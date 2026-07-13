/**
 * faceEngine — shared LiteRT.js + MediaPipe wrapper for face enrollment (P3)
 * and the check-in kiosk (P4). All inference is on-device; raw frames never
 * leave the browser.
 *
 * Two constraints carried over from the Phase 1 model work (gmgmt
 * tools/face-model/README.md):
 *  - The SFace embedder takes RAW 0-255 BGR pixels — normalization is baked
 *    into the graph. Do NOT rescale to [-1,1] or [0,1].
 *  - loadLiteRt must enable JSPI where available, or the converted model
 *    throws "Asyncify is not defined" on the WebGPU backend.
 */
import { loadLiteRt, loadAndCompile, Tensor } from '@litertjs/core';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import {
  ARCFACE_TEMPLATE,
  CROP_SIZE,
  fivePointsFromLandmarks,
  similarityTransform,
  poseLabel,
  frameQuality,
  laplacianVariance,
  l2Normalize,
} from './faceAlign';

const MANIFEST_URL = '/api/biometric/face/model-manifest';

// Pull the eyeBlink blendshape scores out of a MediaPipe faceBlendshapes entry.
// Returns { left, right } in 0..1 (0 = open, 1 = closed), defaulting to open
// when the categories are absent so a missing signal never reads as a blink.
function blinkScores(blendshapes) {
  const out = { left: 0, right: 0 };
  for (const cat of blendshapes?.categories || []) {
    if (cat.categoryName === 'eyeBlinkLeft') out.left = cat.score;
    else if (cat.categoryName === 'eyeBlinkRight') out.right = cat.score;
  }
  return out;
}

class FaceEngine {
  constructor() {
    this.model = null;
    this.landmarker = null;
    this.manifest = null;
    this.backend = null;
    this._initPromise = null;
    this._cropCanvas = null;
  }

  /** Idempotent init; safe to call from multiple components. */
  init() {
    if (!this._initPromise) {
      this._initPromise = this._init().catch((err) => {
        this._initPromise = null; // allow retry after failure
        throw err;
      });
    }
    return this._initPromise;
  }

