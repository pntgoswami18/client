/**
 * Active liveness challenge state machine (plan Section 5, v1-mandatory).
 *
 * With no staff confirming a match before the door opens, the blink/head-turn
 * challenge is what stands between a printed photo and an unlocked door. Both
 * signals come from the FaceLandmarker already in the pipeline — no extra
 * model:
 *   - blink: the eyeBlinkLeft/eyeBlinkRight blendshape scores (0..1)
 *   - head turn: the yaw ratio from faceAlign.poseLabel (nose offset / inter-eye)
 *
 * This is pure and deterministic: feed it one observation per frame and it
 * advances. It deters casual/opportunistic spoofing (a photo, a paused video);
 * it is explicitly NOT FIDO-grade and won't stop a determined attacker with a
 * head-turn video — honest framing for a gym door. The passive-texture model
 * that would let us skip this prompt is deferred (plan's "Phase 2" of liveness).
 */

export const CHALLENGE_TYPES = ['blink', 'turn_left', 'turn_right'];

export const DEFAULT_LIVENESS_CONFIG = {
  timeoutMs: 4000, // fail the challenge if not satisfied within this window
  blinkClosed: 0.5, // blendshape score above which an eye counts as closed
  blinkOpen: 0.2, // ...and below which it counts as open again
  turnRatio: 0.22, // |yawRatio| beyond this counts as a deliberate head turn
};

/**
 * Pick a challenge. Random by default so an attacker can't pre-record one
 * fixed action; callers may pass a fixed type for tests.
 */
export function pickChallenge(rng = Math.random) {
  return CHALLENGE_TYPES[Math.floor(rng() * CHALLENGE_TYPES.length)];
}

/**
 * A single challenge instance. Construct when entering the liveness step, then
 * call observe() once per frame until state is 'passed' or 'failed'.
 *
 * A blink requires a full closed->open transition (both eyes crossing the
 * closed threshold, then reopening) so a half-closed still frame can't pass.
 * A head turn requires the yaw ratio to cross the threshold on the requested
 * side; the requested side (not just "any turn") must match so a photo tilted
 * once can't satisfy an arbitrary prompt.
 */
export class LivenessChallenge {
  constructor(type, config = DEFAULT_LIVENESS_CONFIG, startNow = null) {
    this.type = type;
    this.config = { ...DEFAULT_LIVENESS_CONFIG, ...config };
    this.state = 'waiting'; // waiting -> passed | failed
    this._startedAt = startNow;
    this._eyesClosed = false; // blink: have we seen the closed phase yet
  }

  get prompt() {
    switch (this.type) {
      case 'blink':
        return 'Please blink';
      case 'turn_left':
        return 'Turn your head slightly left';
      case 'turn_right':
        return 'Turn your head slightly right';
      default:
        return 'Follow the prompt';
    }
  }

  /**
   * @param {{ now:number, blinkLeft?:number, blinkRight?:number, yawRatio?:number }} obs
   *   yawRatio > 0 = nose toward image-right; < 0 = image-left (faceAlign.poseLabel).
   * @returns {{ state:'waiting'|'passed'|'failed', prompt:string, remainingMs:number }}
   */
  observe(obs) {
    if (this.state !== 'waiting') {
      return { state: this.state, prompt: this.prompt, remainingMs: 0 };
    }
    if (this._startedAt == null) this._startedAt = obs.now;
    const elapsed = obs.now - this._startedAt;

    if (this._satisfied(obs)) {
      this.state = 'passed';
    } else if (elapsed >= this.config.timeoutMs) {
      this.state = 'failed';
    }
    return {
      state: this.state,
      prompt: this.prompt,
      remainingMs: Math.max(0, this.config.timeoutMs - elapsed),
    };
  }

  _satisfied(obs) {
    if (this.type === 'blink') {
      const bothClosed =
        (obs.blinkLeft ?? 0) >= this.config.blinkClosed &&
        (obs.blinkRight ?? 0) >= this.config.blinkClosed;
      const bothOpen =
        (obs.blinkLeft ?? 0) <= this.config.blinkOpen &&
        (obs.blinkRight ?? 0) <= this.config.blinkOpen;
      if (bothClosed) this._eyesClosed = true;
      // A blink is only complete once eyes have gone closed THEN reopened.
      return this._eyesClosed && bothOpen;
    }
    if (this.type === 'turn_left') {
      // Image-left = negative yaw ratio.
      return (obs.yawRatio ?? 0) <= -this.config.turnRatio;
    }
    if (this.type === 'turn_right') {
      return (obs.yawRatio ?? 0) >= this.config.turnRatio;
    }
    return false;
  }
}
