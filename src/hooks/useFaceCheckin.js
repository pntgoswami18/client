/**
 * useFaceCheckin — orchestrates the unattended walk-up check-in loop
 * (plan Section 3.2). It is the glue around three already-unit-tested pure
 * modules; it deliberately holds no matching/liveness math of its own:
 *   - faceMatching.MatchAccumulator — K-consecutive-frame identity lock
 *   - faceLiveness.LivenessChallenge — blink / head-turn anti-spoof
 *   - faceCacheDb / faceStation      — gallery cache + device-secret backend
 *
 * The pipeline per accepted member: detect → embed → accumulate (K frames) →
 * liveness challenge → server re-validation → door unlock (server-side only).
 * Every failure resolves to the door staying locked (plan 6.2). The client
 * never opens a door on its own — it only ever submits a claim and renders the
 * server's verdict.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import faceEngine from '../utils/faceEngine';
import { MatchAccumulator, DEFAULT_MATCH_CONFIG } from '../utils/faceMatching';
import { LivenessChallenge, pickChallenge } from '../utils/faceLiveness';
import { applySyncDelta, computeCursor, toGalleryArray } from '../utils/faceCacheDb';
import * as cacheDb from '../utils/faceCacheDb';
import {
  loadStationConfig,
  hasStationSecret,
  deriveStationStatus,
  fetchFaceConfig,
  syncGallery,
  submitCheckIn,
  clearStationConfig,
} from '../utils/faceStation';

const WELCOME_COOLDOWN_MS = 5000; // linger on the welcome/checkout screen
const DENY_COOLDOWN_MS = 2200; // brief "not recognized" before resuming
const SYNC_INTERVAL_MS = 60000; // periodic gallery delta sync

const REASON_HINTS = {
  no_face: 'Step in front of the camera to check in',
  multiple_faces: 'Only one person at a time, please',
  too_small: 'Step a little closer',
  off_center: 'Center your face in the frame',
};

// Keyed on the exact reason strings the backend returns (checkInService +
// faceBiometricController) so a denial never falls through to the generic
// internal_error message. Keep this in sync with those two files.
const DENY_MESSAGES = {
  // Liveness (server reason + client-side timeout)
  liveness_not_passed: "Couldn't confirm liveness — please try again",
  liveness_failed: "Couldn't confirm liveness — please try again",
  // Recognition / identity
  below_match_threshold: 'Not recognized — please try again or see the front desk',
  not_recognized: 'Not recognized — please try again or see the front desk',
  not_enrolled: 'Not enrolled for face check-in — see the front desk',
  model_version_mismatch: 'Please re-enroll your face at the front desk',
  invalid_member_id: 'Not recognized — please see the front desk',
  member_not_found: 'Not recognized — please see the front desk',
  // Membership / payment
  member_inactive: 'Your membership is inactive — please see the front desk',
  payment_overdue_grace_expired: 'Your membership payment is overdue — please see the front desk',
  // Session rules
  outside_session_windows: 'Outside your allowed check-in hours — see the front desk',
  cross_session_violation: 'You already checked in this session — see the front desk',
  already_completed: "You've already completed today's session",
  // Attendance-record edge cases
  invalid_attendance_record: 'Your attendance record needs attention — please see the front desk',
  dwell_time_not_met: "You're already checked in",
  // System
  face_checkin_disabled: 'Face check-in is currently disabled',
  offline: 'System offline — please see the front desk',
  internal_error: 'Something went wrong — please try again',
};

export default function useFaceCheckin() {
  // Render-driving state (coarse; the loop runs off refs to avoid stale closures).
  const [phase, setPhase] = useState('loading');
  const [hint, setHint] = useState('');
  const [prompt, setPrompt] = useState('');
  const [remainingMs, setRemainingMs] = useState(0);
  const [welcome, setWelcome] = useState(null); // { memberName, action }
  const [denyReason, setDenyReason] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [debug, setDebug] = useState({ backend: null, galleryCount: 0, modelVersion: '' });

  const videoRef = useRef(null);

  // Loop-internal refs.
  const streamRef = useRef(null);
  const loopRef = useRef(null);
  const wsRef = useRef(null);
  const syncTimerRef = useRef(null);
  const cooldownRef = useRef(null);
  const mountedRef = useRef(true);

  const phaseRef = useRef('loading');
  const configRef = useRef(null); // server face config
  const secretRef = useRef('');
  const stationLabelRef = useRef('');
  const matchCfgRef = useRef(DEFAULT_MATCH_CONFIG);

  const mapRef = useRef(new Map()); // memberId -> gallery record
  const galleryRef = useRef([]); // array form for rankGallery
  const cursorRef = useRef('');

  const accumulatorRef = useRef(null);
  const challengeRef = useRef(null);
  const pendingRef = useRef(null); // { memberId, name, score }
  const busyRef = useRef(false); // embed/verify in flight
  const cooldownUntilRef = useRef(0);

  const setPhaseBoth = useCallback((p) => {
    phaseRef.current = p;
    if (mountedRef.current) setPhase(p);
  }, []);

  // ---- gallery sync -------------------------------------------------------

  const refreshGallery = useCallback(async (full = false) => {
    const since = full ? null : cursorRef.current || null;
    const delta = await syncGallery(secretRef.current, since);
    mapRef.current = applySyncDelta(mapRef.current, delta);
    cursorRef.current = computeCursor(cursorRef.current, delta);
    galleryRef.current = toGalleryArray(mapRef.current);
    await cacheDb.persistDelta(delta, cursorRef.current).catch(() => {});
    if (mountedRef.current) {
      setDebug((d) => ({ ...d, galleryCount: galleryRef.current.length }));
    }
  }, []);

  // ---- cooldown / phase transitions ---------------------------------------

  const resumeIdle = useCallback(() => {
    pendingRef.current = null;
    challengeRef.current = null;
    accumulatorRef.current = new MatchAccumulator(matchCfgRef.current);
    setWelcome(null);
    setDenyReason('');
    setPrompt('');
    setPhaseBoth('idle');
  }, [setPhaseBoth]);

  const startCooldown = useCallback(
    (ms) => {
      cooldownUntilRef.current = performance.now() + ms;
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
      cooldownRef.current = setTimeout(() => {
        if (mountedRef.current) resumeIdle();
      }, ms);
    },
    [resumeIdle]
  );

  const deny = useCallback(
    (reason) => {
      setDenyReason(reason);
      setPhaseBoth('denied');
      startCooldown(DENY_COOLDOWN_MS);
    },
    [setPhaseBoth, startCooldown]
  );

  // ---- server re-validation ----------------------------------------------

  const verify = useCallback(
    async (member, livenessPassed) => {
      busyRef.current = true;
      setPhaseBoth('verifying');
      try {
        const resp = await submitCheckIn(secretRef.current, {
          memberId: member.memberId,
          matchScore: member.score,
          livenessPassed,
          deviceId: stationLabelRef.current || undefined,
        });
        if (!mountedRef.current) return;
        if (resp.authorized) {
          setWelcome({
            memberName: resp.memberName || member.name,
            action: resp.action,
            minutesUntilCheckout: resp.minutesUntilCheckout,
          });
          setPhaseBoth('welcome');
          startCooldown(WELCOME_COOLDOWN_MS);
        } else {
          deny(resp.reason || 'not_recognized');
        }
      } catch (err) {
        // Network / 5xx: fail closed with an "offline" message, then resume.
        if (mountedRef.current) deny('offline');
      } finally {
        busyRef.current = false;
      }
    },
    [deny, setPhaseBoth, startCooldown]
  );

  const beginLivenessOrVerify = useCallback(
    (member) => {
      pendingRef.current = member;
      const mode = configRef.current?.livenessMode || 'challenge';
      if (mode === 'none') {
        verify(member, true);
        return;
      }
      challengeRef.current = new LivenessChallenge(pickChallenge());
      setPrompt(challengeRef.current.prompt);
      setPhaseBoth('liveness');
    },
    [setPhaseBoth, verify]
  );

  // ---- per-frame loop -----------------------------------------------------

  const tick = useCallback(() => {
    const schedule = () => {
      loopRef.current = requestAnimationFrame(tick);
    };
    const video = videoRef.current;
    const p = phaseRef.current;

    // Only 'idle' and 'liveness' actively process frames; other phases (welcome,
    // denied, verifying) just hold until their cooldown flips back to idle.
    if ((p !== 'idle' && p !== 'liveness') || !video || video.readyState < 2) {
      schedule();
      return;
    }

    const det = faceEngine.detect(video, performance.now());

    if (p === 'liveness') {
      const challenge = challengeRef.current;
      if (challenge && det.faceCount === 1 && det.blink) {
        const r = challenge.observe({
          now: performance.now(),
          blinkLeft: det.blink.left,
          blinkRight: det.blink.right,
          yawRatio: det.pose?.ratio ?? 0,
        });
        setRemainingMs(r.remainingMs);
        if (r.state === 'passed') {
          verify(pendingRef.current, true);
        } else if (r.state === 'failed') {
          deny('liveness_failed');
        }
      } else if (challenge) {
        // Face lost mid-challenge: still let the timeout run so a walk-away
        // resolves to failure rather than hanging.
        const r = challenge.observe({ now: performance.now() });
        setRemainingMs(r.remainingMs);
        if (r.state === 'failed') deny('liveness_failed');
      }
      schedule();
      return;
    }

    // idle / scanning
    if (!det.ok) {
      accumulatorRef.current.reset();
      setHint(REASON_HINTS[det.reasons?.[0]] || 'Step in front of the camera to check in');
      schedule();
      return;
    }
    setHint('Hold still…');

    if (busyRef.current) {
      schedule();
      return;
    }
    busyRef.current = true;
    const { imageData } = faceEngine.alignCrop(video, det.fivePoints);
    faceEngine
      .embed(imageData)
      .then((probe) => {
        if (!mountedRef.current || phaseRef.current !== 'idle') return;
        const obs = accumulatorRef.current.observe(probe, galleryRef.current);
        if (obs.state === 'accepted') {
          beginLivenessOrVerify({ memberId: obs.memberId, name: obs.name, score: obs.score });
        }
      })
      .catch(() => {
        accumulatorRef.current.reset();
      })
      .finally(() => {
        busyRef.current = false;
      });
    schedule();
  }, [beginLivenessOrVerify, deny, verify]);

  // ---- bootstrap ----------------------------------------------------------

  const start = useCallback(async () => {
    setErrorMessage('');
    setPhaseBoth('loading');

    const stationConfig = loadStationConfig();
    secretRef.current = stationConfig.deviceSecret;
    stationLabelRef.current = stationConfig.stationLabel;

    // Bootstrap: fetch server config first so "disabled"/"no door"/"not set up"
    // are distinguishable before we ever touch the camera (plan 6.2).
    let config = null;
    let configError = false;
    if (hasStationSecret(stationConfig)) {
      try {
        config = await fetchFaceConfig(stationConfig.deviceSecret);
      } catch (_) {
        configError = true;
      }
    }
    configRef.current = config;

    const status = deriveStationStatus({
      hasSecret: hasStationSecret(stationConfig),
      config,
      configError,
    });
    if (status !== 'ready') {
      if (status === 'error') {
        setErrorMessage('Could not reach the server. Check the station secret and try again.');
      }
      setPhaseBoth(status);
      return;
    }

    // Threshold comes from the server; margin/K are client policy (plan 3.2).
    matchCfgRef.current = {
      ...DEFAULT_MATCH_CONFIG,
      threshold: Number.isFinite(config.matchThreshold)
        ? config.matchThreshold
        : DEFAULT_MATCH_CONFIG.threshold,
    };
    accumulatorRef.current = new MatchAccumulator(matchCfgRef.current);

    // Load models + gallery.
    try {
      await faceEngine.init();
    } catch (err) {
      setErrorMessage(err.message || 'Face model failed to load');
      setPhaseBoth('error');
      return;
    }
    setDebug((d) => ({
      ...d,
      backend: faceEngine.backend,
      modelVersion: faceEngine.modelVersion,
    }));

    // Cross-version guard: the deployed model must match the pinned version the
    // gallery embeddings were made with, or cosine scores are meaningless.
    if (
      config.modelVersion &&
      faceEngine.modelVersion &&
      config.modelVersion !== faceEngine.modelVersion
    ) {
      await cacheDb.clearCache().catch(() => {});
      setErrorMessage(
        `Model version mismatch (deployed ${faceEngine.modelVersion}, expected ${config.modelVersion}). Re-run the model deploy.`
      );
      setPhaseBoth('error');
      return;
    }

    try {
      const cached = await cacheDb.loadCache();
      mapRef.current = cached.map;
      cursorRef.current = cached.cursor;
      galleryRef.current = toGalleryArray(cached.map);
      await refreshGallery(false);
    } catch (err) {
      // A sync failure at boot is fatal-for-now: an empty gallery matches nobody
      // anyway, so fail closed with a clear message.
      setErrorMessage('Could not sync the member gallery. Check the connection and retry.');
      setPhaseBoth('error');
      return;
    }

    // Camera.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      });
      if (!videoRef.current || !mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    } catch (err) {
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Camera access denied — allow camera use for this site.'
          : `Camera unavailable: ${err.message}`
      );
      setPhaseBoth('error');
      return;
    }

    // Live updates + periodic delta sync.
    connectWebSocket();
    syncTimerRef.current = setInterval(() => {
      refreshGallery(false).catch(() => {});
    }, SYNC_INTERVAL_MS);

    resumeIdle();
    loopRef.current = requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshGallery, resumeIdle, setPhaseBoth, tick]);

  const connectWebSocket = useCallback(() => {
    try {
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const ws = new WebSocket(`${proto}://${window.location.host}/ws`);
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === 'face_cache_invalidated') {
            refreshGallery(false).catch(() => {});
          }
        } catch (_) {
          /* ignore non-JSON frames */
        }
      };
      wsRef.current = ws;
    } catch (_) {
      /* WS is a latency optimization; periodic sync still covers correctness. */
    }
  }, [refreshGallery]);

  // ---- lifecycle ----------------------------------------------------------

  const teardown = useCallback(() => {
    if (loopRef.current) cancelAnimationFrame(loopRef.current);
    if (cooldownRef.current) clearTimeout(cooldownRef.current);
    if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (_) {
        /* noop */
      }
      wsRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    start();
    return () => {
      mountedRef.current = false;
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-run bootstrap after the station-setup form saves a secret.
  const retry = useCallback(() => {
    teardown();
    start();
  }, [start, teardown]);

  // Escape hatch from a stuck 'error' state: a config-fetch failure is often a
  // wrong/expired device secret, and the secret is the one thing 'retry' can't
  // fix since it re-reads the same bad value from localStorage. This clears it
  // and re-bootstraps, which lands back on the 'setup' screen to re-enter it.
  const resetStation = useCallback(() => {
    teardown();
    clearStationConfig();
    start();
  }, [start, teardown]);

  return {
    phase,
    hint,
    prompt,
    remainingMs,
    welcome,
    denyReason,
    denyMessage: DENY_MESSAGES[denyReason] || DENY_MESSAGES.internal_error,
    errorMessage,
    debug,
    videoRef,
    retry,
    resetStation,
  };
}

// Re-exported so the setup screen and tests can share the same denial vocabulary.
export { DENY_MESSAGES };
