/**
 * One-off fix for seven Gemini-imported Book 1 hymns that kept Arabic-style
 * parentheses and `)2` repeat markers in their Hebrew lines. House style drops
 * both: the content is written once, without brackets or numbering. Also
 * rebuilds chorus_he for the affected hymns from the cleaned chorus verse.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const NUMBERS = [585, 596, 603, 606, 616, 625, 632];

const corpus = new Map();
for (const name of ['main.json', 'main-1001-1047.json']) {
  const data = JSON.parse(await readFile(join(ROOT, 'content', name), 'utf8'));
  for (const h of Array.isArray(data) ? data : data.hymns) corpus.set(h.number, h);
}

const clean = (s) => s.replace(/\)\s*\d+\s*/g, '').replace(/[()]/g, '');

for (const number of NUMBERS) {
  const path = join(ROOT, 'content', 'hebrew', 'main', `${String(number).padStart(4, '0')}.json`);
  const payload = JSON.parse(await readFile(path, 'utf8'));
  payload.verses_he = payload.verses_he.map((v) => ({
    ...v,
    lines: v.lines.map(clean),
  }));
  const index = corpus.get(number).verses.findIndex((v) => v.chorus);
  if (index >= 0) payload.chorus_he = payload.verses_he[index].lines.join(' · ');
  await writeFile(path, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`cleaned h${number}`);
}
