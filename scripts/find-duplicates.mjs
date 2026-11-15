#!/usr/bin/env node
/**
 * Lists the hymns the corpus prints in more than one book.
 *
 * Run with:  node scripts/find-duplicates.mjs
 *
 * The same hymn is typeset differently in each book, so this prints the two
 * things that decide whether work can be reused:
 *
 *   lines   how many printed lines each book uses — a translation can only be
 *           re-cut onto another grid when these agree
 *   HE      which copies already carry a hand-authored Hebrew translation
 *
 * Book order is b3 → main → taranim, which is the order `build-corpus.mjs`
 * lends Hebrew in: a hymn without one borrows from the first copy that has a
 * compatible line grid.
 */
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { crossBookGroups, lineCompatible, printedLines } from './lib/duplicates.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'content');
const ID_PREFIX = { main: 'h', taranim: 'tr', book3: 'b3' };
const idFor = (book, number) => `${ID_PREFIX[book] ?? book.slice(0, 2)}${String(number).padStart(4, '0')}`;
const BOOK_LABEL = { book3: 'هلم نرنم', main: 'رنموا للرب', taranim: 'ترانيم روحية' };

const files = (await readdir(CONTENT)).filter((f) => f.endsWith('.json') && f !== 'authors.json');
const hymns = [];
for (const name of files) {
  const data = JSON.parse(await readFile(join(CONTENT, name), 'utf8'));
  const list = Array.isArray(data) ? data : data.hymns;
  if (!Array.isArray(list)) continue;
  const fallback = name.replace(/\.json$/, '');
  for (const hymn of list) {
    const book = hymn.book ?? fallback;
    hymns.push({ ...hymn, book, id: hymn.id ?? idFor(book, hymn.number) });
  }
}

const groups = crossBookGroups(hymns);
let shareable = 0;
let needsRebreak = 0;

console.log(`${groups.length} hymn(s) printed in more than one book (${hymns.length} records scanned)\n`);

for (const group of groups) {
  // Same lending rule as build-corpus.mjs: a copy without Hebrew takes the
  // first sibling whose printed lines match exactly.
  const borrows = [];
  const blocked = [];
  for (const target of group) {
    if (target.verses_he?.length) continue;
    const source = group.find(
      (other) => other.id !== target.id && other.verses_he?.length && lineCompatible(target, other),
    );
    if (source) borrows.push(`${target.id} ← ${source.id}`);
    else blocked.push(`${target.id} (${printedLines(target).length} lines)`);
  }
  if (borrows.length > 0) shareable += 1;
  else needsRebreak += 1;

  console.log(`${borrows.length > 0 ? '✓' : '~'} ${group[0].title}`);
  for (const hymn of group) {
    console.log(
      `    ${hymn.id.padEnd(7)} ${(BOOK_LABEL[hymn.book] ?? hymn.book).padEnd(12)} ` +
        `${String(hymn.number).padStart(4)} · ${String(printedLines(hymn).length).padStart(2)} lines · ` +
        `${hymn.verses_he?.length ? 'HE' : 'no Hebrew'}`,
    );
  }
  if (borrows.length > 0) console.log(`    borrow: ${borrows.join(', ')}`);
  if (blocked.length > 0) console.log(`    cannot re-cut (line counts differ): ${blocked.join(', ')}`);
  console.log('');
}

console.log(
  `summary: ${shareable} group(s) can share Hebrew today · ${needsRebreak} need the lines re-broken by hand`,
);
