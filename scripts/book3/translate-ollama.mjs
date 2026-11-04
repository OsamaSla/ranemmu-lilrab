/**
 * EN/DE translation for Book 3 via local Ollama (qwen2.5:14b).
 *
 * Run: node scripts/book3/translate-ollama.mjs
 * Test one hymn: set TRANSLATE_LIMIT=1
 *
 * - Reads content/book3/book3.json (Arabic source).
 * - Keeps finished work in content/book3/book3-translated.json.
 * - Resumable *per language*: anything already valid is skipped, so stopping
 *   and restarting never loses work and never re-pays for finished text.
 * - One request per language: shorter output means fewer truncated/failed
 *   responses on a small GPU, and a German failure cannot cost the English.
 * - Writes after every hymn and rebuilds the app corpus every 20 hymns, so
 *   language chips appear in the running app while it works.
 * - Never stores a fake translation (Arabic copied into `*_en` / `*_de`).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const IN = join(ROOT, 'content/book3/book3.json');
const OUT = join(ROOT, 'content/book3/book3-translated.json');

const OLLAMA_URL = 'http://localhost:11434/api/generate';
const MODEL = process.env.TRANSLATE_MODEL || 'qwen2.5:7b';
const BATCH = 20;
const LIMIT = Number(process.env.TRANSLATE_LIMIT || 0);
const LANGS = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'German' },
];

const LATIN = /[A-Za-z\u00C0-\u024F]/;
const hasText = (value) => typeof value === 'string' && LATIN.test(value);

/** True when a stored entry holds a complete, real translation for `lang`. */
function validFor(entry, hymn, lang) {
  if (!entry || !hasText(entry[`title_${lang}`])) return false;
  const translated = entry[`verses_${lang}`];
  if (!Array.isArray(translated) || translated.length !== hymn.verses.length) return false;
  return hymn.verses.every((verse, index) => {
    const match = translated[index];
    return (
      Array.isArray(match?.lines) &&
      match.lines.length === verse.lines.length &&
      match.lines.every(hasText)
    );
  });
}

/** Drops the fake `*_en` / `*_de` fields an earlier buggy run may have saved. */
function sanitize(store, byNumber) {
  let dropped = 0;
  for (const entry of store) {
    const hymn = byNumber.get(Number(entry.number));
    if (!hymn) continue;
    for (const { code } of LANGS) {
      if (entry[`title_${code}`] === undefined) continue;
      if (validFor(entry, hymn, code)) continue;
      delete entry[`title_${code}`];
      delete entry[`verses_${code}`];
      dropped += 1;
    }
  }
  return dropped;
}

function buildPrompt(hymn, langName) {
  const lines = hymn.verses.flatMap((verse) => verse.lines);
  return `Translate this Christian Arabic hymn into ${langName}.

Return exactly ${lines.length} numbered lines, in the same order, using this exact format:
TITLE: <translated title>
1. <translated line 1>
2. <translated line 2>
...
${lines.length}. <translated line ${lines.length}>

Rules: translate every line; never merge or drop a line; keep " · " between the two halves of a line; output nothing except TITLE and the numbered lines.

Arabic hymn:
${JSON.stringify({ title: hymn.title, lines })}`;
}

async function callOllama(prompt, attempt = 1) {
  try {
    const res = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        stream: false,
        keep_alive: '30m',
        options: { temperature: 0.1, num_ctx: 4096 },
      }),
      signal: AbortSignal.timeout(900_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const text = String(json.response ?? '').trim();
    if (!text) throw new Error('empty response');
    const seconds = json.eval_duration ? json.eval_duration / 1e9 : 0;
    const tokens = json.eval_count ?? 0;
    return { text, speed: seconds > 0 && tokens > 0 ? tokens / seconds : 0 };
  } catch (error) {
    if (attempt >= 3) throw error;
    const wait = attempt * 3000;
    console.warn(`    retry ${attempt} in ${wait / 1000}s after: ${error.message}`);
    await new Promise((resolve) => setTimeout(resolve, wait));
    return callOllama(prompt, attempt + 1);
  }
}

/**
 * Reads the plain-text answer:
 *   TITLE: ...
 *   1. ...
 *   2. ...
 * Small models follow this far more reliably than a JSON schema.
 */
