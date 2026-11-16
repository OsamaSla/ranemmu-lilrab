/**
 * Worship setlists are just an ordered row of hymn ids.
 *
 * The order travels in a single `ids` query parameter so a setlist link is
 * self-contained — anybody who opens it gets the same sequence, with no
 * database or account involved. The local store (../store/setlist) keeps the
 * set the leader is currently editing between visits.
 *
 * Ids are short slugs (`h0042`, `tr0001`, `b30001`), so a comma-separated list
 * stays readable and needs no JSON encoding. Parsing is strict on purpose: a
 * hand-edited URL with a stray value must not smuggle an arbitrary string into
 * a router path.
 */
import { getSummaries } from './loader';
import type { HymnSummary } from './types';

/** Matches the id prefixes emitted by scripts/build-corpus.mjs. */
const SAFE_ID = /^[a-z][a-z0-9]*$/i;

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

/** Serialises a setlist for the `ids` query parameter. */
export function encodeSetIds(ids: string[]): string {
  return ids.join(',');
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
