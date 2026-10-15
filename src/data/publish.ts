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
    const db = requireDb();
    await setDoc(
      doc(db, HYMNS_COLLECTION, id),
      { ...(sanitize(patch) as Record<string, unknown>), updatedAt: new Date().toISOString() },
      { merge: true },
    );
    return true;
  } catch {
    return false;
  }
}

/** Bulk upload of the whole local override set (the Publish button). */export async function publishOverrides(
  overrides: Record<string, Partial<Hymn>>,
): Promise<PublishResult> {
  const ids = Object.keys(overrides);
  if (ids.length === 0) return { ok: false, messageKey: 'admin.noChanges', saved: 0 };
  let db;
  try {
    db = requireDb();
  } catch (e) {
    return { ok: false, messageKey: messageFor((e as Error).message), saved: 0 };
  }
  try {
    const stamp = new Date().toISOString();
    // Firestore caps batches at 500 writes — stay well under it.
    for (let i = 0; i < ids.length; i += 400) {
      const batch = writeBatch(db);
      for (const id of ids.slice(i, i + 400)) {
        batch.set(
          doc(db, HYMNS_COLLECTION, id),
          { ...(sanitize(overrides[id]) as Record<string, unknown>), updatedAt: stamp },
          { merge: true },
        );
      }
      await batch.commit();
    }
    return { ok: true, messageKey: 'admin.published', saved: ids.length };
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
