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

/** All hymn summaries: numbers, titles, tunes and metres. */
export function getSummaries(): HymnSummary[] {
  return SUMMARIES;
}

export function getSummary(id: string): HymnSummary | undefined {
  return SUMMARIES.find((s) => s.id === id);
}

export function getHymnCount(): number {
  return SUMMARIES.length;
}

/** Adjacent hymns for the reader's previous/next controls. */
export function getNeighbours(id: string): { previous?: HymnSummary; next?: HymnSummary } {
  const index = SUMMARIES.findIndex((s) => s.id === id);
  if (index === -1) return {};
  return {
    previous: index > 0 ? SUMMARIES[index - 1] : undefined,
    next: index < SUMMARIES.length - 1 ? SUMMARIES[index + 1] : undefined,
  };
}

let corpus: Hymn[] | null = null;

/**
 * The full corpus, flattened from its chunks. Built once and cached, since
 * search needs every line and the reader needs its own record.
 */
export function getCorpus(): Hymn[] {
  if (corpus) return corpus;

  const all: Hymn[] = [];
  for (let i = 0; i < HYMN_CHUNK_COUNT; i += 1) {
    const chunk = HYMN_CHUNKS[i];
    if (chunk) all.push(...chunk);
  }

  corpus = all;
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
      byId.set(id, found);
      return found;
    }
  }
  return undefined;
}

/**
 * Drops cached corpus state. Only needed by tooling that swaps content at
 * runtime; the bundled corpus is fixed for the life of the process.
 */
export function resetCorpusCache(): void {
  corpus = null;
  byId.clear();
  invalidateSearchCache();
}
