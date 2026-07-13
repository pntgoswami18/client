import { renderOverlay, clearOverlay } from './faceOverlayDraw';

// jsdom has no 2D canvas, so stub a context that records the calls we assert on
// and no-ops the rest. This lets us exercise renderOverlay/clearOverlay's
// non-visual branch logic (rect tracking, snap-vs-glide, clearing) without a
// real canvas — the actual stroking is validated live in the browser.
function makeCtx() {
  const calls = { clearRect: [], setTransform: [] };
  const noop = () => {};
  const ctx = {
    _calls: calls,
    clearRect: (...a) => calls.clearRect.push(a),
    setTransform: (...a) => calls.setTransform.push(a),
    save: noop,
    restore: noop,
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    stroke: noop,
    ellipse: noop,
    arc: noop,
    fill: noop,
    quadraticCurveTo: noop,
    translate: noop,
  };
  return ctx;
}

function makeCanvas(ctx, { clientWidth = 640, clientHeight = 480 } = {}) {
  return { clientWidth, clientHeight, width: 0, height: 0, getContext: () => ctx };
}

// One face, centered-ish, in a 640x480 raw frame.
const det = { faceCount: 1, box: { originX: 100, originY: 100, width: 200, height: 200 } };
const video = { videoWidth: 640, videoHeight: 480 };

describe('clearOverlay', () => {
  it('forgets the tracked rect and clears the whole backing store', () => {
    const ctx = makeCtx();
    const canvas = makeCanvas(ctx);
    canvas.width = 128;
    canvas.height = 64;
    const state = { lastRect: { x: 1, y: 2, width: 3, height: 4 }, reducedMotion: false };

    clearOverlay(canvas, state);

    expect(state.lastRect).toBe(null);
    expect(ctx._calls.clearRect).toContainEqual([0, 0, 128, 64]);
  });

  it('nulls state even when there is no canvas', () => {
    const state = { lastRect: { x: 1, y: 2, width: 3, height: 4 }, reducedMotion: false };
    clearOverlay(null, state);
    expect(state.lastRect).toBe(null);
  });
});

describe('renderOverlay', () => {
  it('drops the tracked rect when the phase is not scanning', () => {
    const ctx = makeCtx();
    const canvas = makeCanvas(ctx);
    const state = { lastRect: { x: 1, y: 2, width: 3, height: 4 }, reducedMotion: false };

    renderOverlay(canvas, video, det, 'welcome', null, 0, state);

    expect(state.lastRect).toBe(null);
  });

  it('drops the tracked rect when no single face is detected while scanning', () => {
    const ctx = makeCtx();
    const canvas = makeCanvas(ctx);
    const state = { lastRect: { x: 1, y: 2, width: 3, height: 4 }, reducedMotion: false };

    renderOverlay(canvas, video, { faceCount: 0 }, 'idle', null, 0, state);

    expect(state.lastRect).toBe(null);
  });

  it('snaps straight to the mapped target when reduced motion is on', () => {
    const ctx = makeCtx();
    const canvas = makeCanvas(ctx);
    // Start far from the target to prove it snaps rather than glides.
    const state = { lastRect: { x: 0, y: 0, width: 0, height: 0 }, reducedMotion: true };

    renderOverlay(canvas, video, det, 'idle', null, 0, state);

    // coverMap(640x480 box into 640x480 display, mirror): scale 1, x = 640-100-200.
    expect(state.lastRect).toEqual({ x: 340, y: 100, width: 200, height: 200 });
  });

  it('glides a fraction toward the target when reduced motion is off', () => {
    const ctx = makeCtx();
    const canvas = makeCanvas(ctx);
    const state = { lastRect: { x: 0, y: 0, width: 0, height: 0 }, reducedMotion: false };

    renderOverlay(canvas, video, det, 'idle', null, 0, state);

    // lerp factor 0.35 toward target x=340 → 119; not snapped to 340.
    expect(state.lastRect.x).toBeCloseTo(119);
    expect(state.lastRect.width).toBeCloseTo(70); // 200 * 0.35
  });
});
