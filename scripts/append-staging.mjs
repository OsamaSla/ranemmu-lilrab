/**
 * Appends staging rows into the live hymn workbook (single-file workflow).
 *
 * Run: node scripts/append-staging.mjs <live.xlsx> <staging.xlsx>
 *   e.g. node scripts/append-staging.mjs content/hymns-imported.xlsx content/staging-011-100.xlsx
 *
 * Guards: sheet names and headers must match; hymn numbers must not overlap.
 * A backup of the live file is written next to it before modifying.
 */
import { copyFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const [liveArg, stagingArg] = process.argv.slice(2);
if (!liveArg || !stagingArg) {
  console.error('Usage: node scripts/append-staging.mjs <live.xlsx> <staging.xlsx>');
  process.exit(1);
}

const liveWb = new ExcelJS.Workbook();
await liveWb.xlsx.readFile(join(ROOT, liveArg));
const stagingWb = new ExcelJS.Workbook();
await stagingWb.xlsx.readFile(join(ROOT, stagingArg));

const live = liveWb.worksheets[0];
const staging = stagingWb.worksheets[0];
if (live.name !== staging.name) throw new Error(`sheet mismatch: ${live.name} vs ${staging.name}`);

const headerOf = (ws) => ws.getRow(1).values.slice(1).map(String);
if (JSON.stringify(headerOf(live)) !== JSON.stringify(headerOf(staging))) {
  throw new Error('header mismatch — refusing to append');
}

const liveNumbers = new Set();
live.eachRow((r, i) => {
  if (i === 1) return;
  const n = Number(r.getCell(1).value);
  if (Number.isInteger(n) && n >= 1) liveNumbers.add(n);
});

let appended = 0;
let target = live.rowCount + 1;
// Blank separator row (converter convention) unless the live file ends with one.
const lastRow = live.getRow(live.rowCount);
let lastBlank = true;
for (let c = 1; c <= 9; c += 1) {
  if (lastRow.getCell(c).value) {
    lastBlank = false;
    break;
  }
}
if (!lastBlank) target += 1;

staging.eachRow((r, i) => {
  if (i === 1) return; // skip header
  let blank = true;
  for (let c = 1; c <= 9; c += 1) {
    if (r.getCell(c).value) {
      blank = false;
      break;
    }
  }
  if (blank) return; // skip separator rows; live side gets its own
  const raw = r.getCell(1).value;
  const n = raw === '' || raw == null ? NaN : Number(raw);
  if (Number.isInteger(n) && n >= 1 && liveNumbers.has(n)) {
    throw new Error(`hymn number overlap: #${n} already in live file — refusing to append`);
  }
  const row = live.getRow(target);
  for (let c = 1; c <= 9; c += 1) {
    const src = r.getCell(c);
    const dst = row.getCell(c);
    dst.value = src.value ?? '';
    if (src.font) dst.font = { ...src.font };
    if (src.alignment) dst.alignment = { ...src.alignment };
    if (src.dataValidation) dst.dataValidation = { ...src.dataValidation };
  }
  if (Number.isInteger(n) && n >= 1) liveNumbers.add(n);
  target += 1;
  appended += 1;
});

const backup = join(ROOT, dirname(liveArg), `${basename(liveArg, '.xlsx')}.pre-append-backup.xlsx`);
copyFileSync(join(ROOT, liveArg), backup);
await liveWb.xlsx.writeFile(join(ROOT, liveArg));
console.log(`Appended ${appended} rows -> ${liveArg} (backup: ${backup})`);
console.log(`Live file now holds hymns: ${[...liveNumbers].sort((a, b) => a - b).join(', ')}`);
