/**
 * Check-in station identity + backend calls (plan Sections 3.3, 3.4, 6.2).
 *
 * A station is one unattended browser tab at `/checkin`. It has no staff
 * session, so it authenticates to the guarded face endpoints (`/face/sync`,
 * `/face/check-in`) with the shared device secret, sent as `X-Device-Secret`.
 * That secret plus a human-readable station label are configured once on first
 * run and kept in localStorage — this is one machine per install per the
 * confirmed localhost deployment, so per-browser config is the right scope.
 *
 * The door itself (`face_door_device_id`) is server-side config, surfaced to
 * the station only as `config.doorDeviceConfigured` so a setup mistake ("no
 * door configured for this entrance") is diagnosable rather than a silent
 * no-unlock (plan 3.4 / 6.2).
 */

const STORAGE_KEY = 'gmgmt_face_station';

const API = {
  config: '/api/biometric/face/config',
  sync: '/api/biometric/face/sync',
  checkIn: '/api/biometric/face/check-in',
};

// ---- Station config (localStorage) -----------------------------------------

/** Load { deviceSecret, stationLabel }; empty strings when unset. */
export function loadStationConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { deviceSecret: '', stationLabel: '' };
    const parsed = JSON.parse(raw);
    return {
      deviceSecret: typeof parsed.deviceSecret === 'string' ? parsed.deviceSecret : '',
      stationLabel: typeof parsed.stationLabel === 'string' ? parsed.stationLabel : '',
    };
  } catch (_) {
    return { deviceSecret: '', stationLabel: '' };
  }
}

export function saveStationConfig({ deviceSecret, stationLabel }) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      deviceSecret: (deviceSecret || '').trim(),
      stationLabel: (stationLabel || '').trim(),
    })
  );
}

export function clearStationConfig() {
  localStorage.removeItem(STORAGE_KEY);
}

/** A station is provisioned once it holds a non-empty device secret. */
export function hasStationSecret(config) {
  return !!(config && config.deviceSecret && config.deviceSecret.trim());
}

// ---- Pure status derivation (unit tested) ----------------------------------

/**
 * Decide which fail-closed screen the kiosk should show, from the bootstrap
 * signals (plan 6.2). Order matters: a station that isn't provisioned can't
 * even reach the server as a device, so that's checked before server-reported
 * states. Everything resolves to a concrete, diagnosable screen — never to
 * "scan anyway".
 *
 * @returns 'error' | 'setup' | 'disabled' | 'no_door' | 'ready'
 */
export function deriveStationStatus({ hasSecret, config, configError }) {
  if (!hasSecret) return 'setup';
  if (configError || !config) return 'error';
  if (!config.enabled) return 'disabled';
  if (!config.doorDeviceConfigured) return 'no_door';
  return 'ready';
}

// ---- Backend calls ---------------------------------------------------------

function secretHeaders(deviceSecret) {
  return deviceSecret ? { 'X-Device-Secret': deviceSecret } : {};
}

async function readJson(res) {
  try {
    return await res.json();
  } catch (_) {
    return null;
  }
}

/**
 * Fetch station bootstrap config. Sends the device secret so it resolves the
 * kiosk path even on a hardened deployment (the endpoint accepts either the
 * device secret or a staff session — plan/app.js FACE_BOOTSTRAP_PATHS).
 * Throws on non-2xx so the caller can fail closed.
 */
export async function fetchFaceConfig(deviceSecret) {
  const res = await fetch(API.config, {
    headers: secretHeaders(deviceSecret),
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`face config request failed (HTTP ${res.status})`);
  }
  const body = await readJson(res);
  return body?.data || null;
}

/**
 * Pull a gallery delta. `since` is the last cursor (ISO string) or null for a
 * full sync. Returns the raw { members, deletedMemberIds, syncedAt } payload.
 */
export async function syncGallery(deviceSecret, since) {
  const res = await fetch(API.sync, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...secretHeaders(deviceSecret) },
    credentials: 'include',
    body: JSON.stringify(since ? { since } : {}),
  });
  const body = await readJson(res);
  if (!res.ok) {
    const err = new Error(body?.message || `sync failed (HTTP ${res.status})`);
    err.status = res.status;
    throw err;
  }
  return body?.data || { members: [], deletedMemberIds: [], syncedAt: null };
}

/**
 * Submit a local match claim for server re-validation (plan 3.5). The server
 * re-scores the match itself from `embedding` (the probe that triggered the
 * accept) against its stored gallery — the local `matchScore` is advisory
 * only, and without a valid probe the server denies (check-in trust model).
 * It decides authorization and, only on success, sends the door-unlock command;
 * the client never unlocks anything itself. Returns
 * { authorized, action, reason, memberId, memberName, doorCommandSent }.
 * Network/5xx failures throw so the kiosk shows "system offline" and stays
 * locked rather than guessing.
 */
export async function submitCheckIn(
  deviceSecret,
  { memberId, matchScore, livenessPassed, deviceId, embedding }
) {
  const res = await fetch(API.checkIn, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...secretHeaders(deviceSecret) },
    credentials: 'include',
    body: JSON.stringify({ memberId, matchScore, livenessPassed, deviceId, embedding }),
  });
  const body = await readJson(res);
  if (!res.ok && res.status >= 500) {
    const err = new Error(body?.reason || `check-in failed (HTTP ${res.status})`);
    err.status = res.status;
    throw err;
  }
  // 4xx (403 disabled, 400 bad claim) carry a structured denial we surface as-is.
  return body || { authorized: false, reason: 'internal_error' };
}
