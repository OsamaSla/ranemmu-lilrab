/**
 * Full-text search over the hymn corpus.
 *
 * Matching happens on the normalised form of each line (see ./normalize) and
 * positions are mapped back to the original text for highlighting, so a query
 * of "نرنم" matches "نَرْنَم" and highlights the diacritics in place.
 *
 * Result references are stanza:line (مقطع:سطر, e.g. "1:9") to match the
 * printed book.
 *
 * Normalising every line on each keystroke is far too slow for 1000+ hymns, so
 * the flattened search index is built once per loaded corpus and memoised.
 */
import { normalize, normalizeText } from './normalize';
import { normalizeMeter } from './meter';
import { bumpCorpusVersion } from '../store/corpus';
import type { BookId, Hymn, HymnSummary, SearchMatch } from './types';

/** One searchable line, with its normalised form precomputed. */
interface IndexedLine {
  verseIndex: number;
  lineIndex: number;
  label: string;
  original: string;
  text: string;
}

interface IndexedTitle {
  original: string;
  text: string;
}

interface SearchDoc {
  summary: HymnSummary;
  titles: IndexedTitle[];
  lines: IndexedLine[];
}

/** Shape emitted by scripts/build-corpus.mjs into assets/hymns/search-ar.json. */
interface PrebuiltHymn {
  /** FNV-1a of the raw title + verse text, to detect admin edits at runtime. */
  f: number;
  titles: string[];
  lines: Record<string, string[]>;
}
interface PrebuiltIndex {
  version: number;
  hymns: Record<string, PrebuiltHymn>;
}

/**
 * The prebuilt index is language-complete, so search no longer normalises
 * 30k+ lines on the main thread on the first keystroke. It is imported lazily
 * (the 4 MB JSON has no place in the entry bundle) and kept for the session.
 */
let prebuilt: PrebuiltIndex | null = null;
let indexPromise: Promise<void> | null = null;
let indexReady = false;

export function ensureSearchIndex(): Promise<void> {
  if (!indexPromise) {
    indexPromise = import('../../assets/hymns/search-ar.json')
      .then((mod) => {
        prebuilt = ((mod as { default?: PrebuiltIndex }).default ?? mod) as PrebuiltIndex;
      })
      .catch(() => {
        // A missing/corrupt index is not fatal: buildDocs falls back to
        // normalising on the device, as it did before the index existed.
      })
      .finally(() => {
        indexReady = true;
        // Lyrics search is gated on isSearchIndexReady(); screens waiting on it
        // need a render when the index lands, not just when chunks land.
        bumpCorpusVersion();
      });
  }
  return indexPromise;
}

/** True once the index has loaded (or failed and the fallback took over). */
export function isSearchIndexReady(): boolean {
  return indexReady;
}

/** Same function/field order as scripts/build-corpus.mjs — keep them in sync. */
function searchFingerprint(hymn: Hymn): number {
  const parts = [
    hymn.title, hymn.title_en ?? '', hymn.title_de ?? '', hymn.title_he ?? '',
  ];
  for (const key of ['verses', 'verses_en', 'verses_de', 'verses_he'] as const) {
    for (const verse of hymn[key] ?? []) parts.push(verse.label ?? '', ...verse.lines);
  }
  let hash = 0x811c9dc5;
  const text = parts.join('\u0000');
  for (let i = 0; i < text.length; i += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
  }
  return hash >>> 0;
}

/** Cache keyed by the corpus identity, so a rebuild is only paid once. */
let cache: { key: string; docs: SearchDoc[] } | null = null;

