/**
 * Builds handoff packs for translating Book 1 in an external chat (e.g. Gemini).
 *
 *   node scripts/book1/make-gemini-packs.mjs [--from N] [--to N]
 *                                           [--hymns N] [--lines N] [--out DIR]
 *
 * Writes into content/.cache/gemini/ (gitignored):
 *   00-INSTRUCTIONS.txt   — self-contained translator brief + the full glossary
 *   main-XXXX-YYYY.txt    — one `hebrew-digest --pack` template per batch
 *   MANIFEST.md           — ranges, line counts, and a status column
 *
 * Each template file already has the exact shape `hebrew-pack.mjs` consumes:
 * `#NNN | ...`, `T: ...`, `S:L <line>`, `C: <chorus>` (blank when absent),
 * optional `R: <note>`. Paste one pack into the chat, ask for the same template
 * with Hebrew in place of Arabic, then bring the answer back to the parent
 * session, which saves it as content/.cache/hebrew/main-XXXX-YYYY.he.txt and
 * runs the normal pack -> apply -> gates -> commit loop.
 *
 * Defaults match the driver: 15 hymns / 140 lines per pack. Re-run after every
 * completed batch to refresh the packs; hymns with a payload on disk are skipped.
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const CONTENT = join(ROOT, 'content');
const HEBREW_DIR = join(CONTENT, 'hebrew', 'main');

const argv = process.argv.slice(2);
const option = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const FROM = Number(option('--from', 1));
const TO = Number(option('--to', 1047));
const MAX_HYMS = Number(option('--hymns', 15));
const MAX_LINES = Number(option('--lines', 140));
const OUT = join(ROOT, option('--out', join('content', '.cache', 'gemini')));

const BRIEF = `You are translating Arabic Coptic hymns (Book 1, "رنموا للرب")
into liturgical Hebrew. This is a human-quality translation task, not a gloss.

OUTPUT CONTRACT — read this first
- Output ONLY the template you are given, with the Arabic after "T:", "S:L"
  and "C:" replaced by pointed Hebrew. Keep every "#NNN | ..." header, every
  "T:" prefix, every "S:L" line number, every blank line, and the "C:" line
  (write the Hebrew refrain there when it is blank in the template).
- No preamble, no commentary, no markdown code fences, no translated headings.
  The answer must be usable as a plain .txt file with no cleanup.
- Add at most one "R: <short note>" line per hymn for a glossary choice, a
  quoted Bible verse, or a line-division decision. Do not add other lines.

TRANSLATION RULES
- Elevated biblical/liturgical Hebrew, NOT modern conversational Hebrew.
- Fully vocalised (niqqud on every word). Unpointed Hebrew is rejected.
- One Hebrew line per printed Arabic line; the printed line is the unit.
  Keep the Arabic's half-phrases in ONE string joined by " · " (space, maqaf
  if a genuine construct chain). Never pad a short Arabic half-phrase, never
  merge two printed lines, never invent a stanza.
- The Arabic is the authority; the printed English is only a bridge where the
  Arabic is ambiguous. Where the Arabic addresses "you", use 2nd person even
  if an English gloss says "he".
- Stanza labels and refrain flags are data copied from the Arabic at merge
  time; never retype or renumber them in the template.
- No parentheses, no em-dashes, no quotation marks inside a line except a
  colon before direct speech (אוֹמֵר לִי: הִנְנִי־חַי). Source repeat markers
  such as "(…)2" and printed verse numbers are singing/numbering artifacts:
  translate their content once and drop the markers.
- Divine name: never the tetragrammaton unless the Arabic itself prints
  يَهْوَه; use אֲדֹנָי in direct address and הָאָדוֹן when speaking about Him.
- Meshed shuruq, furtive patah on final gutturals (רוּחַ, מָשִׁיחַ), and a
  line-break maqaf are all banned; use the pointing conventions below.
- Chorus ("C:"): fill with the Hebrew of the chorus-tagged verse's lines
  joined by " · ". The Arabic label القرار stays as stanza-label data and is
  not translated. A blank C: means the hymn has no chorus field — leave the
  blank line exactly as it is.

FIXED RENDERINGS AND HOUSE STYLE (authoritative — paste of glossary.md)
`;

const files = (await readdir(CONTENT)).filter(
  (f) => f.endsWith('.json') && f !== 'authors.json',
);
const hymns = [];
for (const name of files) {
  const data = JSON.parse(await readFile(join(CONTENT, name), 'utf8'));
  const list = Array.isArray(data) ? data : data.hymns;
  if (!Array.isArray(list)) continue;
  const fallback = name.replace(/\.json$/, '');
  for (const hymn of list) {
    if ((hymn.book ?? fallback) === 'main') hymns.push(hymn);
  }
}
hymns.sort((a, b) => a.number - b.number);

const isDone = (n) => existsSync(join(HEBREW_DIR, `${String(n).padStart(4, '0')}.json`));
const lineCount = (h) => h.verses.reduce((n, v) => n + v.lines.length, 0);
const remaining = hymns.filter((h) => h.number >= FROM && h.number <= TO && !isDone(h.number));

await mkdir(OUT, { recursive: true });

const glossary = await readFile(join(CONTENT, 'hebrew', 'glossary.md'), 'utf8');
await writeFile(
  join(OUT, '00-INSTRUCTIONS.txt'),
  BRIEF + glossary + '\n\nEND OF BRIEF. Now translate the template in the next message.\n',
  'utf8',
);

const groups = [];
for (const h of remaining) {
  const n = lineCount(h);
  const last = groups[groups.length - 1];
  if (last && last.lines + n <= MAX_LINES && last.hymns.length < MAX_HYMS) {
    last.lines += n;
    last.hymns.push(h.number);
  } else {
    groups.push({ lines: n, hymns: [h.number] });
  }
}

const manifest = [
  '# Gemini handoff packs — Book 1 Hebrew',
  '',
  'Paste `00-INSTRUCTIONS.txt` once, then one `main-XXXX-YYYY.txt` per message.',
  'Paste Gemini\'s answer back to the parent session; it will be saved as',
  '`content/.cache/hebrew/main-XXXX-YYYY.he.txt` and run through the normal gates.',
  '',
  '| pack | from | to | hymns | lines | status |',
  '| --- | --- | --- | --- | --- | --- |',
];
for (const group of groups) {
  const from = group.hymns[0];
  const to = group.hymns[group.hymns.length - 1];
  const name = `main-${String(from).padStart(4, '0')}-${String(to).padStart(4, '0')}.txt`;
  const template = execFileSync(
    process.execPath,
    [join(ROOT, 'scripts', 'hebrew-digest.mjs'), 'main', String(from), String(to), '--pack'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  );
  await writeFile(join(OUT, name), template, 'utf8');
  manifest.push(`| ${name} | ${from} | ${to} | ${group.hymns.length} | ${group.lines} | |`);
  console.log(`${from}-${to} ${group.hymns.length} ${group.lines} -> ${relative(ROOT, join(OUT, name))}`);
}
await writeFile(join(OUT, 'MANIFEST.md'), manifest.join('\n') + '\n', 'utf8');
console.log(`${groups.length} pack(s) + 00-INSTRUCTIONS.txt in ${relative(ROOT, OUT)}`);