function readLang(text, hymn) {
  const flat = hymn.verses.flatMap((verse) => verse.lines);
  const numbered = new Map();
  let title = '';
  const clean = (value) => value.replace(/^["'\s{]+|["',\s}]+$/g, '').trim();

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    const numberedMatch = line.match(/^(\d+)\s*[.)|:\-]\s*(.+)$/);
    if (numberedMatch) {
      const index = Number(numberedMatch[1]) - 1;
      if (index >= 0 && index < flat.length) numbered.set(index, numberedMatch[2].trim());
      continue;
    }

    const titleMatch =
      line.match(/^TITLE\s*:\s*(.+)$/i) ||
      line.match(/^\{?\s*"?title"?\s*:\s*"(.+?)"?\s*,?\s*\}?$/i);
    if (titleMatch) title = clean(titleMatch[1]);
  }

  if (!hasText(title)) return null;
  const translated = [];
  for (let index = 0; index < flat.length; index += 1) {
    const line = numbered.get(index);
    if (!hasText(line)) return null;
    translated.push(line);
  }

  let cursor = 0;
  const verses = hymn.verses.map((source) => {
    const lines = translated.slice(cursor, cursor + source.lines.length);
    cursor += source.lines.length;
    return { label: source.label, ...(source.chorus ? { chorus: true } : {}), lines };
  });
  return { title, verses };
}

function save(store) {
  const list = [...store.values()].sort((a, b) => Number(a.number) - Number(b.number));
  writeFileSync(OUT, JSON.stringify({ hymns: list }, null, 2), 'utf8');
}

function rebuildApp() {
  console.log('  rebuilding book + corpus...');
  const build = spawnSync(process.execPath, ['scripts/book3/build-book3.mjs'], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  if (build.status !== 0) {
    console.warn('  build-book3 failed; chunks not rebuilt');
    return;
  }
  const corpus = spawnSync('npm', ['run', 'build:corpus'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  });
  if (corpus.status !== 0) console.warn('  build:corpus failed; chunks not rebuilt');
}

async function main() {
  const raw = JSON.parse(readFileSync(IN, 'utf8'));
  const hymns = raw.hymns ?? [];
  const byNumber = new Map(hymns.map((hymn) => [Number(hymn.number), hymn]));

  const store = new Map();
  if (existsSync(OUT)) {
    const saved = JSON.parse(readFileSync(OUT, 'utf8'));
    const list = Array.isArray(saved) ? saved : (saved.hymns ?? []);
    for (const entry of list) store.set(Number(entry.number), entry);
  }
  const dropped = sanitize([...store.values()], byNumber);
  if (dropped > 0) console.log(`cleaned ${dropped} fake translation field(s) from the store`);

  const missing = (hymn) =>
    LANGS.filter(({ code }) => !validFor(store.get(hymn.number), hymn, code));

  const done = hymns.filter((hymn) => missing(hymn).length === 0).length;
  const todo = hymns
    .filter((hymn) => missing(hymn).length > 0)
    // Later hymns (301+) are what the user checks most often, so finish those
    // first; the rest follow in numeric order.
    .sort((a, b) => {
      const priority = (hymn) => (hymn.number >= 301 ? 0 : 1);
      return priority(a) - priority(b) || a.number - b.number;
    });

  const queue = LIMIT > 0 ? todo.slice(0, LIMIT) : todo;
  console.log(
    `${hymns.length} hymns, ${done} fully translated, ${todo.length} incomplete` +
      `${LIMIT > 0 ? ` (testing ${queue.length})` : ''} — ${MODEL}`,
  );

  let processed = 0;
  let lastSpeed = 0;
  const startedAt = Date.now();

  for (const hymn of queue) {
    const needed = missing(hymn);
    if (needed.length === 0) continue;
    if (!store.has(hymn.number)) store.set(hymn.number, { number: hymn.number });
    const entry = store.get(hymn.number);

    processed += 1;
    console.log(
      `[${processed}/${queue.length}] hymn ${hymn.number}: ${hymn.title} (${needed
        .map((l) => l.code)
        .join('+')})`,
    );

    for (const { code, name } of needed) {
      let text;
      try {
        const result = await callOllama(buildPrompt(hymn, name));
        text = result.text;
        lastSpeed = result.speed;
      } catch (error) {
        console.error(`  ${code}: skipped — ${error.message}`);
        continue;
      }
      const translation = readLang(text, hymn);
      if (!translation) {
        writeFileSync(join(ROOT, `translation-debug-${code}.txt`), text, 'utf8');
        console.warn(`  ${code}: incomplete structure, raw answer saved to translation-debug-${code}.txt`);
        continue;
      }
      entry[`title_${code}`] = translation.title;
      entry[`verses_${code}`] = translation.verses;
      save(store);
      console.log(`  ${code}: saved${lastSpeed ? ` (${lastSpeed.toFixed(1)} tok/s)` : ''}`);
    }

    const left = queue.length - processed;
    const minutes = (Date.now() - startedAt) / 60000;
    const eta = processed > 0 ? Math.round((minutes / processed) * left) : null;
    if (eta !== null) console.log(`  ETA ~${eta} min for the rest of this run`);
    if (processed % BATCH === 0) rebuildApp();
  }

  save(store);
  console.log('final rebuild...');
  rebuildApp();
  const left = hymns.filter((hymn) => missing(hymn).length > 0).length;
  console.log(`done. hymns still incomplete: ${left}`);
  if (left > 0) console.log('run the same command again to continue.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
