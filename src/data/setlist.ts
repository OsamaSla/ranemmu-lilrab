/**
 * Worship setlists travel in the URL so a link is self-contained — no database
 * or account involved. Two params are understood:
 *
 * - `ids`: the legacy flat, comma-separated hymn order. Still emitted by the
 *   reader for next/prev navigation and accepted by old shared links.
 * - `groups`: user-defined categories, JSON of `[[name, ids], ...]` URL-encoded
 *   as one param. The local store (../store/setlist) keeps whatever the leader
 *   is currently editing; opening a `?groups=` link replaces it.
 *
 * Ids are short slugs (`h0042`, `tr0001`, `b30001`), so the legacy `ids` list
 * stays readable and needs no JSON encoding. Parsing is strict on purpose: a
 * hand-edited URL must not smuggle an arbitrary string into a router path.
 */
import { getSummaries } from './loader';
import type { HymnSummary } from './types';

/** Matches the id prefixes emitted by scripts/build-corpus.mjs. */
const SAFE_ID = /^[a-z][a-z0-9]*$/i;

const MAX_CATEGORIES = 50;
const MAX_IDS_PER_CATEGORY = 500;

/**
 * Reads the `ids` query param from whatever shape expo-router hands back.
 * Expo Router decodes a comma-separated value to a string, but a repeated
 * `?ids=a&ids=b` becomes an array — accept both. Duplicates are dropped so a
 * position always maps to exactly one hymn (and next/prev stays predictable).
 */
export function parseSetIds(param: string | string[] | undefined | null): string[] {
  const raw = Array.isArray(param) ? param.join(',') : typeof param === 'string' ? param : '';
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const part of raw.split(',')) {
    const id = part.trim();
    if (SAFE_ID.test(id) && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

/** Serialises a legacy flat setlist for the `ids` query parameter. */
export function encodeSetIds(ids: string[]): string {
  return ids.join(',');
}

export interface SharedCategory {
  name: string;
  ids: string[];
}

/** Serialises categories for the `groups` query parameter. */
export function encodeSetGroups(categories: { name: string; ids: string[] }[]): string {
  return encodeURIComponent(JSON.stringify(categories.map((category) => [category.name, category.ids])));
}

/**
 * Reads the `groups` query param. Expo Router may hand back the raw JSON (it
 * decodes query values itself) or our own encoded form, so try decoding then
 * fall back to parsing the string as-is. Over-long lists are capped; anything
 * with the wrong shape yields null rather than throwing.
 */
export function parseSetGroups(
  param: string | string[] | undefined | null,
): SharedCategory[] | null {
  const candidates = Array.isArray(param) ? param : [param];
  for (const candidate of candidates) {
    if (typeof candidate !== 'string' || !candidate) continue;
    let decoded: unknown;
    try {
      try {
        decoded = JSON.parse(decodeURIComponent(candidate));
      } catch {
        decoded = JSON.parse(candidate);
      }
    } catch {
      continue;
    }
    if (!Array.isArray(decoded)) return null;

    const groups: SharedCategory[] = [];
    for (const entry of decoded.slice(0, MAX_CATEGORIES)) {
      // Every entry must be exactly a [name, ids] pair.
      if (!Array.isArray(entry) || entry.length !== 2) return null;
      const [name, ids] = entry;
      if (typeof name !== 'string' || !Array.isArray(ids)) return null;

      const seen = new Set<string>();
      const cleanIds: string[] = [];
      for (const value of ids) {
        if (typeof value !== 'string') continue;
        const id = value.trim();
        if (!SAFE_ID.test(id) || seen.has(id)) continue;
        seen.add(id);
        if (cleanIds.length < MAX_IDS_PER_CATEGORY) cleanIds.push(id);
      }
      groups.push({ name: name.trim(), ids: cleanIds });
    }
    return groups;
  }
  return null;
}

/**
 * Reader navigation within a set. Resolves the neighbour ids to summaries so
 * the toolbar can show the hymn title, and reports the 1-based position for the
 * "n of m" badge. When the current hymn is not in the set (the reader was
 * reached from search or a shared single-hymn link) `index` is -1 and the
 * caller falls back to the corpus neighbours.
 */
export function setNeighbours(
  ids: string[],
  id: string,
): { previous?: HymnSummary; next?: HymnSummary; index: number; total: number } {
  const index = ids.indexOf(id);
  const total = ids.length;
  if (index === -1) return { index, total };
  const byId = new Map(getSummaries().map((summary) => [summary.id, summary]));
  return {
    previous: index > 0 ? byId.get(ids[index - 1]) : undefined,
    next: index < total - 1 ? byId.get(ids[index + 1]) : undefined,
    index,
    total,
  };
}
