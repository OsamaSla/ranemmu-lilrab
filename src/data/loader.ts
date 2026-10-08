/**
 * Access to the bundled hymn corpus.
 *
 * Everything is bundled, so lookups are synchronous — there is no I/O to await
 * and the search screen can run a query on its first keystroke. The cost is
 * bundle size, which `npm run build:corpus` keeps in check by chunking.
 */
import { HYMN_CHUNKS, HYMN_CHUNK_COUNT } from './generated-chunks';
import type { Hymn, HymnSummary } from './types';
import { invalidateSearchCache } from './search';

const SUMMARIES = require('../../assets/hymns/index.json') as HymnSummary[];

/**
 * Admin override patches by stable hymn id, supplied by the overrides store.
 * The loader never imports the store itself (that would be a module cycle);
 * the store registers its reader once at startup.
 */
let overlayReader: () => Record<string, Partial<Hymn>> = () => ({});

export function setOverlayReader(reader: () => Record<string, Partial<Hymn>>): void {
  overlayReader = reader;
}

/** Drops every memoised view so the next read re-merges the overrides. */
export function refreshOverlaidCorpus(): void {
  corpus = null;
  byId.clear();
  invalidateSearchCache();
}

/** All hymn summaries: numbers, titles and metres, overrides applied. */
export function getSummaries(): HymnSummary[] {
  const overlays = overlayReader();
  return SUMMARIES.map((s) => {
    const patch = overlays[s.id];
    if (!patch) return s;
    return {
      ...s,
      number: patch.number ?? s.number,
      title: patch.title ?? s.title,
      meter: patch.meter ?? s.meter,
      hasChorus:
        patch.verses !== undefined ? patch.verses.some((v) => v.chorus) : (s.hasChorus ?? false),
    };
  }).sort((a, b) => a.number - b.number);
}

export function getHymnCount(): number {
  return SUMMARIES.length;
}

/** Adjacent hymns for the reader's previous/next controls. */
export function getNeighbours(id: string): { previous?: HymnSummary; next?: HymnSummary } {
  const summaries = getSummaries();
  const index = summaries.findIndex((s) => s.id === id);
  if (index === -1) return {};
  return {
    previous: index > 0 ? summaries[index - 1] : undefined,
    next: index < summaries.length - 1 ? summaries[index + 1] : undefined,
  };
}

let corpus: Hymn[] | null = null;

/**
 * The full corpus, flattened from its chunks. Built once and cached, since
 * search needs every line and the reader needs its own record.
 */
export function getCorpus(): Hymn[] {
  if (corpus) return corpus;

  const overlays = overlayReader();
  const all: Hymn[] = [];
  for (let i = 0; i < HYMN_CHUNK_COUNT; i += 1) {
    const chunk = HYMN_CHUNKS[i];
    if (chunk) all.push(...chunk);
  }

  corpus = all.map((hymn) => {
    const patch = overlays[hymn.id];
    return patch ? { ...hymn, ...patch } : hymn;
  });
  return corpus;
}

const byId = new Map<string, Hymn>();

/** A single hymn record, or undefined when the id is not in the corpus. */
export function getHymn(id: string): Hymn | undefined {
  const cached = byId.get(id);
  if (cached) return cached;

  for (const chunk of Object.values(HYMN_CHUNKS)) {
    const found = chunk.find((hymn) => hymn.id === id);
    if (found) {
      const patch = overlayReader()[id];
      const merged = patch ? { ...found, ...patch } : found;
      byId.set(id, merged);
      return merged;
    }
  }
  return undefined;
}