  async _init() {
    const res = await fetch(MANIFEST_URL, { credentials: 'include' });
    if (!res.ok) {
      throw new Error(
        res.status === 404
          ? 'No face model manifest deployed on the server (run the model deploy step)'
          : `Failed to load model manifest (HTTP ${res.status})`
      );
    }
    const manifest = (await res.json()).data;
    this.manifest = manifest;

    const jspiOk = 'Suspending' in WebAssembly;
    await loadLiteRt(manifest.litertWasmPath, { jspi: jspiOk });

    // WebGPU first, WASM/XNNPACK fallback (plan Section 6.1). Both are within
    // the latency budget for the fp32 embedder (9.6ms / 27ms measured in P1).
    const accelerators = 'gpu' in navigator ? ['webgpu', 'wasm'] : ['wasm'];
    let lastError = null;
    for (const accelerator of accelerators) {
      try {
        this.model = await loadAndCompile(manifest.embedder.url, { accelerator });
        this.backend = accelerator;
        break;
      } catch (err) {
        lastError = err;
      }
    }
    if (!this.model) {
      throw new Error(`Failed to compile face embedder: ${lastError?.message || lastError}`);
    }

    const fileset = await FilesetResolver.forVisionTasks(manifest.mediapipeWasmPath);
    this.landmarker = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: manifest.landmarker.url },
      runningMode: 'VIDEO',
      numFaces: 2, // 2 so "more than one face in frame" is detectable
      // Blendshapes give the eyeBlink scores the check-in kiosk's liveness
      // challenge needs (plan Section 5). Enrollment ignores them; the extra
      // per-frame cost is negligible for the small landmarker.
      outputFaceBlendshapes: true,
    });
    return this;
  }

  get modelVersion() {
    return this.manifest?.modelVersion || '';
  }

  /**
   * Detect + gate a video frame. Returns:
   * { ok, reasons, fivePoints, pose, faceCount, blink }
   * `blink` is { left, right } eyeBlink blendshape scores (0..1) for the single
   * detected face, used by the kiosk liveness challenge; null when faceCount!==1.
   */
  detect(video, timestampMs) {
    const result = this.landmarker.detectForVideo(video, timestampMs);
    const faces = result.faceLandmarks || [];
    const faceCount = faces.length;
    if (faceCount !== 1) {
      return {
        ...frameQuality({ faceCount }),
        fivePoints: null,
        pose: null,
        faceCount,
        blink: null,
      };
    }

    const w = video.videoWidth;
    const h = video.videoHeight;
    const landmarks = faces[0];

    // Bounding box from the landmark extremes (FaceLandmarker has no box output).
    let minX = 1;
    let minY = 1;
    let maxX = 0;
    let maxY = 0;
    for (const p of landmarks) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    const box = {
      originX: minX * w,
      originY: minY * h,
      width: (maxX - minX) * w,
      height: (maxY - minY) * h,
    };

    const gate = frameQuality({ faceCount, box, videoWidth: w, videoHeight: h });
    const fivePoints = fivePointsFromLandmarks(landmarks, w, h);
    return {
      ...gate,
      fivePoints,
      pose: poseLabel(fivePoints),
      faceCount,
      box,
      blink: blinkScores(result.faceBlendshapes?.[0]),
    };
  }

  /**
   * Warp the frame to the canonical 112x112 crop via the 5-point similarity
   * transform. Returns { canvas, imageData, sharpness }.
   */
  alignCrop(video, fivePoints) {
    if (!this._cropCanvas) {
      this._cropCanvas = document.createElement('canvas');
      this._cropCanvas.width = CROP_SIZE;
      this._cropCanvas.height = CROP_SIZE;
    }
    const canvas = this._cropCanvas;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const [a, b, tx, ty] = similarityTransform(fivePoints, ARCFACE_TEMPLATE);
    ctx.setTransform(a, b, -b, a, tx, ty);
    ctx.drawImage(video, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const imageData = ctx.getImageData(0, 0, CROP_SIZE, CROP_SIZE);
    const gray = new Float32Array(CROP_SIZE * CROP_SIZE);
    const px = imageData.data;
    for (let i = 0, j = 0; i < gray.length; i++, j += 4) {
      gray[i] = 0.299 * px[j] + 0.587 * px[j + 1] + 0.114 * px[j + 2];
    }
    return { canvas, imageData, sharpness: laplacianVariance(gray, CROP_SIZE, CROP_SIZE) };
  }

  /**
   * Embed an aligned crop's ImageData. Returns an L2-normalized number[128].
   */
  async embed(imageData) {
    const px = imageData.data;
    const n = CROP_SIZE * CROP_SIZE;
    // NHWC float32, BGR channel order, raw 0-255 scale (see header comment).
    const input = new Float32Array(n * 3);
    for (let i = 0, j = 0; i < n; i++, j += 4) {
      input[i * 3] = px[j + 2]; // B
      input[i * 3 + 1] = px[j + 1]; // G
      input[i * 3 + 2] = px[j]; // R
    }
    const tensor = new Tensor(input, [1, CROP_SIZE, CROP_SIZE, 3]);
    let outputs;
    try {
      outputs = await this.model.run([tensor]);
    } finally {
      tensor.delete();
    }
    const outs = Array.isArray(outputs) ? outputs : Object.values(outputs);
    const host = await outs[0].moveTo('wasm');
    const embedding = l2Normalize(host.toTypedArray());
    host.delete();
    outs.slice(1).forEach((t) => t.delete());
    return embedding;
  }

  dispose() {
    try {
      this.model?.delete();
      this.landmarker?.close();
    } catch (_) {
      /* best effort */
    }
    this.model = null;
    this.landmarker = null;
    this._initPromise = null;
  }
}

// Singleton — enrollment tab and (later) the check-in kiosk share one engine.
const faceEngine = new FaceEngine();
export default faceEngine;
