/**
 * Imports hymns from a filled-in spreadsheet into content/*.json.
 *
 * Run with: npm run import:sheet -- <file.xlsx> [--out <file.json>]
 * With no file argument, the newest .xlsx in content/ (other than the
 * template itself) is used. Output defaults to content/book-<name>.json.
 *
 * Sheets: the Arabic sheet is the master; `EN - English` and `DE - Deutsch`
 * hold optional translations with the SAME hymn numbers. Absent hymns stay
 * Arabic — translation is per hymn, never mandatory. A translation whose
 * stanza count differs from the Arabic blocks the import until fixed.
 *
 * Row rules (also printed in the template's instructions sheet):
 *   - one spreadsheet row = one printed verse (بيت); stanzas (مقاطع) reassemble
 *   - blank hymn number = same hymn as the row above
 *   - blank stanza label = continuation of the open stanza
 *   - kind لازمة/refrain/Kehrvers = refrain block in place, chorus:true
 *   - الصدر + العجز filled = بيت تام joined with ❖; صدر alone = مشطور
 *   - ملاحظات/Notes column is never imported
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = join(ROOT, 'content');

/** Two half-lines in their own columns are joined with this ornament. */
const HALF_JOINER = ' \u2756 ';

/** Header texts (trimmed) mapped to schema roles. */
const COLUMNS = new Map([
  ['رقم الترنيمة', 'number'], ['الرقم', 'number'], ['رقم', 'number'], ['number', 'number'],
  ['Hymn No.', 'number'], ['Liednr.', 'number'], ['Nummer', 'number'],
  ['العنوان', 'title'], ['عنوان', 'title'], ['title', 'title'],
  ['Title', 'title'], ['Titel', 'title'],
  ['مقياس الكلام', 'meter'], ['الوزن', 'meter'], ['meter', 'meter'],
  ['Meter', 'meter'], ['Metrum', 'meter'],
  ['القرار', 'chorus'], ['اللازمة', 'chorus'], ['chorus', 'chorus'],
  ['Chorus label', 'chorus'], ['Kehrvers', 'chorus'],
  ['نوع المقطع', 'kind'], ['نوع السطر', 'kind'], ['النوع', 'kind'], ['kind', 'kind'], ['type', 'kind'],
  ['Kind', 'kind'], ['Art', 'kind'],
  ['رقم المقطع', 'label'], ['المقطع', 'label'],
  ['رقم البيت', 'label'], ['البيت', 'label'], ['label', 'label'],
  ['Stanza No.', 'label'], ['Strophennr.', 'label'], ['Strophe', 'label'],
  ['الصدر', 'part1'], ['صدر', 'part1'],
  ['الشطر الأول', 'part1'], ['السطر', 'part1'], ['line', 'part1'], ['part1', 'part1'],
  ['First half', 'part1'], ['Erste Hälfte', 'part1'],
  ['العجز', 'part2'], ['عجز', 'part2'],
  ['الشطر الثاني', 'part2'], ['part2', 'part2'],
  ['Second half', 'part2'], ['Zweite Hälfte', 'part2'],
  // Never imported, never warned about.
  ['ملاحظات', 'notes'], ['notes', 'notes'], ['comment', 'notes'],
  ['Notes', 'notes'], ['Notizen', 'notes'],
]);

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
/** Display labels use Western digits; fromDigits still reads both forms. */
const toWesternDigits = (n) => String(n);
const fromDigits = (s) =>
  Number(String(s).replace(/[٠-٩]/g, (d) => AR_DIGITS.indexOf(d)));

/** Invisible direction/zero-width marks Excel sometimes carries over. */
const INVISIBLE_RE = /[​‌‍‎‏؜]/g;

/** Headers match with harakat stripped, so vocalised and plain forms agree. */
const HARAKAT_RE = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06E8\u06EB-\u06ED]/g;
function canonicalHeader(text) {
  return clean(text).replace(HARAKAT_RE, '');
}

