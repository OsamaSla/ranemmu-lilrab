/**
 * Lazily loaded hymn-body chunks.
 *
 * Every hymn body used to be a static `require()` in `generated-chunks.ts`,
 * which put all ~5 MB of hymn text into the entry bundle on web. This module
 * owns the on-demand imports instead: the reader loads the one chunk that
 * holds its hymn, full-text search and the admin review queue load them all.
 *
 * Loaded chunks stay in memory for the life of the session. A single
 * invalidation listener (registered by the loader) drops the merged views and
 * the search index whenever a new chunk lands, so callers keep using the
 * synchronous `getHymn()` / `getCorpus()` reads they already know.
 */
import { HYMN_CHUNK_BY_ID, HYMN_CHUNK_COUNT, loadHymnChunk } from './generated-chunks';
import type { Hymn } from './types';

const loaded = new Map<number, Hymn[]>();
const pending = new Map<number, Promise<void>>();

let onLoaded: () => void = () => {};

/** Registers the cache invalidation hook (called once by ./loader). */
export function setChunkLoadedListener(listener: () => void): void {
  onLoaded = listener;
}

/** True when `id` belongs to a bundled chunk, whether or not it is loaded. */
export function isBundledId(id: string): boolean {
  return HYMN_CHUNK_BY_ID[id] !== undefined;
}

/** True while the chunk that holds `id` has not been imported yet. */
export function isHymnPending(id: string): boolean {
  const index = HYMN_CHUNK_BY_ID[id];
  return index !== undefined && !loaded.has(index);
}

/** One bundled record from an already-loaded chunk, without any overlays. */
export function bundledHymn(id: string): Hymn | undefined {
  const index = HYMN_CHUNK_BY_ID[id];
  if (index === undefined) return undefined;
  return loaded.get(index)?.find((hymn) => hymn.id === id);
}

/** Every loaded chunk in corpus order (chunk 0 first). */
export function loadedChunksInOrder(): Hymn[][] {
  const chunks: Hymn[][] = [];
  for (let index = 0; index < HYMN_CHUNK_COUNT; index += 1) {
    const chunk = loaded.get(index);
    if (chunk) chunks.push(chunk);
  }
  return chunks;
}

/** True when every chunk is in memory, i.e. full-text search can run. */
export function areAllChunksLoaded(): boolean {
  return loaded.size >= HYMN_CHUNK_COUNT;
}

/**
 * Imports one chunk exactly once. Concurrent callers share the same promise,
 * and failures are retryable (the rejected promise is not kept).
 */
export async function ensureChunk(index: number): Promise<void> {
  if (loaded.has(index)) return;

  let promise = pending.get(index);
  if (!promise) {
    promise = loadHymnChunk(index)
      .then((hymns) => {
        loaded.set(index, hymns);
        pending.delete(index);
        onLoaded();
      })
      .catch((error: unknown) => {
        pending.delete(index);
        throw error;
      });
    pending.set(index, promise);
  }

  await promise;
}

/** Loads the chunk holding `id`; no-op for remote-only or unknown ids. */
export async function ensureHymn(id: string): Promise<void> {
  const index = HYMN_CHUNK_BY_ID[id];
  if (index === undefined) return;
  await ensureChunk(index);
}

/** Loads every chunk — full-text search needs the whole corpus. */
export async function ensureAllChunks(): Promise<void> {
  const missing: number[] = [];
  for (let index = 0; index < HYMN_CHUNK_COUNT; index += 1) {
    if (!loaded.has(index)) missing.push(index);
  }
  await Promise.all(missing.map((index) => ensureChunk(index)));
}
