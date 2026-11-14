/**
 * Merges the hand-authored Hebrew payloads into the book corpus.
 *
 * Run with:  node scripts/hebrew-apply.mjs            (write)
 *            node scripts/hebrew-apply.mjs --check    (validate only)
 *            node scripts/hebrew-apply.mjs --verbose
 *
 * Inputs   content/hebrew/<book>/<number>.json
 *            { book, number, title_he, verses_he, chorus_he?, review?[] }
 * Output   content/<book>.json, edited in place
 *
 * Every payload is checked against the Arabic record before anything is
 * written: same stanza count, same labels, same line counts, and every Hebrew
 * line must actually be Hebrew and actually be pointed. A mismatch aborts the
 * whole run, so a batch can never half-land.
 *
 * The corpus is serialised by hand (JSON.stringify with a single-space
 * indent, LF endings, no trailing newline) because that is exactly how the
 * file is authored; a plain read-modify-write would rewrite every byte and
 * bury the real change in the diff.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HEBREW_DIR = join(ROOT, 'content', 'hebrew');

/** Diacritics that make a line "vocalised": points, cantillation, dagesh. */
const POINT = /[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]/;
/** Any Hebrew letter. */
const HEBREW = /[\u05D0-\u05EA]/;
/** Latin, Arabic, Cyrillic, CJK — anything that must never leak into `*_he`. */
const FOREIGN = /[A-Za-z\u0600-\u06FF\u0750-\u077F\u0400-\u04FF\u3040-\u30FF\u4E00-\u9FFF]/;

const HE_KEYS = ['title_he', 'verses_he', 'chorus_he'];
const ALLOWED_KEYS = new Set(['book', 'number', ...HE_KEYS, 'review']);

const args = new Set(process.argv.slice(2));
const CHECK = args.has('--check');
const VERBOSE = args.has('--verbose');

/**
 * Reads a corpus file and remembers how it was serialised, so the write can
 * reproduce the authoring format byte for byte.
 */
async function readCorpus(book) {
  const path = join(ROOT, 'content', `${book}.json`);
  const raw = await readFile(path, 'utf8');
  const data = JSON.parse(raw);
  const list = Array.isArray(data) ? data : data.hymns;
  if (!Array.isArray(list)) throw new Error(`${book}.json: no hymn array`);
  return {
    path,
    raw,
    data,
    list,
    arrayRoot: Array.isArray(data),
    eol: raw.includes('\r\n') ? '\r\n' : '\n',
    trailing: raw.endsWith('\n'),
  };
}

/** Serialises exactly like the authored corpus (indent 1, LF, no final EOL). */
function serialise(corpus) {
  const text = JSON.stringify(corpus.data, null, 1).replace(/\n/g, corpus.eol);
  return corpus.trailing ? `${text}${corpus.eol}` : text;
}

/** Shape + language checks for one payload against its Arabic hymn. */
function inspect(payload, hymn, file) {
  const issues = [];
  const at = `${file}`;

  for (const key of Object.keys(payload)) {
    if (!ALLOWED_KEYS.has(key)) issues.push(`${at}: unexpected key '${key}'`);
  }
  if (payload.book !== hymn.book) {
    issues.push(`${at}: book '${payload.book}' vs '${hymn.book}' in the corpus`);
  }
  if (typeof payload.title_he !== 'string' || !payload.title_he.trim()) {
    issues.push(`${at}: missing 'title_he'`);
  }
  const verses = payload.verses_he;
  if (!Array.isArray(verses) || verses.length === 0) {
    issues.push(`${at}: missing 'verses_he'`);
    return issues;
  }
  if (verses.length !== hymn.verses.length) {
    issues.push(
      `${at}: ${verses.length} Hebrew stanzas vs ${hymn.verses.length} Arabic — must match one-to-one`,
    );
    return issues;
  }

  verses.forEach((verse, v) => {
    const vat = `${at}:${v + 1}`;
    if (String(verse.label) !== String(hymn.verses[v].label)) {
      issues.push(
        `${vat}: label '${verse.label}' vs '${hymn.verses[v].label}' in Arabic`,
      );
    }
    const lines = verse.lines;
    if (!Array.isArray(lines) || lines.length === 0) {
      issues.push(`${vat}: missing 'lines'`);
      return;
    }
    if (lines.length !== hymn.verses[v].lines.length) {
      issues.push(
        `${vat}: ${lines.length} lines vs ${hymn.verses[v].lines.length} in Arabic — must match`,
      );
    }
    lines.forEach((line, l) => {
      const lat = `${vat}:${l + 1}`;
      if (typeof line !== 'string' || !line.trim()) {
        issues.push(`${lat}: empty line`);
        return;
      }
      if (FOREIGN.test(line)) {
        issues.push(`${lat}: non-Hebrew character in ${JSON.stringify(line)}`);
      }
      if (!HEBREW.test(line)) issues.push(`${lat}: no Hebrew letters in ${JSON.stringify(line)}`);
      if (!POINT.test(line)) issues.push(`${lat}: unpointed line ${JSON.stringify(line)}`);
    });
  });

  if (hymn.chorus !== undefined && hymn.chorus !== '') {
    if (typeof payload.chorus_he !== 'string' || !payload.chorus_he.trim()) {
      issues.push(`${at}: Arabic has a chorus but the payload has no 'chorus_he'`);
    } else if (!HEBREW.test(payload.chorus_he) || !POINT.test(payload.chorus_he)) {
      issues.push(`${at}: 'chorus_he' must be pointed Hebrew`);
    }
  }

  return issues;
}

