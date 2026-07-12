import { applySyncDelta, computeCursor, toGalleryArray } from './faceCacheDb';

const member = (id, updatedAt, extra = {}) => ({
  memberId: id,
  name: `M${id}`,
  isActive: true,
  updatedAt,
  samples: [[0.1, 0.2]],
  ...extra,
});

describe('applySyncDelta', () => {
  it('upserts returned members without mutating the input map', () => {
    const current = new Map([[1, member(1, '2026-07-01')]]);
    const delta = { members: [member(2, '2026-07-02')], deletedMemberIds: [] };
    const next = applySyncDelta(current, delta);
    expect(next.size).toBe(2);
    expect(current.size).toBe(1); // input untouched (immutability for React state)
    expect(next.get(2).name).toBe('M2');
  });

  it('overwrites an existing member with the newer record', () => {
    const current = new Map([[1, member(1, '2026-07-01', { name: 'Old' })]]);
    const next = applySyncDelta(current, {
      members: [member(1, '2026-07-05', { name: 'New' })],
    });
    expect(next.get(1).name).toBe('New');
    expect(next.get(1).updatedAt).toBe('2026-07-05');
  });

  it('removes tombstoned members', () => {
    const current = new Map([
      [1, member(1, '2026-07-01')],
      [2, member(2, '2026-07-01')],
    ]);
    const next = applySyncDelta(current, { members: [], deletedMemberIds: [2] });
    expect(next.has(2)).toBe(false);
    expect(next.has(1)).toBe(true);
  });

  it('handles a delta that both updates and deletes', () => {
    const current = new Map([
      [1, member(1, '2026-07-01')],
      [2, member(2, '2026-07-01')],
    ]);
    const next = applySyncDelta(current, {
      members: [member(1, '2026-07-06', { name: 'Updated' })],
      deletedMemberIds: [2],
    });
    expect(next.get(1).name).toBe('Updated');
    expect(next.has(2)).toBe(false);
  });

  it('tolerates missing members/deletedMemberIds fields', () => {
    const current = new Map([[1, member(1, '2026-07-01')]]);
    expect(applySyncDelta(current, {}).size).toBe(1);
  });
});

describe('computeCursor', () => {
  it('advances to the max updatedAt actually received', () => {
    const delta = {
      members: [member(1, '2026-07-02'), member(2, '2026-07-09'), member(3, '2026-07-05')],
    };
    expect(computeCursor('2026-07-01', delta)).toBe('2026-07-09');
  });

  it('never moves the cursor backwards', () => {
    const delta = { members: [member(1, '2026-07-01')] };
    expect(computeCursor('2026-07-08', delta)).toBe('2026-07-08');
  });

  it('leaves the cursor unchanged for an empty delta (no records = no skip risk)', () => {
    expect(computeCursor('2026-07-08', { members: [] })).toBe('2026-07-08');
    expect(computeCursor('2026-07-08', {})).toBe('2026-07-08');
  });

  it('starts from empty string when there is no prior cursor', () => {
    expect(computeCursor(undefined, { members: [member(1, '2026-07-02')] })).toBe('2026-07-02');
  });
});

describe('toGalleryArray', () => {
  it('produces the array shape rankGallery consumes', () => {
    const map = new Map([
      [1, member(1, '2026-07-01')],
      [2, member(2, '2026-07-02')],
    ]);
    const arr = toGalleryArray(map);
    expect(Array.isArray(arr)).toBe(true);
    expect(arr.map((m) => m.memberId).sort()).toEqual([1, 2]);
    expect(arr[0]).toHaveProperty('samples');
  });
});