function clean(value) {
  return String(value ?? '').replace(INVISIBLE_RE, '').replace(/\s{2,}/g, ' ').trim();
}

/** ExcelJS cells can be strings, numbers, rich text, booleans or null. */
function cellText(cell) {
  const v = cell?.value;
  if (v === null || v === undefined) return '';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return clean(v);
  if (typeof v === 'object') {
    if (Array.isArray(v.richText)) return clean(v.richText.map((r) => r.text).join(''));
    if (typeof v.text === 'string') return clean(v.text);
    if (v.result !== undefined) return clean(v.result);
  }
  return '';
}

function isChorusKind(value) {
  const v = clean(value);
  if (!v) return false;
  return /لازم|قرار|chorus|refrain|kehrvers/i.test(v);
}

/** Digits anywhere in the cell (brackets, dots and prefixes tolerated). */
function parseLabel(value) {
  const m = /([0-9٠-٩]+)/.exec(clean(value));
  if (!m) return null;
  const n = fromDigits(m[1]);
  return Number.isInteger(n) && n >= 1 ? toWesternDigits(n) : null;
}

/**
 * Parses one sheet. `lang` is 'ar' for the master, 'en'/'de' for translations:
 * title and chorus-label land on the suffixed fields, metre is only ever
 * taken from the Arabic master (it is language-neutral).
 */
export function importWorksheet(ws, sourceName, lang = 'ar') {
  const warnings = [];
  const errors = [];
  const hymns = [];

  // Locate the header row: first row containing a known header.
  let headerRowNumber = -1;
  let colIndex = new Map();
  ws.eachRow((row, n) => {
    if (headerRowNumber !== -1) return;
    const mapping = new Map();
    row.eachCell((cell, c) => {
      const role = COLUMNS.get(canonicalHeader(cellText(cell)));
      if (role && !mapping.has(role)) mapping.set(role, c);
    });
    if (mapping.has('number') && mapping.has('title') && mapping.has('part1')) {
      headerRowNumber = n;
      colIndex = mapping;
    }
  });

  if (headerRowNumber === -1) {
    return { hymns, warnings, errors: [`${sourceName}: no header row found (need رقم الترنيمة / العنوان / الصدر)`] };
  }

  const at = (row, role) => {
    const c = colIndex.get(role);
    return c === undefined ? '' : cellText(row.getCell(c));
  };

  let current = null;
  let openStanza = null;
  let verseCounter = 0;

  const finishHymn = () => {
    if (!current) return;
    if (current.verses.length === 0) {
      errors.push(`${current.where}: hymn ${current.number} has no stanzas — skipped`);
    } else if (/…/.test(current.title)) {
      warnings.push(`${current.where}: placeholder hymn '${current.title}' skipped (unfilled template block?)`);
    } else {
      delete current.where;
      hymns.push(current);
    }
    current = null;
    openStanza = null;
  };

  for (let n = headerRowNumber + 1; n <= ws.rowCount; n += 1) {
    const row = ws.getRow(n);
    const where = `${sourceName}#${n}`;
    const rawNumber = at(row, 'number');
    const title = at(row, 'title');
    const part1 = at(row, 'part1');
    const part2 = at(row, 'part2');
    const kind = at(row, 'kind');
    const rawLabel = at(row, 'label');

    if (!rawNumber && !title && !part1 && !part2 && !rawLabel && !kind) continue;

    const number = rawNumber ? fromDigits(rawNumber.replace(/[^0-9٠-٩]/g, '')) : null;
    if (rawNumber && (!Number.isInteger(number) || number < 1)) {
      errors.push(`${where}: bad hymn number '${rawNumber}'`);
      continue;
    }

    if (number !== null && (!current || current.number !== number)) {
      finishHymn();
      current = { number, title: title || '', verses: [], where: `${where} (hymn ${number})` };
      verseCounter = 0;
      const suffix = lang === 'ar' ? '' : `_${lang}`;
      // Metre is language-neutral: only the Arabic sheet may set it.
      const meta = {
        ...(lang === 'ar' ? { meter: at(row, 'meter') } : {}),
        [`chorus${suffix}`]: at(row, 'chorus'),
      };
      for (const [field, value] of Object.entries(meta)) {
        if (value) current[field] = value;
      }
    }

    if (!current) {
      errors.push(`${where}: first data row must carry a hymn number`);
      continue;
    }
    const titleField = lang === 'ar' ? 'title' : `title_${lang}`;
    if (title && !current[titleField]) current[titleField] = title;
    if (!current[titleField]) {
      errors.push(`${where}: hymn ${current.number} has no title yet (put it on its first row)`);
      continue;
    }

    const line = [part1, part2].filter((p) => p).join(HALF_JOINER);
    if (!line) {
      if (kind || rawLabel) warnings.push(`${where}: row has kind/label but no text — ignored`);
      continue;
    }

    const chorus = isChorusKind(kind);
    const label = parseLabel(rawLabel);
    const sameBlock =
      openStanza !== null && openStanza.chorus === chorus && (label === null || label === openStanza.label);

    if (!sameBlock) {
      if (!chorus) verseCounter += 1;
      openStanza = {
        label: label ?? toWesternDigits(Math.max(verseCounter, 1)),
        lines: [],
        chorus,
      };
      current.verses.push(openStanza);
    }
    openStanza.lines.push(line);
  }

  finishHymn();

  // Strip the internal flag into the schema shape.
  for (const hymn of hymns) {
    for (const stanza of hymn.verses) {
      if (stanza.chorus === false) delete stanza.chorus;
    }
  }

  return { hymns, warnings, errors };
}

