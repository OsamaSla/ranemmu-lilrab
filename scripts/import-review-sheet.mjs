#!/usr/bin/env node
/**
 * Imports an edited review spreadsheet back into Firebase (bulk review sync).
 *
 * Run with: npm run import:review -- <file.xlsx|file.csv> [--lang de] [--local] [--apply]
 *
 * Source of truth for the diff (default: merged bundle + Firebase):
 *   (default)  content/*.json overlaid with the Firebase `hymns`
 *              collection — the same view the export produces, so untouched
 *              rows diff to nothing. Needs EXPO_PUBLIC_FIREBASE_* env vars.
 *   --local    content/*.json only — offline dry-run only, for testing
 *              the sheet without touching production.
 *
 * Safety (bulk writes to the live database):
 *   - Without --apply this is a dry run: every row is validated and the
 *     detected changes are reported, nothing is written.
 *   - With --apply (Firebase only) the reviewer signs in (ADMIN_EMAIL +
 *     ADMIN_PASSWORD) and only changed fields are written back in batches,
 *     each stamped with a fresh updatedAt so devices pick them up live.
 *   - Any validation error aborts the whole run before a single write:
 *     fix the reported rows and re-run.
 *
 * Editable columns: Title (Arabic), Arabic Text, German/English Title,
 * German/English Translation, Primary Category, Tags, IsReviewed.
 * ID/Number/Book are match keys and are never written. Blank translation
 * cells mean "no change" (translations are never deleted from the sheet);
 * blank Tags clears the tags; blank Primary Category keeps the stored one.
 */
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { getApp, initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, getDocs, getFirestore, writeBatch } from 'firebase/firestore';

import { REVIEW_LANGS, cellText, diffRow, sheetColumns } from './lib/review-sheet.mjs';
import { loadLocalCorpus, mergeRemote } from './lib/review-source.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = join(ROOT, 'content');
const BATCH_SIZE = 400;

async function loadSource(local) {
  const bundle = loadLocalCorpus(CONTENT_DIR);
  if (local) return { map: bundle, db: null };
  // Diff against the same merged view the export produces (bundle overlaid
  // with live Firebase edits), so untouched rows diff to nothing.
  const app = initializeApp(firebaseConfigFromEnv());
  const db = getFirestore(app);
  const snap = await getDocs(collection(db, 'hymns'));
  const remote = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return { map: mergeRemote(bundle, remote), db };
}

function argValue(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1];
}

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`missing env ${name}`);
    process.exit(1);
  }
  return value;
}

function firebaseConfigFromEnv() {
  return {
    apiKey: required('EXPO_PUBLIC_FIREBASE_API_KEY'),
    authDomain: required('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
    projectId: required('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: required('EXPO_PUBLIC_FIREBASE_APP_ID'),
  };
}

async function readRows(file) {
  const ext = extname(file).toLowerCase();
  const wb = new ExcelJS.Workbook();
  if (ext === '.csv') await wb.csv.readFile(file);
  else if (ext === '.xlsx') await wb.xlsx.readFile(file);
  else throw new Error(`unsupported file ${basename(file)} — use .xlsx or .csv`);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error(`${basename(file)}: workbook has no sheets`);
  return ws;
}

async function main() {
  const input = process.argv[2];
  if (!input || input.startsWith('--')) {
    throw new Error('usage: node scripts/import-review-sheet.mjs <file.xlsx|file.csv> [--lang de] [--local] [--apply]');
  }
  const file = resolve(ROOT, input);
  const lang = argValue('--lang', 'de');
  if (!REVIEW_LANGS.includes(lang)) throw new Error(`--lang must be one of ${REVIEW_LANGS.join(', ')}`);
  const local = process.argv.includes('--local');
  const apply = process.argv.includes('--apply');
  if (local && apply) throw new Error('--local is dry-run only (it has nowhere to write); drop --apply');

  const columns = sheetColumns(lang);
  const byHeader = new Map(columns.map((c) => [c.header.toLowerCase(), c.key]));

  const ws = await readRows(file);
  const headerCells = [];
  ws.getRow(1).eachCell({ includeEmpty: true }, (cell, c) => {
    headerCells[c] = cellText(cell).trim().toLowerCase();
  });
  const colIndex = new Map();
  headerCells.forEach((h, c) => {
    if (h && byHeader.has(h)) colIndex.set(byHeader.get(h), c);
  });
  for (const c of columns) {
    if (!colIndex.has(c.key)) throw new Error(`${basename(file)}: missing column '${c.header}' — was this exported by export-review-sheet?`);
  }

  const rows = [];
  for (let n = 2; n <= ws.rowCount; n += 1) {
    const excelRow = ws.getRow(n);
    const row = {};
    for (const c of columns) row[c.key] = cellText(excelRow.getCell(colIndex.get(c.key)));
    if (Object.values(row).every((v) => String(v ?? '').trim() === '')) continue;
    row.__line = n;
    rows.push(row);
  }

  const { map, db } = await loadSource(local);

  const errors = [];
  const changes = [];
  for (const row of rows) {
    const id = String(row.id ?? '').trim();
    if (!id) {
      errors.push(`row ${row.__line}: blank ID — every row needs its exported ID`);
      continue;
    }
    const hymn = map.get(id);
    if (!hymn) {
      errors.push(`row ${row.__line}: unknown ID '${id}' (not in ${local ? 'content/*.json' : 'Firebase'})`);
      continue;
    }
    const { patch, errors: rowErrors } = diffRow(row, hymn, lang);
    if (rowErrors) {
      for (const e of rowErrors) errors.push(`row ${row.__line}: ${e}`);
    } else if (Object.keys(patch).length > 0) {
      changes.push({ id, number: hymn.number, fields: Object.keys(patch), patch });
    }
  }

  console.log(`${rows.length} row(s) read, ${changes.length} hymn(s) with changes, ${errors.length} error(s)`);
  if (errors.length > 0) {
    for (const e of errors.slice(0, 30)) console.error(`  - ${e}`);
    if (errors.length > 30) console.error(`  ... and ${errors.length - 30} more`);
    console.error('aborted: no writes performed — fix the rows above and re-run');
    process.exit(1);
  }

  const preview = changes.slice(0, 20);
  for (const c of preview) console.log(`  ~ ${c.id} (#${c.number}): ${c.fields.join(', ')}`);
  if (changes.length > 20) console.log(`  ... and ${changes.length - 20} more`);

  if (!apply) {
    console.log(`dry run: re-run with --apply to write ${changes.length} hymn(s) to Firebase`);
    return;
  }

  const auth = getAuth(getApp());
  await signInWithEmailAndPassword(auth, required('ADMIN_EMAIL'), required('ADMIN_PASSWORD'));
  const stamp = new Date().toISOString();
  let written = 0;
  for (let i = 0; i < changes.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    for (const c of changes.slice(i, i + BATCH_SIZE)) {
      batch.set(doc(db, 'hymns', c.id), { ...c.patch, updatedAt: stamp }, { merge: true });
    }
    await batch.commit();
    written += Math.min(BATCH_SIZE, changes.length - i);
    console.log(`wrote ${written}/${changes.length}`);
  }
  console.log(`done: ${written} hymn(s) updated (updatedAt=${stamp}) — devices pick them up live`);
}

main().catch((err) => {
  console.error(err?.message ?? err);
  process.exit(1);
});
