/**
 * Cloud publishing: admin edits go straight to Firestore.
 *
 * Each hymn id maps to one document in the `hymns` collection; writes use
 * merge semantics so an edit touches only its own fields. Every write is
 * stamped so devices fetch just what changed since their last sync.
 * Requires Firebase config + a signed-in admin — otherwise a clear
 * messageKey explains what is missing. No git, no CI involved.
 *
 * Two rules learned the hard way (see PROJECT_NOTES §7):
 * - an *empty string* in a patch means "the admin cleared this field", and it
 *   is written as `deleteField()` — never as `''`. A stale empty field in a
 *   plain merge write wiped a real YouTube link on 2026-10-27;
 * - every write is read back and compared before it is reported as published.
 *   "Saved to the cloud" must mean the cloud document really matches.
 */
import {
  arrayUnion,
  deleteDoc,
  deleteField,
  doc,
  getDocFromServer,
  setDoc,
  writeBatch,
} from 'firebase/firestore';

import type { TranslationKey } from '../i18n';
import {
  getFirebaseAuth,
  getFirebaseDb,
  DELETED_DOC,
  HYMNS_COLLECTION,
  isFirebaseConfigured,
} from './firebase';
import type { Hymn } from './types';

export interface PublishResult {
  ok: boolean;
  messageKey: TranslationKey;
  saved: number;
}

/** Firestore rejects undefined — strip it recursively before any write. */
function sanitize(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (Array.isArray(value)) return value.map((v) => sanitize(v));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const clean = sanitize(v);
      if (clean !== undefined) out[k] = clean;
    }
    return out;
  }
  return value;
}

/**
 * Turns a hymn patch into a Firestore write payload.
 *
 * `''` becomes `deleteField()` — an explicit clear reaches the cloud (without
 * it, clearing a wrong link could never be published) while no blank string is
 * ever stored, so no device can re-publish it over a real value by accident.
 * `undefined` keys are dropped; everything else is sanitized.
 */
function toWrite(patch: Partial<Hymn>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    out[key] = value === '' ? deleteField() : sanitize(value);
  }
  return out;
}

/**
 * True when a read-back of the document shows exactly what the patch asked
 * for. Cleared fields must be gone (absent or blank); every other field must
 * hold the value we sent.
 */
function matchesWrite(data: Record<string, unknown> | undefined, patch: Partial<Hymn>): boolean {
  if (!data) return false;
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    const stored = data[key];
    if (value === '') {
      if (stored !== undefined && stored !== null && stored !== '') return false;
      continue;
    }
    if (JSON.stringify(stored) !== JSON.stringify(value)) return false;
  }
  return true;
}

function requireDb() {
  const db = getFirebaseDb();
  const auth = getFirebaseAuth();
  if (!isFirebaseConfigured || !db) throw new Error('setup');
  if (!auth?.currentUser) throw new Error('auth');
  return db;
}

const messageFor = (code: string): TranslationKey => {
  if (code === 'setup') return 'admin.noCloud';
  if (code === 'auth') return 'admin.notSignedIn';
  return 'admin.publishFailed';
};

/** Single-hymn write-through used right after an editor save. */
export async function publishHymn(id: string, patch: Partial<Hymn>): Promise<boolean> {
  try {
    const write = toWrite(patch);
    if (Object.keys(write).length === 0) return true;
    const db = requireDb();
    const ref = doc(db, HYMNS_COLLECTION, id);
    await setDoc(ref, { ...write, updatedAt: new Date().toISOString() }, { merge: true });
    // Verify instead of trusting the promise: the caller shows this result to
    // the admin as "uploaded", and a silent mismatch is exactly the failure
    // mode that made edits look saved while the reader stayed stale.
    // `getDocFromServer` forces a network read — a cached echo of our own
    // local write would "verify" a change the server never accepted.
    const back = await getDocFromServer(ref);
    return matchesWrite(back.data() as Record<string, unknown> | undefined, patch);
  } catch {
    return false;
  }
}

/** Bulk upload of the whole local override set (the Publish button). */
export async function publishOverrides(
  overrides: Record<string, Partial<Hymn>>,
): Promise<PublishResult> {
  const entries = Object.entries(overrides).filter(([, patch]) => Object.keys(patch).length > 0);
  if (entries.length === 0) return { ok: true, messageKey: 'admin.noChanges', saved: 0 };
  let db;
  try {
    db = requireDb();
  } catch (e) {
    return { ok: false, messageKey: messageFor((e as Error).message), saved: 0 };
  }
  try {
    const stamp = new Date().toISOString();
    // Firestore caps batches at 500 writes — stay well under it.
    for (let i = 0; i < entries.length; i += 400) {
      const batch = writeBatch(db);
      const chunk = entries.slice(i, i + 400);
      for (const [id, patch] of chunk) {
        batch.set(
          doc(db, HYMNS_COLLECTION, id),
          { ...toWrite(patch), updatedAt: stamp },
          { merge: true },
        );
      }
      await batch.commit();
      // Read the chunk back from the server: published means "the cloud holds
      // this", not merely "the promise resolved" (and not a cached echo of our
      // own local mutation).
      for (const [id, patch] of chunk) {
        const back = await getDocFromServer(doc(db, HYMNS_COLLECTION, id));
        if (!matchesWrite(back.data() as Record<string, unknown> | undefined, patch)) {
          return { ok: false, messageKey: 'admin.publishMismatch', saved: 0 };
        }
      }
    }
    return { ok: true, messageKey: 'admin.published', saved: entries.length };
  } catch {
    return { ok: false, messageKey: 'admin.publishFailed', saved: 0 };
  }
}

/**
 * Deletes a hymn everywhere: removes its Firestore document (for hymns
 * added from another device) and union-appends its id to the shared
 * `meta/deleted` tombstone set (hides bundled hymns on all devices).
 * Local tombstoning happens in the overrides store alongside this call.
 */
export async function deleteHymnFromCloud(id: string): Promise<boolean> {
  try {
    const db = requireDb();
    await deleteDoc(doc(db, HYMNS_COLLECTION, id));
    await setDoc(
      doc(db, 'meta', DELETED_DOC),
      { ids: arrayUnion(id), updatedAt: new Date().toISOString() },
      { merge: true },
    );
    return true;
  } catch {
    return false;
  }
}
