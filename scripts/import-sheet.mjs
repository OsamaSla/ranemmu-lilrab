/**
 * Imports hymns from a filled-in spreadsheet into content/*.json.
 *
 * Run with: npm run import:sheet -- <file.xlsx> [--out <file.json>]
 * With no file argument, the newest .xlsx in content/ (other than the
 * template itself) is used. Output defaults to content/book-<name>.json.
 *
 * Row rules (also printed in the template's instructions sheet):
 *   - one spreadsheet row = one printed line; stanzas reassemble below
 *   - blank hymn number = same hymn as the row above
 *   - blank stanza label = continuation of the open stanza
 *   - نوع السطر لازمة/قرار = refrain block in place, flagged chorus:true
 *   - الشطر الأول + الثاني filled = halves joined with ❖
 *   - ملاحظات column is never imported
 */
import { readdirSync, statSync, writeFileSync } from 'node:fs';
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
  ['العنوان', 'title'], ['عنوان', 'title'], ['title', 'title'],
  ['نظم', 'tune'], ['اللحن', 'tune'], ['tune', 'tune'],
  ['مقياس الكلام', 'meter'], ['الوزن', 'meter'], ['meter', 'meter'],
  ['كورد', 'key'], ['key', 'key'], ['chord', 'key'],
  ['المؤلف', 'author'], ['author', 'author'],
  ['الملحن', 'composer'], ['composer', 'composer'],
  ['القرار', 'chorus'], ['اللازمة', 'chorus'], ['chorus', 'chorus'],
  ['نوع السطر', 'kind'], ['النوع', 'kind'], ['kind', 'kind'], ['type', 'kind'],
  ['رقم البيت', 'label'], ['البيت', 'label'], ['label', 'label'],
  ['الشطر الأول', 'part1'], ['السطر', 'part1'], ['line', 'part1'], ['part1', 'part1'],
  ['الشطر الثاني', 'part2'], ['part2', 'part2'],
  // Never imported, never warned about.
  ['ملاحظات', 'notes'], ['notes', 'notes'], ['comment', 'notes'],
]);

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const toArabicDigits = (n) => String(n).replace(/[0-9]/g, (d) => AR_DIGITS[Number(d)]);
const fromDigits = (s) =>
  Number(String(s).replace(/[٠-٩]/g, (d) => AR_DIGITS.indexOf(d)));

/** Invisible direction/zero-width marks Excel sometimes carries over. */
const INVISIBLE_RE = /[​‌‍‎‏؜]/g;

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
  return /لازم|قرار|chorus/i.test(v);
}

/** Digits anywhere in the cell (brackets, dots and prefixes tolerated). */
function parseLabel(value) {
  const m = /([0-9٠-٩]+)/.exec(clean(value));
  if (!m) return null;
  const n = fromDigits(m[1]);
  return Number.isInteger(n) && n >= 1 ? toArabicDigits(n) : null;
}

export function importWorksheet(ws, sourceName) {
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
      const role = COLUMNS.get(cellText(cell));
      if (role && !mapping.has(role)) mapping.set(role, c);
    });
    if (mapping.has('number') && mapping.has('title') && mapping.has('part1')) {
      headerRowNumber = n;
      colIndex = mapping;
    }
  });

  if (headerRowNumber === -1) {
    return { hymns, warnings, errors: [`${sourceName}: no header row found (need رقم الترنيمة / العنوان / الشطر الأول)`] };
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
      const meta = { tune: at(row, 'tune'), meter: at(row, 'meter'), key: at(row, 'key'),
        author: at(row, 'author'), composer: at(row, 'composer'), chorus: at(row, 'chorus') };
      for (const [field, value] of Object.entries(meta)) {
        if (value) current[field] = value;
      }
    }

    if (!current) {
      errors.push(`${where}: first data row must carry a hymn number`);
      continue;
    }
    if (title && !current.title) current.title = title;
    if (!current.title) {
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
        label: label ?? toArabicDigits(Math.max(verseCounter, 1)),
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

async function convertFile(xlsxPath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(xlsxPath);
  const ws = wb.getWorksheet('ترانيم') ?? wb.worksheets[0];
  if (!ws) throw new Error(`${basename(xlsxPath)}: workbook has no sheets`);
  return importWorksheet(ws, basename(xlsxPath));
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

  const input = args[0] ?? newestWorkbook();
  if (!input) {
    console.error('no .xlsx found in content/ (the template itself is never imported)');
    process.exit(1);
  }

  const { hymns, warnings, errors } = await convertFile(input);

  for (const w of warnings) console.warn(`warn: ${w}`);

  if (errors.length > 0) {
    console.error(`${errors.length} error(s) — nothing written:`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  const out = outPath ?? join(CONTENT_DIR, `book-${basename(input, extname(input))}.json`);
  writeFileSync(out, JSON.stringify({ hymns }, null, 1) + '\n');
  console.log(`${hymns.length} hymn(s) from ${basename(input)} -> ${out}`);
}

const invoked = process.argv[1] && basename(process.argv[1]) === 'import-sheet.mjs';
if (invoked) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
