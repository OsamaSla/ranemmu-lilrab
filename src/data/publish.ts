/**
 * Cloud publishing: admin edits go straight to Firestore.
 *
 * Each hymn id maps to one document in the `hymns` collection; writes use
 * merge semantics so an edit touches only its own fields. Every write is
 * stamped so devices fetch just what changed since their last sync.
 * Requires Firebase config + a signed-in admin — otherwise a clear
 * messageKey explains what is missing. No git, no CI involved.
 */
import { arrayUnion, doc, deleteDoc, setDoc, writeBatch } from 'firebase/firestore';

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
 * Drops empty top-level values before a write.
 *
 * Writes use `{ merge: true }`, so an empty string does not mean "nothing to
 * say" — it overwrites whatever the cloud holds. A stale `mediaUrl: ''` left
 * over from an older save wiped a real YouTube link out of an already-published
 * hymn on 2026-10-27 (publishing that device's single override wrote
 * `mediaUrl: ""`). Blank values are therefore never sent: the settle path is
 * the cloud copy, and clearing a field is a separate, explicit action.
 */
function withoutBlanks(patch: Partial<Hymn>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === '' || value === null || value === undefined) continue;
    out[key] = value;
  }
  return out;
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
    const clean = withoutBlanks(patch);
    // Nothing but blanks: skip the write entirely rather than stamping a
    // document with an empty update.
    if (Object.keys(clean).length === 0) return true;
    const db = requireDb();
    await setDoc(
      doc(db, HYMNS_COLLECTION, id),
      { ...(sanitize(clean) as Record<string, unknown>), updatedAt: new Date().toISOString() },
      { merge: true },
    );
    return true;
  } catch {
    return false;
  }
}

/** Bulk upload of the whole local override set (the Publish button). */
export async function publishOverrides(
  overrides: Record<string, Partial<Hymn>>,
): Promise<PublishResult> {
  // Blank-only patches are not documents: they would only stamp `updatedAt`
  // (and, before the guard, overwrite real fields with empty strings).
  const entries = Object.entries(overrides)
    .map(([id, patch]) => [id, withoutBlanks(patch)] as const)
    .filter(([, clean]) => Object.keys(clean).length > 0);
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
      for (const [id, clean] of entries.slice(i, i + 400)) {
        batch.set(
          doc(db, HYMNS_COLLECTION, id),
          { ...(sanitize(clean) as Record<string, unknown>), updatedAt: stamp },
          { merge: true },
        );
      }
      await batch.commit();
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
