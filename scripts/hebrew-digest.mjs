/**
 * Dumps a translation digest for a range of hymns: Arabic lines, the English
 * gloss, the printed metre and the exact stanza/line shape.
 *
 * Run with:  node scripts/hebrew-digest.mjs <book> <from> <to> [outfile]
 *
 * The blog uses it as the single input for authoring a batch: one read gives
 * everything the translator needs, so the corpus JSON never has to be opened
 * by hand. Titles fall back to the English translation when the Arabic has
 * none, and `chorus` prints `yes` when the hymn carries a separate refrain
 * field (the payload then needs `chorus_he`).
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'content');

const [bookArg, fromArg, toArg, outArg] = process.argv.slice(2);
if (!bookArg || !fromArg || !toArg) {
  console.error('usage: node scripts/hebrew-digest.mjs <book> <from> <to> [outfile]');
  process.exit(2);
}

const from = Number(fromArg);
const to = Number(toArg);
const book = bookArg;

const files = (await readdir(CONTENT)).filter((f) => f.endsWith('.json') && f !== 'authors.json');
let hymns = [];
for (const name of files) {
  const data = JSON.parse(await readFile(join(CONTENT, name), 'utf8'));
  const list = Array.isArray(data) ? data : data.hymns;
  if (!Array.isArray(list)) continue;
  const fallback = name.replace(/\.json$/, '');
  for (const hymn of list) {
    if ((hymn.book ?? fallback) === book) hymns.push(hymn);
  }
}
hymns.sort((a, b) => a.number - b.number);

const range = hymns.filter((h) => h.number >= from && h.number <= to);
if (range.length === 0) {
  console.error(`no ${book} hymns in ${from}–${to}`);
  process.exit(1);
}

const lines = [];
for (const hymn of range) {
  const shape = hymn.verses.map((v) => v.lines.length).join('/');
  const id = `${book === 'taranim' ? 'tr' : book === 'book3' ? 'b3' : 'h'}${String(hymn.number).padStart(4, '0')}`;
  lines.push(
    `=== ${hymn.number} | ${id} | metre ${hymn.meter ?? '-'} | chorus ${hymn.chorus ? 'yes' : '-'} | topics ${(hymn.topics ?? []).join(',')}`,
  );
  lines.push(`shape ${shape}`);
  lines.push(`AR title: ${hymn.title}`);
  if (hymn.title_en) lines.push(`EN title: ${hymn.title_en}`);
  hymn.verses.forEach((verse, v) => {
    lines.push(`[${verse.label}]`);
    verse.lines.forEach((line, l) => {
      lines.push(`  ${line}`);
      const en = hymn.verses_en?.[v]?.lines?.[l];
      if (en) lines.push(`    ~ ${en}`);
    });
  });
  if (hymn.chorus) lines.push(`chorus: ${hymn.chorus}`);
  lines.push('');
}

const text = lines.join('\n');
if (outArg) {
  await writeFile(outArg, text, 'utf8');
  console.log(`wrote ${outArg} · ${range.length} hymn(s) · ${lines.length} lines`);
} else {
  console.log(text);
}
