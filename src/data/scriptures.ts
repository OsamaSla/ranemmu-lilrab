/**
 * Scripture references: formatting for the reader, parsing for the admin form.
 *
 * This is a deliberate mirror of `scripts/lib/bible-books.mjs`. The book table
 * itself is shared (`./scripture-books.json`); only the small amount of logic
 * is duplicated, because the scripts run on Node with `node:` imports and the
 * app runs in Metro/Hermes where those cannot be pulled in.
 *
 * No Bible text lives here or anywhere else in the bundle: a hymn stores the
 * reference only, and the reader prints it as a line above the first stanza.
 */
import type { ScriptureRef } from './types';
import BOOKS_JSON from './scripture-books.json';

export interface ScriptureBook {
  id: string;
  /** Arabic display name, e.g. "إشعياء". */
  ar: string;
  /** Latin name, for the admin form and reports. */
  en: string;
  /** Alternate spellings seen in print or typed by hand. */
  also?: string[];
  chapters: number;
}

export const SCRIPTURE_BOOKS = BOOKS_JSON as ScriptureBook[];

const BY_ID = new Map(SCRIPTURE_BOOKS.map((book) => [book.id, book]));

/**
 * The longest chapter in the canon (Psalm 119). A verse number above this is a
 * typo; the per-chapter verse counts are not bundled, so this is the only upper
 * bound the app can enforce on its own.
 */
export const MAX_VERSES_PER_CHAPTER = 176;

/** Harakat, Quranic marks, tatweel — noise for every comparison here. */
const MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;

