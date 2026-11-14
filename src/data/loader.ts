/**
 * Access to the bundled hymn corpus.
 *
 * Summaries are bundled statically (they are small and every list needs
 * them); the full hymn bodies live in chunks that are imported on demand by
 * ./chunks. Reads stay synchronous — callers await the chunk first, then the
 * normal `getHymn()` / `getCorpus()` lookups work exactly as before.
 */
import {
  bundledHymn,
  loadedChunksInOrder,
  setChunkLoadedListener,
} from './chunks';
import { BOOKS } from './types';
import type { BookId, Hymn, HymnSummary } from './types';
import { type TopicId } from './topics';
import { getRemoteFullDocs, getRemoteSummaries, isFullDoc, useRemote } from '../store/remote';
import { invalidateSearchCache } from './search';

export { areAllChunksLoaded, ensureAllChunks, ensureHymn, isHymnPending } from './chunks';

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
  summaryCache = null;
  invalidateSearchCache();
}

/** A freshly imported chunk invalidates the merged views and search index. */
setChunkLoadedListener(refreshOverlaidCorpus);

/** Books present in the bundled corpus, in display order, with hymn counts and translation coverage. */
export function getBooks(): { id: BookId; count: number; hasEn: boolean; hasDe: boolean }[] {
  // Counts run over the merged view so admin-added hymns show up and
  // tombstoned ones stop being counted. Translation flags ride along in the
  // summaries so the home cards can advertise EN/DE without loading chunks.
  const counts = new Map<BookId, { count: number; en: number; de: number }>();
  for (const s of getSummaries()) {
    const b = s.book ?? 'main';
    const entry = counts.get(b) ?? { count: 0, en: 0, de: 0 };
    entry.count += 1;
    if (s.hasEn) entry.en += 1;
    if (s.hasDe) entry.de += 1;
    counts.set(b, entry);
  }
  return BOOKS.filter((b) => (counts.get(b.id)?.count ?? 0) > 0).map((b) => {
    const entry = counts.get(b.id);
    return {
      id: b.id,
      count: entry?.count ?? 0,
      hasEn: (entry?.en ?? 0) > 0,
      hasDe: (entry?.de ?? 0) > 0,
    };
  });
}

/**
 * Combined patch for one hymn: cloud diff under local overrides, so an
 * admin's own unsynced edits always win on their own device. Either side
 * may be absent. Both maps are passed in because the callers iterate the
 * whole corpus and reading the stores per hymn was thousands of lookups.
 */
function mergedPatch(
  id: string,
  patches: Record<string, Partial<Hymn>>,
  overlays: Record<string, Partial<Hymn>>,
): Partial<Hymn> | undefined {
  const remote = patches[id];
  const local = overlays[id];
  if (!remote && !local) return undefined;
  if (!remote || !local) return { ...remote, ...local };
  const merged: Partial<Hymn> = { ...remote, ...local };
  // A blank local value means "nothing set", not a deliberate clear, so it
  // must not hide real cloud data. Without this, any device that once saved a
  // hymn with an empty field (a blank mediaUrl) kept masking a link added from
  // another device — the cloud had the URL, the reader stayed empty.
  for (const [key, value] of Object.entries(local)) {
    const cloud = (remote as Record<string, unknown>)[key];
    if (value === '' && typeof cloud === 'string' && cloud !== '') {
      (merged as Record<string, unknown>)[key] = cloud;
    }
  }
  return merged;
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
    hasEn:
      patch.title_en !== undefined || patch.verses_en !== undefined
        ? Boolean(patch.title_en?.trim() || patch.verses_en?.length)
        : s.hasEn,
    hasDe:
      patch.title_de !== undefined || patch.verses_de !== undefined
        ? Boolean(patch.title_de?.trim() || patch.verses_de?.length)
        : s.hasDe,
    hasHe:
      patch.title_he !== undefined || patch.verses_he !== undefined
        ? Boolean(patch.title_he?.trim() || patch.verses_he?.length)
        : s.hasHe,
  };
}

/**
 * Merged-summary cache. Every list screen asks for summaries on mount (home,
 * library, counts, neighbours, reader), and re-merging 1.8k records each time
 * is wasted work when nothing changed. The stores replace their maps on
 * write, so object identity is a cheap and reliable version key.
 */
