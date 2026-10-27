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
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from 'firebase/firestore';

import { DELETED_DOC, getFirebaseDb, HYMNS_COLLECTION, isFirebaseConfigured } from './firebase';
import { refreshOverlaidCorpus } from './loader';
import { publishHymn } from './publish';
import { useRemote } from '../store/remote';
import { useOverrides } from '../store/overrides';
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

/** ids array from a meta/deleted snapshot, or null when absent/invalid. */
function readDeletedIds(data: unknown): string[] | null {
  if (typeof data !== 'object' || data === null) return null;
  const ids = (data as Record<string, unknown>).ids;
  if (!Array.isArray(ids)) return null;
  return ids.filter((id): id is string => typeof id === 'string');
}

let started = false;

/**
 * How far back the query reaches before the stored marker. The marker used to
 * be stamped from the device clock, so a device whose clock ran ahead holds a
 * marker *after* edits that are still pending — those were never fetched. A
 * day of overlap costs a handful of reads per launch and lets such devices
 * recover on their own.
 */
const SYNC_GRACE_MS = 24 * 60 * 60 * 1000;

async function readLastSync(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(LAST_SYNC_KEY);
    if (!stored) return BUNDLED_AT;
    const at = Date.parse(stored);
    if (Number.isNaN(at)) return BUNDLED_AT;
    const from = new Date(at - SYNC_GRACE_MS).toISOString();
    return from > BUNDLED_AT ? from : BUNDLED_AT;
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
      let newest = '';
      if (!snap.empty) {
        const docs = snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          if (typeof data.updatedAt === 'string' && data.updatedAt > newest) {
            newest = data.updatedAt;
          }
          return { id: d.id, data };
        });
        useRemote.getState().applyDocs(docs);
        refreshOverlaidCorpus();
      }
      // Shared tombstones (admin deletions): one tiny document, fetched
      // once and then watched. Union-merged locally — deletions propagate
      // like edits and never resurrect.
      const metaRef = doc(db, 'meta', DELETED_DOC);
      try {
        const metaSnap = await getDoc(metaRef);
        const ids = metaSnap.exists() ? readDeletedIds(metaSnap.data()) : null;
        if (ids && ids.length > 0) {
          useOverrides.getState().mergeDeletedIds(ids);
          refreshOverlaidCorpus();
        }
      } catch {
        // Missing doc or offline — nothing deleted yet, carry on.
      }
      // Advance the watermark to the newest timestamp actually received — never
      // to the device clock. A clock running ahead would move the marker past
      // edits written just before this sync, and those never arrive (observed:
      // a saved YouTube URL stayed empty on the second device).
      if (newest) writeLastSync(newest);
      const stops: (() => void)[] = [];
      stops.push(
        onSnapshot(
          q,
          (live) => {
            if (live.empty) return;
            let newest = '';
            const docs = live.docs.map((d) => {
              const data = d.data() as Record<string, unknown>;
              if (typeof data.updatedAt === 'string' && data.updatedAt > newest)
                newest = data.updatedAt;
              return { id: d.id, data };
            });
            useRemote.getState().applyDocs(docs);
            refreshOverlaidCorpus();
            if (newest) writeLastSync(newest);
          },
          () => {
            // Offline or permission-denied: the bundled corpus keeps working.
          },
        ),
      );
      stops.push(
        onSnapshot(
          metaRef,
          (metaSnap) => {
            if (!metaSnap.exists()) return;
            const ids = readDeletedIds(metaSnap.data());
            if (ids && ids.length > 0) {
              useOverrides.getState().mergeDeletedIds(ids);
              refreshOverlaidCorpus();
            }
          },
          () => {},
        ),
      );
      stop = () => stops.forEach((fn) => fn());
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
