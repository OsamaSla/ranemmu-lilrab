/**
 * Marks the first stanza of selected hymns as the refrain — optionally moving it
 * below stanza 2 — and renumbers the rest. This writes the same shape the admin
 * editor produces when you press "تحويل إلى قرار" (+ "نقل لأسفل") and save, so a
 * later edit in the app sees no difference.
 *
 * Usage:
 *   node scripts/refrain-batch.mjs 315:move 318:keep 323:move …
 *
 * Modes:
 *   keep  the refrain stays first:        refrain, 1, 2, 3 …
 *   move  it swaps with stanza 2:         1, refrain, 2, 3 …
 *
 * EN/DE translations mirror the Arabic stanza-for-stanza, so they are reordered
 * and labelled identically (the editor does the same on save).
 *
 * Afterwards run `npm run build:corpus` — the app reads the bundled chunks, not
 * content/*.json. Re-running is refused once a hymn has a refrain, so a typo in
 * the list cannot silently reorder stanzas twice.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = join(ROOT, 'content', 'taranim.json');

/** The printed word for a refrain with no `chorus` field of its own. */
const REFRAIN = 'القرار';
const LANGS = ['verses', 'verses_en', 'verses_de'];

/** `315:move` → { number: 315, mode: 'move' } */
function parseSpecs(argv) {
  return argv.map((arg) => {
    const [rawNumber, mode] = arg.split(':');
    const number = Number(rawNumber);
    if (!Number.isInteger(number) || number < 1) throw new Error(`bad hymn number: ${arg}`);
    if (mode !== 'keep' && mode !== 'move') throw new Error(`bad mode (use keep|move): ${arg}`);
    return { number, mode };
  });
}

/** Reorder one stanza array and relabel it; `index` is where the refrain lands. */
function apply(verses, index) {
  const order = index === 1 ? [1, 0, ...verses.map((_, i) => i).slice(2)] : verses.map((_, i) => i);
  const reordered = order.map((i) => ({ ...verses[i] }));
  let counter = 0;
  reordered.forEach((verse, i) => {
    const isRefrain = i === index;
    if (isRefrain) verse.chorus = true;
    else delete verse.chorus;
    if (!isRefrain) counter += 1;
    verse.label = isRefrain ? REFRAIN : String(counter);
  });
  return reordered;
}

const specs = parseSpecs(process.argv.slice(2));
if (specs.length === 0) throw new Error('usage: node scripts/refrain-batch.mjs 315:move 318:keep …');

const raw = await readFile(FILE, 'utf8');
const data = JSON.parse(raw);
const hymns = Array.isArray(data) ? data : data.hymns;

const done = [];
for (const { number, mode } of specs) {
  const hymn = hymns.find((h) => h.number === number);
  if (!hymn) throw new Error(`hymn ${number} not found in content/taranim.json`);
  if (hymn.verses.length < 2) throw new Error(`hymn ${number}: needs at least 2 stanzas`);
  if (hymn.verses.some((v) => v.chorus)) {
    throw new Error(`hymn ${number}: already has a refrain — refusing to reorder twice`);
  }
  for (const lang of LANGS) {
    const verses = hymn[lang];
    if (!verses) {
      if (lang !== 'verses') continue;
      throw new Error(`hymn ${number}: missing '${lang}'`);
    }
    if (verses.length !== hymn.verses.length) {
      throw new Error(`hymn ${number}: '${lang}' has ${verses.length} stanzas vs ${hymn.verses.length}`);
    }
  }
  const index = mode === 'move' ? 1 : 0;
  for (const lang of LANGS) {
    if (hymn[lang]) hymn[lang] = apply(hymn[lang], index);
  }
  done.push(`${number}:${mode} (${hymn.verses.length} stanzas)`);
}

// The authoring files are 1-space indented CRLF without a trailing newline;
// keep that so the diff only shows the hymns that actually changed.
const out = JSON.stringify(data, null, 1).replace(/\n/g, '\r\n');
await writeFile(FILE, out, 'utf8');

console.log(`${done.length} hymn(s) updated in content/taranim.json`);
for (const line of done) console.log(`  ${line}`);
console.log('Next: npm run check:hymns && npm run build:corpus');
