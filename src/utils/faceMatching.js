/**
 * Pure face-matching library for the check-in kiosk (plan Section 3.2/3.3).
 * No wasm, no DOM, no network — every function here is deterministic and
 * unit-tested. This is the module where a bug unlocks a door for the wrong
 * person, so it is deliberately isolated from the camera/model plumbing.
 *
 * Matching is local: a probe embedding is compared against the synced gallery
 * (each member has 3-5 enrolled samples). The final accept decision is a state
 * machine requiring K consecutive frames agreeing on the same identity, each
 * above the similarity threshold and with a sufficient top1-top2 margin. The
 * server re-validates authorization before any unlock — this module only
 * decides "who, if anyone, is this, confidently?".
 */

/**
 * Cosine similarity. Embeddings from faceEngine.embed and the enrolled gallery
 * are already L2-normalized, so this is effectively a dot product, but we
 * normalize defensively so a mis-normalized input can't inflate a score past
 * the threshold.
 */
export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return -1;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? -1 : dot / denom;
}

/**
 * Best similarity between a probe and one member's set of enrolled samples.
 * Max (not mean) so a single good-angle match still scores high — enrollment
 * captures distinct poses on purpose.
 */
export function scoreMember(probe, samples) {
  let best = -1;
  for (const sample of samples) {
    const s = cosineSimilarity(probe, sample);
    if (s > best) best = s;
  }
  return best;
}

/**
 * Rank the gallery against a probe. `gallery` is an array of
 * { memberId, name, samples: number[][], isActive }. Inactive members are
 * excluded — an inactive member should never be a match candidate, and
 * including them could steal the top-1 slot from a valid member and suppress
 * the real match via the margin test.
 *
 * Returns { top1, top2, margin } where top1/top2 are { memberId, name, score }
 * or null. margin = top1.score - (top2?.score ?? -1).
 */
export function rankGallery(probe, gallery) {
  let top1 = null;
  let top2 = null;
  for (const member of gallery) {
    if (member.isActive === false) continue;
    if (!member.samples || member.samples.length === 0) continue;
    const score = scoreMember(probe, member.samples);
    const entry = { memberId: member.memberId, name: member.name, score };
    if (!top1 || score > top1.score) {
      top2 = top1;
      top1 = entry;
    } else if (!top2 || score > top2.score) {
      top2 = entry;
    }
  }
  const margin = top1 ? top1.score - (top2 ? top2.score : -1) : 0;
  return { top1, top2, margin };
}

export const DEFAULT_MATCH_CONFIG = {
  threshold: 0.55, // face_match_threshold from GET /face/config
  margin: 0.05, // minimum top1-top2 separation (delta in plan 3.2 rule 3)
  k: 3, // consecutive agreeing frames required (K in plan 3.2)
};

/**
 * Evaluate a single probe against the gallery and the config gates. Returns
 * { memberId|null, name, score, margin, passed, reason }. `passed` means this
 * frame is a confident single-frame hit — the K-of-K streak is handled by
 * MatchAccumulator below.
 */
export function evaluateFrame(probe, gallery, config = DEFAULT_MATCH_CONFIG) {
  const { top1, top2, margin } = rankGallery(probe, gallery);
  if (!top1) {
    return {
      memberId: null,
      name: null,
      score: -1,
      margin: 0,
      passed: false,
      reason: 'no_gallery',
    };
  }
  if (top1.score < config.threshold) {
    return {
      memberId: top1.memberId,
      name: top1.name,
      score: top1.score,
      margin,
      passed: false,
      reason: 'below_threshold',
    };
  }
  if (margin < config.margin) {
    return {
      memberId: top1.memberId,
      name: top1.name,
      score: top1.score,
      margin,
      passed: false,
      reason: 'ambiguous',
      runnerUpId: top2 ? top2.memberId : null,
    };
  }
  return {
    memberId: top1.memberId,
    name: top1.name,
    score: top1.score,
    margin,
    passed: true,
    reason: 'match',
  };
}

/**
 * K-consecutive-frames accept state machine (plan 3.2 rule 3). Feed it one
 * probe per frame; it returns the current streak state. It only reports
 * ACCEPTED once the same member has passed every gate for K consecutive
 * frames. Any failing frame, or a frame matching a different member, resets
 * the streak — an impostor flickering into a match for one frame never
 * accumulates to an accept.
 *
 * This is NOT the final authorization: the caller still runs the liveness
 * challenge and the server's processCheckIn before any unlock.
 */
export class MatchAccumulator {
  constructor(config = DEFAULT_MATCH_CONFIG) {
    this.config = { ...DEFAULT_MATCH_CONFIG, ...config };
    this.reset();
  }

  reset() {
    this._memberId = null;
    this._count = 0;
    this._lastScore = -1;
  }

  /**
   * @returns {{ state: 'idle'|'building'|'accepted', memberId, name, score,
   *   margin, count, needed }}
   */
  observe(probe, gallery) {
    const frame = evaluateFrame(probe, gallery, this.config);
    if (!frame.passed) {
      this.reset();
      return {
        state: 'idle',
        memberId: null,
        name: null,
        score: frame.score,
        margin: frame.margin,
        count: 0,
        needed: this.config.k,
        reason: frame.reason,
      };
    }

    if (frame.memberId === this._memberId) {
      this._count += 1;
    } else {
      this._memberId = frame.memberId;
      this._count = 1;
    }
    this._lastScore = frame.score;
    this._lastName = frame.name;

    const accepted = this._count >= this.config.k;
    return {
      state: accepted ? 'accepted' : 'building',
      memberId: this._memberId,
      name: frame.name,
      score: frame.score,
      margin: frame.margin,
      count: this._count,
      needed: this.config.k,
      reason: frame.reason,
    };
  }
}
