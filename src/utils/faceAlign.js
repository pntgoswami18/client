/**
 * Pure geometry/quality helpers for the face pipeline (no wasm, unit-testable).
 *
 * Alignment follows the ArcFace/SFace convention: a non-reflective similarity
 * transform maps 5 facial points onto a canonical 112x112 template, matching
 * what OpenCV's FaceRecognizerSF.alignCrop does in the offline eval harness
 * (tools/face-model/evaluate.py in the gmgmt repo). Small skew between
 * MediaPipe and YuNet landmarks is expected and validated in shadow mode.
 */

// Canonical 5-point template for a 112x112 ArcFace-family crop:
// [leftEye, rightEye, noseTip, leftMouth, rightMouth] ("left" = smaller x in
// the image, not the subject's left).
export const ARCFACE_TEMPLATE = [
  [38.2946, 51.6963],
  [73.5318, 51.5014],
  [56.0252, 71.7366],
  [41.5493, 92.3655],
  [70.7299, 92.2041],
];

export const CROP_SIZE = 112;

// MediaPipe FaceLandmarker (468/478-point mesh) indices used for alignment.
const LM = {
  RIGHT_EYE_OUTER: 33, // subject's right eye (image left on unmirrored video)
  RIGHT_EYE_INNER: 133,
  LEFT_EYE_INNER: 362,
  LEFT_EYE_OUTER: 263,
  NOSE_TIP: 1,
  MOUTH_RIGHT: 61,
  MOUTH_LEFT: 291,
};

const mid = (a, b) => [(a.x + b.x) / 2, (a.y + b.y) / 2];

/**
 * Extract the 5 alignment points (pixel coords) from MediaPipe normalized
 * landmarks. Points are ordered to match ARCFACE_TEMPLATE by x-coordinate,
 * which makes the mapping robust to mirrored video frames.
 */
export function fivePointsFromLandmarks(landmarks, width, height) {
  const eyeA = mid(landmarks[LM.RIGHT_EYE_OUTER], landmarks[LM.RIGHT_EYE_INNER]);
  const eyeB = mid(landmarks[LM.LEFT_EYE_INNER], landmarks[LM.LEFT_EYE_OUTER]);
  const nose = [landmarks[LM.NOSE_TIP].x, landmarks[LM.NOSE_TIP].y];
  const mouthA = [landmarks[LM.MOUTH_RIGHT].x, landmarks[LM.MOUTH_RIGHT].y];
  const mouthB = [landmarks[LM.MOUTH_LEFT].x, landmarks[LM.MOUTH_LEFT].y];

  const [eyeL, eyeR] = eyeA[0] <= eyeB[0] ? [eyeA, eyeB] : [eyeB, eyeA];
  const [mouthL, mouthR] = mouthA[0] <= mouthB[0] ? [mouthA, mouthB] : [mouthB, mouthA];

  return [eyeL, eyeR, nose, mouthL, mouthR].map(([x, y]) => [x * width, y * height]);
}

/**
 * Least-squares non-reflective similarity transform src -> dst.
 * Returns [a, b, tx, ty] such that:
 *   u = a*x - b*y + tx
 *   v = b*x + a*y + ty
 * Solved via the 4x4 normal equations (equivalent to Umeyama without
 * reflection handling — fine for faces, which can't be mirrored by a
 * physical camera between landmarks and template).
 */
export function similarityTransform(src, dst) {
  // Accumulate A^T A and A^T b for rows [x, -y, 1, 0] -> u and [y, x, 0, 1] -> v
  const AtA = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  const Atb = [0, 0, 0, 0];
  for (let i = 0; i < src.length; i++) {
    const [x, y] = src[i];
    const [u, v] = dst[i];
    const rows = [
      [x, -y, 1, 0, u],
      [y, x, 0, 1, v],
    ];
    for (const [r0, r1, r2, r3, t] of rows) {
      const r = [r0, r1, r2, r3];
      for (let j = 0; j < 4; j++) {
        for (let k = 0; k < 4; k++) AtA[j][k] += r[j] * r[k];
        Atb[j] += r[j] * t;
      }
    }
  }
  return solve4x4(AtA, Atb);
}

// Gaussian elimination with partial pivoting for the 4x4 system.
function solve4x4(A, b) {
  const m = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < 4; col++) {
    let pivot = col;
    for (let r = col + 1; r < 4; r++) {
      if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    }
    if (Math.abs(m[pivot][col]) < 1e-12) throw new Error('degenerate landmark configuration');
    [m[col], m[pivot]] = [m[pivot], m[col]];
    for (let r = 0; r < 4; r++) {
      if (r === col) continue;
      const f = m[r][col] / m[col][col];
      for (let c = col; c < 5; c++) m[r][c] -= f * m[col][c];
    }
  }
  return m.map((row, i) => row[4] / row[i]);
}

/** Apply [a,b,tx,ty] to a point. */
export function applyTransform([a, b, tx, ty], [x, y]) {
  return [a * x - b * y + tx, b * x + a * y + ty];
}

/**
 * Coarse yaw label from the 5 points: how far the nose tip sits from the
 * eye midpoint, normalized by inter-eye distance. Used only to guide the
 * multi-pose capture flow (pose_label metadata) — not for matching.
 */
export function poseLabel(fivePoints, { frontBand = 0.12, sideBand = 0.3 } = {}) {
  const [eyeL, eyeR, nose] = fivePoints;
  const midX = (eyeL[0] + eyeR[0]) / 2;
  const interEye = Math.hypot(eyeR[0] - eyeL[0], eyeR[1] - eyeL[1]);
  if (interEye < 1e-6) return { label: 'front', ratio: 0 };
  const ratio = (nose[0] - midX) / interEye;
  let label = 'front';
  if (Math.abs(ratio) >= sideBand) label = ratio > 0 ? 'right' : 'left';
  else if (Math.abs(ratio) > frontBand) label = null; // in-between, don't capture
  return { label, ratio };
}

/**
 * Frame-level capture gate. box is {originX, originY, width, height} in pixels
 * (MediaPipe convention). Returns { ok, reasons } — reasons drive UI hints.
 */
export function frameQuality({ faceCount, box, videoWidth, videoHeight }, opts = {}) {
  const { minFaceFrac = 0.22, centerBand = 0.3 } = opts;
  const reasons = [];
  if (faceCount === 0) reasons.push('no_face');
  if (faceCount > 1) reasons.push('multiple_faces');
  if (faceCount === 1 && box) {
    if (box.height / videoHeight < minFaceFrac) reasons.push('too_far');
    const cx = box.originX + box.width / 2;
    const cy = box.originY + box.height / 2;
    if (
      Math.abs(cx - videoWidth / 2) > videoWidth * centerBand ||
      Math.abs(cy - videoHeight / 2) > videoHeight * centerBand
    ) {
      reasons.push('off_center');
    }
  }
  return { ok: reasons.length === 0, reasons };
}

/**
 * Variance of a 3x3 Laplacian over a grayscale crop — the standard cheap
 * blur metric. Higher = sharper. Input: Float32Array/number[] of length w*h.
 */
export function laplacianVariance(gray, w, h) {
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const v = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w];
      sum += v;
      sumSq += v * v;
      n++;
    }
  }
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

/** L2-normalize a vector in place; returns a plain number[]. */
export function l2Normalize(vec) {
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  return Array.from(vec, (v) => v / norm);
}
