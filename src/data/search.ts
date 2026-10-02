/**
 * Full-text search over the hymn corpus.
 *
 * Matching happens on the normalised form of each line (see ./normalize) and
 * positions are mapped back to the original text for highlighting, so a query
 * of "نرنم" matches "نَرْنَم" and highlights the diacritics in place.
 *
 * Normalising every line on each keystroke is far too slow for 1000+ hymns, so
 * the flattened search index is built once per loaded corpus and memoised.
 */
import { normalize, type Normalized } from './normalize';
import type { Hymn, HymnSummary, SearchMatch } from './types';

/** One searchable line, with its normalised form precomputed. */
interface IndexedLine {
  verseIndex: number;
  lineIndex: number;
  label: string;
  original: string;
  normalized: Normalized;
}

interface SearchDoc {
  summary: HymnSummary;
  title: Normalized;
  lines: IndexedLine[];
}

/** Cache keyed by the corpus identity, so a rebuild is only paid once. */
let cache: { key: string; docs: SearchDoc[] } | null = null;

function buildDocs(hymns: Hymn[], key: string): SearchDoc[] {
  if (cache?.key === key) return cache.docs;

  const docs = hymns.map((hymn) => ({
    summary: {
      id: hymn.id,
      number: hymn.number,
      title: hymn.title,
      tune: hymn.tune,
      meter: hymn.meter,
      hasChorus: hymn.verses.some((v) => v.chorus),
    },
    title: normalize(hymn.title),
    lines: hymn.verses.flatMap((verse, verseIndex) =>
      verse.lines.map((line, lineIndex) => ({
        verseIndex,
        lineIndex,
        label: verse.label,
        original: line,
        normalized: normalize(line),
      })),
    ),
  }));

  cache = { key, docs };
  return docs;
}

/** Drops the memoised index. Call after replacing the corpus. */
export function invalidateSearchCache(): void {
  cache = null;
}

/**
 * Find every line in the corpus containing `query`.
 *
 * Title matches are reported as a single synthetic hit so a hymn is reachable
 * by name, and titles are also scanned per line so a query spanning the title
 * and the first line still reports the line hit.
 */
export function searchHymns(hymns: Hymn[], query: string, limit = 200): SearchMatch[] {
  const needle = normalize(query).text;
  if (needle.length === 0) return [];

  const docs = buildDocs(hymns, `${hymns.length}:${hymns[0]?.id ?? ''}:${hymns.at(-1)?.id ?? ''}`);
  const matches: SearchMatch[] = [];

  for (const doc of docs) {
    if (matches.length >= limit) break;

    const titleAt = doc.title.text.indexOf(needle);
    if (titleAt !== -1) {
      const end = titleAt + needle.length;
      matches.push({
        hymn: doc.summary,
        verseIndex: -1,
        lineIndex: -1,
        label: '',
        line: doc.summary.title,
        start: doc.title.origin[titleAt],
        end: (doc.title.origin[end - 1] ?? 0) + 1,
        inTitle: true,
      });
    }

    for (const line of doc.lines) {
      if (matches.length >= limit) break;

      const at = line.normalized.text.indexOf(needle);
      if (at === -1) continue;

      const end = at + needle.length;
      matches.push({
        hymn: doc.summary,
        verseIndex: line.verseIndex,
        lineIndex: line.lineIndex,
        label: line.label,
        line: line.original,
        start: line.normalized.origin[at],
        end: (line.normalized.origin[end - 1] ?? at) + 1,
      });
    }
  }

  return matches;
}

/**
 * Slice `text` into alternating plain/highlighted runs for rendering.
 * Returns null when there is no match, so callers can render a plain Text.
 */
export function highlight(
  text: string,
  start: number,
  end: number,
): { text: string; highlighted: boolean }[] | null {
  if (start < 0 || end <= start || end > text.length) return null;

  const runs: { text: string; highlighted: boolean }[] = [];
  if (start > 0) runs.push({ text: text.slice(0, start), highlighted: false });
  runs.push({ text: text.slice(start, end), highlighted: true });
  if (end < text.length) runs.push({ text: text.slice(end), highlighted: false });
  return runs;
}

/**
 * Rank sibling hymns for the "similar hymns" view.
 *
 * Prefers an exact `tune` match, falls back to a shared `meter`, and finally
 * to sharing the chorus label — which is the only grouping signal available
 * when a book omits tune metadata entirely.
 */
export function findSimilar(hymn: HymnSummary, all: HymnSummary[], limit = 20): HymnSummary[] {
  const scored = all
    .filter((candidate) => candidate.id !== hymn.id)
    .map((candidate) => {
      let score = 0;
      if (hymn.tune && candidate.tune) {
        if (candidate.tune === hymn.tune) score += 100;
        else if (candidate.tune.startsWith(hymn.tune)) score += 60;
      }
      if (hymn.meter && candidate.meter === hymn.meter) score += 25;
      if (!score && hymn.hasChorus && candidate.hasChorus) score += 5;
      return { candidate, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.candidate.number - b.candidate.number);

  return scored.slice(0, limit).map((entry) => entry.candidate);
}

/** Group summaries by tune (or meter when tune is absent) for the نظم screen. */
export function groupByStructure(all: HymnSummary[]): { key: string; label: string; hymns: HymnSummary[] }[] {
  const groups = new Map<string, HymnSummary[]>();

  for (const hymn of all) {
    const key = hymn.tune?.trim() || hymn.meter?.trim() || '';
    if (!key) continue;
    const bucket = groups.get(key);
    if (bucket) bucket.push(hymn);
    else groups.set(key, [hymn]);
  }

  return [...groups.entries()]
    .map(([key, hymns]) => ({
      key,
      label: hymns[0].tune?.trim() || hymns[0].meter?.trim() || key,
      hymns: hymns.sort((a, b) => a.number - b.number),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ar'));
}
