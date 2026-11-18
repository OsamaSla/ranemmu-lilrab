/**
 * One-off fix: the Gemini import left printed line numbers ("1 ", "2 ", ...)
 * inside `chorus_he` for 301 hymns. Rebuild each affected chorus from the
 * chorus-tagged verse's already-clean Hebrew lines, exactly as hebrew-pack does.
 * Edits only the `chorus_he` line in each payload so all other bytes stay put.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = join(ROOT, 'content', 'hebrew', 'main');

const corpus = new Map();
for (const name of ['main.json', 'main-1001-1047.json']) {
  const data = JSON.parse(await readFile(join(ROOT, 'content', name), 'utf8'));
  for (const h of Array.isArray(data) ? data : data.hymns) corpus.set(h.number, h);
}

const artifact = /^\d+\s|·\s*\d+\s/;
let fixed = 0;
for (const file of (await readdir(DIR)).filter((f) => /^\d+\.json$/.test(f))) {
  const path = join(DIR, file);
  const raw = await readFile(path, 'utf8');
  const field = /^(\s*)"chorus_he": ("(?:[^"\\]|\\.)*")$/m.exec(raw);
  if (!field) continue;
  const current = JSON.parse(field[2]);
  if (!artifact.test(current)) continue;

  const payload = JSON.parse(raw);
  const arabic = corpus.get(payload.number);
  const index = arabic?.verses.findIndex((v) => v.chorus) ?? -1;
  const verse = payload.verses_he[index];
  if (!verse) throw new Error(`h${payload.number}: no Hebrew verse at chorus index ${index}`);

  const next = verse.lines.join(' · ');
  const updated = raw.replace(
    /^(\s*)"chorus_he": ".*"$/m,
    (_, indent) => `${indent}"chorus_he": ${JSON.stringify(next)}`,
  );
  await writeFile(path, updated, 'utf8');
  fixed++;
}
console.log(`fixed chorus_he line-number artifacts in ${fixed} payload(s)`);