function buildDocs(hymns: Hymn[], key: string): SearchDoc[] {
  if (cache?.key === key) return cache.docs;

  const docs = hymns.map((hymn) => {
    // Only trust the prebuilt strings when the raw text still matches what
    // was bundled. An admin edit changes the fingerprint, so just that hymn
    // takes the slow path instead of poisoning the whole index.
    const candidate = prebuilt?.hymns[hymn.id];
    const pre = candidate && candidate.f === searchFingerprint(hymn) ? candidate : undefined;

    let titleIndex = 0;
    const normalizedTitle = (text: string) =>
      pre?.titles[titleIndex++] ?? normalizeText(text);
    const titles: IndexedTitle[] = [
      { original: hymn.title, text: normalizedTitle(hymn.title) },
    ];
    // Translated titles are searchable too, so search works in every UI
    // language (each reports its own title as the hit line).
    if (hymn.title_en) titles.push({ original: hymn.title_en, text: normalizedTitle(hymn.title_en) });
    if (hymn.title_de) titles.push({ original: hymn.title_de, text: normalizedTitle(hymn.title_de) });
    if (hymn.title_he) titles.push({ original: hymn.title_he, text: normalizedTitle(hymn.title_he) });

    const offsets = { ar: 0, en: 0, de: 0, he: 0 };
    const normalizedLine = (lang: keyof typeof offsets, text: string) =>
      pre?.lines[lang]?.[offsets[lang]++] ?? normalizeText(text);
    const lines = hymn.verses.flatMap((verse, verseIndex) =>
      verse.lines.map((line, lineIndex) => ({
        verseIndex,
        lineIndex,
        label: verse.label,
        original: line,
        text: normalizedLine('ar', line),
      })),
    );
    // Translated verses join the same index with their own originals, so
    // highlighting maps back into the translated line, not the Arabic one.
    for (const [lang, field] of [
      ['en', 'verses_en'], ['de', 'verses_de'], ['he', 'verses_he'],
    ] as const) {
      const translated = hymn[field];
      if (!translated) continue;
      translated.forEach((verse, verseIndex) => {
        verse.lines.forEach((line, lineIndex) => {
          lines.push({
            verseIndex,
            lineIndex,
            label: verse.label,
            original: line,
            text: normalizedLine(lang, line),
          });
        });
      });
    }

    return {
      summary: {
        id: hymn.id,
        book: hymn.book ?? 'main',
        number: hymn.number,
        title: hymn.title,
        meter: hymn.meter,
        hasChorus: hymn.verses.some((v) => v.chorus),
        primaryTopic: hymn.primaryTopic,
        topics: hymn.topics,
      },
      titles,
      lines,
    };
  });

  cache = { key, docs };
  return docs;
}

/** Drops the memoised index. Call after replacing the corpus. */
export function invalidateSearchCache(): void {
  cache = null;
}

/**
 * Memoised normalised title for a summary, so filtering 1.8k titles on every
 * keystroke does not re-normalise each title every time.
 */
const titleCache = new Map<string, { title: string; norm: string }>();

export function titleKey(s: { id: string; title: string }): string {
  const hit = titleCache.get(s.id);
  if (hit && hit.title === s.title) return hit.norm;
  const norm = normalizeText(s.title);
  titleCache.set(s.id, { title: s.title, norm });
  return norm;
}

/**
 * Find every line in the corpus containing `query`.
 *
 * Title matches are reported as a single synthetic hit so a hymn is reachable
 * by name, and titles are also scanned per line so a query spanning the title
 * and the first line still reports the line hit.
 */
