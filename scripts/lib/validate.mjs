/**
 * Corpus validation shared by the build and the standalone check.
 *
 * Run directly with: npm run check:hymns
 */

/**
 * Arabic letters that must never appear in hymn content. These are the result
 * of a mangled copy/paste through a non-Unicode-aware editor and are very easy
 * to miss by eye, so they are checked mechanically.
 */
const NON_ARABIC_LETTERS = /[A-Za-z\p{Script=Latin}가-힯぀-ヿ一-鿿]/u;

/**
 * LTR text that *is* legitimate: metre cadences like "87.87.87", plus the
 * human translation fields (checked structurally, not by alphabet).
 */
const ALLOWED_LATIN_FIELDS = new Set([
  'meter',
  'title_en', 'chorus_en',
  'title_de', 'chorus_de',
]);

/** Harakat range, kept for the vocalisation-coverage report in check-hymns. */
export const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭ]/;

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

const PLACEHOLDER_RE = /\u2026/;

function placeholderIn(field, value, where) {
  if (typeof value === 'string' && PLACEHOLDER_RE.test(value)) {
    return `${where}: '${field}' contains … — unfilled template placeholder?`;
  }
  return null;
}

/**
 * Validates a raw hymn array, returning a list of human-readable problems.
 * An empty array means the corpus is good.
 */
export function validateCorpus(hymns) {
  const issues = [];
  const seenNumbers = new Map();
  const seenIds = new Map();

  if (!Array.isArray(hymns)) {
    return ['corpus: expected an array of hymns'];
  }
  if (hymns.length === 0) {
    return ['corpus: no hymns found'];
  }

  hymns.forEach((hymn, i) => {
    const at = `hymn[${i}]`;

    if (typeof hymn.number !== 'number' || !Number.isInteger(hymn.number) || hymn.number < 1) {
      issues.push(`${at}: 'number' must be a positive integer (got ${JSON.stringify(hymn.number)})`);
    }

    if (isBlank(hymn.title)) {
      issues.push(`${at} (${hymn.number ?? '?'}): missing 'title'`);
    } else {
      const ph = placeholderIn('title', hymn.title, `${at} (${hymn.number})`);
      if (ph) issues.push(ph);
    }

    if (hymn.id !== undefined) {
      if (seenIds.has(hymn.id)) {
        issues.push(`${at}: duplicate id '${hymn.id}' (also at ${seenIds.get(hymn.id)})`);
      } else {
        seenIds.set(hymn.id, at);
      }
    }

    if (typeof hymn.number === 'number') {
      if (seenNumbers.has(hymn.number)) {
        issues.push(`${at}: duplicate number ${hymn.number} (also at ${seenNumbers.get(hymn.number)})`);
      } else {
        seenNumbers.set(hymn.number, at);
      }
    }

    // Latin text is only legitimate in a handful of metadata fields. Finding it
    // in a title or verse means mojibake or an untranslated placeholder.
    for (const [field, value] of Object.entries(hymn)) {
      if (typeof value !== 'string' || value === '') continue;
      if (ALLOWED_LATIN_FIELDS.has(field)) continue;
      if (NON_ARABIC_LETTERS.test(value)) {
        const hit = NON_ARABIC_LETTERS.exec(value);
        issues.push(`${at} (${hymn.number}): stray non-Arabic character '${hit[0]}' in '${field}': ${JSON.stringify(value.slice(0, 60))}`);
      }
    }

    if (!Array.isArray(hymn.verses) || hymn.verses.length === 0) {
      issues.push(`${at} (${hymn.number ?? '?'}): missing or empty 'verses'`);
      return;
    }

    hymn.verses.forEach((verse, v) => {
      const vat = `${at}.verses[${v}]`;

      if (isBlank(verse.label)) {
        issues.push(`${vat}: missing stanza 'label'`);
      }
      if (!Array.isArray(verse.lines) || verse.lines.length === 0) {
        issues.push(`${vat}: missing or empty 'lines'`);
        return;
      }
      verse.lines.forEach((line, l) => {
        if (isBlank(line)) {
          issues.push(`${vat}.lines[${l}]: empty line`);
          return;
        }
        if (NON_ARABIC_LETTERS.test(line)) {
          const hit = NON_ARABIC_LETTERS.exec(line);
          issues.push(`${vat}.lines[${l}]: stray non-Arabic character '${hit[0]}': ${JSON.stringify(line.slice(0, 60))}`);
        }
        const ph = placeholderIn('line', line, `${vat}.lines[${l}]`);
        if (ph) issues.push(ph);
      });
    });

    // Translations mirror the Arabic stanza-for-stanza so indices, refs and
    // the reader's fallback stay aligned. Only structure is checked here —
    // the Arabic-only letter rules above must not run on foreign text.
    for (const lang of ['en', 'de']) {
      const key = `verses_${lang}`;
      const tv = hymn[key];
      if (tv === undefined) continue;
      if (!Array.isArray(tv) || tv.length !== hymn.verses.length) {
        issues.push(
          `${at} (${hymn.number}): '${key}' has ${Array.isArray(tv) ? tv.length : 'no'} stanzas vs ${hymn.verses.length} in Arabic — must match one-to-one`,
        );
        continue;
      }
      tv.forEach((verse, v) => {
        const vat = `${at}.${key}[${v}]`;
        if (!Array.isArray(verse.lines) || verse.lines.length === 0) {
          issues.push(`${vat}: missing or empty 'lines'`);
          return;
        }
        if (verse.lines.length !== hymn.verses[v].lines.length) {
          issues.push(
            `${vat}: ${verse.lines.length} lines vs ${hymn.verses[v].lines.length} in Arabic stanza ${v + 1} — must match`,
          );
        }
        verse.lines.forEach((line, l) => {
          if (isBlank(line)) issues.push(`${vat}.lines[${l}]: empty line`);
          const ph = placeholderIn('line', line, `${vat}.lines[${l}]`);
          if (ph) issues.push(ph);
        });
      });
    }

    if (hymn.chorus !== undefined && isBlank(hymn.chorus)) {
      issues.push(`${at}: 'chorus' present but blank — omit the key instead`);
    }
  });

  return issues;
}

/** Formats issues as an indented, numbered list for terminal output. */
export function formatIssues(issues) {
  return issues.map((issue, i) => `  ${i + 1}. ${issue}`).join('\n');
}
