/**
 * Extracts author metadata from the saved hymnary HTML pages.
 *
 * Run with: node scripts/extract-authors.mjs
 * Output: content/authors.json — { "<number>": { author, authorOriginal?, englishTitle? } }
 *   - `author`: who wrote the Arabic words (poet, or translator for translations)
 *   - `authorOriginal`: foreign original author, when the page names one
 *   - entries carry source:"hymnary"; apply-overrides.mjs adds source:"manual"
 *
 * Pages without author info (and hymns 1-10/58/489, which have no saved
 * HTML) are simply absent — the app hides the author line for those.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'content', 'authors.json');

const strip = (h) =>
  h
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#039;/g, ' ')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

/** Hymn 58's page is a bare tune write-up (no lyrics), so its credit is the
 * tune's — not the manually typed text's. Excluded to avoid misattribution. */
const EXCLUDED = new Set([58]);

/**
 * Latin-only credits whose Arabic spelling is attested elsewhere in this
 * same corpus (never guessed). Everything else stays Latin — a correct
 * transliteration beats a wrong Arabic guess.
 */
const ATTESTED_ARABIC = new Map([
  ['Fawwaz Omeish', 'فواز عميش'],
  ['Naji Fouad', 'ناجي فؤاد'],
  ['Youssef Qusta', 'يوسف قسطة'],
  ['Milhim Dhahabiyyeh', 'ملحم ذهبية'],
  ['Suheil Madanat', 'سهيل مدانات'],
  ['William Jundi', 'وليم جندي'],
  ['Zackariya Boutros', 'زكريا بطرس'],
  ['Majeed Nushi Mansour', 'مجيد نصحي منصور'],
]);

/** Keeps the Arabic-script part of "Naji Fouad ناجي فؤاد"-style credits. */
function arabicOnly(name) {
  return name
    .replace(/[\p{Script=Latin}\u0300-\u036f.'`’‘-]+/gu, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const HAS_ARABIC = /[\p{Script=Arabic}]/u;
function field(text, label) {
  const i = text.indexOf(label);
  if (i === -1) return '';
  const rest = text.slice(i + label.length);
  const end = rest.search(/\s(?:Tune|Language|Published|Translator|Transaltor|Refrain|First|Title|Author|Text|All|Timeline|Media|Instances|Suggestions)\b:?/);
  return (end === -1 ? rest : rest.slice(0, end)).replace(/[:;^]+$/, '').trim().slice(0, 80);
}

const files = [];
const collect = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const f = join(dir, e.name);
    if (e.isDirectory()) collect(f);
    else if (/^\d+\.html$/.test(e.name)) files.push(f);
  }
};
collect(join(ROOT, 'content', 'batches'));
collect(join(ROOT, 'content', 'pilot'));

const authors = {};
for (const f of files) {
  const number = Number(f.match(/(\d+)\.html$/)[1]);
  const t = strip(readFileSync(f, 'utf8'));
  const authorField = field(t, 'Author:');
  const translator =
    field(t, 'Translator:') || field(t, 'Transaltor:');
  const englishTitle = field(t, 'English Title:');
  if (!authorField && !translator) continue;
  if (EXCLUDED.has(number)) continue;
  const entry = { source: 'hymnary' };
  if (translator) {
    entry.author = arabicOnly(translator) || translator;
    if (authorField) entry.authorOriginal = authorField;
    if (englishTitle) entry.englishTitle = englishTitle;
  } else if (HAS_ARABIC.test(authorField)) {
    entry.author = arabicOnly(authorField);
  } else if (englishTitle) {
    // Latin-only credit on a translation page names the foreign original,
    // not the Arabic translator (who is unlisted) — never show it as author.
    entry.authorOriginal = authorField;
    entry.englishTitle = englishTitle;
  } else {
    entry.author = authorField;
  }
  if (entry.author && !HAS_ARABIC.test(entry.author)) {
    entry.author = ATTESTED_ARABIC.get(entry.author) ?? entry.author;
  }
  authors[number] = entry;
}

writeFileSync(OUT, JSON.stringify(authors, null, 1) + '\n');
const withOrig = Object.values(authors).filter((e) => e.authorOriginal).length;
console.log(`${files.length} pages -> ${Object.keys(authors).length} authors (${withOrig} with foreign original) -> content/authors.json`);
