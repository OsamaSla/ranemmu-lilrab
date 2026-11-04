/**
 * Shared heuristic topic-tagging functions used by tag-topics.mjs
 * and the build pipeline.
 */
import { TOPIC_IDS, TOPIC_KEYWORDS } from './topic-keywords.mjs';

const TITLE_WEIGHT = 3;
const LYRIC_WEIGHT = 1;
const MAX_SECONDARY = 3;

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

export function lyricBlob(hymn) {
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

export function tagHymn(hymn, { minPrimary = 4, minSecondary = 3 } = {}) {
  const scores = scoreHymn(hymn);
  const ranked = [...TOPIC_IDS].sort((a, b) => scores[b] - scores[a]);
  const [best] = ranked;
  if (scores[best] < minPrimary) return { primaryTopic: undefined, topics: [], scores };
  const topics = ranked
    .filter((t) => t !== best && scores[t] >= minSecondary && scores[t] >= scores[best] / 2)
    .slice(0, MAX_SECONDARY);
  return { primaryTopic: best, topics, scores };
}