/**
 * Rebuilds the hymn object with the Hebrew fields grouped after the last
 * translation field. Key order has no semantic meaning, but a stable one keeps
 * `git diff` readable across batches.
 */
function withHebrew(hymn, payload) {
  const he = {};
  for (const key of HE_KEYS) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) he[key] = value;
    else if (Array.isArray(value) && value.length > 0) he[key] = value;
  }

  const anchors = [
    'chorus_de', 'verses_de', 'title_de',
    'chorus_en', 'verses_en', 'title_en',
    'chorus', 'verses', 'title',
  ];
  const entries = Object.entries(hymn).filter(([key]) => !HE_KEYS.includes(key));
  let insertAt = entries.length;
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    if (anchors.includes(entries[i][0])) {
      insertAt = i + 1;
      break;
    }
  }
  const out = {};
  entries.forEach(([key, value], i) => {
    if (i === insertAt) Object.assign(out, he);
    out[key] = value;
  });
  if (insertAt === entries.length) Object.assign(out, he);
  // Preserve any Hebrew key the payload does not overwrite (nothing today,
  // but keeps a partial re-run from silently deleting text).
  for (const key of HE_KEYS) {
    if (out[key] === undefined && hymn[key] !== undefined) out[key] = hymn[key];
  }
  return out;
}

/** Loads every payload file, grouped by book. */
async function loadPayloads() {
  const books = (await readdir(HEBREW_DIR, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  const payloads = [];
  for (const book of books) {
    const dir = join(HEBREW_DIR, book);
    const files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort();
    for (const name of files) {
      const file = `content/hebrew/${book}/${name}`;
      const payload = JSON.parse(await readFile(join(dir, name), 'utf8'));
      payloads.push({ book, file, payload });
    }
  }
  return payloads;
}

const payloads = await loadPayloads();
if (payloads.length === 0) {
  console.log('No Hebrew payloads found under content/hebrew/.');
  process.exit(0);
}

const corpora = new Map();
const issues = [];
const applied = [];
const seen = new Set();

for (const { book, file, payload } of payloads) {
  if (!corpora.has(book)) corpora.set(book, await readCorpus(book));
  const corpus = corpora.get(book);
  const key = `${book}:${payload.number}`;
  if (seen.has(key)) issues.push(`${file}: duplicate payload for ${book} ${payload.number}`);
  seen.add(key);

  const hymn = corpus.list.find(
    (h) => (h.book ?? book) === book && h.number === payload.number,
  );
  if (!hymn) {
    issues.push(`${file}: no hymn ${payload.number} in ${book}.json`);
    continue;
  }

  const found = inspect(payload, hymn, file);
  if (found.length) {
    issues.push(...found);
    continue;
  }

  const next = withHebrew(hymn, payload);
  const index = corpus.list.indexOf(hymn);
  corpus.list[index] = next;
  applied.push({ book, file, number: payload.number, title: next.title, flags: payload.review?.length ?? 0 });
}

if (issues.length) {
  console.error(`${issues.length} problem(s) — nothing written:\n`);
  for (const issue of issues) console.error(`  • ${issue}`);
  process.exit(1);
}

const changed = [];
for (const [book, corpus] of corpora) {
  const before = corpus.raw;
  const after = serialise(corpus);
  if (before === after) continue;
  changed.push(book);
  if (!CHECK) await writeFile(corpus.path, after, 'utf8');
}

const totalFlags = applied.reduce((sum, item) => sum + item.flags, 0);
const noun = applied.length === 1 ? 'hymn' : 'hymns';

const out = [];

if (VERBOSE || CHECK) {
  for (const item of applied) {
    out.push(`  ${item.book} ${String(item.number).padStart(4, '0')}  ${item.title}  [${item.flags} flag(s)]`);
  }
}

let failed = false;
if (CHECK) {
  if (changed.length === 0) {
    out.push(`✓ ${applied.length} ${noun} already applied in ${corpora.size} book(s) — no drift.`);
  } else {
    out.push(
      `✗ ${applied.length} ${noun} in payload files but ${changed.join(', ')} would change. Run without --check to write.`,
    );
    failed = true;
  }
} else {
  out.push(
    `✓ applied ${applied.length} ${noun} (${changed.length ? changed.join(', ') : 'no change'}) · ${totalFlags} review flag(s)`,
  );
}

if (totalFlags > 0 && !CHECK) {
  out.push('', 'Review flags (read these lines):');
  for (const { file, payload } of payloads) {
    for (const flag of payload.review ?? []) out.push(`  ${file} — ${flag}`);
  }
}

console.log(out.join('\n'));
if (failed) process.exit(1);
