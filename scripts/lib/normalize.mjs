/**
 * Build-time mirror of src/data/normalize.ts.
 *
 * scripts/build-corpus.mjs runs under plain Node (not Metro/Babel), so it
 * cannot import the TypeScript module the app uses. Keep the two files in
 * sync: a mismatch would make the prebuilt search index disagree with the
 * query normalisation and silently drop hits.
 */

/** Marks, harakat and annotation signs to discard entirely (non-global on purpose). */
const DROPPED = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06E8\u06EB-\u06ED\u0640\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]/;

/** Explicit many-to-one folds. Anything here changes length. */
const FOLDS = {
  '\u0622': '\u0627',
  '\u0623': '\u0627',
  '\u0625': '\u0627',
  '\u0671': '\u0627',
  '\u0672': '\u0627',
  '\u0673': '\u0627',
  '\u0675': '\u0627',
  '\u0640': '',
  '\u0649': '\u064A',
  '\u06CC': '\u064A',
  '\u06D2': '\u064A',
  '\u0629': '\u0647',
  '\u06C0': '\u0647',
  '\u06C1': '\u0647',
  '\u06C2': '\u0647',
  '\u0624': '\u0648',
  '\u06C4': '\u0648',
  '\u0626': '\u064A',
  '\u06CD': '\u064A',
  '\u06CE': '\u064A',
  '\u06D0': '\u064A',
  '\u0621': '\u0627',
  '\u0660': '0', '\u0661': '1', '\u0662': '2', '\u0663': '3', '\u0664': '4',
  '\u0665': '5', '\u0666': '6', '\u0667': '7', '\u0668': '8', '\u0669': '9',
  '\u06F0': '0', '\u06F1': '1', '\u06F2': '2', '\u06F3': '3', '\u06F4': '4',
  '\u06F5': '5', '\u06F6': '6', '\u06F7': '7', '\u06F8': '8', '\u06F9': '9',
  '\u061B': ';', '\u061F': '?', '\u060C': ',',
  '\u05BE': ' ',
};

/** Punctuation that carries no search meaning. */
const STRIPPED_PUNCT = /[\u060C\u061B\u061F.,!()[\]{}"'`~*_\u2013\u2014\-/\\\u05C0\u05C3\u05F3\u05F4]/;

function normalizeCore(input, withOrigin) {
  const chars = [];
  const origin = [];

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (DROPPED.test(char)) continue;
    if (STRIPPED_PUNCT.test(char)) continue;

    const folded = FOLDS[char] ?? char.toLowerCase();
    if (!withOrigin) {
      chars.push(folded);
      continue;
    }
    for (let k = 0; k < folded.length; k += 1) {
      chars.push(folded[k]);
      origin.push(i);
    }
  }

  return { text: chars.join(''), origin };
}

export function normalize(input) {
  return normalizeCore(input, true);
}

export function normalizeText(input) {
  return normalizeCore(input, false).text;
}
