import {
  ARCFACE_TEMPLATE,
  similarityTransform,
  applyTransform,
  fivePointsFromLandmarks,
  poseLabel,
  frameQuality,
  laplacianVariance,
  l2Normalize,
  captureDecision,
} from './faceAlign';

describe('similarityTransform', () => {
  it('recovers an exact similarity (rotation + scale + translation)', () => {
    const angle = Math.PI / 7;
    const scale = 1.8;
    const a = scale * Math.cos(angle);
    const b = scale * Math.sin(angle);
    const truth = [a, b, 12.5, -4.2];
    const src = ARCFACE_TEMPLATE;
    const dst = src.map((p) => applyTransform(truth, p));

    const est = similarityTransform(src, dst);
    est.forEach((v, i) => expect(v).toBeCloseTo(truth[i], 6));
  });

  it('maps noisy source points close to the template (least squares)', () => {
    // Template points perturbed slightly, then transformed — the LS solution
    // should map them back near the template.
    const truth = [0.5, 0.1, 100, 50];
    const noisySrc = ARCFACE_TEMPLATE.map(([x, y], i) => [x + (i % 2 ? 0.4 : -0.4), y + 0.3]);
    const observed = noisySrc.map((p) => applyTransform(truth, p));

    const est = similarityTransform(observed, ARCFACE_TEMPLATE);
    for (let i = 0; i < observed.length; i++) {
      const [u, v] = applyTransform(est, observed[i]);
      expect(Math.hypot(u - ARCFACE_TEMPLATE[i][0], v - ARCFACE_TEMPLATE[i][1])).toBeLessThan(1.5);
    }
  });

  it('throws on a degenerate configuration (all points identical)', () => {
    const p = [
      [10, 10],
      [10, 10],
      [10, 10],
      [10, 10],
      [10, 10],
    ];
    expect(() => similarityTransform(p, ARCFACE_TEMPLATE)).toThrow(/degenerate/);
  });
});

describe('fivePointsFromLandmarks', () => {
  // Minimal synthetic landmark set: only the indices the extractor reads.
  const lm = (entries) => {
    const arr = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
    for (const [i, x, y] of entries) arr[i] = { x, y };
    return arr;
  };

  it('orders points left-to-right regardless of subject orientation', () => {
    const landmarks = lm([
      [33, 0.3, 0.4], // subject right eye outer (image left)
      [133, 0.36, 0.4],
      [362, 0.6, 0.4], // subject left eye inner (image right)
      [263, 0.66, 0.4],
      [1, 0.48, 0.55],
      [61, 0.38, 0.7],
      [291, 0.58, 0.7],
    ]);
    const pts = fivePointsFromLandmarks(landmarks, 100, 100);
    expect(pts[0][0]).toBeLessThan(pts[1][0]); // eyeL.x < eyeR.x
    expect(pts[3][0]).toBeLessThan(pts[4][0]); // mouthL.x < mouthR.x
    expect(pts[2][1]).toBeGreaterThan(pts[0][1]); // nose below eyes
  });
});

describe('poseLabel', () => {
  const face = (noseOffset) => [
    [40, 50],
    [72, 50],
    [56 + noseOffset, 70],
    [44, 90],
    [68, 90],
  ];
  it('labels a centered nose as front', () => {
    expect(poseLabel(face(0)).label).toBe('front');
  });
  it('labels a strongly offset nose as a side pose', () => {
    expect(poseLabel(face(12)).label).toBe('right');
    expect(poseLabel(face(-12)).label).toBe('left');
  });
  it('returns null in the ambiguous band (no capture)', () => {
    expect(poseLabel(face(6)).label).toBeNull();
  });
});

describe('frameQuality', () => {
  const video = { videoWidth: 640, videoHeight: 480 };
  it('flags empty and crowded frames', () => {
    expect(frameQuality({ faceCount: 0, ...video }).reasons).toContain('no_face');
    expect(frameQuality({ faceCount: 2, ...video }).reasons).toContain('multiple_faces');
  });
  it('flags a distant face and passes a good one', () => {
    const small = { originX: 300, originY: 220, width: 40, height: 50 };
    expect(
      frameQuality({ faceCount: 1, box: small, videoWidth: 640, videoHeight: 480 }).reasons
    ).toContain('too_far');

    const good = { originX: 220, originY: 120, width: 200, height: 240 };
    expect(frameQuality({ faceCount: 1, box: good, videoWidth: 640, videoHeight: 480 }).ok).toBe(
      true
    );
  });
});

describe('laplacianVariance', () => {
  it('scores a sharp pattern higher than a flat one', () => {
    const w = 16;
    const h = 16;
    const flat = new Float32Array(w * h).fill(128);
    const checker = Float32Array.from({ length: w * h }, (_, i) =>
      (Math.floor(i / w) + (i % w)) % 2 ? 255 : 0
    );
    expect(laplacianVariance(checker, w, h)).toBeGreaterThan(laplacianVariance(flat, w, h) + 100);
  });
});

describe('l2Normalize', () => {
  it('returns a unit vector', () => {
    const v = l2Normalize([3, 4]);
    expect(Math.hypot(...v)).toBeCloseTo(1, 10);
  });
});

describe('captureDecision', () => {
  it('requires the front pose first', () => {
    expect(captureDecision({}, 'front')).toBe('front');
    expect(captureDecision({}, 'left')).toBeNull(); // sides rejected until front is done
    expect(captureDecision({}, 'right')).toBeNull();
  });

  it('rejects an ambiguous (null) pose', () => {
    expect(captureDecision({}, null)).toBeNull();
    expect(captureDecision({ front: {} }, null)).toBeNull();
  });

  it('labels a side capture by its actual orientation', () => {
    expect(captureDecision({ front: {} }, 'right')).toBe('right');
    expect(captureDecision({ front: {} }, 'left')).toBe('left');
  });

  it('does not let one orientation fill both side slots (the regression)', () => {
    // Front + one side captured; holding that same side must NOT fill the other.
    expect(captureDecision({ front: {}, right: {} }, 'right')).toBeNull();
    expect(captureDecision({ front: {}, left: {} }, 'left')).toBeNull();
    // The genuinely different side is still accepted.
    expect(captureDecision({ front: {}, right: {} }, 'left')).toBe('left');
    expect(captureDecision({ front: {}, left: {} }, 'right')).toBe('right');
  });

  it('never re-captures the front slot', () => {
    expect(captureDecision({ front: {} }, 'front')).toBeNull();
  });

  it('returns null once all poses are captured', () => {
    expect(captureDecision({ front: {}, left: {}, right: {} }, 'left')).toBeNull();
  });
});
