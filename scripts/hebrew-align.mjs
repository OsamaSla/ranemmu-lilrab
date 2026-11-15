/**
 * Audits the Hebrew grid against the Arabic one, hymn by hymn.
 *
 * Run with:  node scripts/hebrew-align.mjs
 *            node scripts/hebrew-align.mjs --verbose   (list every hymn, not only faults)
 *
 * `hebrew-apply.mjs` already refuses a payload whose stanza labels or line
 * counts disagree with the Arabic, but nothing checked the *merged* corpus: an
 * admin edit that reorders Arabic stanzas, or flags a refrain, leaves the
 * shipped `verses_he` behind, and the reader then pairs fluent Hebrew with the
 * wrong stanza. This script is the post-merge gate for exactly that.
 *
 * Reported faults, per hymn:
 *   count   — a different number of stanzas
 *   label   — stanza i is labelled differently in Hebrew
 *   chorus  — stanza i is the refrain in one language but not the other
 *   lines   — stanza i has a different number of lines
 *
 * Run it after `build:corpus` whenever the Arabic side of a translated hymn has
 * been edited, and before publishing. Any fault here is a shipped error.
 */
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'content');
const verbose = process.argv.slice(2).includes('--verbose');

const files = (await readdir(CONTENT)).filter((f) => f.endsWith('.json') && f !== 'authors.json');
const rows = [];

for (const name of files) {
  const data = JSON.parse(await readFile(join(CONTENT, name), 'utf8'));
  const list = Array.isArray(data) ? data : data.hymns;
  if (!Array.isArray(list)) continue;
  const fallback = name.replace(/\.json$/, '');
  for (const hymn of list) {
    if (!Array.isArray(hymn.verses_he) || hymn.verses_he.length === 0) continue;
    const id = hymn.id ?? `${hymn.book ?? fallback}:${hymn.number}`;
    const ar = hymn.verses;
    const he = hymn.verses_he;
    const faults = [];
    if (ar.length !== he.length) faults.push(`count ${ar.length} Arabic vs ${he.length} Hebrew`);
    const shared = Math.min(ar.length, he.length);
    for (let i = 0; i < shared; i += 1) {
      const at = i + 1;
      if (String(ar[i].label) !== String(he[i].label)) {
        faults.push(`${at}: label '${ar[i].label}' vs '${he[i].label}'`);
      }
      if (Boolean(ar[i].chorus) !== Boolean(he[i].chorus)) {
        faults.push(`${at}: refrain flag ${Boolean(ar[i].chorus)} vs ${Boolean(he[i].chorus)}`);
      }
      if (ar[i].lines.length !== he[i].lines.length) {
        faults.push(`${at}: ${ar[i].lines.length} lines vs ${he[i].lines.length}`);
      }
    }
    rows.push({ id, number: hymn.number, faults });
  }
}

rows.sort((a, b) => a.id.localeCompare(b.id));
const faulty = rows.filter((r) => r.faults.length);

if (verbose) {
  for (const row of rows) {
    console.log(`${row.faults.length ? '✗' : '✓'} ${row.id}${row.faults.length ? ' — ' + row.faults.join('; ') : ''}`);
  }
}

if (faulty.length === 0) {
  console.log(`✓ ${rows.length} translated hymn(s): Hebrew grid matches the Arabic stanza-for-stanza.`);
  process.exit(0);
}

console.error(`${faulty.length} hymn(s) out of ${rows.length} have a Hebrew grid that does not match the Arabic:\n`);
for (const row of faulty) console.error(`  • ${row.id} — ${row.faults.join('; ')}`);
console.error('\nRe-run the payload through `npm run hebrew:apply`, or realign by hand if the Arabic reorder was intentional.');
process.exit(1);
