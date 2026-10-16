/**
 * Remote hymn patches from Firestore (never persisted locally).
 *
 * The bundled corpus + local overrides stay the offline foundation.
 * This store holds cloud state only: field-level diffs for bundled hymns
 * (keeps memory tiny) and full records for hymns that exist only remotely.
 * The loader merges remote under local overrides, so an admin's own
 * unsynced edits always win on their own device.
 */
import { create } from 'zustand';

import type { Hymn, HymnSummary } from '../data/types';
import { HYMN_CHUNKS } from '../data/generated-chunks';

/** Text-level fields synced from Firestore. Identity fields stay local. */
const SYNCED_FIELDS = [
  'number',
  'title',
  'verses',
  'chorus',
  'meter',
  'author',
  'authorOriginal',
  'info',
  'title_en',
  'verses_en',
  'chorus_en',
  'title_de',
  'verses_de',
  'chorus_de',
  'translationStatus',
  'primaryTopic',
  'topics',
] as const;

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** Bundled record for diffing, or undefined for remote-only hymns. */
function bundledById(id: string): Hymn | undefined {
  for (const chunk of Object.values(HYMN_CHUNKS)) {
    const found = (chunk as Hymn[]).find((h) => h.id === id);
    if (found) return found;
  }
  return undefined;
}

/** A patch/new record complete enough to stand alone (number+title+verses). */
export function isFullDoc(data: Record<string, unknown>): boolean {
  return (
    Number.isInteger(data.number) &&
    typeof data.title === 'string' &&
    (data.title as string).trim().length > 0 &&
    Array.isArray(data.verses) &&
    (data.verses as unknown[]).length > 0
  );
}

interface RemoteState {
  patches: Record<string, Partial<Hymn>>;
  /** Bumped whenever the patch set changes so screens re-read the corpus. */
  updatedAt: number;
  /** Merges one Firestore snapshot batch (echo-safe: no-ops on no change). */
  applyDocs: (docs: { id: string; data: Record<string, unknown> }[]) => void;
}

export const useRemote = create<RemoteState>()((set) => ({
  patches: {},
  updatedAt: 0,

  applyDocs: (docs) =>
    set((state) => {
      let changed = false;
      const patches = { ...state.patches };
      for (const { id, data } of docs) {
        const base = bundledById(id);
        let next: Partial<Hymn> | null = null;
        if (base) {
          const diff: Partial<Hymn> = {};
          for (const field of SYNCED_FIELDS) {
            const remote = (data as Record<string, unknown>)[field];
            if (remote !== undefined && !same(remote, (base as unknown as Record<string, unknown>)[field])) {
              (diff as Record<string, unknown>)[field] = remote;
            }
          }
          next = Object.keys(diff).length > 0 ? diff : null;
        } else if (isFullDoc(data)) {
          const { updatedAt: _drop, ...rest } = data;
          next = { ...(rest as Partial<Hymn>), book: ((data.book as string) ?? 'main') as Hymn['book'] };
        }
        const prev = patches[id];
        if (next === null) {
          if (prev !== undefined) {
            delete patches[id];
            changed = true;
          }
        } else if (!same(prev, next)) {
          patches[id] = next;
          changed = true;
        }
      }
      if (!changed) return state;
      return { patches, updatedAt: state.updatedAt + 1 };
    }),
}));

/** Full remote-only hymns (present in Firestore, absent from the bundle). */
export function getRemoteFullDocs(): Hymn[] {
  const out: Hymn[] = [];
  const patches = useRemote.getState().patches;
  for (const [id, patch] of Object.entries(patches)) {
    if (bundledById(id) || !isFullDoc(patch as Record<string, unknown>)) continue;
    out.push({
      ...(patch as Hymn),
      id,
      book: patch.book ?? 'main',
      number: patch.number as number,
      title: patch.title as string,
      verses: (patch.verses as Hymn['verses']).map((v) => ({ ...v, chorus: v.chorus ?? false })),
    });
  }
  return out;
}

/** Summaries for remote-only hymns, shaped like the bundled index. */
export function getRemoteSummaries(): HymnSummary[] {
  return getRemoteFullDocs().map((h) => ({
    id: h.id,
    book: h.book,
    number: h.number,
    title: h.title,
    meter: h.meter,
    hasChorus: h.verses.some((v) => v.chorus),
    primaryTopic: h.primaryTopic,
    topics: h.topics,
  }));
}
