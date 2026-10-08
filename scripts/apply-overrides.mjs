/**
 * Merges a device-exported admin patch set into the authoring files.
 *
 * Run with: node scripts/apply-overrides.mjs <export.json>
 * The export comes from Admin → Export changes (Share) and looks like:
 *   { app, version, exportedAt, overrides: { "<hymnId>": { title?, verses?, ... } } }
 *
 * Writes:
 *   content/hymns-imported.xlsx  (Arabic sheet: titles, lines, meter, chorus)
 *   content/authors.json          (author/authorOriginal, source:"manual")
 *
 * Hymn ids are stable (hNNNN from the original number); the CURRENT number
 * of a hymn is patch.number ?? <id-derived>. After applying, run
 * `npm run add-batch` — its check gate re-validates everything.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = join(ROOT, 'content');
const XLSX = join(CONTENT_DIR, 'hymns-imported.xlsx');
const AUTHORS = join(CONTENT_DIR, 'authors.json');

const idToOriginalNumber = (id) => {
  const m = /^h(\d{1,4})$/.exec(id ?? '');
  return m ? Number(m[1]) : null;
};

async function main() {
  const [exportPath] = process.argv.slice(2);
  if (!exportPath) {
    console.error('usage: node scripts/apply-overrides.mjs <export.json>');
    process.exit(1);
  }
  const payload = JSON.parse(readFileSync(exportPath, 'utf8'));
  const overrides = payload.overrides ?? {};
  const ids = Object.keys(overrides);
  if (ids.length === 0) {
    console.log('no overrides in export — nothing to do');
    return;
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(XLSX);
  const ws = wb.getWorksheet('ترانيم') ?? wb.worksheets[0];

  // Locate the header row and column roles (same contract as import-sheet).
  let headerRow = -1;
  const col = {};
  ws.eachRow((row, n) => {
    if (headerRow !== -1) return;
    row.eachCell((cell, c) => {
      // Headers match with harakat stripped (الصَّدْر vs الصدر).
      const header = String(cell.value ?? '').replace(/[ً-ٰٰٟ]/g, '').trim();
      if (/رقم الترنيمة|Hymn No|Liednr/.test(header)) col.number = c;
      else if (/العنوان|Title|Titel/.test(header)) col.title = c;
      else if (/مقياس|Meter|Metrum/.test(header)) col.meter = c;
      else if (/القرار|Chorus|Kehrvers/.test(header)) col.chorus = c;
      else if (/الصدر|First half|Erste/.test(header)) col.part1 = c;
    });
    if (col.number && col.title && col.part1) headerRow = n;
  });
  if (headerRow === -1) throw new Error('no header row found in Arabic sheet');

  // Map hymn number -> its row numbers (first row carries the number).
  const blocks = new Map();
  let current = null;
  for (let n = headerRow + 1; n <= ws.rowCount; n += 1) {
    const row = ws.getRow(n);
    const raw = row.getCell(col.number).value;
    const hasText = [col.title, col.part1].some((c) => String(row.getCell(c).value ?? '').trim() !== '');
    if (raw !== null && raw !== undefined && String(raw).trim() !== '') {
      current = Number(String(raw).replace(/[^0-9]/g, ''));
      if (!blocks.has(current)) blocks.set(current, []);
    }
    if (current !== null && hasText) blocks.get(current).push(n);
  }

  const authors = JSON.parse(readFileSync(AUTHORS, 'utf8'));
  let touched = 0;

  for (const id of ids) {
    const patch = overrides[id];
    const original = idToOriginalNumber(id);
    const number = patch.number ?? original;
    if (!Number.isInteger(number) || number < 1) throw new Error(`${id}: bad hymn number`);
    const rows = blocks.get(number);
    if (!rows) throw new Error(`${id}: hymn ${number} not found in workbook`);
    const first = ws.getRow(rows[0]);

    if (patch.title !== undefined) first.getCell(col.title).value = patch.title;
    if (patch.meter !== undefined && col.meter) first.getCell(col.meter).value = patch.meter || null;
    if (patch.chorus !== undefined && col.chorus) first.getCell(col.chorus).value = patch.chorus || null;
    if (patch.number !== undefined) first.getCell(col.number).value = patch.number;

    if (patch.verses !== undefined) {
      const flat = patch.verses.flatMap((v) => v.lines);
      if (flat.length !== rows.length) {
        throw new Error(
          `${id}: ${flat.length} edited lines vs ${rows.length} workbook rows — structural edits are PC-only, fix by hand`,
        );
      }
      rows.forEach((rn, i) => {
        ws.getRow(rn).getCell(col.part1).value = flat[i];
      });
    }

    if (patch.author !== undefined || patch.authorOriginal !== undefined) {
      const prev = authors[number] ?? authors[String(number)] ?? {};
      authors[number] = {
        ...prev,
        ...(patch.author !== undefined ? { author: patch.author } : {}),
        ...(patch.authorOriginal !== undefined ? { authorOriginal: patch.authorOriginal } : {}),
        source: 'manual',
      };
      if (!authors[number].author) delete authors[number].author;
      if (!authors[number].authorOriginal) delete authors[number].authorOriginal;
    }
    touched += 1;
  }

  // Number uniqueness guard (swaps move two hymns at once).
  const seen = new Map();
  ws.eachRow((row, n) => {
    if (n <= headerRow) return;
    const raw = row.getCell(col.number).value;
    if (raw === null || raw === undefined || String(raw).trim() === '') return;
    const num = Number(String(raw).replace(/[^0-9]/g, ''));
    if (seen.has(num)) throw new Error(`duplicate hymn number ${num} (rows ${seen.get(num)} and ${n})`);
    seen.set(num, n);
  });

  await wb.xlsx.writeFile(XLSX);
  writeFileSync(AUTHORS, JSON.stringify(authors, null, 1) + '\n');
  console.log(`applied ${touched} hymn(s) -> ${basename(XLSX)} + authors.json`);
  console.log('now run: npm run add-batch');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

