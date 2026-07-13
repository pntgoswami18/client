import {
  cosineSimilarity,
  scoreMember,
  rankGallery,
  evaluateFrame,
  MatchAccumulator,
  DEFAULT_MATCH_CONFIG,
} from './faceMatching';

// Axis-aligned unit vectors make similarities exact and easy to reason about:
// same axis -> 1.0, orthogonal -> 0.0. A "near" vector blends two axes.
const e = (dim, axis, mag = 1) => {
  const v = new Array(dim).fill(0);
  v[axis] = mag;
  return v;
};
const blend = (dim, a, b, wa, wb) => {
  const v = new Array(dim).fill(0);
  v[a] = wa;
  v[b] = wb;
  return v;
};

const galleryOf = (members) => members;

describe('cosineSimilarity', () => {
  it('is 1 for identical direction, 0 for orthogonal, -1 for guard cases', () => {
    expect(cosineSimilarity(e(4, 0), e(4, 0))).toBeCloseTo(1, 10);
    expect(cosineSimilarity(e(4, 0), e(4, 1))).toBeCloseTo(0, 10);
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(-1); // length mismatch
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(-1); // zero vector
  });

  it('normalizes defensively so magnitude cannot inflate score', () => {
    // Same direction, different magnitude -> still 1.
    expect(cosineSimilarity(e(3, 0, 5), e(3, 0, 0.1))).toBeCloseTo(1, 10);
  });
});

describe('scoreMember', () => {
  it('returns the MAX similarity across a member samples, not the mean', () => {
    const probe = e(4, 2);
    const samples = [e(4, 0), e(4, 2), e(4, 1)]; // one exact match
    expect(scoreMember(probe, samples)).toBeCloseTo(1, 10);
  });
});

describe('rankGallery', () => {
  const dim = 4;
  it('ranks top1/top2 and computes the margin', () => {
    const probe = e(dim, 0);
    const gallery = galleryOf([
      { memberId: 1, name: 'A', isActive: true, samples: [e(dim, 0)] }, // score 1
      { memberId: 2, name: 'B', isActive: true, samples: [blend(dim, 0, 1, 0.7, 0.7)] }, // ~0.707
      { memberId: 3, name: 'C', isActive: true, samples: [e(dim, 1)] }, // 0
    ]);
    const { top1, top2, margin } = rankGallery(probe, gallery);
    expect(top1.memberId).toBe(1);
    expect(top2.memberId).toBe(2);
    expect(margin).toBeCloseTo(1 - 0.7071, 3);
  });

  it('excludes inactive members even when they would be the best match', () => {
    const probe = e(dim, 0);
    const gallery = galleryOf([
      { memberId: 1, name: 'Inactive', isActive: false, samples: [e(dim, 0)] },
      { memberId: 2, name: 'Active', isActive: true, samples: [blend(dim, 0, 1, 0.6, 0.8)] },
    ]);
    const { top1 } = rankGallery(probe, gallery);
    expect(top1.memberId).toBe(2);
  });

  it('returns null top1 and margin 0 for an empty gallery', () => {
    const { top1, margin } = rankGallery(e(dim, 0), []);
    expect(top1).toBeNull();
    expect(margin).toBe(0);
  });
});

describe('evaluateFrame gates', () => {
  const dim = 4;
  const config = { threshold: 0.55, margin: 0.05, k: 3 };
  const probe = e(dim, 0);

  it('passes a clear, unambiguous match', () => {
    const gallery = [
      { memberId: 1, name: 'A', isActive: true, samples: [e(dim, 0)] },
      { memberId: 2, name: 'B', isActive: true, samples: [e(dim, 1)] },
    ];
    const r = evaluateFrame(probe, gallery, config);
    expect(r.passed).toBe(true);
    expect(r.memberId).toBe(1);
    expect(r.reason).toBe('match');
  });

  it('rejects a below-threshold best match', () => {
    // cosine of [1, √3] against [1,0] = 1/2 = 0.5 (< 0.55) after normalization.
    const gallery = [
      { memberId: 1, name: 'A', isActive: true, samples: [blend(dim, 0, 1, 1, Math.sqrt(3))] },
    ];
    const r = evaluateFrame(probe, gallery, config);
    expect(r.score).toBeCloseTo(0.5, 6);
    expect(r.passed).toBe(false);
    expect(r.reason).toBe('below_threshold');
  });

  it('rejects an ambiguous match (two members too close together)', () => {
    const gallery = [
      { memberId: 1, name: 'A', isActive: true, samples: [e(dim, 0)] }, // 1.0
      { memberId: 2, name: 'B', isActive: true, samples: [blend(dim, 0, 1, 0.99, 0.14)] }, // ~0.99
    ];
    const r = evaluateFrame(probe, gallery, config);
    expect(r.passed).toBe(false);
    expect(r.reason).toBe('ambiguous');
    expect(r.runnerUpId).toBe(2);
  });

  it('reports no_gallery when nothing is enrolled', () => {
    expect(evaluateFrame(probe, [], config).reason).toBe('no_gallery');
  });
});

describe('MatchAccumulator — K-consecutive-frames accept', () => {
  const dim = 4;
  const config = { threshold: 0.55, margin: 0.05, k: 3 };
  const gallery = [
    { memberId: 1, name: 'Alice', isActive: true, samples: [e(dim, 0)] },
    { memberId: 2, name: 'Bob', isActive: true, samples: [e(dim, 1)] },
  ];
  const probeA = e(dim, 0);
  const probeB = e(dim, 1);
  const probeNoise = blend(dim, 2, 3, 0.7, 0.7); // matches nobody

  it('accepts only after K consecutive agreeing frames', () => {
    const acc = new MatchAccumulator(config);
    let r = acc.observe(probeA, gallery);
    expect(r.state).toBe('building');
    expect(r.count).toBe(1);
    r = acc.observe(probeA, gallery);
    expect(r.state).toBe('building');
    expect(r.count).toBe(2);
    r = acc.observe(probeA, gallery);
    expect(r.state).toBe('accepted');
    expect(r.memberId).toBe(1);
    expect(r.name).toBe('Alice');
  });

  it('resets the streak on a failing (below-threshold) frame', () => {
    const acc = new MatchAccumulator(config);
    acc.observe(probeA, gallery);
    acc.observe(probeA, gallery);
    const miss = acc.observe(probeNoise, gallery);
    expect(miss.state).toBe('idle');
    expect(miss.count).toBe(0);
    // Must build again from scratch — the two earlier hits don't count.
    expect(acc.observe(probeA, gallery).count).toBe(1);
  });

  it('resets to count 1 when a different member appears mid-streak', () => {
    const acc = new MatchAccumulator(config);
    acc.observe(probeA, gallery);
    acc.observe(probeA, gallery);
    const switched = acc.observe(probeB, gallery);
    expect(switched.state).toBe('building');
    expect(switched.memberId).toBe(2);
    expect(switched.count).toBe(1); // impostor flicker cannot inherit the streak
  });

  it('never accepts on a single lucky frame amid noise', () => {
    const acc = new MatchAccumulator(config);
    const seq = [probeNoise, probeA, probeNoise, probeA, probeNoise];
    const states = seq.map((p) => acc.observe(p, gallery).state);
    expect(states).not.toContain('accepted');
  });

  it('uses DEFAULT_MATCH_CONFIG when none supplied', () => {
    const acc = new MatchAccumulator();
    expect(acc.config.k).toBe(DEFAULT_MATCH_CONFIG.k);
  });
});
