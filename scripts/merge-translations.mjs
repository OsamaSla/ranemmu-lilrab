#!/usr/bin/env node
/**
 * Merges translation staging sheets into the live workbook.
 *
 * Run with: node scripts/merge-translations.mjs <live.xlsx> <staging1.xlsx> [staging2.xlsx ...]
 * Example : node scripts/merge-translations.mjs content/hymns-imported.xlsx content/staging-en-de-001-020.xlsx content/staging-en-de-021-030.xlsx content/staging-en-de-031-040.xlsx
 *
 * For the EN - English and DE - Deutsch sheets: rows of hymns present in
 * any staging file replace the live rows of the same hymns; all other
 * live rows are kept. The Arabic sheet is never touched. Hymns are kept
 * in ascending number order. Back up the live file yourself first —
 * this overwrites it in place.
 */
import ExcelJS from 'exceljs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LANG_SHEETS = ['EN - English', 'DE - Deutsch'];

/** Split a sheet's data rows into [number, rows[]] groups (header excluded). */
function hymnGroups(ws) {
  const groups = [];
  let current = null;
  for (let n = 2; n <= ws.rowCount; n += 1) {
    const row = ws.getRow(n);
    const numCell = row.getCell(1).value;
    const num = numCell === null || numCell === undefined || numCell === ''
      ? null
      : Number(String(numCell).replace(/[^0-9]/g, ''));
    if (num !== null && (!current || current.number !== num)) {
      current = { number: num, rows: [] };
      groups.push(current);
    }
    if (!current) throw new Error(`${ws.name}#${n}: data before first hymn number`);
    current.rows.push(n);
  }
  return groups;
}

function snapRow(ws, n) {
  const snap = [];
  ws.getRow(n).eachCell({ includeEmpty: true }, (cell, c) => {
    snap[c] = {
      value: cell.value,
      font: cell.font && Object.keys(cell.font).length > 0 ? { ...cell.font } : undefined,
      alignment: cell.alignment ? { ...cell.alignment } : undefined,
    };
  });
  return snap;
}

async function main() {
  const [liveFile, ...stagingFiles] = process.argv.slice(2);
  if (!liveFile || stagingFiles.length === 0) {
    throw new Error('usage: node scripts/merge-translations.mjs <live.xlsx> <staging1.xlsx> [...]');
  }

  const live = new ExcelJS.Workbook();
  await live.xlsx.readFile(join(ROOT, liveFile));

  // Staging rows per language per hymn (later files win on overlap).
  const staged = new Map(LANG_SHEETS.map((s) => [s, new Map()]));
  for (const file of stagingFiles) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(join(ROOT, file));
    for (const name of LANG_SHEETS) {
      const ws = wb.getWorksheet(name);
      if (!ws) continue;
      for (const g of hymnGroups(ws)) staged.get(name).set(g.number, { ws, rows: g.rows });
    }
  }

  for (const name of LANG_SHEETS) {
    const ws = live.getWorksheet(name);
    if (!ws) throw new Error(`${liveFile}: sheet '${name}' missing`);
    // Snapshot kept live rows BEFORE splicing (row numbers shift after).
    const kept = hymnGroups(ws)
      .filter((g) => !staged.get(name).has(g.number))
      .map((g) => ({ number: g.number, snaps: g.rows.map((n) => snapRow(ws, n)) }));
    const stagedList = [...staged.get(name).entries()].map(([number, g]) => ({ number, ...g }));
    const merged = [...kept, ...stagedList].sort((a, b) => a.number - b.number);
    const dupes = merged.map((g) => g.number).filter((n, i, all) => all.indexOf(n) !== i);
    if (dupes.length > 0) throw new Error(`${name}: duplicate hymn(s) ${[...new Set(dupes)]} — aborting before write`);

    // NOTE: worksheet.spliceRows is a no-op in the bundled exceljs build
    // (verified empirically), so rewrite rows in place instead: merged
    // snapshots overwrite rows 2.. and any leftover rows are blanked
    // (the importer skips fully-empty rows).
    const snaps = [];
    for (const g of merged) {
      if (g.snaps) snaps.push(...g.snaps);
      else for (const n of g.rows) snaps.push(snapRow(g.ws, n));
    }
    const maxCol = ws.columnCount;
    const total = Math.max(ws.rowCount - 1, snaps.length);
    for (let i = 0; i < total; i += 1) {
      const row = ws.getRow(i + 2);
      for (let c = 1; c <= maxCol; c += 1) row.getCell(c).value = null;
      const snap = snaps[i];
      if (!snap) continue;
      for (let c = 1; c < snap.length; c += 1) {
        if (!snap[c]) continue;
        const d = row.getCell(c);
        d.value = snap[c].value;
        if (snap[c].font) d.font = snap[c].font;
        if (snap[c].alignment) d.alignment = snap[c].alignment;
      }
    }
    console.log(`${name}: kept ${kept.length} live hymn(s), merged ${stagedList.length} staged hymn(s)`);
  }

  await live.xlsx.writeFile(join(ROOT, liveFile));
  console.log(`wrote ${liveFile} (Arabic sheet untouched)`);
}

main().catch((err) => {
  console.error(err.stack ?? err.message);
  process.exit(1);
});
