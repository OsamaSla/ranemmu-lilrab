/**
 * Merges the authored scripture references into the book corpus.
 *
 * Run with:  node scripts/scripture-apply.mjs            (write)
 *            node scripts/scripture-apply.mjs --check    (validate only)
 *            node scripts/scripture-apply.mjs --verbose
 *
 * Inputs   content/scriptures/<book>/<number>.json
 *            { book, number, refs: ["isa.53.4-6", …], review?: ["1pe.2.24"] }
 * Output   content/<book>.json, edited in place
 *
 * `refs` accepts the canonical id or the Arabic form, so a payload can be
 * authored the way the reference is printed (إشعياء ٥٣: ٤-٦). The payload is
 * parsed once, here: the corpus stores structured refs and the app never
 * parses text.
 *
 * An empty `refs` array clears the hymn's references (that is how a wrong
 * citation is removed). Anything malformed aborts the whole run, so a batch can
 * never half-land — same discipline as hebrew-apply.mjs.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compareRefs,
  formatScriptureRef,
  parseScriptureRef,
  refToString,
} from './lib/bible-books.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPTURES_DIR = join(ROOT, 'content', 'scriptures');

const ALLOWED_KEYS = new Set(['book', 'number', 'refs', 'review']);

const args = new Set(process.argv.slice(2));
const CHECK = args.has('--check');
const VERBOSE = args.has('--verbose');

/** Reads every corpus file once and indexes its hymns by book (same as hebrew-apply). */
async function loadCorpora() {
  const names = (await readdir(join(ROOT, 'content'))).filter(
    (f) => f.endsWith('.json') && f !== 'authors.json',
  );
  const files = new Map();
  const byBook = new Map();

  for (const name of names) {
    const corpus = await readCorpusFile(join(ROOT, 'content', name));
    const book = name.replace(/\.json$/, '');
    files.set(corpus.path, corpus);
    corpus.list.forEach((hymn, index) => {
      const key = hymn.book ?? book;
      if (!byBook.has(key)) byBook.set(key, []);
      byBook.get(key).push({ corpus, hymn, index });
    });
  }
  return { files, byBook };
}

