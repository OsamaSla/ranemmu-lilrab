/**
 * Imports hymns from a filled-in template .docx into content/*.json.
 *
 * Run with: npm run import:word -- <file.docx> [--out <file.json>]
 * With no file argument, the newest .docx in content/ (other than the
 * template itself) is used. Output defaults to content/book-<name>.json.
 *
 * The mapping is purely style-driven, so a refrain sitting between any two
 * stanzas is preserved exactly where the typist put it:
 *   Hymn | عنوان  -> `number. title` opens a hymn
 *   Verse | بيت    -> one stanza; `(١)`-style prefix becomes its label
 *   Chorus | لازمة -> refrain block in place, flagged chorus:true
 *   Info | معلومات -> `key: value` metadata (aliases below)
 * Everything else (instructions, notes) is ignored.
 */
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
import mammoth from 'mammoth';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = join(ROOT, 'content');

const STYLE_MAP = [
  "p[style-name='Hymn | عنوان'] => hymn-title:fresh",
  "p[style-name='Verse | بيت'] => verse:fresh",
  "p[style-name='Chorus | لازمة'] => chorus:fresh",
  "p[style-name='Info | معلومات'] => info:fresh",
];

/** Two half-lines typed with Tab between them are joined with this ornament. */
const HALF_JOINER = ' \u2756 ';

/** Info keys (after trimming) mapped to schema fields. */
const INFO_FIELDS = new Map([
  ['نظم', 'tune'],
  ['اللحن', 'tune'],
  ['النغم', 'tune'],
  ['tune', 'tune'],
  ['مقياس الكلام', 'meter'],
  ['الوزن', 'meter'],
  ['البحر', 'meter'],
  ['التفعيلة', 'meter'],
  ['meter', 'meter'],
  ['كورد', 'key'],
  ['الطبقة', 'key'],
  ['المقام', 'key'],
  ['key', 'key'],
  ['chord', 'key'],
  ['المؤلف', 'author'],
  ['مؤلف', 'author'],
  ['الشاعر', 'author'],
  ['شاعر', 'author'],
  ['الكلمات', 'author'],
  ['النص', 'author'],
  ['author', 'author'],
  ['الملحن', 'composer'],
  ['ملحن', 'composer'],
  ['composer', 'composer'],
  ['القرار', 'chorus'],
  ['اللازمة', 'chorus'],
  ['لازمة', 'chorus'],
  ['chorus', 'chorus'],
]);

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const toArabicDigits = (n) => String(n).replace(/[0-9]/g, (d) => AR_DIGITS[Number(d)]);
const fromDigits = (s) =>
  Number(String(s).replace(/[٠-٩]/g, (d) => AR_DIGITS.indexOf(d)));

const TITLE_RE = /^\s*([0-9٠-٩]+)\s*[.\-–—:]\s*(.+?)\s*$/;
const LABEL_RE = /^\s*[[(]\s*([0-9٠-٩]+)\s*[)\]]\s*/;
const LABEL_ALT_RE = /^\s*([0-9٠-٩]+)\s*[.)]\s+/;

/** Invisible direction/zero-width marks Word inserts; harmless but noisy. */
const INVISIBLE_RE = /[​‌‍‎‏؜]/g;

function clean(text) {
  return text.replace(INVISIBLE_RE, '').replace(/[ \t]{2,}/g, ' ').trim();
}

/** Inner HTML of a mapped element with <br> restored to newlines. */
function elementText($el) {
  const html = $el.html() ?? '';
  const withBreaks = html.replace(/<br\s*\/?>/gi, '\n');
  const text = cheerio.load(`<x>${withBreaks}</x>`)('x').text();
  return clean(text);
}

function splitHalves(line) {
  const parts = line
    .split('\t')
    .map((p) => clean(p))
    .filter((p) => p.length > 0);
  return parts.join(HALF_JOINER);
}

function parseHymnTitle(text, where) {
  const m = TITLE_RE.exec(text);
  if (!m) {
    throw new Error(`${where}: hymn line has no 'number. title' shape: ${JSON.stringify(text.slice(0, 60))}`);
  }
  const number = fromDigits(m[1]);
  if (!Number.isInteger(number) || number < 1) {
    throw new Error(`${where}: bad hymn number: ${JSON.stringify(m[1])}`);
  }
  return { number, title: clean(m[2]) };
}

/** Returns { label, rest }; autoLabel is used when no explicit label found. */
function parseStanzaHead(text, autoLabel) {
  let m = LABEL_RE.exec(text);
  if (!m) m = LABEL_ALT_RE.exec(text);
  if (m) {
    const n = fromDigits(m[1]);
    return { label: toArabicDigits(n), rest: clean(text.slice(m[0].length)) };
  }
  return { label: autoLabel, rest: clean(text) };
}

