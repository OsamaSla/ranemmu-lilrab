/**
 * Converts an authored batch file into Hebrew payload JSON.
 *
 * Run with:  node scripts/hebrew-pack.mjs <file.txt> [--book book3] [--dry-run] [--force]
 *
 * The batch file is the `hebrew-digest.mjs --pack` template with the Arabic
 * replaced by Hebrew, one block per hymn:
 *
 *   #51 | metre 87.87 | shape 4/4/4
 *   T: <title_he>
 *   1:1 <pointed Hebrew line>
 *   1:2 <pointed Hebrew line>
 *   2:1 <pointed Hebrew line>
 *   C: <chorus_he>          (only when the Arabic hymn has a chorus field)
 *   R: <one-line note>      (optional, at most one per hymn)
 *
 * Why the `S:L` prefixes: the payload needs one line per printed line, and a
 * batch that silently loses or repeats a line shifts the whole stanza. The
 * prefix makes the expected position explicit, so a mistake is reported as
 * "missing 2:3" instead of landing in the corpus.
 *
 * Labels and refrain flags are NOT read from the batch file — they are copied
 * from the Arabic stanza at the same index, exactly as `hebrew-apply.mjs` does
 * on merge. Stanza labels are data (Book 3 mixes `القرار` and `قرار`, and two
 * hymns start at `1`), so they must never be retyped.
 *
 * Nothing is written unless every block in the file validates.
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FOREIGN, HEBREW, checkLine } from './lib/hebrew-text.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'content');
const HEBREW_DIR = join(CONTENT, 'hebrew');

const argv = process.argv.slice(2);
const input = argv.find((arg) => !arg.startsWith('--'));
const DRY = argv.includes('--dry-run');
const FORCE = argv.includes('--force');

/** Reads `--name value`; returns undefined when the flag is absent. */
function option(name) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

const BOOK = option('--book') ?? 'book3';

if (!input) {
  console.error(
    'usage: node scripts/hebrew-pack.mjs <file.txt> [--book book3] [--dry-run] [--force]',
  );
  process.exit(2);
}

/** Reads the batch file into per-hymn blocks; collection errors abort later. */
async function readBatch(path) {
  const raw = (await readFile(path, 'utf8')).replace(/^\uFEFF/, '');
  const rows = raw.split(/\r?\n/);
  const blocks = [];
  const faults = [];
  let current = null;

  rows.forEach((row, index) => {
    const at = `line ${index + 1}`;
    const line = row.trim();
    if (!line) return;

    if (line.startsWith('#')) {
      const match = /^#(\d+)\b/.exec(line);
      if (!match) {
        faults.push(`${at}: '#NN' must start with the hymn number — got ${JSON.stringify(line)}`);
        return;
      }
      current = {
        number: Number(match[1]),
        title: '',
        chorus: '',
        review: [],
        lines: new Map(),
        at,
      };
      blocks.push(current);
      return;
    }

    if (!current) {
      faults.push(`${at}: text before the first '#NN' block`);
      return;
    }

    if (line.startsWith('T:')) {
      current.title = line.slice(2).trim();
      return;
    }
    if (line.startsWith('C:')) {
      current.chorus = line.slice(2).trim();
      return;
    }
    if (line.startsWith('R:')) {
      current.review.push(line.slice(2).trim());
      return;
    }

    const match = /^(\d+):(\d+)\s+(.+)$/.exec(line);
    if (!match) {
      faults.push(`${at}: expected 'S:L <text>', got ${JSON.stringify(line)}`);
      return;
    }
    const key = `${Number(match[1])}:${Number(match[2])}`;
    if (current.lines.has(key)) {
      faults.push(`${at}: duplicate line ${key} in hymn ${current.number}`);
      return;
    }
    current.lines.set(key, match[3].trim());
  });

  return { blocks, faults };
}

/** Indexes every corpus hymn by book, like the digest and apply scripts. */
async function loadCorpora() {
  const names = (await readdir(CONTENT)).filter((f) => f.endsWith('.json') && f !== 'authors.json');
  const byBook = new Map();
  for (const name of names) {
    const data = JSON.parse(await readFile(join(CONTENT, name), 'utf8'));
    const list = Array.isArray(data) ? data : data.hymns;
    if (!Array.isArray(list)) continue;
    const fallback = name.replace(/\.json$/, '');
    for (const hymn of list) {
      const key = hymn.book ?? fallback;
      if (!byBook.has(key)) byBook.set(key, []);
      byBook.get(key).push(hymn);
    }
  }
  return byBook;
}

