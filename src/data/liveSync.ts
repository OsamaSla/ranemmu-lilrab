/**
 * Firestore live sync: bundled corpus stays the offline foundation,
 * cloud edits overlay it the moment they land — no reload, no rebuild.
 *
 * Read economy (Firestore charges per read): the first launch after setup
 * fetches only documents edited after the bundled baseline, and later
 * launches only documents edited since the last sync (tracked in
 * AsyncStorage). A persistent onSnapshot listener on the same bounded
 * query then streams live edits. Initial quota cost is ~0 reads.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';

import { getFirebaseDb, HYMNS_COLLECTION, isFirebaseConfigured } from './firebase';
import { refreshOverlaidCorpus } from './loader';
import { publishHymn } from './publish';
import { useRemote } from '../store/remote';
import type { Hymn } from './types';

const LAST_SYNC_KEY = 'helemenarnam.lastSync';

/**
 * Build date of the bundled corpus now shipping in the app. The migration
 * stamps every document with exactly this value, so a fresh device fetches
 * only genuinely newer cloud edits. Rule: bump this whenever a rebuilt
 * bundle ships in a release (keep scripts/migrate-to-firestore.mjs STAMP
 * default in sync with it).
 */
export const BUNDLED_AT = '2026-10-15T00:00:00.000Z';

let started = false;

async function readLastSync(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(LAST_SYNC_KEY)) ?? BUNDLED_AT;
  } catch {
    return BUNDLED_AT;
  }
}

function writeLastSync(value: string): void {
  AsyncStorage.setItem(LAST_SYNC_KEY, value).catch(() => {});
}

/**
 * Attaches the live listener (idempotent). Returns the unsubscribe
 * function. No-op when Firebase is not configured.
 */
export function startLiveSync(): () => void {
  if (!isFirebaseConfigured || started) return () => {};
  const db = getFirebaseDb();
  if (!db) return () => {};
  started = true;

  let stop = () => {};
  void (async () => {
    try {
      const baseline = await readLastSync();
      const q = query(collection(db, HYMNS_COLLECTION), where('updatedAt', '>', baseline));
      const snap = await getDocs(q);
      if (!snap.empty) {
        useRemote.getState().applyDocs(
          snap.docs.map((d) => ({ id: d.id, data: d.data() as Record<string, unknown> })),
        );
        refreshOverlaidCorpus();
      }
      writeLastSync(new Date().toISOString());
      stop = onSnapshot(
        q,
        (live) => {
          if (live.empty) return;
          let newest = '';
          const docs = live.docs.map((d) => {
            const data = d.data() as Record<string, unknown>;
            if (typeof data.updatedAt === 'string' && data.updatedAt > newest) newest = data.updatedAt;
            return { id: d.id, data };
          });
          useRemote.getState().applyDocs(docs);
          refreshOverlaidCorpus();
          if (newest) writeLastSync(newest);
        },
        () => {
          // Offline or permission-denied: the bundled corpus keeps working.
        },
      );
    } catch {
      // Same: offline-first, never crash the app over cloud state.
    }
  })();

  return () => stop();
}

/**
 * Best-effort single-hymn upload (editor write-through). Resolves false
 * when offline, unconfigured, or signed out — callers treat local save as
 * the source of truth and surface cloud status separately.
 */
export async function syncHymnToCloud(id: string, patch: Partial<Hymn>): Promise<boolean> {
  try {
    return await publishHymn(id, patch);
  } catch {
    return false;
  }
}
