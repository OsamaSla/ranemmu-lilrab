/**
 * Finds hymns that the corpus prints more than once, in different books.
 *
 * Run through `scripts/build-corpus.mjs`, which uses the result twice: to write
 * `assets/hymns/links.json` (the "also in" pointers the reader shows) and to
 * lend a hymn the Hebrew that its twin already has.
 *
 * Matching is on **Arabic letters only**. Diacritics, tatweel, punctuation and
 * spacing are dropped and the print variants are folded (أ إ آ → ا, ى → ي,
 * ة → ه), because the same hymn is typeset differently in each book:
 *
 *   main:731  قَبْلَمَا بَنَى الْجِبَال …   (4-line stanzas)
 *   taranim:290  قبلما بنى الجبال …          (6-line stanzas)
 *
 * That also means a match is *not* proof that the line breaks agree, which is
 * why `lineCompatible` exists: a translation can only be re-flowed onto
 * another book's grid when the two print the same lines.
 */

/** Letters only: no harakat, no tatweel, no punctuation, no spaces, no Latin. */
export function hymnKey(hymn) {
  return (hymn.verses ?? [])
    .flatMap((verse) => verse.lines)
    .join(' ')
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
    .replace(/[\u0622\u0623\u0625]/g, '\u0627')
    .replace(/\u0649/g, '\u064A')
    .replace(/\u0629/g, '\u0647')
    .replace(/[^\u0621-\u064A]/g, '');
}

const normaliseLine = (line) =>
  (line ?? '')
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
    .replace(/[\u0622\u0623\u0625]/g, '\u0627')
    .replace(/\u0649/g, '\u064A')
    .replace(/\u0629/g, '\u0647')
    .replace(/[^\u0621-\u064A]/g, '');

/** The hymn's lines in print order, one entry per printed line. */
export const printedLines = (hymn) => (hymn.verses ?? []).flatMap((verse) => verse.lines);

/**
 * True when two printings break the same words into the same lines, so a
 * translation authored line-for-line can be moved across without re-breaking
 * it (the stanza grouping may still differ — that is handled by the reflow).
 */
export function lineCompatible(a, b) {
  const left = printedLines(a).map(normaliseLine);
  const right = printedLines(b).map(normaliseLine);
  if (left.length !== right.length) return false;
  return left.every((line, i) => line === right[i]);
}

/**
 * Groups hymns whose text is identical across books. Same-book repeats are
 * ignored: they are numbering oddities, not the same hymn printed twice.
 * Groups are returned in a stable order (book order, then number) so the
 * generated files do not churn between builds.
 */
export function crossBookGroups(hymns) {
  const byKey = new Map();
  for (const hymn of hymns) {
    const key = hymnKey(hymn);
    if (!key) continue;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(hymn);
  }
  return [...byKey.values()]
    .filter((group) => new Set(group.map((hymn) => hymn.book)).size > 1)
    .map((group) => group.slice().sort((a, b) => (a.book < b.book ? -1 : a.book > b.book ? 1 : a.number - b.number)));
}

/**
 * Re-cuts a sibling's Hebrew onto `target`'s stanza grid.
 *
 * The translation is a flat list of printed lines; only the stanza grouping is
 * put back, using the target's own widths, labels and refrain flags, so the
 * merged record looks exactly like a hand-authored payload for that book.
 */
export function reflowHebrew(target, source) {
  const lines = (source.verses_he ?? []).flatMap((verse) => verse.lines);
  let cursor = 0;
  const verses_he = target.verses.map((verse) => {
    const slice = lines.slice(cursor, cursor + verse.lines.length);
    cursor += verse.lines.length;
    return { label: verse.label, lines: slice, ...(verse.chorus ? { chorus: true } : {}) };
  });
  if (cursor !== lines.length) return null;
  return {
    title_he: source.title_he,
    ...(source.chorus_he ? { chorus_he: source.chorus_he } : {}),
    verses_he,
  };
}
