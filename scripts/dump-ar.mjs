#!/usr/bin/env node
// Usage: node scripts/dump-ar.mjs <from> <to> [outfile]
import fs from 'node:fs';
import path from 'node:path';

const [from, to] = process.argv.slice(2).map(Number);
if (!from || !to) {
  console.error('usage: node scripts/dump-ar.mjs <from> <to> [outfile]');
  process.exit(1);
}
const out =
  process.argv[4] ||
  path.join('C:\\', 'Temp', 'iconwork', `ar-${from}-${to}.txt`);

const book = JSON.parse(
  fs.readFileSync(path.join('content', 'book-hymns-imported.json'), 'utf8'),
);
let text = '';
for (const h of book.hymns) {
  if (h.number < from || h.number > to) continue;
  text += `=== ${h.number} ${h.title} ===\n`;
  h.verses.forEach((v, i) => {
    text += `[${v.chorus ? 'R ' : ''}${i + 1}]\n${v.lines.join('\n')}\n`;
  });
  text += '\n';
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, text);
console.log(`wrote ${out}`);