async function readCorpusFile(path) {
  const raw = await readFile(path, 'utf8');
  const data = JSON.parse(raw);
  const list = Array.isArray(data) ? data : data.hymns;
  if (!Array.isArray(list)) throw new Error(`${path}: no hymn array`);
  // Authored corpora do not agree on indentation (book3 uses 2 spaces, main and
  // taranim use 1). Keep whatever the file already uses, so a merge that adds
  // one key does not rewrite forty thousand lines.
  const indentMatch = raw.match(/^\{[^\S\r\n]*\r?\n([ \t]+)/);
  return {
    path,
    raw,
    data,
    list,
    indent: indentMatch ? indentMatch[1] : 1,
    eol: raw.includes('\r\n') ? '\r\n' : '\n',
    trailing: raw.endsWith('\n'),
  };
}

/** Serialises exactly like the authored corpus (its own indent, LF/CRLF as before). */
function serialise(corpus) {
  const text = JSON.stringify(corpus.data, null, corpus.indent).replace(/\n/g, corpus.eol);
  return corpus.trailing ? `${text}${corpus.eol}` : text;
}

/**
 * Refs in canonical order, duplicates dropped. Two spellings of the same verse
 * ("isa.53.5" and "إشعياء ٥٣: ٥") are one reference; the second is an error, not
 * a silent duplicate, because it usually means a hand edit went wrong.
 */
function parseRefList(values, file) {
  const issues = [];
  const seen = new Map();
  const refs = [];
  values.forEach((value, i) => {
    if (typeof value !== 'string' || !value.trim()) {
      issues.push(`${file}: refs[${i}] is not a non-empty string`);
      return;
    }
    let ref;
    try {
      ref = parseScriptureRef(value);
    } catch (err) {
      issues.push(`${file}: refs[${i}] ${err.message}`);
      return;
    }
    const key = refToString(ref);
    if (seen.has(key)) {
      issues.push(`${file}: refs[${i}] repeats ${key} (also refs[${seen.get(key)}])`);
      return;
    }
    seen.set(key, i);
    refs.push({ ref, key });
  });
  return { issues, refs };
}

/**
 * Rebuilds the hymn with `scriptures` right after the identifying fields, so
 * the key order stays stable across batches and the diff stays readable.
 */
function withScriptures(hymn, refs) {
  const out = {};
  let inserted = false;
  for (const [key, value] of Object.entries(hymn)) {
    if (key === 'scriptures') continue;
    if (!inserted && (key === 'number' || key === 'title')) {
      if (refs.length) out.scriptures = refs;
      inserted = true;
    }
    out[key] = value;
  }
  if (!inserted && refs.length) out.scriptures = refs;
  return out;
}

/** Loads every payload file, grouped by book. `_drafts` is never merged. */
async function loadPayloads() {
  const books = (await readdir(SCRIPTURES_DIR, { withFileTypes: true }))
    .filter((e) => e.isDirectory() && !e.name.startsWith('_'))
    .map((e) => e.name)
    .sort();

  const payloads = [];
  for (const book of books) {
    const dir = join(SCRIPTURES_DIR, book);
    const files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort();
    for (const name of files) {
      const file = `content/scriptures/${book}/${name}`;
      const payload = JSON.parse(await readFile(join(dir, name), 'utf8'));
      payloads.push({ book, file, payload });
    }
  }
  return payloads;
}

const payloads = await loadPayloads();
if (payloads.length === 0) {
  console.log('No scripture payloads found under content/scriptures/.');
  process.exit(0);
}

const { files: corpora, byBook } = await loadCorpora();
const issues = [];
const applied = [];
const seen = new Set();

for (const { book, file, payload } of payloads) {
  for (const key of Object.keys(payload)) {
    if (!ALLOWED_KEYS.has(key)) issues.push(`${file}: unexpected key '${key}'`);
  }
  if (payload.book !== book) {
    issues.push(`${file}: book '${payload.book}' vs '${book}' (payload folder)`);
  }
  if (!Number.isInteger(payload.number)) {
    issues.push(`${file}: 'number' must be an integer`);
    continue;
  }
  if (!Array.isArray(payload.refs)) {
    issues.push(`${file}: 'refs' must be an array`);
    continue;
  }
  const key = `${book}:${payload.number}`;
  if (seen.has(key)) issues.push(`${file}: duplicate payload for ${book} ${payload.number}`);
  seen.add(key);

  const entries = byBook.get(book) ?? [];
  const entry = entries.find((item) => item.hymn.number === payload.number);
  if (!entry) {
    issues.push(`${file}: no hymn ${payload.number} in ${book}`);
    continue;
  }

  const parsed = parseRefList(payload.refs, file);
  issues.push(...parsed.issues);
  if (parsed.issues.length) continue;

  const refs = parsed.refs.map((item) => item.ref).sort(compareRefs);

  // `review` lists the refs whose verse has not been checked by a human yet.
  // Marking happens here, on the structured ref, so reordering refs in a
  // payload cannot move a flag onto a different verse.
  const review = payload.review ?? [];
  if (!Array.isArray(review)) {
    issues.push(`${file}: 'review' must be an array of refs`);
    continue;
  }
  const reviewKeys = new Set();
  let reviewProblem = false;
  review.forEach((value, i) => {
    let ref;
    try {
      ref = parseScriptureRef(value);
    } catch (err) {
      issues.push(`${file}: review[${i}] ${err.message}`);
      reviewProblem = true;
      return;
    }
    const refKey = refToString(ref);
    if (!parsed.refs.some((item) => item.key === refKey)) {
      issues.push(`${file}: review[${i}] ${refKey} is not one of the refs`);
      reviewProblem = true;
      return;
    }
    reviewKeys.add(refKey);
  });
  if (reviewProblem) continue;

  const structured = refs.map((ref) => {
    const flag = reviewKeys.has(refToString(ref));
    return flag ? { ...ref, review: true } : ref;
  });

  const next = withScriptures(entry.hymn, structured);
  entry.corpus.list[entry.index] = next;
  entry.hymn = next;
  applied.push({
    book,
    file,
    number: payload.number,
    title: next.title,
    refs: structured,
    flags: structured.filter((ref) => ref.review).length,
  });
}

if (issues.length) {
  console.error(`${issues.length} problem(s) — nothing written:\n`);
  for (const issue of issues) console.error(`  • ${issue}`);
  process.exit(1);
}

const changed = [];
const touched = new Set();
for (const item of applied) {
  const entry = (byBook.get(item.book) ?? []).find((e) => e.hymn.number === item.number);
  if (entry) touched.add(entry.corpus.path);
}
for (const corpus of corpora.values()) {
  if (!touched.has(corpus.path)) continue;
  const before = corpus.raw;
  const after = serialise(corpus);
  if (before === after) continue;
  changed.push(corpus.path.replace(/\\/g, '/').replace(`${ROOT.replace(/\\/g, '/')}/`, ''));
  if (!CHECK) await writeFile(corpus.path, after, 'utf8');
}

const totalRefs = applied.reduce((sum, item) => sum + item.refs.length, 0);
const totalFlags = applied.reduce((sum, item) => sum + item.flags, 0);
const noun = applied.length === 1 ? 'hymn' : 'hymns';
const refNoun = totalRefs === 1 ? 'reference' : 'references';

const out = [];

if (VERBOSE || CHECK) {
  for (const item of applied) {
    const refs = item.refs.map((ref) => formatScriptureRef(ref)).join(' · ');
    out.push(`  ${item.book} ${String(item.number).padStart(4, '0')}  ${refs}  [${item.flags} flag(s)]`);
  }
}

let failed = false;
if (CHECK) {
  if (changed.length === 0) {
    out.push(`✓ ${totalRefs} ${refNoun} on ${applied.length} ${noun} — no drift.`);
  } else {
    out.push(
      `✗ ${totalRefs} ${refNoun} on ${applied.length} ${noun} in payload files but ${changed.join(', ')} would change. Run without --check to write.`,
    );
    failed = true;
  }
} else {
  out.push(
    `✓ applied ${totalRefs} ${refNoun} to ${applied.length} ${noun} (${changed.length ? changed.join(', ') : 'no change'}) · ${totalFlags} review flag(s)`,
  );
}

if (totalFlags > 0 && !CHECK) {
  out.push('', 'Review flags (unconfirmed references):');
  for (const item of applied) {
    for (const ref of item.refs) {
      if (ref.review) out.push(`  ${item.file} — ${formatScriptureRef(ref)}`);
    }
  }
}

console.log(out.join('\n'));
if (failed) process.exit(1);
