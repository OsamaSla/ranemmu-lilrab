/**
 * Merges a device-exported admin patch set into the authoring files.
 *
 * Run with: node scripts/apply-overrides.mjs <export.json>
 * The export comes from Admin → Export changes (Share) and looks like:
 *   { app, version, exportedAt, overrides: { "<hymnId>": { title?, verses?, ... } } }
 *
 * Hymn ids route to their book by prefix:
 *   hNNNN (main)    -> content/hymns-imported.xlsx + content/authors.json
 *   trNNNN (taranim)-> content/taranim-rohiya.xlsx + content/drafts/authors-taranim.json
 *
 * Writes per touched hymn:
 *   Arabic sheet  (ترانيم): titles, lines, meter, chorus
 *   EN / DE sheets (EN - English, DE - Deutsch): translated titles, lines,
 *     chorus labels — stanza/line counts must match the Arabic, same as import
 *   authors file  (author/authorOriginal; main entries keep source:"manual")
 *
 * Hymn ids are stable (hNNNN/trNNNN from the original number); the CURRENT
 * number of a hymn is patch.number ?? <id-derived>. After applying, run
 * `npm run add-batch` — its check gate re-validates everything.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = join(ROOT, 'content');

const BOOKS = {
  main: {
    xlsx: join(CONTENT_DIR, 'hymns-imported.xlsx'),
    authors: join(CONTENT_DIR, 'authors.json'),
    idRe: /^h(\d{1,4})$/,
    arabicSheet: 'ترانيم',
    authorSource: 'manual',
  },
  taranim: {
    xlsx: join(CONTENT_DIR, 'taranim-rohiya.xlsx'),
    authors: join(CONTENT_DIR, 'drafts', 'authors-taranim.json'),
    idRe: /^tr(\d{1,4})$/,
    arabicSheet: 'ترانيم',
    authorSource: null,
  },
};

/** Translation sheet per language, with the column-header contract of import. */
const LANG_SHEET = { en: 'EN - English', de: 'DE - Deutsch' };
const LANG_TITLE = { en: 'title_en', de: 'title_de' };
const LANG_CHORUS = { en: 'chorus_en', de: 'chorus_de' };
const LANG_VERSES = { en: 'verses_en', de: 'verses_de' };

/** Locate the header row and column roles (same contract as import-sheet). */
function locateColumns(ws) {
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
  return { headerRow, col };
}

/** Map hymn number -> its row numbers (first row carries the number). */
function collectBlocks(ws, col, headerRow) {
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
  return blocks;
}

function guardUniqueNumbers(ws, col, headerRow) {
  const seen = new Map();
  ws.eachRow((row, n) => {
    if (n <= headerRow) return;
    const raw = row.getCell(col.number).value;
    if (raw === null || raw === undefined || String(raw).trim() === '') return;
    const num = Number(String(raw).replace(/[^0-9]/g, ''));
    if (seen.has(num)) throw new Error(`duplicate hymn number ${num} (rows ${seen.get(num)} and ${n})`);
    seen.set(num, n);
  });
}

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

  // Group patches by book from their id prefix.
  const byBook = { main: [], taranim: [] };
  for (const id of ids) {
    const book = Object.keys(BOOKS).find((b) => BOOKS[b].idRe.test(id ?? ''));
    if (!book) throw new Error(`${id}: unknown hymn id (expected hNNNN or trNNNN)`);
    const original = Number(BOOKS[book].idRe.exec(id)[1]);
    byBook[book].push({ id, patch: overrides[id], original });
  }

  for (const [book, items] of Object.entries(byBook)) {
    if (items.length === 0) continue;
    const cfg = BOOKS[book];
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(cfg.xlsx);

    const sheets = {};
    const arabic = wb.getWorksheet(cfg.arabicSheet) ?? wb.worksheets[0];
    sheets.ar = { ws: arabic, ...locateColumns(arabic) };
    if (sheets.ar.headerRow === -1) throw new Error(`${basename(cfg.xlsx)}: no header row found in Arabic sheet`);
    for (const lang of ['en', 'de']) {
      const ws = wb.getWorksheet(LANG_SHEET[lang]);
      if (!ws) continue;
      const located = locateColumns(ws);
      if (located.headerRow !== -1) sheets[lang] = { ws, ...located };
    }

    const blocks = {};
    for (const [key, s] of Object.entries(sheets)) blocks[key] = collectBlocks(s.ws, s.col, s.headerRow);

    const authors = JSON.parse(readFileSync(cfg.authors, 'utf8'));
    let touched = 0;

    for (const { id, patch, original } of items) {
      const number = patch.number ?? original;
      if (!Number.isInteger(number) || number < 1) throw new Error(`${id}: bad hymn number`);
      const rows = blocks.ar.get(number);
      if (!rows) throw new Error(`${id}: hymn ${number} not found in ${basename(cfg.xlsx)}`);
      const first = sheets.ar.ws.getRow(rows[0]);
      const col = sheets.ar.col;

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
          sheets.ar.ws.getRow(rn).getCell(col.part1).value = flat[i];
        });
      }

      // Translations land on the EN/DE sheets row-for-row, same shape guard.
      for (const lang of ['en', 'de']) {
        const title = patch[LANG_TITLE[lang]];
        const chorus = patch[LANG_CHORUS[lang]];
        const verses = patch[LANG_VERSES[lang]];
        if (title === undefined && chorus === undefined && verses === undefined) continue;
        const s = sheets[lang];
        if (!s) throw new Error(`${id}: ${lang} translation has no '${LANG_SHEET[lang]}' sheet in ${basename(cfg.xlsx)}`);
        const trows = blocks[lang].get(number);
        if (!trows) throw new Error(`${id}: hymn ${number} has no ${lang} rows — add the translation on PC first`);
        if (title !== undefined) s.ws.getRow(trows[0]).getCell(s.col.title).value = title;
        if (chorus !== undefined && s.col.chorus) s.ws.getRow(trows[0]).getCell(s.col.chorus).value = chorus || null;
        if (verses !== undefined) {
          const flat = verses.flatMap((v) => v.lines);
          if (flat.length !== trows.length) {
            throw new Error(
              `${id}: ${flat.length} edited ${lang} lines vs ${trows.length} workbook rows — structural edits are PC-only, fix by hand`,
            );
          }
          trows.forEach((rn, i) => {
            s.ws.getRow(rn).getCell(s.col.part1).value = flat[i];
          });
        }
      }

      if (patch.author !== undefined || patch.authorOriginal !== undefined) {
        const prev = authors[number] ?? authors[String(number)] ?? {};
        authors[number] = {
          ...prev,
          ...(patch.author !== undefined ? { author: patch.author } : {}),
          ...(patch.authorOriginal !== undefined ? { authorOriginal: patch.authorOriginal } : {}),
          ...(cfg.authorSource ? { source: cfg.authorSource } : {}),
        };
        if (!authors[number].author) delete authors[number].author;
        if (!authors[number].authorOriginal) delete authors[number].authorOriginal;
      }
      touched += 1;
    }

    // Number uniqueness guard (swaps move two hymns at once).
    guardUniqueNumbers(sheets.ar.ws, sheets.ar.col, sheets.ar.headerRow);

    await wb.xlsx.writeFile(cfg.xlsx);
    writeFileSync(cfg.authors, JSON.stringify(authors, null, 1) + '\n');
    console.log(`applied ${touched} hymn(s) [${book}] -> ${basename(cfg.xlsx)} + ${basename(cfg.authors)}`);
  }
  console.log('now run: npm run add-batch');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
