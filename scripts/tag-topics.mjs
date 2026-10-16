/**
 * Heuristic bootstrap tagger: assigns `primaryTopic` + secondary `topics`
 * to every hymn in content/*.json using Arabic keyword stems.
 *
 * Run with: node scripts/tag-topics.mjs            (dry run, report only)
 *            node scripts/tag-topics.mjs --apply    (write tags into content/*.json)
 *            node scripts/tag-topics.mjs --apply --force   (re-tag everything)
 *
 * Matching is substring-based on normalised text (tashkeel/tatweel stripped,
 * alef forms unified, ة→ه, ى→ي). A title hit counts 3x, a lyric hit 1x.
 * Primary = top scorer at/above --min-primary (default 4). Secondaries =
 * the next best at/above --min-secondary (default 3), capped at 3, never
 * repeating the primary. Hymns already tagged are skipped unless --force.
 *
 * After --apply, run `npm run build:corpus` to rebuild the bundles.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOPIC_IDS, TOPIC_KEYWORDS } from './lib/topic-keywords.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = join(ROOT, 'content');

const TITLE_WEIGHT = 3;
const LYRIC_WEIGHT = 1;
const MAX_SECONDARY = 3;

const args = new Set(process.argv.slice(2));
const APPLY = args.has('--apply');
const FORCE = args.has('--force');
const EXPLAIN = [...args].find((a) => a.startsWith('--explain='));
const flagValue = (name, fallback) => {
  const hit = [...args].find((a) => a.startsWith(`${name}=`));
  const n = hit ? Number(hit.split('=')[1]) : NaN;
  return Number.isFinite(n) ? n : fallback;
};
const MIN_PRIMARY = flagValue('--min-primary', 4);
const MIN_SECONDARY = flagValue('--min-secondary', 3);

/** Normalise Arabic for keyword matching (mirrors the keyword table rules). */
export function normalizeAr(text) {
  return String(text)
    .replace(/[ً-ٰٟۖ-ۭؐ-ؚ]/g, '')
    .replace(/ـ/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');
}

function lyricBlob(hymn) {
  const lines = [];
  for (const verse of hymn.verses ?? []) lines.push(...(verse.lines ?? []));
  if (hymn.chorus) lines.push(hymn.chorus);
  return normalizeAr(lines.join('\n'));
}

/** Weighted score per topic for one hymn. */
export function scoreHymn(hymn) {
  const title = normalizeAr(hymn.title ?? '');
  const lyrics = lyricBlob(hymn);
  const scores = {};
  for (const topic of TOPIC_IDS) {
    let total = 0;
    for (const [stem, weight] of TOPIC_KEYWORDS[topic] ?? []) {
      if (title.includes(stem)) total += weight * TITLE_WEIGHT;
      if (lyrics.includes(stem)) total += weight * LYRIC_WEIGHT;
    }
    scores[topic] = total;
  }
  return scores;
}

export function tagHymn(hymn, { minPrimary = MIN_PRIMARY, minSecondary = MIN_SECONDARY } = {}) {
  const scores = scoreHymn(hymn);
  const ranked = [...TOPIC_IDS].sort((a, b) => scores[b] - scores[a]);
  const [best] = ranked;
  if (scores[best] < minPrimary) return { primaryTopic: undefined, topics: [], scores };
  const topics = ranked
    .filter((t) => t !== best && scores[t] >= minSecondary && scores[t] >= scores[best] / 2)
    .slice(0, MAX_SECONDARY);
  return { primaryTopic: best, topics, scores };
}

async function readContentFiles() {
  const entries = (await readdir(CONTENT_DIR))
    .filter((name) => name.endsWith('.json') && name !== 'authors.json')
    .sort();
  const files = [];
  for (const name of entries) {
    const raw = JSON.parse(await readFile(join(CONTENT_DIR, name), 'utf8'));
    files.push({ name, bare: Array.isArray(raw), hymns: Array.isArray(raw) ? raw : raw.hymns });
  }
  return files;
}

async function main() {
  const files = await readContentFiles();

  // --explain=main:47 — print per-topic scores for one hymn and exit.
  if (EXPLAIN) {
    const [, want] = EXPLAIN.split('=');
    const [wantBook, wantNumber] = want.split(':');
    for (const file of files) {
      const hymn = file.hymns.find(
        (h) => String(h.book ?? 'main') === wantBook && String(h.number) === wantNumber,
      );
      if (!hymn) continue;
      console.log(`${want} ${hymn.title}`);
      console.log(`title norm: ${normalizeAr(hymn.title)}`);
      const scores = scoreHymn(hymn);
      for (const t of [...TOPIC_IDS].sort((a, b) => scores[b] - scores[a])) {
        const hits = (TOPIC_KEYWORDS[t] ?? [])
          .filter(([stem]) => normalizeAr(hymn.title).includes(stem) || lyricBlob(hymn).includes(stem))
          .map(([stem, w]) => `${stem}(${w})`);
        console.log(`  ${t}: ${scores[t]}  [${hits.join(' ')}]`);
      }
      return;
    }
    console.error(`hymn ${want} not found`);
    process.exit(1);
  }
  const primaryCounts = Object.fromEntries(TOPIC_IDS.map((t) => [t, 0]));
  const secondaryCounts = Object.fromEntries(TOPIC_IDS.map((t) => [t, 0]));
  const untagged = [];
  const samples = Object.fromEntries(TOPIC_IDS.map((t) => [t, []]));
  let tagged = 0;
  let skipped = 0;
  let total = 0;

  for (const file of files) {
    let dirty = false;
    for (const hymn of file.hymns) {
      total += 1;
      if (hymn.primaryTopic && !FORCE) {
        skipped += 1;
        primaryCounts[hymn.primaryTopic] = (primaryCounts[hymn.primaryTopic] ?? 0) + 1;
        for (const t of hymn.topics ?? []) secondaryCounts[t] = (secondaryCounts[t] ?? 0) + 1;
        continue;
      }
      const { primaryTopic, topics } = tagHymn(hymn);
      if (!primaryTopic) {
        untagged.push(`${hymn.book ?? 'main'}:${hymn.number} ${hymn.title}`);
        continue;
      }
      tagged += 1;
      primaryCounts[primaryTopic] += 1;
      for (const t of topics) secondaryCounts[t] += 1;
      if (samples[primaryTopic].length < 3) {
        samples[primaryTopic].push(`${hymn.book ?? 'main'}:${hymn.number} ${hymn.title}`);
      }
      if (APPLY) {
        hymn.primaryTopic = primaryTopic;
        hymn.topics = topics;
        dirty = true;
      }
    }
    if (APPLY && dirty) {
      const payload = file.bare ? file.hymns : { hymns: file.hymns };
      await writeFile(join(CONTENT_DIR, file.name), JSON.stringify(payload, null, 1) + '\n');
      console.log(`wrote ${file.name}`);
    }
  }

  console.log(`\n${APPLY ? 'applied' : 'dry run'}: ${total} hymns, ${tagged} newly tagged, ${skipped} already tagged, ${untagged.length} untagged`);
  console.log('\nprimary counts:');
  for (const t of TOPIC_IDS) console.log(`  ${t}: ${primaryCounts[t]}`);
  console.log('\nsecondary counts:');
  for (const t of TOPIC_IDS) console.log(`  ${t}: ${secondaryCounts[t]}`);
  if (untagged.length > 0) {
    console.log(`\nuntagged (${untagged.length}):`);
    for (const u of untagged.slice(0, 40)) console.log(`  ${u}`);
    if (untagged.length > 40) console.log(`  … +${untagged.length - 40} more`);
  }
  console.log('\nsamples:');
  for (const t of TOPIC_IDS) {
    console.log(`  ${t}:`);
    for (const s of samples[t]) console.log(`    ${s}`);
  }
  if (!APPLY) console.log('\nre-run with --apply to write tags into content/*.json');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
