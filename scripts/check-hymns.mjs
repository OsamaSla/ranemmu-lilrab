/**
 * Standalone corpus check. Run with: npm run check:hymns
 * Exits non-zero so it can gate a commit or the EAS build.
 */
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCorpus, formatIssues, DIACRITICS } from './lib/validate.mjs';

const CONTENT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'content');

const entries = (await readdir(CONTENT_DIR))
  .filter((f) => f.endsWith('.json') && f !== 'authors.json')
  .sort();

const hymns = [];
for (const name of entries) {
  const raw = JSON.parse(await readFile(join(CONTENT_DIR, name), 'utf8'));
  hymns.push(...(Array.isArray(raw) ? raw : (raw.hymns ?? [])));
}

const issues = validateCorpus(hymns);

if (issues.length > 0) {
  console.error(`${issues.length} issue(s) across ${hymns.length} hymns:\n${formatIssues(issues)}`);
  process.exit(1);
}

// Vocalisation coverage. A real hymnal is fully vocalised, so a low percentage
// means the ingest pipeline lost or never read the diacritics.
const lines = hymns.flatMap((h) => (h.verses ?? []).flatMap((v) => v.lines));
const vocalised = lines.filter((line) => DIACRITICS.test(line)).length;
const pct = lines.length === 0 ? 0 : (vocalised / lines.length) * 100;

const unmetered = hymns.filter((h) => !h.meter).length;

console.log(`${hymns.length} hymns in ${entries.length} file(s) — all checks passed`);
console.log(`  lines            ${lines.length} (${vocalised} vocalised, ${pct.toFixed(0)}%)`);
console.log(`  missing meter    ${unmetered}`);