const { blocks, faults } = await readBatch(input);
const issues = [...faults];

if (blocks.length === 0) issues.push(`${input}: no hymn blocks found`);

const byBook = await loadCorpora();
const bookHymns = byBook.get(BOOK) ?? [];
const seen = new Set();
const planned = [];

for (const block of blocks) {
  const at = `#${block.number}`;
  if (seen.has(block.number)) {
    issues.push(`${at}: appears twice in the batch file`);
    continue;
  }
  seen.add(block.number);

  const hymn = bookHymns.find((item) => item.number === block.number);
  if (!hymn) {
    issues.push(`${at}: no hymn ${block.number} in '${BOOK}'`);
    continue;
  }

  if (!block.title) issues.push(`${at}: missing 'T:' title`);
  else if (FOREIGN.test(block.title)) issues.push(`${at}: non-Hebrew character in title`);
  else if (!HEBREW.test(block.title)) issues.push(`${at}: title has no Hebrew letters`);

  if (hymn.chorus) {
    if (!block.chorus) {
      issues.push(`${at}: Arabic has a chorus but the block has no 'C:' line`);
    } else {
      const fault = checkLine(block.chorus);
      if (fault) issues.push(`${at}: chorus_he ${fault}`);
    }
  } else if (block.chorus) {
    issues.push(`${at}: 'C:' given but the Arabic hymn has no chorus field`);
  }

  const expected = [];
  hymn.verses.forEach((verse, v) => {
    verse.lines.forEach((_, l) => expected.push(`${v + 1}:${l + 1}`));
  });

  const missing = expected.filter((key) => !block.lines.has(key));
  const extra = [...block.lines.keys()].filter((key) => !expected.includes(key));
  if (missing.length) {
    const shape = hymn.verses.map((v) => v.lines.length).join('/');
    issues.push(`${at}: missing ${missing.join(', ')} (shape ${shape})`);
  }
  if (extra.length) issues.push(`${at}: unexpected ${extra.join(', ')}`);

  for (const [key, text] of block.lines) {
    const fault = checkLine(text);
    if (!fault) continue;
    const why =
      fault === 'empty'
        ? 'empty line'
        : fault === 'foreign'
          ? `non-Hebrew character in ${JSON.stringify(text)}`
          : fault === 'no-hebrew'
            ? `no Hebrew letters in ${JSON.stringify(text)}`
            : `unpointed line ${JSON.stringify(text)}`;
    issues.push(`${at} ${key}: ${why}`);
  }

  const name = `${String(block.number).padStart(4, '0')}.json`;
  const path = join(HEBREW_DIR, BOOK, name);
  const relative = path.replace(/\\/g, '/').replace(`${ROOT.replace(/\\/g, '/')}/`, '');
  if (existsSync(path) && !FORCE) {
    issues.push(`${relative}: payload exists — pass --force to overwrite`);
  }

  const payload = {
    book: BOOK,
    number: block.number,
    title_he: block.title,
    verses_he: hymn.verses.map((verse, v) => ({
      label: verse.label,
      lines: verse.lines.map((_, l) => block.lines.get(`${v + 1}:${l + 1}`)),
      ...(verse.chorus ? { chorus: true } : {}),
    })),
  };
  if (block.chorus) payload.chorus_he = block.chorus;
  if (block.review.length) payload.review = block.review;

  planned.push({ path, relative, payload, lines: expected.length });
}

if (issues.length) {
  console.error(`${issues.length} problem(s) — nothing written:\n`);
  for (const issue of issues) console.error(`  • ${issue}`);
  process.exit(1);
}

const totalLines = planned.reduce((sum, item) => sum + item.lines, 0);

if (DRY) {
  for (const item of planned) console.error(`would write ${item.relative}`);
  console.log(`✓ ${planned.length} payload(s), ${totalLines} line(s) — dry run, nothing written`);
  process.exit(0);
}

await mkdir(join(HEBREW_DIR, BOOK), { recursive: true });
for (const item of planned) {
  await writeFile(item.path, `${JSON.stringify(item.payload, null, 2)}\n`, 'utf8');
}

console.log(
  `✓ wrote ${planned.length} payload(s), ${totalLines} line(s) to content/hebrew/${BOOK}/`,
);
