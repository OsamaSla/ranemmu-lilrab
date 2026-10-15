#!/usr/bin/env node
/**
 * One-time upload of the bundled corpus to Firestore.
 *
 * Reads every content/*.json hymn, writes one document per hymn into the
 * `hymns` collection (doc id mirrors scripts/build-corpus.mjs: hNNNN for
 * the main book, trNNNN for taranim). Every document is stamped with the
 * same updatedAt baseline the app treats as "already bundled", so devices
 * only ever download genuinely newer edits afterwards.
 *
 * Usage (Windows cmd — never commit these values anywhere):
 *   set EXPO_PUBLIC_FIREBASE_API_KEY=...
 *   set EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
 *   set EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
 *   set EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
 *   set EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
 *   set EXPO_PUBLIC_FIREBASE_APP_ID=...
 *   set ADMIN_EMAIL=admin@example.com
 *   set ADMIN_PASSWORD=...secret...
 *   node scripts/migrate-to-firestore.mjs [--dry-run]
 *
 * Requires: npm i firebase (already a dependency), an admin account that
 * can sign in, and Firestore rules allowing authenticated writes.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getFirestore, writeBatch } from 'firebase/firestore';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = join(ROOT, 'content');

/** Must equal BUNDLED_AT in src/data/liveSync.ts. */
const STAMP = process.env.STAMP ?? '2026-10-15T00:00:00.000Z';
const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = 400;

const ID_PREFIX = { main: 'h', taranim: 'tr' };
const idFor = (book, number) =>
  `${ID_PREFIX[book] ?? String(book).slice(0, 2)}${String(number).padStart(4, '0')}`;

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`missing env ${name}`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const config = {
    apiKey: required('EXPO_PUBLIC_FIREBASE_API_KEY'),
    authDomain: required('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
    projectId: required('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: required('EXPO_PUBLIC_FIREBASE_APP_ID'),
  };

  const app = initializeApp(config);
  const auth = getAuth(app);
  await signInWithEmailAndPassword(auth, required('ADMIN_EMAIL'), required('ADMIN_PASSWORD'));
  console.log(`signed in to project ${config.projectId}`);
  const db = getFirestore(app);

  const entries = readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'authors.json')
    .sort();
  const hymns = [];
  for (const name of entries) {
    const raw = JSON.parse(readFileSync(join(CONTENT_DIR, name), 'utf8'));
    hymns.push(...(Array.isArray(raw) ? raw : (raw.hymns ?? [])));
  }

  const seen = new Set();
  const docs = [];
  for (const h of hymns) {
    if (!Number.isInteger(h?.number) || !h?.title || !Array.isArray(h?.verses) || h.verses.length === 0) {
      console.error(`skipping invalid hymn in corpus: ${JSON.stringify(h?.number)}`);
      process.exit(1);
    }
    const book = h.book ?? 'main';
    const id = h.id ?? idFor(book, h.number);
    if (seen.has(id)) {
      console.error(`duplicate id ${id} — fix the corpus first`);
      process.exit(1);
    }
    seen.add(id);
    // Everything imported starts life as an AI draft; proofreaders flip
    // individual hymns to VERIFIED in the Admin panel after review.
    docs.push({ id, data: { ...h, book, id, translationStatus: 'AI_DRAFT', updatedAt: STAMP } });
  }
  docs.sort((a, b) => (a.id < b.id ? -1 : 1));

  console.log(`${docs.length} hymn documents from ${entries.map((e) => basename(e)).join(', ')}`);
  if (DRY_RUN) {
    console.log(`dry run: first=${docs[0].id} last=${docs[docs.length - 1].id} stamp=${STAMP}`);
    return;
  }
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    for (const { id, data } of docs.slice(i, i + BATCH_SIZE)) {
      batch.set(doc(db, 'hymns', id), data);
    }
    await batch.commit();
    console.log(`wrote ${Math.min(i + BATCH_SIZE, docs.length)}/${docs.length}`);
  }
  console.log('migration complete — verify one hymn in the Firestore console, then delete nothing locally');
}

main().catch((err) => {
  console.error(err?.message ?? err);
  process.exit(1);
});
