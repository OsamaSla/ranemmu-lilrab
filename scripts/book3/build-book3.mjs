/**
 * Assembles `content/book3/parts/*.json` (source format: line = {sadr, ajuz})
 * into `content/book3/book3.json` (app format: Hymn[] with lines: string[]).
 *
 * Rules (content/book3/AGENTS.md):
 *  - one entry per printed row, flattened as `sadr · ajuz`
 *  - `chorus: true` kept for القرار stanzas
 *  - later batches win on duplicate hymn numbers (so corrections can be re-issued)
 *  - every hymn gets `book: 'book3'` and id `b3NNNN`
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tagHymn } from '../lib/topic-tagger.mjs';

const PARTS_DIR = 'content/book3/parts';
const OUT = 'content/book3/book3.json';
const CORPUS_OUT = 'content/book3.json';
const TRANSLATIONS = 'content/book3/book3-translated.json';

const LATIN = /[A-Za-z\u00C0-\u024F]/;
const hasText = (value) => typeof value === 'string' && LATIN.test(value);

function mergeTranslation(hymn, store, lang) {
  const title = store[`title_${lang}`];
  const translated = store[`verses_${lang}`];
  if (!hasText(title) || !Array.isArray(translated) || translated.length !== hymn.verses.length) return false;
  const verses = [];
  hymn.verses.forEach((verse, index) => {
    const match = translated[index];
    const lines = Array.isArray(match?.lines) ? match.lines.filter(hasText) : [];
    if (lines.length !== verse.lines.length) return;
    verses.push({ label: verse.label, ...(verse.chorus ? { chorus: true } : {}), lines });
  });
  if (verses.length !== hymn.verses.length) return false;
  hymn[`title_${lang}`] = title.trim();
  hymn[`verses_${lang}`] = verses;
  return true;
}

/** `{sadr, ajuz}` -> one readable line; a lone sadr stays as-is. */
function flatten(lineObj) {
  if (typeof lineObj === 'string') return lineObj.trim();
  const sadr = (lineObj.sadr ?? '').trim();
  const ajuz = (lineObj.ajuz ?? '').trim();
  if (sadr && ajuz) return `${sadr} · ${ajuz}`;
  return sadr || ajuz;
}

const files = readdirSync(PARTS_DIR)
  .filter((f) => f.endsWith('.json'))
  .sort();

if (files.length === 0) throw new Error(`no part files in ${PARTS_DIR}`);

const byNumber = new Map();
let order = 0;

for (const file of files) {
  const raw = JSON.parse(readFileSync(join(PARTS_DIR, file), 'utf8'));
  const list = Array.isArray(raw) ? raw : (raw.hymns ? raw.hymns : [raw]);
  if (!Array.isArray(list)) throw new Error(`${file}: expected { hymns: [] }`);

  for (const hymn of list) {
    const id = `b3${String(hymn.number).padStart(4, '0')}`;
    const verses = (hymn.verses ?? []).map((verse, vIdx) => ({
      label: (verse.label != null && String(verse.label).trim()) ? String(verse.label).trim() : (verse.chorus ? 'قرار' : '١'),
      ...(verse.chorus ? { chorus: true } : {}),
      lines: (verse.lines ?? []).map(flatten).filter(Boolean),
    }));

    byNumber.set(hymn.number, {
      id,
      book: 'book3',
      number: hymn.number,
      title: (hymn.title ?? '').trim(),
      ...(hymn.title_en ? { title_en: hymn.title_en } : {}),
      ...(hymn.title_de ? { title_de: hymn.title_de } : {}),
      ...(hymn.verses_en ? { verses_en: hymn.verses_en } : {}),
      ...(hymn.verses_de ? { verses_de: hymn.verses_de } : {}),
      ...(hymn.translationStatus ? { translationStatus: hymn.translationStatus } : {}),
      ...(hymn.author ? { author: hymn.author } : {}),
      ...(hymn.authorOriginal ? { authorOriginal: hymn.authorOriginal } : {}),
      ...(hymn.meter ? { meter: hymn.meter } : {}),
      verses,
    });
    order += 1;
  }
}

const hymns = [...byNumber.values()].sort((a, b) => a.number - b.number);

// Hard gate: never publish a hymn with no text.
const broken = hymns.filter((h) => h.verses.length === 0 || h.verses.every((v) => v.lines.length === 0));
if (broken.length > 0) {
  throw new Error(`hymns with no lines: ${broken.map((h) => h.number).join(', ')}`);
}

if (existsSync(TRANSLATIONS)) {
  const storeRaw = JSON.parse(readFileSync(TRANSLATIONS, 'utf8'));
  const storeList = Array.isArray(storeRaw) ? storeRaw : (storeRaw.hymns ?? []);
  const byNumber = new Map(storeList.map((h) => [Number(h.number), h]));
  let enCount = 0;
  let deCount = 0;
  for (const hymn of hymns) {
    const stored = byNumber.get(hymn.number);
    if (!stored) continue;
    if (mergeTranslation(hymn, stored, 'en')) enCount += 1;
    if (mergeTranslation(hymn, stored, 'de')) deCount += 1;
  }
  if (enCount > 0 || deCount > 0) {
    for (const hymn of hymns) {
      if (hymn.title_en || hymn.title_de) hymn.translationStatus = 'AI_DRAFT';
    }
  }
  console.log(`translations merged: ${enCount} EN, ${deCount} DE`);
}

// Topic tags are computed from the final Arabic text on every build (the
// parts stay clean), so `tag-topics` heuristics stay identical to the other
// books and a rebuild never drops them.
let tagged = 0;
for (const hymn of hymns) {
  const { primaryTopic, topics } = tagHymn(hymn);
  if (!primaryTopic) continue;
  hymn.primaryTopic = primaryTopic;
  if (topics.length > 0) hymn.topics = topics;
  tagged += 1;
}
console.log(`topics tagged: ${tagged}/${hymns.length}`);

writeFileSync(OUT, JSON.stringify({ hymns }, null, 2), 'utf8');
writeFileSync(CORPUS_OUT, JSON.stringify({ hymns }, null, 2), 'utf8');
console.log(`parts: ${files.length} (${order} records)`);
console.log(`hymns written: ${hymns.length} -> ${OUT} + ${CORPUS_OUT}`);
console.log(`range: ${hymns[0].number}..${hymns[hymns.length - 1].number}`);
