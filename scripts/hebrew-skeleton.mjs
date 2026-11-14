/**
 * Prints (or writes) payload skeletons for a hymn range.
 *
 * Run with:  node scripts/hebrew-skeleton.mjs <book> <from> <to> [--write]
 *
 * A skeleton has the exact stanza labels and line counts of the printed hymn
 * with every line empty, so the author only replaces `""` and can never hit the
 * shape/label failures that `hebrew-apply.mjs` rejects. Empty lines are
 * intentional: an unfinished skeleton must fail the apply gate.
 *
 * Without `--write` the JSON goes to stdout (safe to inspect); with `--write`
 * it lands in content/hebrew/<book>/NNNN.json, skipping files that exist.
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'content');
const HEBREW = join(CONTENT, 'hebrew');

const args = process.argv.slice(2);
const write = args.includes('--write');
const [bookArg, fromArg, toArg] = args.filter((a) => !a.startsWith('--'));
if (!bookArg || !fromArg || !toArg) {
  console.error('usage: node scripts/hebrew-skeleton.mjs <book> <from> <to> [--write]');
  process.exit(2);
}

const from = Number(fromArg);
const to = Number(toArg);
const book = bookArg;

const files = (await readdir(CONTENT)).filter((f) => f.endsWith('.json') && f !== 'authors.json');
const hymns = [];
for (const name of files) {
  const data = JSON.parse(await readFile(join(CONTENT, name), 'utf8'));
  const list = Array.isArray(data) ? data : data.hymns;
  if (!Array.isArray(list)) continue;
  const fallback = name.replace(/\.json$/, '');
  for (const hymn of list) if ((hymn.book ?? fallback) === book) hymns.push(hymn);
}
hymns.sort((a, b) => a.number - b.number);

const range = hymns.filter((h) => h.number >= from && h.number <= to);
if (range.length === 0) {
  console.error(`no ${book} hymns in ${from}–${to}`);
  process.exit(1);
}

const dir = join(HEBREW, book);
if (write) await mkdir(dir, { recursive: true });
let written = 0;
for (const hymn of range) {
  const payload = {
    book,
    number: hymn.number,
    title_he: '',
    verses_he: hymn.verses.map((verse) => ({
      label: verse.label,
      lines: verse.lines.map(() => ''),
    })),
    ...(hymn.chorus ? { chorus_he: '' } : {}),
    review: [],
  };
  const text = JSON.stringify(payload, null, 2);
  const name = `${String(hymn.number).padStart(4, '0')}.json`;

  if (!write) {
    console.log(`### ${book}/${name}  (shape ${hymn.verses.map((v) => v.lines.length).join('/')})`);
    console.log(text);
    console.log('');
    continue;
  }

  const path = join(dir, name);
  if (existsSync(path)) {
    console.error(`skip ${name} (already exists)`);
    continue;
  }
  await writeFile(path, `${text}\n`, 'utf8');
  written += 1;
}

if (write) console.log(`wrote ${written}/${range.length} skeleton(s) to content/hebrew/${book}/`);
