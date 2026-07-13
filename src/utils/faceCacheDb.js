/**
 * IndexedDB-backed gallery cache for the check-in kiosk (plan Section 3.3).
 *
 * The kiosk matches locally against a synced copy of every enrolled member's
 * embeddings. This module owns that cache: a pure delta-merge core (unit
 * tested, no IndexedDB) plus a thin IndexedDB persistence wrapper.
 *
 * Sync protocol: POST /api/biometric/face/sync { since } returns
 *   { members: [{ memberId, name, photoUrl, isActive, modelVersion,
 *     updatedAt, samples: number[][] }], deletedMemberIds, syncedAt }
 * Delta is driven by `since`; deletedMemberIds propagates removals/tombstones.
 */

// ---- Pure merge core (no IndexedDB) ----------------------------------------

/**
 * Apply a sync delta to the in-memory gallery map (memberId -> record).
 * Upserts returned members, deletes tombstoned ones. Returns a NEW map (does
 * not mutate the input) so React state updates stay clean.
 */
export function applySyncDelta(currentMap, delta) {
  const next = new Map(currentMap);
  for (const member of delta.members || []) {
    next.set(member.memberId, member);
  }
  for (const id of delta.deletedMemberIds || []) {
    next.delete(id);
  }
  return next;
}

/**
 * Compute the next `since` cursor. We advance only to the max updatedAt we
 * actually received — never to the server's syncedAt — so a record written
 * between the server's query snapshot and its response timestamp can't be
 * skipped on the next delta. If the delta carried no members, the cursor is
 * unchanged.
 */
export function computeCursor(prevCursor, delta) {
  let cursor = prevCursor || '';
  for (const member of delta.members || []) {
    if (member.updatedAt && member.updatedAt > cursor) cursor = member.updatedAt;
  }
  return cursor;
}

/** Convert the gallery map to the array shape faceMatching.rankGallery expects. */
export function toGalleryArray(map) {
  return Array.from(map.values());
}

// ---- IndexedDB persistence -------------------------------------------------

const DB_NAME = 'gmgmt_face_cache';
const DB_VERSION = 1;
const STORE = 'gallery';
const META_STORE = 'meta';
const CURSOR_KEY = 'sync_cursor';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'memberId' });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, storeNames, mode, fn) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeNames, mode);
    const result = fn(transaction);
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

/** Load the full gallery map + last cursor from IndexedDB. */
export async function loadCache() {
  const db = await openDb();
  try {
    const members = await new Promise((resolve, reject) => {
      const out = [];
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).openCursor();
      req.onsuccess = () => {
        const cur = req.result;
        if (cur) {
          out.push(cur.value);
          cur.continue();
        } else {
          resolve(out);
        }
      };
      req.onerror = () => reject(req.error);
    });
    const cursor = await new Promise((resolve, reject) => {
      const req = db.transaction(META_STORE, 'readonly').objectStore(META_STORE).get(CURSOR_KEY);
      req.onsuccess = () => resolve(req.result || '');
      req.onerror = () => reject(req.error);
    });
    const map = new Map(members.map((m) => [m.memberId, m]));
    return { map, cursor };
  } finally {
    db.close();
  }
}

/** Persist a sync delta: upsert members, delete tombstones, advance cursor. */
export async function persistDelta(delta, cursor) {
  const db = await openDb();
  try {
    await tx(db, [STORE, META_STORE], 'readwrite', (transaction) => {
      const store = transaction.objectStore(STORE);
      for (const member of delta.members || []) store.put(member);
      for (const id of delta.deletedMemberIds || []) store.delete(id);
      transaction.objectStore(META_STORE).put(cursor, CURSOR_KEY);
    });
  } finally {
    db.close();
  }
}

/** Wipe the cache (e.g. on model-version change — old embeddings are invalid). */
export async function clearCache() {
  const db = await openDb();
  try {
    await tx(db, [STORE, META_STORE], 'readwrite', (transaction) => {
      transaction.objectStore(STORE).clear();
      transaction.objectStore(META_STORE).clear();
    });
  } finally {
    db.close();
  }
}
