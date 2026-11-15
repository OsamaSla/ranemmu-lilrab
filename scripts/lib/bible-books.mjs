/**
 * Scripture book table, reference parsing and Arabic formatting.
 *
 * Shared by the app (`src/data/scriptures.ts` mirrors this file) and every
 * script that touches references. The canonical id is the only thing stored in
 * the corpus; a ref is written `isa.53.4-6` and read as إشعياء ٥٣: ٤-٦.
 *
 * The table lives in `src/data/scripture-books.json` because the reader needs
 * the Arabic names and chapter counts too — one file, two consumers.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** 66 entries: `{ id, ar, en, also?, chapters }`. */
export const BIBLE_BOOKS = JSON.parse(
  readFileSync(join(ROOT, 'src', 'data', 'scripture-books.json'), 'utf8'),
);

export const BIBLE_BY_ID = new Map(BIBLE_BOOKS.map((book) => [book.id, book]));

/**
 * The longest chapter in the canon (Psalm 119). A verse number above this is a
 * typo, not a reference — the per-chapter verse counts are not in the table, so
 * this is the only bound validation can enforce without the downloaded text.
 */
export const MAX_VERSES_PER_CHAPTER = 176;

/** Harakat, Quranic marks, tatweel — noise for every comparison here. */
const MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;