/** Sheet name (or fallback position) mapped to content language. */
const SHEET_LANGS = [
  { match: (name) => name === 'ترانيم', lang: 'ar' },
  { match: (name) => name === 'EN - English', lang: 'en' },
  { match: (name) => name === 'DE - Deutsch', lang: 'de' },
];

/** Returns null when shapes match, otherwise a human-readable mismatch. */
function shapeMismatch(a, b) {
  if (a.length !== b.length) return `${b.length} stanzas vs ${a.length} in Arabic`;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].lines.length !== b[i].lines.length) {
      return `stanza ${i + 1} has ${b[i].lines.length} lines vs ${a[i].lines.length} in Arabic`;
    }
  }
  return null;
}

/**
 * Merges translation sheets into the Arabic master by hymn number. A hymn
 * with no translation rows keeps only Arabic — that absence is the entire
 * "optional translation" mechanism. Stanza-count mismatch blocks the import.
 */
function mergeTranslations(master, translated, lang, sourceName, warnings, errors) {
  const byNumber = new Map(master.map((h) => [h.number, h]));
  let attached = 0;

  for (const t of translated) {
    const base = byNumber.get(t.number);
    if (!base) {
      warnings.push(`${t.where ?? sourceName}: ${lang} translation of hymn ${t.number} has no Arabic original — skipped`);
      continue;
    }
    const mismatch = shapeMismatch(base.verses, t.verses);
    if (mismatch) {
      errors.push(
        `${t.where ?? sourceName}: ${lang} translation of hymn ${t.number}: ${mismatch} — fix to match one-to-one`,
      );
      continue;
    }
    if (t[`title_${lang}`]) base[`title_${lang}`] = t[`title_${lang}`];
    if (t[`chorus_${lang}`]) base[`chorus_${lang}`] = t[`chorus_${lang}`];
    base[`verses_${lang}`] = t.verses;
    attached += 1;
  }

  return attached;
}

