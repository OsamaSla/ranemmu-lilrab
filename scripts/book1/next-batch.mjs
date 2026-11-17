/**
 * Prints the next Book 1 batch range for the subagent rotation driver.
 *
 *   node scripts/book1/next-batch.mjs            -> "FROM TO HYMNS LINES"
 *   node scripts/book1/next-batch.mjs --json     -> full object
 *
 * A batch is the first `N` untranslated hymns, greedily filled up to
 * BATCH_LINES (default 140) verse lines and at most BATCH_HYMNS (default 15)
 * hymns. The next range is always derived from the payloads on disk, so a
 * crashed run resumes at the last committed batch with no bookkeeping.
 */
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const CONTENT = join(ROOT, 'content');
const HEBREW = join(CONTENT, 'hebrew', 'main');
const MAX_LINES = Number(process.env.BATCH_LINES || 140);
const MAX_HYMS = Number(process.env.BATCH_HYMNS || 15);

const files = (await readdir(CONTENT)).filter((f) => f.endsWith('.json') && f !== 'authors.json');
const hymns = [];
for (const name of files) {
  const data = JSON.parse(await readFile(join(CONTENT, name), 'utf8'));
  const list = Array.isArray(data) ? data : data.hymns;
  if (!Array.isArray(list)) continue;
  const fallback = name.replace(/\.json$/, '');
  for (const hymn of list) if ((hymn.book ?? fallback) === 'main') hymns.push(hymn);
}
hymns.sort((a, b) => a.number - b.number);

const lineCount = (h) => h.verses.reduce((n, v) => n + v.lines.length, 0);
const done = (h) => existsSync(join(HEBREW, `${String(h.number).padStart(4, '0')}.json`));

const remaining = hymns.filter((h) => !done(h));
if (remaining.length === 0) {
  const result = { from: null, to: null, hymns: 0, lines: 0, total: hymns.length, done: hymns.length };
  if (process.argv.includes('--json')) console.log(JSON.stringify(result));
  else console.log('COMPLETE');
  process.exit(0);
}

const batch = [];
let lines = 0;
for (const h of remaining) {
  const n = lineCount(h);
  if (batch.length > 0 && (lines + n > MAX_LINES || batch.length >= MAX_HYMS)) break;
  batch.push(h);
  lines += n;
}

const from = batch[0].number;
const to = batch[batch.length - 1].number;
const result = {
  from,
  to,
  hymns: batch.length,
  lines,
  total: hymns.length,
  done: hymns.length - remaining.length,
  numbers: batch.map((h) => h.number),
};
if (process.argv.includes('--json')) console.log(JSON.stringify(result));
else console.log(`${from} ${to} ${batch.length} ${lines}`);
