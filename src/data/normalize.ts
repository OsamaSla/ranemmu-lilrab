/**
 * Arabic text normalisation for search.
 *
 * The goal is that a user typing without diacritics, without tatweel, and with
 * whichever hamza/yeh/teh-marbuta spelling their keyboard produces still
 * matches the printed text. A naive `String.replace` chain cannot be used for
 * highlighting because collapsing several characters into one shifts indices,
 * so `normalize()` also returns a map back to the original positions.
 */

/**
 * Marks, harakat, and Quranic annotation signs to discard entirely.
 * Written with explicit escapes: literal Arabic ranges are treacherous because
 * a range end glyph can sit *after* the alphabet in code-point order, silently
 * swallowing every letter (this exact bug once shipped here).
 * Deliberately not /g: a global regex used with `.test()` carries `lastIndex`
 * between calls, which silently drops alternating characters.
 */
const DROPPED = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06E8\u06EB-\u06ED\u0640]/;

/** Explicit many-to-one folds. Anything here changes length. */
const FOLDS: Record<string, string> = {
  // Alif variants -> bare alif
  '\u0622': '\u0627', // آ
  '\u0623': '\u0627', // أ
  '\u0625': '\u0627', // إ
  '\u0671': '\u0627', // ٱ
  '\u0672': '\u0627', // ٲ
  '\u0673': '\u0627', // ٳ
  '\u0675': '\u0627', // ٵ
  '\u0640': '', // ـ  tatweel
  // Yeh variants -> ي
  '\u0649': '\u064A', // ى
  '\u06CC': '\u064A', // ی
  '\u06D2': '\u064A', // ے
  // Teh marbuta -> ه
  '\u0629': '\u0647', // ة
  '\u06C0': '\u0647', // ۀ
  '\u06C1': '\u0647', // ہ
  '\u06C2': '\u0647', // ۂ
  // Waw with hamza
  '\u0624': '\u0648', // ؤ
  '\u06C4': '\u0648', // ۄ
  // Yeh with hamza below / alef maksura folded above
  '\u0626': '\u064A', // ئ
  '\u06CD': '\u064A', // ۍ
  '\u06CE': '\u064A', // ێ
  '\u06D0': '\u064A', // ې
  // Hamza on its own -> alif
  '\u0621': '\u0627', // ء
  // Arabic-Indic and Eastern Arabic digits -> ASCII, so "١٢٣" matches "123"
  '\u0660': '0', '\u0661': '1', '\u0662': '2', '\u0663': '3', '\u0664': '4',
  '\u0665': '5', '\u0666': '6', '\u0667': '7', '\u0668': '8', '\u0669': '9',
  '\u06F0': '0', '\u06F1': '1', '\u06F2': '2', '\u06F3': '3', '\u06F4': '4',
  '\u06F5': '5', '\u06F6': '6', '\u06F7': '7', '\u06F8': '8', '\u06F9': '9',
  // Punctuation that differs between sources
  '\u061B': ';', '\u061F': '?', '\u060C': ',',
};

/** Punctuation that differs between sources and carries no search meaning. */
const STRIPPED_PUNCT = /[\u060C\u061B\u061F.,!()[\]{}"'`~*_\u2013\u2014\-/\\]/;

export interface Normalized {
  text: string;
  /**
   * `origin[n]` is the index in the source string that produced `text[n]`.
   * Same length as `text`.
   */
  origin: number[];
}

/**
 * Normalise `input`, returning the folded text plus a per-character map back
 * to the source. Callers use `origin[matchStart]` and `origin[matchEnd - 1]`
 * to highlight the untouched original.
 */
export function normalize(input: string): Normalized {
  const chars: string[] = [];
  const origin: number[] = [];

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (DROPPED.test(char)) continue;
    if (STRIPPED_PUNCT.test(char)) continue;

    const folded = FOLDS[char] ?? char;
    for (let k = 0; k < folded.length; k += 1) {
      chars.push(folded[k]);
      origin.push(i);
    }
  }

  return { text: chars.join(''), origin };
}

/** Convenience wrapper when highlight positions are not needed. */
export function normalizeText(input: string): string {
  return normalize(input).text;
}

/** The digits shown for a stanza/line reference, matching the printed book. */
export function toArabicDigits(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => '\u0660' + Number(d));
}