/** Arabic-Indic and Persian digits → ASCII, so one grammar parses every input. */
export function toLatinDigits(value: string | number): string {
  return String(value)
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/** Arabic-Indic digits for display: 53 → ٥٣. */
export function toArabicDigits(value: string | number): string {
  return toLatinDigits(value).replace(/[0-9]/g, (d) => String.fromCharCode(0x0660 + Number(d)));
}

/**
 * Folds a book name for matching: no harakat/tatweel, no punctuation or
 * spaces, أ إ آ ٱ → ا, ى → ي, ة → ه. Digits survive, so "1 كورنثوس" and
 * "2 كورنثوس" stay distinct.
 */
export function foldBookName(value: string): string {
  return toLatinDigits(value)
    .replace(MARKS, '')
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
    .replace(/\u0649/g, '\u064A')
    .replace(/\u0629/g, '\u0647')
    .replace(/[^\u0621-\u064A0-9]/g, '');
}

/** Latin display names ("1 Corinthians") and ids, lowercased without spaces. */
function latinKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const ARABIC_NAMES = new Map<string, string>();
const LATIN_NAMES = new Map<string, string>();
for (const book of SCRIPTURE_BOOKS) {
  ARABIC_NAMES.set(foldBookName(book.ar), book.id);
  for (const name of book.also ?? []) {
    // A Latin alias ("psalms") must not be folded: an empty key would collide
    // with every other Latin alias.
    if (/[a-z]/i.test(name)) LATIN_NAMES.set(latinKey(name), book.id);
    else ARABIC_NAMES.set(foldBookName(name), book.id);
  }
  LATIN_NAMES.set(latinKey(book.en), book.id);
  LATIN_NAMES.set(book.id, book.id);
}

/** Resolves a book name in either script, or null. */
export function findBookId(name: string): string | null {
  const text = String(name ?? '').trim();
  if (!text) return null;
  if (/[\u0621-\u064A]/.test(text)) return ARABIC_NAMES.get(foldBookName(text)) ?? null;
  return LATIN_NAMES.get(latinKey(text)) ?? null;
}

/** Canonical string for a ref: `isa.53.4-6`. */
export function refToString(ref: ScriptureRef): string {
  const range = ref.to === ref.from ? `${ref.from}` : `${ref.from}-${ref.to}`;
  return `${ref.book}.${ref.chapter}.${range}`;
}

/**
 * Arabic display form: `إشعياء ٥٣: ٤-٦`. Always the Arabic book name and
 * Arabic-Indic digits, whatever the UI language — the reference belongs to the
 * Arabic hymn, not to the interface.
 */
export function formatScriptureRef(
  ref: ScriptureRef,
  { latinDigits = false }: { latinDigits?: boolean } = {},
): string {
  const book = BY_ID.get(ref.book);
  const name = book ? book.ar : ref.book;
  const digit = (value: number) => (latinDigits ? String(value) : toArabicDigits(value));
  const range = ref.to === ref.from ? digit(ref.from) : `${digit(ref.from)}-${digit(ref.to)}`;
  return `${name} ${digit(ref.chapter)}: ${range}`;
}

/** The line the reader prints: `إشعياء ٥٣: ٤-٦ · يوحنا ٣: ١٦`. Empty when none. */
export function formatScriptureLine(refs: ScriptureRef[] | undefined, separator = ' · '): string {
  if (!refs || refs.length === 0) return '';
  return refs.map((ref) => formatScriptureRef(ref)).join(separator);
}

/**
 * Structural problems with a ref; empty when it is usable.
 *
 * Arabic on purpose: these strings are read by whoever fills the admin field,
 * and an English sentence wedged into an RTL line renders as a jumble
 * (`chapter 99 outside 1..66` landed in the middle of `إشعياء ٩٩: ١`). The
 * scripting mirror keeps its English messages — it writes logs, not UI.
 */
export function validateScriptureRef(ref: ScriptureRef): string[] {
  const issues: string[] = [];
  const book = BY_ID.get(ref?.book);
  if (!book) return [`كتاب غير معروف «${ref?.book}»`];
  if (!Number.isInteger(ref.chapter) || ref.chapter < 1 || ref.chapter > book.chapters) {
    issues.push(
      `${book.ar}: الفصل ${toArabicDigits(ref.chapter)} خارج ١-${toArabicDigits(book.chapters)}`,
    );
  }
  if (!Number.isInteger(ref.from) || ref.from < 1) {
    issues.push(`${book.ar}: رقم أول آية يجب أن يكون موجبًا`);
  }
  if (!Number.isInteger(ref.to) || ref.to < ref.from) {
    issues.push(
      `${book.ar}: نطاق الآيات ${toArabicDigits(ref.from)}-${toArabicDigits(ref.to)} معكوس`,
    );
  }
  if (ref.to > MAX_VERSES_PER_CHAPTER) {
    issues.push(
      `${book.ar}: الآية ${toArabicDigits(ref.to)} تتجاوز ${toArabicDigits(MAX_VERSES_PER_CHAPTER)}`,
    );
  }
  return issues;
}

const CANONICAL = /^([0-9a-z]+)\.([0-9]{1,3})\.([0-9]{1,3})(?:-([0-9]{1,3}))?$/i;
/** Human form: `<book> <chapter>:<from>[-<to>]`. */
const HUMAN = /^(.*?)\s*([0-9]{1,3})\s*:\s*([0-9]{1,3})\s*(?:[-\u2013\u2014]\s*([0-9]{1,3}))?$/;

/**
 * Parses `isa.53.4-6`, `إشعياء ٥٣: ٤-٦` or `Isaiah 53:4-6`. Throws with a
 * readable reason; the admin form catches it and shows it under the field.
 */
export function parseScriptureRef(text: string): ScriptureRef {
  const raw = String(text ?? '').trim();
  const input = toLatinDigits(raw);
  if (!input) throw new Error('المرجع فارغ');

  const canonical = CANONICAL.exec(input);
  if (canonical) {
    const ref: ScriptureRef = {
      book: canonical[1].toLowerCase(),
      chapter: Number(canonical[2]),
      from: Number(canonical[3]),
      to: canonical[4] === undefined ? Number(canonical[3]) : Number(canonical[4]),
    };
    const issues = validateScriptureRef(ref);
    if (issues.length) throw new Error(issues.join('؛ '));
    return ref;
  }

  const human = HUMAN.exec(input);
  if (!human) throw new Error(`${raw}: صيغة غير مفهومة — مثال: إشعياء ٥٣: ٤-٦`);
  const bookId = findBookId(human[1]);
  if (!bookId) throw new Error(`كتاب غير معروف «${human[1].trim()}»`);
  const ref: ScriptureRef = {
    book: bookId,
    chapter: Number(human[2]),
    from: Number(human[3]),
    to: human[4] === undefined ? Number(human[3]) : Number(human[4]),
  };
  const issues = validateScriptureRef(ref);
  if (issues.length) throw new Error(issues.join('؛ '));
  return ref;
}

/** Sorts refs into canonical order (book, chapter, verse) for stable output. */
export function compareScriptureRefs(a: ScriptureRef, b: ScriptureRef): number {
  const bookA = SCRIPTURE_BOOKS.findIndex((book) => book.id === a.book);
  const bookB = SCRIPTURE_BOOKS.findIndex((book) => book.id === b.book);
  return bookA - bookB || a.chapter - b.chapter || a.from - b.from;
}

/**
 * Parses a whole field: refs separated by `·`, `,`, `;` or a new line.
 * Returns the refs in canonical order with duplicates removed.
 */
export function parseScriptureText(text: string): ScriptureRef[] {
  const parts = String(text ?? '')
    .split(/[·,;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const refs: ScriptureRef[] = [];
  for (const part of parts) {
    const ref = parseScriptureRef(part);
    const key = refToString(ref);
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push(ref);
  }
  return refs.sort(compareScriptureRefs);
}
