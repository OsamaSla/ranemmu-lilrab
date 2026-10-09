/**
 * Access to the bundled hymn corpus.
 *
 * Everything is bundled, so lookups are synchronous — there is no I/O to await
 * and the search screen can run a query on its first keystroke. The cost is
 * bundle size, which `npm run build:corpus` keeps in check by chunking.
 */
import { HYMN_CHUNKS, HYMN_CHUNK_COUNT } from './generated-chunks';
import { BOOKS } from './types';
import type { BookId, Hymn, HymnSummary } from './types';
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

/** Books present in the bundled corpus, in display order, with hymn counts. */
export function getBooks(): { id: BookId; count: number }[] {
  const counts = new Map<BookId, number>();
  for (const s of SUMMARIES) {
    const b = s.book ?? 'main';
    counts.set(b, (counts.get(b) ?? 0) + 1);
  }
  return BOOKS.filter((b) => (counts.get(b.id) ?? 0) > 0).map((b) => ({
    id: b.id,
    count: counts.get(b.id) ?? 0,
  }));
}

/** All hymn summaries: numbers, titles and metres, overrides applied. */
export function getSummaries(book?: BookId): HymnSummary[] {
  const overlays = overlayReader();
  return SUMMARIES.filter((s) => !book || (s.book ?? 'main') === book).map((s) => {
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

/** Adjacent hymns within the same book for the reader's previous/next controls. */
export function getNeighbours(id: string): { previous?: HymnSummary; next?: HymnSummary } {
  const summaries = getSummaries();
  const current = summaries.find((s) => s.id === id);
  if (!current) return {};
  const book = current.book ?? 'main';
  const same = summaries.filter((s) => (s.book ?? 'main') === book);
  const index = same.findIndex((s) => s.id === id);
  if (index === -1) return {};
  return {
    previous: index > 0 ? same[index - 1] : undefined,
    next: index < same.length - 1 ? same[index + 1] : undefined,
  };
}

let corpus: Hymn[] | null = null;

/**
 * The full corpus, flattened from its chunks. Built once and cached, since
 * search needs every line and the reader needs its own record.
 */
export function getCorpus(book?: BookId): Hymn[] {
  if (corpus && !book) return corpus;

  const overlays = overlayReader();
  const all: Hymn[] = [];
  for (let i = 0; i < HYMN_CHUNK_COUNT; i += 1) {
    const chunk = HYMN_CHUNKS[i];
    if (chunk) all.push(...chunk);
  }

  const merged = all.map((hymn) => {
    const patch = overlays[hymn.id];
    return patch ? { ...hymn, ...patch } : hymn;
  });
  if (!book) {
    corpus = merged;
    return merged;
  }
  return merged.filter((hymn) => (hymn.book ?? 'main') === book);
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
