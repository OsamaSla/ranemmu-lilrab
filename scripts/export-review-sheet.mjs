#!/usr/bin/env node
/**
 * Exports the hymn corpus to a review spreadsheet (one row per hymn).
 *
 * Run with: npm run export:review [-- --local] [--lang de] [--out <file>] [--csv]
 *
 * Layout (.xlsx):
 *   Dashboard   — live metrics (total / reviewed / pending / progress %)
 *                 plus per-category and per-book breakdowns. Values are
 *                 spreadsheet formulas over the Review tab, so the board
 *                 stays current while reviewers edit (Excel and Google
 *                 Sheets both recalculate on open/upload).
 *   Review      — one row per hymn: ID, Number, Book, Title (Arabic),
 *                 Arabic Text, German/English Title, German/English
 *                 Translation, Primary Category, Tags, IsReviewed.
 *
 * Source (default: merged bundle + live Firebase edits):
 *   (default)  content/*.json overlaid with the Firebase `hymns`
 *              collection — the same picture the app itself renders.
 *              Firebase alone is incomplete (it only holds hymns an admin
 *              has touched), so the bundle fills in the rest. Needs the
 *              EXPO_PUBLIC_FIREBASE_* env vars (read is public, no sign-in).
 *   --local    content/*.json only — offline, for testing or unconfigured
 *              machines. Review status then comes from the JSON files.
 *
 * Options:
 *   --lang de|en   reviewed translation language (default: de)
 *   --out <file>   output .xlsx path (default: content/review-sheet.xlsx)
 *   --csv          also write a .csv of the Review tab next to the output
 *
 * The .xlsx uploads straight into Google Sheets (Drive → New → File upload
 * → Open with Sheets): reviewers edit Title/Text/Category/Tags/IsReviewed
 * there, then File → Download → .xlsx and feed it to import-review-sheet.
 * ID/Number/Book columns are keys — never edit them. Do not rename the
 * Review tab — the import finds it by name.
 */
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { initializeApp } from 'firebase/app';
import { collection, getDocs, getFirestore } from 'firebase/firestore';

import { REVIEW_LANGS, REVIEW_SHEET_NAME, rowFromHymn, sheetColumns } from './lib/review-sheet.mjs';
import { loadLocalCorpus, mergeRemote } from './lib/review-source.mjs';
import { TOPIC_IDS } from './lib/topic-keywords.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = join(ROOT, 'content');

const TEAL = 'FF0F5B66';
const HEADER_FONT = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
const BODY_FONT = { name: 'Arial', size: 11 };
const TITLE_FONT = { name: 'Arial', size: 14, bold: true };

/** 0-based column index → Excel letters (A … J … AA …). */
function colLetter(i) {
  let n = i + 1;
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function argValue(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1];
}

