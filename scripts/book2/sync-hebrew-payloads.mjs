/**
 * Copies the refrained Hebrew stanza grid from content/taranim.json back into the
 * taranim authoring payloads after scripts/refrain-batch.mjs has reordered it.
 *
 * Usage:  node scripts/book2/sync-hebrew-payloads.mjs 14 19 132 …
 *
 * refrain-batch.mjs reorders and relabels `verses` / `verses_en` / `verses_de` /
 * `verses_he` in the corpus, but the payload files are the source of truth that
 * `hebrew-apply.mjs` re-merges from. Its inspect() checks the payload's stanza
 * labels against the Arabic, so a payload left in the old order fails the drift
 * gate and would silently put the Hebrew lines under the wrong Arabic stanzas.
 * This script makes the payloads mirror the already-corrected corpus grid; it
 * never authors or edits Hebrew text itself, only moves whole stanzas.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CORPUS = join(ROOT, 'content', 'taranim.json');
const HEBREW_DIR = join(ROOT, 'content', 'hebrew', 'taranim');

const numbers = process.argv.slice(2).map(Number);
if (numbers.length === 0 || numbers.some((n) => !Number.isInteger(n) || n < 1)) {
  throw new Error('usage: node scripts/book2/sync-hebrew-payloads.mjs 14 19 132 …');
}

const corpus = JSON.parse(await readFile(CORPUS, 'utf8'));
const hymns = Array.isArray(corpus) ? corpus : corpus.hymns;
const done = [];

for (const number of numbers) {
  const hymn = hymns.find((h) => h.number === number);
  if (!hymn) throw new Error(`hymn ${number} not found in content/taranim.json`);
  if (!Array.isArray(hymn.verses_he)) throw new Error(`hymn ${number}: no verses_he in corpus`);

  const file = join(HEBREW_DIR, `${String(number).padStart(4, '0')}.json`);
  const payload = JSON.parse(await readFile(file, 'utf8'));
  if (payload.book !== 'taranim' || payload.number !== number) {
    throw new Error(`${file}: unexpected book/number ${payload.book}/${payload.number}`);
  }
  const before = payload.verses_he;
  if (!Array.isArray(before) || before.length !== hymn.verses_he.length) {
    throw new Error(`${file}: ${before?.length} Hebrew stanzas vs ${hymn.verses_he.length} in corpus`);
  }
  // Guard against a wrong mapping: after a `move`, new stanza i is the old
  // stanza i+1, so compare each Hebrew stanza to the Arabic one at the same
  // (new) index, and confirm the whole set of line counts survived the reorder.
  // Text itself is never touched — only stanza order and labels.
  const counts = (stanzas) => stanzas.map((v) => v.lines.length).sort((a, b) => a - b).join(',');
  if (counts(hymn.verses_he) !== counts(before)) {
    throw new Error(`${file}: Hebrew line counts changed across the reorder — refusing to sync`);
  }
  hymn.verses_he.forEach((verse, i) => {
    if (verse.lines.length !== hymn.verses[i].lines.length) {
      throw new Error(`${file}: stanza ${i + 1} Hebrew/Arabic line-count mismatch — refusing to sync`);
    }
  });

  payload.verses_he = hymn.verses_he;
  // The payloads are authored at indent 2, LF, no trailing newline.
  await writeFile(file, `${JSON.stringify(payload, null, 2)}`, 'utf8');
  done.push(String(number).padStart(4, '0'));
}

console.log(`Synced Hebrew payloads for ${done.length} hymn(s): ${done.join(', ')}`);
console.log('Next: npm run hebrew:check && npm run hebrew:align && npm run build:corpus');
