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
import { getRemoteFullDocs, getRemoteSummaries, isFullDoc, useRemote } from '../store/remote';
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
  // Counts run over the merged view so admin-added hymns show up and
  // tombstoned ones stop being counted.
  const counts = new Map<BookId, number>();
  for (const s of getSummaries()) {
    const b = s.book ?? 'main';
    counts.set(b, (counts.get(b) ?? 0) + 1);
  }
  return BOOKS.filter((b) => (counts.get(b.id) ?? 0) > 0).map((b) => ({
    id: b.id,
    count: counts.get(b.id) ?? 0,
  }));
}

/**
 * Combined patch for one hymn: cloud diff under local overrides, so an
 * admin's own unsynced edits always win on their own device. Either side
 * may be absent.
 */
function mergedPatch(id: string): Partial<Hymn> | undefined {
  const remote = useRemote.getState().patches[id];
  const local = overlayReader()[id];
  if (!remote && !local) return undefined;
  return { ...remote, ...local };
}

/** Applies an admin overlay patch to a summary (topic fields included). */
function applySummaryPatch(s: HymnSummary, patch: Partial<Hymn>): HymnSummary {
  return {
    ...s,
    number: patch.number ?? s.number,
    title: patch.title ?? s.title,
    meter: patch.meter ?? s.meter,
    mediaUrl: patch.mediaUrl ?? s.mediaUrl,
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
    const patch = mergedPatch(s.id);
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
    known.add(s.id);
  }
  // Hymns added on this device but not published yet: the override patch
  // itself is a complete record, so they appear immediately instead of
  // waiting for the publish round-trip.
  for (const [id, patch] of Object.entries(overlays)) {
    if (known.has(id) || deleted.has(id)) continue;
    if (!isFullDoc(patch as Record<string, unknown>)) continue;
    if (book && (patch.book ?? 'main') !== book) continue;
    const verses = patch.verses as Hymn['verses'];
    base.push({
      id,
      book: patch.book ?? 'main',
      number: patch.number as number,
      title: patch.title as string,
      meter: patch.meter,
      mediaUrl: patch.mediaUrl,
      hasChorus: verses.some((v) => v.chorus),
      primaryTopic: patch.primaryTopic,
      topics: patch.topics,
    });
    known.add(id);
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
    const patch = mergedPatch(hymn.id);
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
  // Same unpublished-local-add handling as getSummaries above.
  for (const [id, patch] of Object.entries(overlays)) {
    if (present.has(id) || deleted.has(id)) continue;
    if (!isFullDoc(patch as Record<string, unknown>)) continue;
    if (book && (patch.book ?? 'main') !== book) continue;
    const verses = (patch.verses as Hymn['verses']).map((v) => ({ ...v, chorus: v.chorus ?? false }));
    merged.push({ ...(patch as Hymn), id, book: patch.book ?? 'main', verses });
    present.add(id);
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
      const patch = mergedPatch(id);
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
  // Hymns added on this device but not published yet.
  const overlay = overlayReader()[id];
  if (overlay && isFullDoc(overlay as Record<string, unknown>)) {
    const verses = (overlay.verses as Hymn['verses']).map((v) => ({
      ...v,
      chorus: v.chorus ?? false,
    }));
    const merged = { ...(overlay as Hymn), id, book: overlay.book ?? 'main', verses };
    byId.set(id, merged);
    return merged;
  }
  return undefined;
}
