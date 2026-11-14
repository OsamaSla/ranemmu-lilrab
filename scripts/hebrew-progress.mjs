/**
 * Translation coverage per book, plus the next numbers to translate.
 *
 * Run with:  node scripts/hebrew-progress.mjs
 *            node scripts/hebrew-progress.mjs --book3
 *
 * Reads the corpus (not the payload folders), so it reports what the app will
 * actually ship. `pointed` counts lines that carry niqqud; it should stay at
 * 100% — a dropped point is a shipped error, not a style choice.
 */
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'content');
const HEBREW = join(CONTENT, 'hebrew');

const POINT = /[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]/;
const PREFIX = { main: 'h', taranim: 'tr', book3: 'b3' };

const only = process.argv.slice(2).find((a) => a.startsWith('--'))?.slice(2);

const files = (await readdir(CONTENT)).filter((f) => f.endsWith('.json') && f !== 'authors.json');
const byBook = new Map();
for (const name of files) {
  const data = JSON.parse(await readFile(join(CONTENT, name), 'utf8'));
  const list = Array.isArray(data) ? data : data.hymns;
  if (!Array.isArray(list)) continue;
  const fallback = name.replace(/\.json$/, '');
  for (const hymn of list) {
    const book = hymn.book ?? fallback;
    if (!byBook.has(book)) byBook.set(book, []);
    byBook.get(book).push(hymn);
  }
}

const flagCounts = new Map();
try {
  const payloadBooks = (await readdir(HEBREW, { withFileTypes: true })).filter((e) => e.isDirectory());
  for (const entry of payloadBooks) {
    const files = (await readdir(join(HEBREW, entry.name))).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      const payload = JSON.parse(await readFile(join(HEBREW, entry.name, file), 'utf8'));
      flagCounts.set(entry.name, (flagCounts.get(entry.name) ?? 0) + (payload.review?.length ?? 0));
    }
  }
} catch {
  /* no payload folders yet */
}

const rows = [];
for (const [book, hymns] of [...byBook].sort((a, b) => a[0].localeCompare(b[0]))) {
  if (only && book !== only) continue;
  hymns.sort((a, b) => a.number - b.number);
  const done = hymns.filter((h) => Array.isArray(h.verses_he) && h.verses_he.length > 0);
  const totalLines = done.reduce((sum, h) => sum + h.verses_he.reduce((n, v) => n + v.lines.length, 0), 0);
  const pointed = done.reduce(
    (sum, h) => sum + h.verses_he.reduce((n, v) => n + v.lines.filter((l) => POINT.test(l)).length, 0),
    0,
  );
  const missing = hymns.filter((h) => !(Array.isArray(h.verses_he) && h.verses_he.length > 0));
  const next = missing.slice(0, 5).map((h) => h.number);
  const prefix = PREFIX[book] ?? book.slice(0, 2);
  rows.push({
    book,
    prefix,
    total: hymns.length,
    done: done.length,
    lines: totalLines,
    pointed,
    flags: flagCounts.get(book) ?? 0,
    next,
    remaining: missing.length,
  });
}

const pad = (value, width) => String(value).padStart(width);
console.log('book     hymns   done   cover   lines   pointed   flags   next');
for (const r of rows) {
  const cover = `${Math.round((r.done / r.total) * 100)}%`;
  console.log(
    `${r.book.padEnd(8)} ${pad(r.total, 4)}   ${pad(r.done, 4)}   ${cover.padStart(5)}   ${pad(r.lines, 5)}   ${pad(r.pointed, 7)}   ${pad(r.flags, 5)}   ${r.next.map((n) => `${r.prefix}${String(n).padStart(4, '0')}`).join(' ')}`,
  );
}
const totals = rows.reduce(
  (acc, r) => ({ total: acc.total + r.total, done: acc.done + r.done, lines: acc.lines + r.lines }),
  { total: 0, done: 0, lines: 0 },
);
console.log(`\nall books: ${totals.done}/${totals.total} hymns translated · ${totals.lines} verse lines`);
