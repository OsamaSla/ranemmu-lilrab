/**
 * Copies the machine drafts into the authoring tree, applying the human
 * verdicts made while reading `_drafts/report.md`.
 *
 * Run with: node scripts/scripture-curate.mjs [--dry]
 *
 * `DROP` is a hymn whose draft was wrong (the phrase was an idiom, or the verse
 * means the opposite). `FIX` is a hymn where the right reference is known: the
 * hymn prints the verse verbatim as its title or opening line, so the machine's
 * pick was the wrong verse of the right passage, or a passing quotation instead
 * of the foundation.
 */
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseScriptureRef, refToString } from './lib/bible-books.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DRAFT_DIR = join(ROOT, 'content', 'scriptures', '_drafts');
const OUT_DIR = join(ROOT, 'content', 'scriptures');

/** Wrong: the matched phrase is an idiom or the verse says the opposite. */
const DROP = new Set([
  'book3:0122', // «لست أدرى» — the hymn is not Peter's denial
  'book3:0214', // «سلمنا فصرنا نحمل» — Paul's shipwreck, not the burden of care
  'main:0254', // duplicate of book3:0122
  'main:0303', // duplicate of book3:0214
  'main:0341', // «قوة لاصطناع ثروة» — Deut 8:18 is not this hymn's ground
  'main:0579', // «في ديار» — Ps 116:19, not the second coming
  'taranim:0037', // duplicate of book3:0122
  'taranim:0200', // Isa 59:7 — blood shed by the wicked, not Christ's blood
  'taranim:0202', // «عري أم خطر» — Rom 8:35 quoted in passing
  'taranim:0232', // Zech 14:9 on weak overlap alone
  'taranim:0339', // Rom 3:15, same problem as taranim:0200
]);

/** Right reference, from the hymn's own title or opening line. */
const FIX = {
  'main:0087': ['php.3.14'], // «أسعى أنا نحو الغرض … جعالتي» is Phil 3:14, not 3:7
  'main:0366': ['luk.1.68'], // «مبارك الرب إلهنا لأنه افتقد شعبه» is the Benedictus' opening
  'main:0529': ['sng.1.4', 'sng.5.10'], // title is Song 1:4; 5:10 is quoted later
  'main:0655': ['psa.65.1', 'psa.65.11'], // title is Ps 65:1, stanza is 65:11
  'main:0346': ['luk.7.48'], // same hymn as book3:0287, which matched Luke 7:48
  'main:0598': ['psa.89.1', 'psa.72.11'], // opening is Ps 89:1, title is Ps 72:11
  'main:0703': ['php.2.9'], // Job 18:17 says the name perishes — the opposite
  'taranim:0080': ['php.2.9'], // same hymn as main:0703
  'book3:0046': ['php.3.13', 'rom.8.37'], // «ننسى ما ورا» is Phil 3:13, quoted with Rom 8:37
  'main:0156': ['php.3.13', 'rom.8.37'], // same hymn as book3:0046
  'book3:0340': ['psa.25.15'], // title is Ps 25:15 verbatim
  'main:0191': ['sng.2.3', 'psa.45.2'], // title is Song 2:3; Ps 45:2 is quoted later
  'taranim:0103': ['psa.45.2', 'sng.5.16'], // title is Ps 45:2; Song 5:16 is quoted later
};

const dry = process.argv.includes('--dry');

const books = (await readdir(DRAFT_DIR, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

let written = 0;
let dropped = 0;
let fixed = 0;
const kept = [];

for (const book of books) {
  const dir = join(DRAFT_DIR, book);
  const files = (await readdir(dir)).filter((name) => name.endsWith('.json')).sort();
  const outDir = join(OUT_DIR, book);
  if (!dry) {
    await rm(outDir, { recursive: true, force: true });
    await mkdir(outDir, { recursive: true });
  }

  for (const name of files) {
    const number = Number(name.replace(/\.json$/, ''));
    const key = `${book}:${String(number).padStart(4, '0')}`;
    if (DROP.has(key)) {
      dropped += 1;
      continue;
    }

    const path = join(dir, name);
    const payload = JSON.parse(await readFile(path, 'utf8'));
    if (FIX[key]) {
      const refs = FIX[key].map((text) => refToString(parseScriptureRef(text)));
      payload.refs = refs;
      // Every corrected reference is still machine-derived work: the reviewer
      // clears the flag once the verse has been read in the hymn's context.
      payload.review = refs;
      fixed += 1;
    }

    if (dry) {
      kept.push(`${key} ${payload.refs.join(', ')}`);
      written += 1;
      continue;
    }

    await writeFile(join(outDir, name), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    kept.push(`${key} ${payload.refs.join(', ')}`);
    written += 1;
  }
}

await writeFile(
  join(DRAFT_DIR, 'curated.txt'),
  kept.join('\n') + '\n',
  'utf8',
);

console.log(`${dry ? 'Would write' : 'Wrote'} ${written} payload(s) to content/scriptures/`);
console.log(`Dropped ${dropped}, corrected ${fixed}.`);