export function importDocx(html, sourceName) {
  const $ = cheerio.load(html);
  const order = $('body')
    .children()
    .toArray()
    .map((el) => ({ tag: el.tagName.toLowerCase(), $el: $(el) }))
    .filter((node) => ['hymn-title', 'verse', 'chorus', 'info'].includes(node.tag));

  const hymns = [];
  const warnings = [];
  const errors = [];
  let current = null;
  let verseCounter = 0;

  const finishHymn = () => {
    if (!current) return;
    if (current.verses.length === 0) {
      errors.push(`${current.where}: hymn ${current.number} has no stanzas — skipped`);
    } else if (/…|\.\.\./.test(current.title)) {
      warnings.push(`${current.where}: placeholder hymn '${current.title}' skipped (unfilled template block?)`);
    } else {
      delete current.where;
      hymns.push(current);
    }
    current = null;
  };

  order.forEach((node, index) => {
    const where = `${sourceName}#${index + 1}`;
    const text = elementText(node.$el);
    if (!text) return;

    if (node.tag === 'hymn-title') {
      finishHymn();
      try {
        const { number, title } = parseHymnTitle(text, where);
        current = { number, title, verses: [], where };
        verseCounter = 0;
      } catch (err) {
        errors.push(err.message);
      }
      return;
    }

    if (!current) {
      warnings.push(`${where}: styled paragraph outside any hymn — ignored: ${JSON.stringify(text.slice(0, 50))}`);
      return;
    }

    if (node.tag === 'info') {
      const at = text.search(/[:：]/);
      if (at === -1) {
        warnings.push(`${where}: info line without ':' — ignored: ${JSON.stringify(text.slice(0, 50))}`);
        return;
      }
      const key = clean(text.slice(0, at));
      const value = clean(text.slice(at + 1));
      const field = INFO_FIELDS.get(key);
      if (!field) {
        warnings.push(`${where}: unknown info key '${key}' — ignored`);
        return;
      }
      if (!value) {
        warnings.push(`${where}: empty value for '${key}' — ignored`);
        return;
      }
      current[field] = value;
      return;
    }

    // Verse or chorus stanza.
    const isChorus = node.tag === 'chorus';
    verseCounter += isChorus ? 0 : 1;
    const { label, rest } = parseStanzaHead(text, toArabicDigits(Math.max(verseCounter, 1)));
    const lines = rest
      .split('\n')
      .map((line) => splitHalves(line))
      .map((line) => clean(line))
      .filter((line) => line.length > 0);
    if (lines.length === 0) {
      warnings.push(`${where}: empty stanza — ignored`);
      return;
    }
    current.verses.push(isChorus ? { label, lines, chorus: true } : { label, lines });
  });

  finishHymn();
  return { hymns, warnings, errors };
}

async function convertFile(docxPath) {
  const { value, messages } = await mammoth.convertToHtml({ path: docxPath }, { styleMap: STYLE_MAP });
  for (const m of messages) console.warn(`mammoth: ${m.type}: ${m.message}`);
  return importDocx(value, basename(docxPath));
}

function newestDocx() {
  const files = readdirSync(CONTENT_DIR)
    .filter((f) => f.toLowerCase().endsWith('.docx') && f.toLowerCase() !== 'template.docx')
    .map((f) => ({ f, t: statSync(join(CONTENT_DIR, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  return files.length > 0 ? join(CONTENT_DIR, files[0].f) : null;
}

async function main() {
  const args = process.argv.slice(2);
  const outFlag = args.indexOf('--out');
  let outPath = null;
  if (outFlag !== -1) {
    outPath = args[outFlag + 1];
    args.splice(outFlag, 2);
  }

  const input = args[0] ?? newestDocx();
  if (!input) {
    console.error('no .docx found in content/ (the template itself is never imported)');
    process.exit(1);
  }

  const { hymns, warnings, errors } = await convertFile(input);

  for (const w of warnings) console.warn(`warn: ${w}`);

  if (errors.length > 0) {
    console.error(`${errors.length} error(s) — nothing written:`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  const out = outPath ?? join(CONTENT_DIR, `book-${basename(input, extname(input))}.json`);
  writeFileSync(out, JSON.stringify({ hymns }, null, 1) + '\n');
  console.log(`${hymns.length} hymn(s) from ${basename(input)} -> ${out}`);
}

const invoked = process.argv[1] && basename(process.argv[1]) === 'import-word.mjs';
if (invoked) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