function firebaseConfigFromEnv() {
  const need = ['EXPO_PUBLIC_FIREBASE_API_KEY', 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', 'EXPO_PUBLIC_FIREBASE_PROJECT_ID', 'EXPO_PUBLIC_FIREBASE_APP_ID'];
  for (const name of need) {
    if (!process.env[name]) {
      console.error(`missing env ${name} — set the Firebase web config (or use --local)`);
      process.exit(1);
    }
  }
  return {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  };
}

async function loadHymns(local) {
  const bundle = loadLocalCorpus(CONTENT_DIR);
  if (local) return [...bundle.values()];
  // Merged view: the bundle overlaid with live Firebase edits — the same
  // picture the app itself renders. Firebase alone is incomplete (it only
  // holds hymns an admin has touched).
  const app = initializeApp(firebaseConfigFromEnv());
  const db = getFirestore(app);
  const snap = await getDocs(collection(db, 'hymns'));
  const remote = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return [...mergeRemote(bundle, remote).values()];
}

function styleHeader(row) {
  row.font = HEADER_FONT;
  row.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
  row.height = 30;
}

/** Fills a worksheet with the review rows (shared by the xlsx and csv outputs). */
function fillReviewSheet(ws, columns, rows) {
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  styleHeader(ws.getRow(1));
  ws.autoFilter = { from: 'A1', to: `${colLetter(columns.length - 1)}1` };

  for (const row of rows) {
    const excelRow = ws.addRow(row);
    excelRow.font = BODY_FONT;
    excelRow.alignment = { vertical: 'top', wrapText: true };
    for (const c of columns) {
      if (!c.rtl) continue;
      excelRow.getCell(c.key).alignment = { horizontal: 'right', vertical: 'top', wrapText: true };
    }
  }

  // Reviewer guardrails: fixed choice lists on the freetext-prone columns.
  const last = rows.length + 1;
  const reviewedCol = colLetter(columns.findIndex((c) => c.key === 'reviewed'));
  ws.dataValidations.add(`${reviewedCol}2:${reviewedCol}${last}`, {
    type: 'list',
    formulae: ['"TRUE,FALSE"'],
    allowBlank: true,
    showErrorMessage: true,
    errorTitle: 'IsReviewed',
    error: 'Pick TRUE or FALSE from the list',
  });
}

/**
 * Dashboard tab: live metrics as formulas over the Review tab, each with
 * the export-time value cached as `result` so the board reads correctly
 * even before the first recalculation.
 */
function fillDashboard(ws, columns, rows, lang) {
  const byKey = new Map(columns.map((c, i) => [c.key, colLetter(i)]));
  const last = rows.length + 1;
  const R = `${REVIEW_SHEET_NAME}!`;
  const range = (key) => `${R}${byKey.get(key)}2:${byKey.get(key)}${last}`;

  const total = rows.length;
  const reviewed = rows.filter((r) => r.reviewed === 'TRUE').length;
  const countWhere = (pred) => rows.filter(pred).length;

  ws.columns = [
    { width: 22 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
  ];

  let n = 1;
  ws.getRow(n).getCell(1).value = 'Hymn Review Dashboard';
  ws.getRow(n).getCell(1).font = TITLE_FONT;
  n += 1;
  ws.getRow(n).getCell(1).value =
    `Review language: ${lang === 'de' ? 'German' : 'English'} · exported ${new Date().toISOString().slice(0, 10)}`;
  ws.getRow(n).getCell(1).font = { ...BODY_FONT, italic: true, color: { argb: 'FF666666' } };
  n += 2;

  const metricHeader = ws.getRow(n);
  metricHeader.getCell(1).value = 'Metric';
  metricHeader.getCell(2).value = 'Value';
  styleHeader(metricHeader);
  n += 1;

  const metric = (label, formula, result, format) => {
    const row = ws.getRow(n);
    row.getCell(1).value = label;
    row.getCell(1).font = BODY_FONT;
    row.getCell(2).value = { formula, result };
    row.getCell(2).font = BODY_FONT;
    if (format) row.getCell(2).numFmt = format;
    n += 1;
  };
  const totalCell = `B${n}`;
  metric('Total Hymns', `COUNTA(${range('id')})`, total);
  const reviewedCell = `B${n}`;
  metric('Reviewed', `COUNTIF(${range('reviewed')},"TRUE")`, reviewed);
  metric('Pending', `${totalCell}-${reviewedCell}`, total - reviewed);
  metric('Progress', `${reviewedCell}/${totalCell}`, total === 0 ? 0 : reviewed / total, '0%');
  n += 1;

  const breakdownHeader = ws.getRow(n);
  breakdownHeader.getCell(1).value = 'Primary Category';
  breakdownHeader.getCell(2).value = 'Total';
  breakdownHeader.getCell(3).value = 'Reviewed';
  breakdownHeader.getCell(4).value = 'Pending';
  styleHeader(breakdownHeader);
  n += 1;

  const categoryRow = (label, criteria) => {
    const row = ws.getRow(n);
    const totalF = `COUNTIF(${range('primaryTopic')},${criteria})`;
    const revF = `COUNTIFS(${range('primaryTopic')},${criteria},${range('reviewed')},"TRUE")`;
    const t = countWhere((r) => (r.primaryTopic || '') === label);
    const rv = countWhere((r) => (r.primaryTopic || '') === label && r.reviewed === 'TRUE');
    row.getCell(1).value = label === '' ? '(uncategorized)' : label;
    row.getCell(1).font = BODY_FONT;
    row.getCell(2).value = { formula: totalF, result: t };
    row.getCell(3).value = { formula: revF, result: rv };
    row.getCell(4).value = { formula: `B${n}-C${n}`, result: t - rv };
    for (let c = 2; c <= 4; c += 1) row.getCell(c).font = BODY_FONT;
    n += 1;
  };
  for (const topic of TOPIC_IDS) categoryRow(topic, `"${topic}"`);
  // Blank Primary Category cells: COUNTBLANK over the bounded range.
  {
    const row = ws.getRow(n);
    const totalF = `COUNTBLANK(${range('primaryTopic')})`;
    const revF = `COUNTIFS(${range('primaryTopic')},"",${range('reviewed')},"TRUE")`;
    const t = countWhere((r) => (r.primaryTopic || '') === '');
    const rv = countWhere((r) => (r.primaryTopic || '') === '' && r.reviewed === 'TRUE');
    row.getCell(1).value = '(uncategorized)';
    row.getCell(1).font = BODY_FONT;
    row.getCell(2).value = { formula: totalF, result: t };
    row.getCell(3).value = { formula: revF, result: rv };
    row.getCell(4).value = { formula: `B${n}-C${n}`, result: t - rv };
    for (let c = 2; c <= 4; c += 1) row.getCell(c).font = BODY_FONT;
    n += 1;
  }
  n += 1;

  const bookHeader = ws.getRow(n);
  bookHeader.getCell(1).value = 'Book';
  bookHeader.getCell(2).value = 'Total';
  bookHeader.getCell(3).value = 'Reviewed';
  bookHeader.getCell(4).value = 'Pending';
  styleHeader(bookHeader);
  n += 1;

  const books = [...new Set(rows.map((r) => r.book))].sort();
  for (const book of books) {
    const row = ws.getRow(n);
    const totalF = `COUNTIF(${range('book')},"${book}")`;
    const revF = `COUNTIFS(${range('book')},"${book}",${range('reviewed')},"TRUE")`;
    const t = countWhere((r) => r.book === book);
    const rv = countWhere((r) => r.book === book && r.reviewed === 'TRUE');
    row.getCell(1).value = book;
    row.getCell(1).font = BODY_FONT;
    row.getCell(2).value = { formula: totalF, result: t };
    row.getCell(3).value = { formula: revF, result: rv };
    row.getCell(4).value = { formula: `B${n}-C${n}`, result: t - rv };
    for (let c = 2; c <= 4; c += 1) row.getCell(c).font = BODY_FONT;
    n += 1;
  }
}

async function main() {
  const lang = argValue('--lang', 'de');
  if (!REVIEW_LANGS.includes(lang)) throw new Error(`--lang must be one of ${REVIEW_LANGS.join(', ')}`);
  const local = process.argv.includes('--local');
  const wantCsv = process.argv.includes('--csv');
  const out = resolve(ROOT, argValue('--out', 'review/review-sheet.xlsx'));
  if (extname(out).toLowerCase() !== '.xlsx') throw new Error('--out must end in .xlsx');

  const hymns = (await loadHymns(local))
    .filter((h) => Number.isInteger(h?.number) && typeof h?.title === 'string' && Array.isArray(h?.verses))
    .sort((a, b) => ((a.book ?? 'main') < (b.book ?? 'main') ? -1 : 1) || a.number - b.number);
  if (hymns.length === 0) throw new Error('no hymns found in the selected source');

  const columns = sheetColumns(lang);
  const rows = hymns.map((h) => rowFromHymn(h, lang));
  const verified = rows.filter((r) => r.reviewed === 'TRUE').length;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'ranemmu.lilrab review pipeline';
  fillDashboard(wb.addWorksheet('Dashboard'), columns, rows, lang);
  fillReviewSheet(wb.addWorksheet(REVIEW_SHEET_NAME), columns, rows);

  await wb.xlsx.writeFile(out);
  console.log(`${hymns.length} hymn(s) [${lang}] -> ${out} (${verified} verified)`);
  if (wantCsv) {
    // CSV holds a single sheet: rebuild just the Review tab on its own.
    const csvOut = out.replace(/\.xlsx$/i, '.csv');
    const cb = new ExcelJS.Workbook();
    fillReviewSheet(cb.addWorksheet(REVIEW_SHEET_NAME), columns, rows);
    await cb.csv.writeFile(csvOut);
    console.log(`csv copy -> ${csvOut}`);
  }
}

main().catch((err) => {
  console.error(err?.message ?? err);
  process.exit(1);
});