async function convertFile(xlsxPath, { book = null, authorsName = 'authors.json' } = {}) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(xlsxPath);
  if (wb.worksheets.length === 0) throw new Error(`${basename(xlsxPath)}: workbook has no sheets`);

  const warnings = [];
  const errors = [];
  const counts = { ar: 0, en: 0, de: 0 };

  // Sheets carrying one of the known names parse into their language;
  // anything else is ignored unless it is the only sheet (single-sheet file).
  const targets = wb.worksheets
    .map((ws) => {
      const known = SHEET_LANGS.find((s) => s.match(ws.name));
      return known ? { ws, lang: known.lang } : null;
    })
    .filter(Boolean);

  const plan = targets.length > 0 ? targets : [{ ws: wb.worksheets[0], lang: 'ar' }];

  const parsed = new Map();
  for (const { ws, lang } of plan) {
    const result = importWorksheet(ws, `${basename(xlsxPath)}:${ws.name}`, lang);
    warnings.push(...result.warnings);
    errors.push(...result.errors);
    parsed.set(lang, result.hymns);
  }

  const hymns = parsed.get('ar') ?? [];
  counts.ar = hymns.length;
  for (const lang of ['en', 'de']) {
    if (!parsed.has(lang)) continue;
    counts[lang] = mergeTranslations(hymns, parsed.get(lang), lang, `${basename(xlsxPath)}`, warnings, errors);
  }

  // Author credits live outside the workbook (extracted from the saved
  // hymnary pages by scripts/extract-authors.mjs). Hymns without an entry
  // simply carry no author — the app hides the line for those.
  try {
    const authors = JSON.parse(readFileSync(join(CONTENT_DIR, authorsName), 'utf8'));
    for (const hymn of hymns) {
      const credit = authors[hymn.number] ?? authors[String(hymn.number)];
      if (!credit) continue;
      if (credit.author) hymn.author = credit.author;
      if (credit.authorOriginal) hymn.authorOriginal = credit.authorOriginal;
    }
  } catch {
    warnings.push(`${authorsName} missing or unreadable — hymns imported without author credits`);
  }

  if (book) {
    for (const hymn of hymns) hymn.book = book;
  }

  hymns.sort((a, b) => a.number - b.number);
  return { hymns, warnings, errors, counts };
}

function newestWorkbook() {
  const files = readdirSync(CONTENT_DIR)
    .filter((f) => f.toLowerCase().endsWith('.xlsx') && f.toLowerCase() !== 'template.xlsx')
    .map((f) => ({ f, t: statSync(join(CONTENT_DIR, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  return files.length > 0 ? join(CONTENT_DIR, files[0].f) : null;
}

async function main() {
  const args = process.argv.slice(2);
  const outFlag = args.indexOf('--out');
  let outPath = null;
  if (outFlag !== -1) {
    outPath = args[outFlag + 1];
    args.splice(outFlag, 2);
  }
  const bookFlag = args.indexOf('--book');
  let book = null;
  if (bookFlag !== -1) {
    book = args[bookFlag + 1];
    args.splice(bookFlag, 2);
  }
  const authorsFlag = args.indexOf('--authors');
  let authorsName = 'authors.json';
  if (authorsFlag !== -1) {
    authorsName = args[authorsFlag + 1];
    args.splice(authorsFlag, 2);
  }

  const input = args[0] ?? newestWorkbook();
  if (!input) {
    console.error('no .xlsx found in content/ (the template itself is never imported)');
    process.exit(1);
  }

  const { hymns, warnings, errors, counts } = await convertFile(input, { book, authorsName });

  for (const w of warnings) console.warn(`warn: ${w}`);

  if (errors.length > 0) {
    console.error(`${errors.length} error(s) — nothing written:`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  const out = outPath ?? join(CONTENT_DIR, `book-${basename(input, extname(input))}.json`);
  writeFileSync(out, JSON.stringify({ hymns }, null, 1) + '\n');
  const langs = [`${counts.ar} Arabic`];
  if (counts.en > 0) langs.push(`${counts.en} with English`);
  if (counts.de > 0) langs.push(`${counts.de} with German`);
  console.log(`${hymns.length} hymn(s) from ${basename(input)} -> ${out} (${langs.join(', ')})`);
}

const invoked = process.argv[1] && basename(process.argv[1]) === 'import-sheet.mjs';
if (invoked) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