export function searchHymns(hymns: Hymn[], query: string, limit = 200, book?: BookId): SearchMatch[] {
  const needle = normalize(query).text;
  if (needle.length === 0) return [];

  const docs = buildDocs(hymns, `${hymns.length}:${hymns[0]?.id ?? ''}:${hymns.at(-1)?.id ?? ''}`);
  const scopedDocs = book ? docs.filter((d) => (d.summary.book ?? 'main') === book) : docs;
  const matches: SearchMatch[] = [];

  // A digit-only query is a hymn-number lookup: exact number first, then
  // numbers starting with it, both numerically sorted. This runs before the
  // text search so typing "55" jumps straight to hymn 55.
  if (/^\d+$/.test(needle)) {
    const digits = needle.replace(/^0+(?=\d)/, '');
    const exact: SearchDoc[] = [];
    const prefixed: SearchDoc[] = [];
    for (const doc of scopedDocs) {
      const num = String(doc.summary.number);
      if (num === digits) exact.push(doc);
      else if (num.startsWith(digits)) prefixed.push(doc);
    }
    prefixed.sort((a, b) => a.summary.number - b.summary.number);
    for (const doc of [...exact, ...prefixed]) {
      if (matches.length >= limit) break;
      matches.push({
        hymn: doc.summary,
        verseIndex: -1,
        lineIndex: -1,
        label: '',
        line: doc.summary.title,
        start: 0,
        end: 0,
        inTitle: true,
      });
    }
  }

  for (const doc of scopedDocs) {
    if (matches.length >= limit) break;

    for (const title of doc.titles) {
      const titleAt = title.text.indexOf(needle);
      if (titleAt === -1) continue;
      const end = titleAt + needle.length;
      // Origin maps are only needed for the few lines that actually match,
      // so they are computed here rather than stored for every title.
      const origin = normalize(title.original).origin;
      matches.push({
        hymn: doc.summary,
        verseIndex: -1,
        lineIndex: -1,
        label: '',
        line: title.original,
        start: origin[titleAt],
        end: (origin[end - 1] ?? 0) + 1,
        inTitle: true,
      });
      break;
    }

    for (const line of doc.lines) {
      if (matches.length >= limit) break;

      const at = line.text.indexOf(needle);
      if (at === -1) continue;

      const end = at + needle.length;
      const norm = normalize(line.original);
      matches.push({
        hymn: doc.summary,
        verseIndex: line.verseIndex,
        lineIndex: line.lineIndex,
        label: line.label,
        line: line.original,
        start: norm.origin[at],
        end: (norm.origin[end - 1] ?? at) + 1,
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
 * Locate `query` inside a single string (a title, say) and slice it for
 * highlighting. Normalisation maps the match back to the printed characters,
 * so typing "نرنم" highlights "نَرْنَم" in place. Returns null when absent.
 */
export function highlightQuery(
  text: string,
  query: string,
): { text: string; highlighted: boolean }[] | null {
  const needle = normalize(query).text;
  if (needle.length === 0) return null;

  const haystack = normalize(text);
  const at = haystack.text.indexOf(needle);
  if (at === -1) return null;

  const end = at + needle.length;
  return highlight(text, haystack.origin[at], (haystack.origin[end - 1] ?? at) + 1);
}

/**
 * Rank sibling hymns for the "similar hymns" view by shared metre
 * (مقياس الكلام). The chorus fallback exists only for hymns that carry no
 * metre at all: without that guard it would flood every result, since nearly
 * every hymn has one.
 */
export function findSimilar(hymn: HymnSummary, all: HymnSummary[], limit = 20): HymnSummary[] {
  // Normalise the reference metre once, not once per candidate (the list can
  // hold every hymn in the book).
  const hymnMeter = hymn.meter ? normalizeMeter(hymn.meter) : '';
  const scored = all
    .filter((candidate) => candidate.id !== hymn.id)
    .map((candidate) => {
      let score = 0;
      const candidateMeter = candidate.meter ? normalizeMeter(candidate.meter) : '';
      if (hymnMeter && candidateMeter === hymnMeter) score += 25;
      if (!score && !hymnMeter && hymn.hasChorus && candidate.hasChorus) score += 5;
      return { candidate, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.candidate.number - b.candidate.number);

  return scored.slice(0, limit).map((entry) => entry.candidate);
}

/** Group summaries by metre (مقياس الكلام) for the structure screen. */
export function groupByStructure(all: HymnSummary[]): { key: string; label: string; hymns: HymnSummary[] }[] {
  const groups = new Map<string, HymnSummary[]>();

  for (const hymn of all) {
    const raw = hymn.meter?.trim() || '';
    if (!raw) continue;
    const key = normalizeMeter(raw);
    const bucket = groups.get(key);
    if (bucket) bucket.push(hymn);
    else groups.set(key, [hymn]);
  }

  return [...groups.entries()]
    .map(([key, hymns]) => ({
      key,
      label: key,
      hymns: hymns.sort((a, b) => a.number - b.number),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ar'));
}
