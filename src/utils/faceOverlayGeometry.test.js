import { coverMap, arrowAnchor, lerpRect } from './faceOverlayGeometry';

const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

describe('coverMap', () => {
  it('maps a landscape frame into a wider container (vertical crop)', () => {
    // 640x480 into 1280x720: scale = max(2, 1.5) = 2; scaledH 960 > 720 so the
    // vertical axis is cropped by (960-720)/2 = 120 each side.
    const r = coverMap(
      { originX: 100, originY: 100, width: 200, height: 200 },
      640,
      480,
      1280,
      720
    );
    expect(near(r.x, 200)).toBe(true); // 100*2 + 0
    expect(near(r.y, 80)).toBe(true); // 100*2 - 120
    expect(near(r.width, 400)).toBe(true);
    expect(near(r.height, 400)).toBe(true);
  });

  it('mirror flips x across the display centerline, leaving y/size untouched', () => {
    const plain = coverMap(
      { originX: 100, originY: 100, width: 200, height: 200 },
      640,
      480,
      1280,
      720
    );
    const flipped = coverMap(
      { originX: 100, originY: 100, width: 200, height: 200 },
      640,
      480,
      1280,
      720,
      { mirror: true }
    );
    expect(near(flipped.x, 1280 - plain.x - plain.width)).toBe(true); // 1280-200-400 = 680
    expect(near(flipped.x, 680)).toBe(true);
    expect(near(flipped.y, plain.y)).toBe(true);
    expect(near(flipped.width, plain.width)).toBe(true);
  });

  it('maps a landscape frame into a portrait container (horizontal crop)', () => {
    // 640x480 into 480x800: scale = max(0.75, 1.667) = 1.6667; scaledW ~1066.7
    // so x is cropped by (1066.7-480)/2 ~= -293.3 offset.
    const r = coverMap({ originX: 0, originY: 0, width: 640, height: 480 }, 640, 480, 480, 800);
    const scale = 800 / 480;
    expect(near(r.height, 480 * scale)).toBe(true); // fills the tall axis exactly (800)
    expect(near(r.width, 640 * scale)).toBe(true);
    expect(near(r.x, (480 - 640 * scale) / 2)).toBe(true); // negative — cropped
    expect(near(r.y, 0)).toBe(true);
  });

  it('returns null on degenerate inputs', () => {
    expect(coverMap(null, 640, 480, 100, 100)).toBe(null);
    expect(coverMap({ originX: 0, originY: 0, width: 1, height: 1 }, 0, 480, 100, 100)).toBe(null);
  });
});

describe('arrowAnchor', () => {
  const rect = { x: 200, y: 100, width: 300, height: 300 };

  it('places a left arrow outside the left edge, pointing left', () => {
    const a = arrowAnchor(rect, 'left');
    expect(a.sign).toBe(-1);
    expect(a.x).toBeLessThan(rect.x);
    expect(near(a.y, 250)).toBe(true); // vertically centered
  });

  it('places a right arrow outside the right edge, pointing right', () => {
    const a = arrowAnchor(rect, 'right');
    expect(a.sign).toBe(1);
    expect(a.x).toBeGreaterThan(rect.x + rect.width);
    expect(near(a.y, 250)).toBe(true);
  });
});

describe('lerpRect', () => {
  it('snaps to target when there is no previous rect', () => {
    const to = { x: 10, y: 20, width: 30, height: 40 };
    expect(lerpRect(null, to, 0.5)).toBe(to);
  });

  it('interpolates each field by t', () => {
    const from = { x: 0, y: 0, width: 0, height: 0 };
    const to = { x: 100, y: 200, width: 300, height: 400 };
    const r = lerpRect(from, to, 0.25);
    expect(r).toEqual({ x: 25, y: 50, width: 75, height: 100 });
  });
});
