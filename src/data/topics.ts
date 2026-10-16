/**
 * Thematic taxonomy: 9 core topics every hymn can be classified under.
 *
 * A hymn carries one `primaryTopic` (used for default grouping) plus
 * optional secondary `topics` (see `HymnSummary` in ./types). Matching is
 * deliberately loose — a hymn belongs to a topic when it is either its
 * primary or one of its secondary tags — so one filter covers browsing,
 * hybrid book+topic queries, and search-across-books alike.
 *
 * Labels live in i18n as `topic.<id>` (ar/en/de). The Arabic keyword lists
 * used to bootstrap the tagging live in scripts/lib/topic-keywords.mjs —
 * keep TOPIC_IDS in sync with that file.
 */

export const TOPIC_IDS = [
  'worship',
  'cross',
  'comfort',
  'repentance',
  'fellowship',
  'warfare',
  'word',
  'eternity',
  'church',
] as const;

export type TopicId = (typeof TOPIC_IDS)[number];

export function isTopicId(value: unknown): value is TopicId {
  return typeof value === 'string' && (TOPIC_IDS as readonly string[]).includes(value);
}

/** Every topic of a hymn, primary first. */
export function allTopicsOf(hymn: {
  primaryTopic?: TopicId;
  topics?: TopicId[];
}): TopicId[] {
  const out: TopicId[] = [];
  if (hymn.primaryTopic && !out.includes(hymn.primaryTopic)) out.push(hymn.primaryTopic);
  for (const t of hymn.topics ?? []) {
    if (!out.includes(t)) out.push(t);
  }
  return out;
}

/** True when the hymn belongs to `topic` as primary or secondary tag. */
export function matchesTopic(
  hymn: { primaryTopic?: TopicId; topics?: TopicId[] },
  topic: TopicId,
): boolean {
  return hymn.primaryTopic === topic || (hymn.topics ?? []).includes(topic);
}
