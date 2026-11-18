/**
 * One-off repair for the Gemini-produced Book 1 text files on the Desktop.
 * Reads the originals, writes corrected copies into content/.cache/hebrew/gemini-import/.
 *
 * Repairs:
 *  - blank `C:` lines are filled from the chorus-tagged Arabic verse's Hebrew
 *    lines (first tagged verse when several), joined by ` · `;
 *  - h0898: the two printed Arabic lines of each stanza were merged with ` · `;
 *    split them back into S:1 / S:2;
 *  - h0913: the two lines after 2:2 were numbered 3:1/3:2 by mistake; rename
 *    those occurrences to 2:3/2:4.
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const DESKTOP = join(process.env.USERPROFILE, 'Desktop');
const OUT = join(ROOT, 'content', '.cache', 'hebrew', 'gemini-import');

const corpus = new Map();
for (const name of ['main.json', 'main-1001-1047.json']) {
  const data = JSON.parse(await readFile(join(ROOT, 'content', name), 'utf8'));
  const list = Array.isArray(data) ? data : data.hymns;
  for (const h of list) corpus.set(h.number, h);
}

await mkdir(OUT, { recursive: true });
const files = (await readdir(DESKTOP)).filter((f) => /^\d+-\d+\.txt$/.test(f)).sort();

for (const file of files) {
  const raw = (await readFile(join(DESKTOP, file), 'utf8')).replace(/^\uFEFF/, '');
  const parts = raw.split(/^#(\d+)\b/m);
  let out = parts[0];
  let filled = 0;
  let fixed = 0;

  for (let i = 1; i < parts.length; i += 2) {
    const number = Number(parts[i]);
    let body = parts[i + 1];
    const hymn = corpus.get(number);
    if (!hymn) throw new Error(`h${number}: not found in corpus`);

    if (number === 898) {
      body = body.replace(/^(\d):1 (.*?) · (.*)$/gm, (_, s, a, b) => {
        fixed++;
        return `${s}:1 ${a}\n${s}:2 ${b}`;
      });
    }
    if (number === 913) {
      let seen32 = 0;
      body = body
        .split(/\r?\n/)
        .map((line) => {
          if (/^3:[12] /.test(line)) {
            seen32++;
            if (seen32 <= 2) {
              fixed++;
              return line.replace(/^3:([12]) /, (_, n) => `2:${Number(n) + 2} `);
            }
          }
          return line;
        })
        .join('\n');
    }

    const chorusIndex = hymn.verses.findIndex((v) => v.chorus);
    if (chorusIndex >= 0) {
      const prefix = `${chorusIndex + 1}:`;
      const lines = body
        .split(/\r?\n/)
        .filter((line) => line.startsWith(prefix))
        .map((line) => line.slice(prefix.length))
        .filter(Boolean)
        .sort((a, b) => {
          const na = Number(a.match(/^\d+:(\d+)/)?.[1] ?? 0);
          const nb = Number(b.match(/^\d+:(\d+)/)?.[1] ?? 0);
          return na - nb;
        });
      if (lines.length) {
        const refrain = lines.map((l) => l.replace(/^\d+:\d+ /, '')).join(' · ');
        const before = body;
        if (/^C:/m.test(body)) {
          body = body.replace(/^C:[ \t]*$/m, `C: ${refrain}`);
        } else {
          body = body.replace(/\n?$/, `\nC: ${refrain}\n`);
        }
        if (body !== before) filled++;
      }
    }
    out += `#${number}` + body;
  }

  const name = file.replace(/\.txt$/, '.he.txt');
  await writeFile(join(OUT, name), out, 'utf8');
  console.log(`${file}: filled ${filled} C: lines, fixed ${fixed} lines -> ${name}`);
}