let summaryCache: {
  overlays: Record<string, Partial<Hymn>>;
  patches: Record<string, Partial<Hymn>>;
  deleted: readonly string[];
  byBook: Map<BookId | 'all', HymnSummary[]>;
} | null = null;

function buildSummaries(
  overlays: Record<string, Partial<Hymn>>,
  patches: Record<string, Partial<Hymn>>,
  deleted: Set<string>,
): HymnSummary[] {
  const base = SUMMARIES.filter((s) => !deleted.has(s.id)).map((s) => {
    const patch = mergedPatch(s.id, patches, overlays);
    if (!patch) return s;
    return applySummaryPatch(s, patch);
  });
  // Hymns that exist only remotely (added from another device after this
  // bundle shipped) join the lists; local edits still win per record.
  const known = new Set(base.map((s) => s.id));
  for (const s of getRemoteSummaries()) {
    if (known.has(s.id) || deleted.has(s.id)) continue;
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
    const verses = patch.verses as Hymn['verses'];
    base.push({
      id,
      book: patch.book ?? 'main',
      number: patch.number as number,
      title: patch.title as string,
      meter: patch.meter,
      mediaUrl: patch.mediaUrl,
      hasChorus: verses.some((v) => v.chorus),
      hasEn: Boolean(patch.title_en?.trim() || patch.verses_en?.length),
      hasDe: Boolean(patch.title_de?.trim() || patch.verses_de?.length),
      hasHe: Boolean(patch.title_he?.trim() || patch.verses_he?.length),
      primaryTopic: patch.primaryTopic,
      topics: patch.topics,
    });
    known.add(id);
  }
  return base.sort((a, b) => a.number - b.number);
}

/** All hymn summaries: numbers, titles and metres, overrides applied. */
export function getSummaries(book?: BookId): HymnSummary[] {
  const overlays = overlayReader();
  const patches = useRemote.getState().patches;
  const deleted = deletedReader();
  if (
    !summaryCache ||
    summaryCache.overlays !== overlays ||
    summaryCache.patches !== patches ||
    summaryCache.deleted !== deleted
  ) {
    summaryCache = { overlays, patches, deleted, byBook: new Map() };
  }

  let all = summaryCache.byBook.get('all');
  if (!all) {
    all = buildSummaries(overlays, patches, new Set(deleted));
    summaryCache.byBook.set('all', all);
  }
  if (!book) return all.slice();

  let filtered = summaryCache.byBook.get(book);
  if (!filtered) {
    filtered = all.filter((s) => (s.book ?? 'main') === book);
    summaryCache.byBook.set(book, filtered);
  }
  // Callers filter/sort the returned array; hand out a copy so the cache
  // cannot be mutated from the outside.
  return filtered.slice();
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

/** Adjacent hymns within the same book for the reader's previous/next controls. */
export function getNeighbours(id: string): { previous?: HymnSummary; next?: HymnSummary } {
  const summaries = getSummaries();
  const index = summaries.findIndex((s) => s.id === id);
  if (index === -1) return {};
  const book = summaries[index].book ?? 'main';
  let previous: HymnSummary | undefined;
  for (let i = index - 1; i >= 0; i -= 1) {
    if ((summaries[i].book ?? 'main') === book) {
      previous = summaries[i];
      break;
    }
  }
  let next: HymnSummary | undefined;
  for (let i = index + 1; i < summaries.length; i += 1) {
    if ((summaries[i].book ?? 'main') === book) {
      next = summaries[i];
      break;
    }
  }
  return { previous, next };
}

let corpus: Hymn[] | null = null;

/**
 * The full corpus, flattened from the chunks that are already loaded. Built
 * once and cached, since search needs every line and the reader needs its own
 * record. Call `ensureAllChunks()` first for a complete corpus.
 */
export function getCorpus(book?: BookId): Hymn[] {
  if (corpus && !book) return corpus;

  const overlays = overlayReader();
  const patches = useRemote.getState().patches;
  const all: Hymn[] = [];
  for (const chunk of loadedChunksInOrder()) all.push(...chunk);

  const merged = all.map((hymn) => {
    const patch = mergedPatch(hymn.id, patches, overlays);
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

  const found = bundledHymn(id);
  if (found) {
    const patch = mergedPatch(id, useRemote.getState().patches, overlayReader());
    const merged = patch ? { ...found, ...patch } : found;
    byId.set(id, merged);
    return merged;
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
