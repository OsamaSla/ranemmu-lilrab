/**
 * One-off: Book 1's `chorus_he` is a label, not the refrain text. The owner
 * chose the fixed pointed Hebrew word `פְּזָמוֹן` for the Arabic القرار field.
 * The refrain text itself remains in verses_he (the chorus-tagged stanza).
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = join(ROOT, 'content', 'hebrew', 'main');
const LABEL = 'פְּזָמוֹן';

let changed = 0;
for (const file of (await readdir(DIR)).filter((f) => /^\d+\.json$/.test(f))) {
  const path = join(DIR, file);
  const payload = JSON.parse(await readFile(path, 'utf8'));
  if (!payload.chorus_he) continue;
  payload.chorus_he = LABEL;
  await writeFile(path, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  changed++;
}
console.log(`set chorus_he to ${LABEL} in ${changed} payload(s)`);
