/**
 * Applies content/meter-fixes.json to the authoring workbooks.
 *
 * Each entry { book, number, meter } rewrites the مقياس الكلام cell on the
 * hymn's first row in the Arabic master sheet. After running, re-import and
 * rebuild like the inbox workflow does:
 *
 *   node scripts/fix-meters.mjs
 *   node scripts/import-sheet.mjs content/taranim-rohiya.xlsx --out content/book-taranim-rohiya.json --book taranim --authors drafts/authors-taranim.json
 *   npm run check:hymns && npm run build:corpus
 *
 * The mapping lives in scripts/ (not content/): check:hymns and build:corpus
 * read every content/*.json as hymn data, so it must not live there.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WORKBOOKS = {
  main: 'content/hymns-imported.xlsx',
  taranim: 'content/taranim-rohiya.xlsx',
};

const clean = (v) => String(v ?? '').replace(/[\u200B-\u200F\u0610-\u061A\u064B-\u065F]/g, '').replace(/\s{2,}/g, ' ').trim();

async function main() {
  const fixes = JSON.parse(readFileSync(join(ROOT, 'scripts', 'meter-fixes.json'), 'utf8'));
  const byBook = new Map();
  for (const f of fixes) {
    if (!WORKBOOKS[f.book] || !Number.isInteger(f.number) || typeof f.meter !== 'string') {
      throw new Error(`bad fix entry: ${JSON.stringify(f)}`);
    }
    if (!byBook.has(f.book)) byBook.set(f.book, []);
    byBook.get(f.book).push(f);
  }

  for (const [book, list] of byBook) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(join(ROOT, WORKBOOKS[book]));
    const ws = wb.worksheets[0];
    // Locate the header row and the number/meter columns.
    let headerRow = -1;
    let numCol = -1;
    let meterCol = -1;
    ws.eachRow((row, n) => {
      if (headerRow !== -1) return;
      row.eachCell((cell, c) => {
        const t = clean(cell.value && cell.value.richText ? cell.value.richText.map((r) => r.text).join('') : cell.value);
        if (t === 'رقم الترنيمة' || t === 'Hymn No.') numCol = numCol === -1 ? c : numCol;
        if (t === 'مقياس الكلام') meterCol = c;
      });
      if (numCol !== -1 && meterCol !== -1) headerRow = n;
    });
    if (headerRow === -1) throw new Error(`${WORKBOOKS[book]}: header row not found`);

    const seen = new Set();
    for (let n = headerRow + 1; n <= ws.rowCount; n += 1) {
      const row = ws.getRow(n);
      const numText = clean(row.getCell(numCol).value);
      if (!numText) continue;
      const number = Number(numText.replace(/[^0-9]/g, ''));
      const fix = list.find((f) => f.number === number);
      if (fix && !seen.has(number)) {
        row.getCell(meterCol).value = fix.meter;
        seen.add(number);
      }
    }
    const missing = list.filter((f) => !seen.has(f.number));
    if (missing.length > 0) throw new Error(`${book}: hymns not found: ${missing.map((f) => f.number).join(',')}`);
    await wb.xlsx.writeFile(join(ROOT, WORKBOOKS[book]));
    console.log(`${book}: updated ${seen.size} meter(s)`);
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
