#!/usr/bin/env node
/**
 * Exports the hymn corpus to a review spreadsheet (one row per hymn).
 *
 * Run with: npm run export:review [-- --local] [--lang de] [--out <file>] [--csv]
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
 *   --csv          also write a .csv next to the output (same basename)
 *
 * The .xlsx uploads straight into Google Sheets (Drive → New → File upload
 * → Open with Sheets): reviewers edit Title/Text/Category/Tags/IsReviewed
 * there, then File → Download → .xlsx and feed it to import-review-sheet.
 * ID/Number/Book columns are keys — never edit them.
 */
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { initializeApp } from 'firebase/app';
import { collection, getDocs, getFirestore } from 'firebase/firestore';

import { REVIEW_LANGS, rowFromHymn, sheetColumns } from './lib/review-sheet.mjs';
import { loadLocalCorpus, mergeRemote } from './lib/review-source.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = join(ROOT, 'content');

const TEAL = 'FF0F5B66';
const HEADER_FONT = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
const BODY_FONT = { name: 'Arial', size: 11 };

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

async function main() {
  const lang = argValue('--lang', 'de');
  if (!REVIEW_LANGS.includes(lang)) throw new Error(`--lang must be one of ${REVIEW_LANGS.join(', ')}`);
  const local = process.argv.includes('--local');
  const wantCsv = process.argv.includes('--csv');
  const out = resolve(ROOT, argValue('--out', 'content/review-sheet.xlsx'));
  if (extname(out).toLowerCase() !== '.xlsx') throw new Error('--out must end in .xlsx');

  const hymns = (await loadHymns(local))
    .filter((h) => Number.isInteger(h?.number) && typeof h?.title === 'string' && Array.isArray(h?.verses))
    .sort((a, b) => ((a.book ?? 'main') < (b.book ?? 'main') ? -1 : 1) || a.number - b.number);
  if (hymns.length === 0) throw new Error('no hymns found in the selected source');

  const columns = sheetColumns(lang);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ranemmu.lilrab review pipeline';
  const ws = wb.addWorksheet('Review');
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width }));

  const headerRow = ws.getRow(1);
  headerRow.font = HEADER_FONT;
  headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
  headerRow.height = 30;
  ws.autoFilter = { from: 'A1', to: `${String.fromCharCode(64 + columns.length)}1` };

  let verified = 0;
  for (const hymn of hymns) {
    const row = rowFromHymn(hymn, lang);
    if (row.reviewed === 'TRUE') verified += 1;
    const excelRow = ws.addRow(row);
    excelRow.font = BODY_FONT;
    excelRow.alignment = { vertical: 'top', wrapText: true };
    for (const c of columns) {
      if (!c.rtl) continue;
      const cell = excelRow.getCell(c.key);
      cell.alignment = { horizontal: 'right', vertical: 'top', wrapText: true };
    }
  }

  // Reviewer guardrails: fixed choice lists on the freetext-prone columns.
  const last = hymns.length + 1;
  ws.dataValidations.add(`J2:J${last}`, {
    type: 'list',
    formulae: ['"TRUE,FALSE"'],
    allowBlank: true,
    showErrorMessage: true,
    errorTitle: 'IsReviewed',
    error: 'Pick TRUE or FALSE from the list',
  });

  await wb.xlsx.writeFile(out);
  console.log(`${hymns.length} hymn(s) [${lang}] -> ${out} (${verified} verified)`);
  if (wantCsv) {
    const csvOut = out.replace(/\.xlsx$/i, '.csv');
    await wb.csv.writeFile(csvOut);
    console.log(`csv copy -> ${csvOut}`);
  }
}

main().catch((err) => {
  console.error(err?.message ?? err);
  process.exit(1);
});
