/**
 * Shared Hebrew checks for the authoring pipeline.
 *
 * `hebrew-apply.mjs` gates the corpus merge and `hebrew-pack.mjs` gates a batch
 * before it can become payloads. They must agree on what "usable Hebrew" means,
 * otherwise a batch passes the packer and is then rejected by the applier — or
 * worse, a laxer check lets a line through and the stricter one is bypassed.
 * Keep the regexes here and import them from both.
 */

/** Diacritics that make a line "vocalised": points, cantillation, dagesh. */
export const POINT = /[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]/;
/** Any Hebrew letter. */
export const HEBREW = /[\u05D0-\u05EA]/;
/** Latin, Arabic, Cyrillic, CJK — anything that must never leak into `*_he`. */
export const FOREIGN = /[A-Za-z\u0600-\u06FF\u0750-\u077F\u0400-\u04FF\u3040-\u30FF\u4E00-\u9FFF]/;

/**
 * Returns the first problem with one authored line, or `null` when it is
 * usable: `empty`, `foreign`, `no-hebrew`, `unpointed`.
 *
 * One code (not an array of flags) on purpose: an empty line cannot also be
 * "unpointed", and the caller maps the code to a message that names the exact
 * stanza and line.
 */
export function checkLine(text) {
  if (typeof text !== 'string' || !text.trim()) return 'empty';
  if (FOREIGN.test(text)) return 'foreign';
  if (!HEBREW.test(text)) return 'no-hebrew';
  if (!POINT.test(text)) return 'unpointed';
  return null;
}