/** Arabic-Indic and Persian digits → ASCII, so one grammar parses every input. */
export function toLatinDigits(value) {
  return String(value)
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/** Arabic-Indic digits for display: 53 → ٥٣. */
export function toArabicDigits(value) {
  return toLatinDigits(value).replace(/[0-9]/g, (d) => String.fromCharCode(0x0660 + Number(d)));
}

/**
 * Folds a book name for matching: no harakat/tatweel, no punctuation or
 * spaces, أ إ آ ٱ → ا, ى → ي, ة → ه. Digits survive, so "1 كورنثوس" and
 * "2 كورنثوس" stay distinct (dropping them collapsed both onto كورنثوس).
 */
export function foldBookName(value) {
  return toLatinDigits(value)
    .replace(MARKS, '')
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
    .replace(/\u0649/g, '\u064A')
    .replace(/\u0629/g, '\u0647')
    .replace(/[^\u0621-\u064A0-9]/g, '');
}

/** Latin display names ("1 Corinthians") and ids, lowercased without spaces. */
function latinKey(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const ARABIC_NAMES = new Map();
const LATIN_NAMES = new Map();
for (const book of BIBLE_BOOKS) {
  for (const name of [book.ar, ...(book.also ?? [])]) {
    // Latin aliases ("psalms", "song of solomon") must go to the Latin index:
    // folding them would yield an empty key, and the last empty key won every
    // lookup — "Isaiah 53:4" resolved to Revelation.
    if (/\p{Script=Arabic}/u.test(name)) {
      const key = foldBookName(name);
      if (key) ARABIC_NAMES.set(key, book.id);
    } else {
      LATIN_NAMES.set(latinKey(name), book.id);
    }
  }
  LATIN_NAMES.set(latinKey(book.en), book.id);
  LATIN_NAMES.set(latinKey(book.id), book.id);
}

/** Resolves a book name in either script, or null. */
export function findBookId(name) {
  const text = String(name ?? '').trim();
  if (!text) return null;
  if (/\p{Script=Arabic}/u.test(text)) {
    const arabic = foldBookName(text);
    if (arabic && ARABIC_NAMES.has(arabic)) return ARABIC_NAMES.get(arabic);
    return null;
  }
  return LATIN_NAMES.get(latinKey(text)) ?? null;
}

/** Canonical string for a structured ref: `isa.53.4-6`. */
export function refToString(ref) {
  const range = ref.to === ref.from ? `${ref.from}` : `${ref.from}-${ref.to}`;
  return `${ref.book}.${ref.chapter}.${range}`;
}

/**
 * Arabic display form: `إشعياء ٥٣: ٤-٦`. Always Arabic book name and digits,
 * regardless of the UI language — the reference belongs to the Arabic hymn.
 * `latinDigits` is for terminals and reports.
 */
export function formatScriptureRef(ref, { latinDigits = false } = {}) {
  const book = BIBLE_BY_ID.get(ref.book);
  const name = book ? book.ar : ref.book;
  const digit = (value) => (latinDigits ? String(value) : toArabicDigits(value));
  const range = ref.to === ref.from ? digit(ref.from) : `${digit(ref.from)}-${digit(ref.to)}`;
  return `${name} ${digit(ref.chapter)}: ${range}`;
}

/**
 * Structural checks that never need the Bible text. Returns problem strings
 * (empty when the ref is valid).
 */
export function validateScriptureRef(ref) {
  const issues = [];
  const book = BIBLE_BY_ID.get(ref?.book);
  if (!book) return [`unknown book '${ref?.book}'`];
  if (!Number.isInteger(ref.chapter) || ref.chapter < 1 || ref.chapter > book.chapters) {
    issues.push(`${book.id}: chapter ${ref.chapter} outside 1..${book.chapters}`);
  }
  if (!Number.isInteger(ref.from) || ref.from < 1) {
    issues.push(`${book.id} ${ref.chapter}: verse from ${ref.from} must be a positive integer`);
  }
  if (!Number.isInteger(ref.to) || ref.to < ref.from) {
    issues.push(`${book.id} ${ref.chapter}: verse range ${ref.from}-${ref.to} is reversed`);
  }
  if (ref.to > MAX_VERSES_PER_CHAPTER) {
    issues.push(`${book.id} ${ref.chapter}: verse ${ref.to} above ${MAX_VERSES_PER_CHAPTER}`);
  }
  return issues;
}

const CANONICAL = /^([0-9a-z]+)\.([0-9]{1,3})\.([0-9]{1,3})(?:-([0-9]{1,3}))?$/i;
/**
 * Human form: `<book> <chapter>:<from>[-<to>]`. The lazy book group stops at
 * the chapter number, so "1 كورنثوس ١٣: ٤-٧" and "مزمور ٢٣: ١" both parse.
 */
const HUMAN = /^(.*?)\s*([0-9]{1,3})\s*:\s*([0-9]{1,3})\s*(?:[-–—]\s*([0-9]{1,3}))?$/;

/**
 * Parses `isa.53.4-6`, `إشعياء ٥٣: ٤-٦` or `Isaiah 53:4-6` into a structured
 * ref. Throws with a human-readable reason; callers collect those into a gate.
 */
export function parseScriptureRef(text) {
  const input = toLatinDigits(String(text ?? '').trim());
  if (!input) throw new Error('empty reference');

  const canonical = CANONICAL.exec(input);
  if (canonical) {
    const book = canonical[1].toLowerCase();
    const chapter = Number(canonical[2]);
    const from = Number(canonical[3]);
    const to = canonical[4] === undefined ? from : Number(canonical[4]);
    const ref = { book, chapter, from, to };
    const issues = validateScriptureRef(ref);
    if (issues.length) throw new Error(`${input}: ${issues.join('; ')}`);
    return ref;
  }

  const human = HUMAN.exec(input);
  if (!human) {
    throw new Error(`${input}: expected "isa.53.4-6" or "إشعياء ٥٣: ٤-٦"`);
  }
  const bookId = findBookId(human[1]);
  if (!bookId) throw new Error(`${input}: unknown book '${human[1].trim()}'`);
  const chapter = Number(human[2]);
  const from = Number(human[3]);
  const to = human[4] === undefined ? from : Number(human[4]);
  const ref = { book: bookId, chapter, from, to };
  const issues = validateScriptureRef(ref);
  if (issues.length) throw new Error(`${input}: ${issues.join('; ')}`);
  return ref;
}

/** Sorts refs into canonical order (book, chapter, verse) for stable output. */
export function compareRefs(a, b) {
  const bookA = BIBLE_BOOKS.findIndex((book) => book.id === a.book);
  const bookB = BIBLE_BOOKS.findIndex((book) => book.id === b.book);
  return bookA - bookB || a.chapter - b.chapter || a.from - b.from;
}
