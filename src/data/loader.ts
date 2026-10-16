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
import { matchesTopic, type TopicId } from './topics';
import { getRemoteFullDocs, getRemoteSummaries } from '../store/remote';
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

/** Tombstoned ids, supplied by the overrides store (same cycle-free pattern). */
let deletedReader: () => string[] = () => [];

export function setDeletedReader(reader: () => string[]): void {
  deletedReader = reader;
}

function deletedSet(): Set<string> {
  return new Set(deletedReader());
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

/** Applies an admin overlay patch to a summary (topic fields included). */
function applySummaryPatch(s: HymnSummary, patch: Partial<Hymn>): HymnSummary {
  return {
    ...s,
    number: patch.number ?? s.number,
    title: patch.title ?? s.title,
    meter: patch.meter ?? s.meter,
    primaryTopic: patch.primaryTopic ?? s.primaryTopic,
    topics: patch.topics ?? s.topics,
    hasChorus:
      patch.verses !== undefined ? patch.verses.some((v) => v.chorus) : (s.hasChorus ?? false),
  };
}

/** All hymn summaries: numbers, titles and metres, overrides applied. */
export function getSummaries(book?: BookId): HymnSummary[] {
  const overlays = overlayReader();
  const deleted = deletedSet();
  const base = SUMMARIES.filter((s) => !deleted.has(s.id))
    .filter((s) => !book || (s.book ?? 'main') === book).map((s) => {
    const patch = overlays[s.id];
    if (!patch) return s;
    return applySummaryPatch(s, patch);
  });
  // Hymns that exist only remotely (added from another device after this
  // bundle shipped) join the lists; local edits still win per record.
  const known = new Set(base.map((s) => s.id));
  for (const s of getRemoteSummaries()) {
    if (known.has(s.id) || deleted.has(s.id)) continue;
    if (book && (s.book ?? 'main') !== book) continue;
    const patch = overlays[s.id];
    base.push(patch ? applySummaryPatch(s, patch) : s);
  }
  return base.sort((a, b) => a.number - b.number);
}

/**
 * Hymns belonging to `topic` (primary or secondary tag), optionally
 * narrowed to one book. Omit `book` to search both books combined.
 */
export function getSummariesByTopic(topic: TopicId, book?: BookId): HymnSummary[] {
  return getSummaries(book).filter((s) => matchesTopic(s, topic));
}

/** Hymn count per topic (primary or secondary), optionally within one book. */
export function getTopicCounts(book?: BookId): Record<TopicId, number> {
  const counts = {
    worship: 0,
    cross: 0,
    comfort: 0,
    repentance: 0,
    fellowship: 0,
    warfare: 0,
    word: 0,
    eternity: 0,
    church: 0,
  } satisfies Record<TopicId, number>;
  for (const s of getSummaries(book)) {
    if (s.primaryTopic) counts[s.primaryTopic] += 1;
    for (const t of s.topics ?? []) counts[t] += 1;
  }
  return counts;
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
  const present = new Set(merged.map((h) => h.id));
  const deleted = deletedSet();
  for (const remote of getRemoteFullDocs()) {
    if (present.has(remote.id) || deleted.has(remote.id)) continue;
    if (book && (remote.book ?? 'main') !== book) continue;
    const patch = overlays[remote.id];
    merged.push(patch ? { ...remote, ...patch } : remote);
    present.add(remote.id);
  }
  const visible = merged.filter((h) => !deleted.has(h.id));
  if (!book) {
    corpus = visible;
    return visible;
  }
  return visible.filter((hymn) => (hymn.book ?? 'main') === book);
}

const byId = new Map<string, Hymn>();

/** A single hymn record, or undefined when the id is not in the corpus. */
export function getHymn(id: string): Hymn | undefined {
  const cached = byId.get(id);
  if (cached) return cached;
  // Tombstoned hymns stay hidden everywhere (reader shows "not found").
  if (deletedSet().has(id)) return undefined;

  for (const chunk of Object.values(HYMN_CHUNKS)) {
    const found = chunk.find((hymn) => hymn.id === id);
    if (found) {
      const patch = overlayReader()[id];
      const merged = patch ? { ...found, ...patch } : found;
      byId.set(id, merged);
      return merged;
    }
  }
  // Hymns added from another device after this bundle shipped.
  const remote = getRemoteFullDocs().find((hymn) => hymn.id === id);
  if (remote) {
    const patch = overlayReader()[id];
    const merged = patch ? { ...remote, ...patch } : remote;
    byId.set(id, merged);
    return merged;
  }
  return undefined;
}
