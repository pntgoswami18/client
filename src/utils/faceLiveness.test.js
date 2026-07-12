import {
  LivenessChallenge,
  pickChallenge,
  CHALLENGE_TYPES,
  DEFAULT_LIVENESS_CONFIG,
} from './faceLiveness';

const cfg = { ...DEFAULT_LIVENESS_CONFIG, timeoutMs: 1000 };

describe('pickChallenge', () => {
  it('returns a valid challenge type and honors a seeded rng', () => {
    expect(CHALLENGE_TYPES).toContain(pickChallenge(() => 0));
    expect(pickChallenge(() => 0)).toBe('blink');
    expect(pickChallenge(() => 0.99)).toBe('turn_right');
  });
});

describe('blink challenge', () => {
  it('passes only after a full closed -> open transition', () => {
    const c = new LivenessChallenge('blink', cfg, 0);
    // Eyes open initially — not a blink yet.
    expect(c.observe({ now: 0, blinkLeft: 0.1, blinkRight: 0.1 }).state).toBe('waiting');
    // Eyes close.
    expect(c.observe({ now: 100, blinkLeft: 0.8, blinkRight: 0.9 }).state).toBe('waiting');
    // Eyes reopen -> blink complete.
    expect(c.observe({ now: 200, blinkLeft: 0.1, blinkRight: 0.05 }).state).toBe('passed');
  });

  it('does NOT pass on eyes-open-only frames (a photo of open eyes)', () => {
    const c = new LivenessChallenge('blink', cfg, 0);
    for (let t = 0; t < 900; t += 100) {
      expect(c.observe({ now: t, blinkLeft: 0.05, blinkRight: 0.05 }).state).toBe('waiting');
    }
  });

  it('does NOT pass on a half-closed still frame (one eye only)', () => {
    const c = new LivenessChallenge('blink', cfg, 0);
    c.observe({ now: 0, blinkLeft: 0.8, blinkRight: 0.1 }); // only left "closed"
    const r = c.observe({ now: 100, blinkLeft: 0.1, blinkRight: 0.1 });
    expect(r.state).toBe('waiting'); // never registered a both-eyes-closed phase
  });

  it('fails when the timeout elapses with no blink', () => {
    const c = new LivenessChallenge('blink', cfg, 0);
    c.observe({ now: 500, blinkLeft: 0.05, blinkRight: 0.05 });
    const r = c.observe({ now: 1000, blinkLeft: 0.05, blinkRight: 0.05 });
    expect(r.state).toBe('failed');
    expect(r.remainingMs).toBe(0);
  });
});

describe('head-turn challenge', () => {
  it('turn_left passes on a negative yaw beyond threshold', () => {
    const c = new LivenessChallenge('turn_left', cfg, 0);
    expect(c.observe({ now: 0, yawRatio: -0.05 }).state).toBe('waiting');
    expect(c.observe({ now: 100, yawRatio: -0.3 }).state).toBe('passed');
  });

  it('turn_right requires the correct side — a left turn does not satisfy it', () => {
    const c = new LivenessChallenge('turn_right', cfg, 0);
    expect(c.observe({ now: 0, yawRatio: -0.5 }).state).toBe('waiting'); // wrong way
    expect(c.observe({ now: 100, yawRatio: 0.3 }).state).toBe('passed'); // correct way
  });

  it('fails a head-turn challenge on timeout if the face never turns', () => {
    const c = new LivenessChallenge('turn_left', cfg, 0);
    c.observe({ now: 0, yawRatio: 0 });
    expect(c.observe({ now: 1000, yawRatio: 0 }).state).toBe('failed');
  });
});

describe('challenge lifecycle', () => {
  it('is terminal — once passed, later frames do not flip it back', () => {
    const c = new LivenessChallenge('turn_right', cfg, 0);
    c.observe({ now: 0, yawRatio: 0.3 }); // passed
    const later = c.observe({ now: 5000, yawRatio: 0 }); // well past timeout
    expect(later.state).toBe('passed');
  });

  it('exposes a human-readable prompt per type', () => {
    expect(new LivenessChallenge('blink', cfg).prompt).toMatch(/blink/i);
    expect(new LivenessChallenge('turn_left', cfg).prompt).toMatch(/left/i);
    expect(new LivenessChallenge('turn_right', cfg).prompt).toMatch(/right/i);
  });

  it('auto-initializes its start time from the first observation', () => {
    const c = new LivenessChallenge('blink', cfg); // no startNow
    // First obs at now=500 sets the clock; timeout is relative to it.
    c.observe({ now: 500, blinkLeft: 0, blinkRight: 0 });
    expect(c.observe({ now: 500 + cfg.timeoutMs, blinkLeft: 0, blinkRight: 0 }).state).toBe(
      'failed'
    );
  });
});
