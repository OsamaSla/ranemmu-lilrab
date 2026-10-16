/**
 * عرض جميع الترنيمات — the full corpus listing, with in-list search.
 *
 * Two orders: by the number printed in the book (the default, since that is how
 * a reader navigates physically) or alphabetically with letter headers.
 * A SectionList keeps header pinning and large lists efficient; with the bundled
 * corpus the data is already in memory, so there is no paging to manage.
 *
 * The search field filters this same list (by number or words, diacritic- and
 * tatweel-insensitive) so no separate search screen is needed. It can be
 * prefilled from the reader's jump bar via `?q=`.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, SectionList, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppBar } from '../../components/AppBar';
import { AppText } from '../../components/AppText';
import { EmptyState } from '../../components/EmptyState';
import { HymnRow } from '../../components/HymnRow';
import { SegmentedControl } from '../../components/SegmentedControl';
import { getBooks, getSummaries, getTopicCounts } from '../../data/loader';
import { normalizeText } from '../../data/normalize';
import { isTopicId, matchesTopic, TOPIC_IDS, type TopicId } from '../../data/topics';
import type { BookId, HymnSummary } from '../../data/types';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';
import { useOverrides } from '../../store/overrides';
import { useSettings } from '../../store/settings';
import { radius, spacing } from '../../theme/tokens';

/** Letter of the alphabet used to bucket the alphabetical sort. */
function firstLetter(text: string): string {
  return (text.trim().charAt(0) || '•').toUpperCase();
}

export default function LibraryScreen() {
  const router = useRouter();
  const { t, direction } = useT();
  const { colors, fontFamily } = useTheme();
  const [order, setOrder] = useState<'number' | 'alpha'>('number');
  const book = useSettings((s) => s.book);
  const setBook = useSettings((s) => s.setBook);
  // Re-reads the merged corpus whenever an admin override lands.
  const corpusVersion = useOverrides((s) => s.updatedAt);
  const books = useMemo(() => getBooks(), []);

  // Prefilled when arriving from the reader's jump bar with free text,
  // or from a topic link (`?topic=worship`) in the reader info sheet.
  const { q, topic: topicParam } = useLocalSearchParams<{ q?: string; topic?: string }>();
  const [query, setQuery] = useState(typeof q === 'string' ? q : '');
  // Topic links from the reader (`/library?topic=worship`) land on the
  // already-mounted tab screen. The last-seen param is tracked alongside
  // the filter (render-time reset, same pattern as the admin editor): a
  // changed param resyncs the filter, manual chip taps are left alone.
  const [topicState, setTopicState] = useState<{ param: unknown; topic: TopicId | null }>(() => ({
    param: topicParam,
    topic: typeof topicParam === 'string' && isTopicId(topicParam) ? topicParam : null,
  }));
  if (topicState.param !== topicParam) {
    const incoming =
      typeof topicParam === 'string' && isTopicId(topicParam) ? topicParam : topicState.topic;
    setTopicState({ param: topicParam, topic: incoming });
  }
  const topic = topicState.topic;
  const setTopic = (next: TopicId | null) =>
    setTopicState((s) => ({ param: s.param, topic: next }));

  // corpusVersion only retriggers this after admin edits land.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const summaries = useMemo(() => getSummaries(book), [corpusVersion, book]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const topicCounts = useMemo(() => getTopicCounts(book), [corpusVersion, book]);

  // Topic filter first (primary or secondary tag), so book + topic combine
  // into one hybrid query and text search runs within the topic.
  const topicFiltered = useMemo(
    () => (topic ? summaries.filter((s) => matchesTopic(s, topic)) : summaries),
    [summaries, topic],
  );

  // In-list search: digits match the hymn number (exact first, then prefix),
  // anything else matches the normalised title.
  const trimmed = query.trim();
  const filtered = useMemo(() => {
    const needle = normalizeText(trimmed);
    if (!needle) return topicFiltered;
    if (/^\d+$/.test(needle)) {
      const digits = needle.replace(/^0+(?=\d)/, '');
      const exact = topicFiltered.filter((s) => String(s.number) === digits);
      if (exact.length > 0) return exact;
      return topicFiltered.filter((s) => String(s.number).startsWith(digits));
    }
    return topicFiltered.filter((s) => normalizeText(s.title).includes(needle));
  }, [topicFiltered, trimmed]);

  const sections = useMemo(() => {
    if (trimmed) {
      return [
        {
          key: 'filter',
          label: `${filtered.length} ${t('search.resultCount')}`,
          data: filtered,
        },
      ];
    }
    if (order === 'number') {
      return [
        {
          key: 'number',
          label: topic ? t(`topic.${topic}`) : t('library.byNumber'),
          data: [...topicFiltered].sort((a, b) => a.number - b.number),
        },
      ];
    }

    const buckets = new Map<string, HymnSummary[]>();
    for (const hymn of [...topicFiltered].sort((a, b) => a.title.localeCompare(b.title, 'ar'))) {
      const key = firstLetter(hymn.title);
      const bucket = buckets.get(key);
      if (bucket) bucket.push(hymn);
      else buckets.set(key, [hymn]);
    }

    return [...buckets.entries()].map(([key, data]) => ({ key, label: key, data }));
  }, [order, topic, topicFiltered, filtered, trimmed, t]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <AppBar title={t('library.title')} subtitle={`${summaries.length}`} showBack />

      {/* In-list search: filters the hymns below, no separate screen. */}
      <View
        style={{
          flexDirection: direction.row,
          alignItems: 'center',
          marginHorizontal: spacing.lg,
          marginTop: spacing.md,
          backgroundColor: colors.surfaceMuted,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: spacing.md,
          height: 48,
        }}>
        <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('search.placeholder')}
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          style={{
            flex: 1,
            marginHorizontal: spacing.sm,
            color: colors.text,
            fontFamily,
            fontSize: 16,
            writingDirection: direction.dir,
            textAlign: direction.textAlign,
          }}
        />
        {query.length > 0 ? (
          <Pressable
            onPress={() => setQuery('')}
            accessibilityRole="button"
            accessibilityLabel={t('search.clear')}
            hitSlop={8}
            android_ripple={{ color: colors.border }}
            style={{ padding: spacing.xs }}>
            <MaterialCommunityIcons name="close-circle" size={24} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {books.length > 1 ? (
        <SegmentedControl
          options={books.map((b) => ({ value: b.id, label: t(`book.${b.id}` as const) }))}
          value={book}
          onChange={(value) => setBook(value as BookId)}
          style={{ marginHorizontal: spacing.lg, marginTop: spacing.lg }}
        />
      ) : null}
      {/* Topic filter chips: All + the 9 topics with per-book counts.
          Combined with the book selector above into one hybrid query. */}
      <View
        accessible
        accessibilityRole="menu"
        accessibilityLabel={t('library.topics')}
        style={{ marginTop: spacing.md }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            flexDirection: direction.row,
            alignItems: 'center',
            gap: spacing.sm,
            paddingHorizontal: spacing.lg,
          }}>
          <TopicChip
            selected={topic === null}
            label={t('library.allTopics')}
            count={summaries.length}
            onPress={() => setTopic(null)}
          />
          {TOPIC_IDS.map((id) => (
            <TopicChip
              key={id}
              selected={topic === id}
              label={t(`topic.${id}` as const)}
              count={topicCounts[id]}
              onPress={() => setTopic(topic === id ? null : id)}
            />
          ))}
        </ScrollView>
      </View>
      <SegmentedControl
        options={[
          { value: 'number', label: t('library.byNumber') },
          { value: 'alpha', label: t('library.alphabetical') },
        ]}
        value={order}
        onChange={(value) => setOrder(value as 'number' | 'alpha')}
        style={{ margin: spacing.lg, marginBottom: spacing.sm }}
      />

      <SectionList
        sections={sections}
        keyExtractor={(hymn) => hymn.id}
        stickySectionHeadersEnabled={order === 'alpha' && !trimmed}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
        ListEmptyComponent={
          <EmptyState
            icon={trimmed ? 'text-search' : 'playlist-music-outline'}
            title={trimmed ? t('search.noResults') : t('library.title')}
            hint={trimmed ? t('search.noResultsHint') : undefined}
          />
        }
        renderSectionHeader={({ section }) => (
          <View
            style={{
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.sm,
              backgroundColor: colors.canvas,
            }}>
            <AppText variant="label" color={colors.textMuted} style={{ fontWeight: '700' }}>
              {order === 'alpha' ? section.label : section.label}
            </AppText>
          </View>
        )}
        renderItem={({ item }) => (
          <HymnRow
            hymn={item}
            subtitle={
              topic && item.primaryTopic ? t(`topic.${item.primaryTopic}` as const) : undefined
            }
            onPress={() => router.push(`/hymn/${item.id}`)}
          />
        )}
        SectionSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
      />
    </View>
  );
}

/** One pill in the topic filter row: label + count, filled when selected. */
function TopicChip({
  selected,
  label,
  count,
  onPress,
}: {
  selected: boolean;
  label: string;
  count: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} (${count})`}
      accessibilityState={{ selected }}
      android_ripple={{ color: colors.border }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.primary : colors.surface,
        opacity: pressed ? 0.75 : 1,
      })}>
      <AppText
        variant="label"
        numberOfLines={1}
        color={selected ? colors.onPrimary : colors.text}
        style={{ fontWeight: selected ? '700' : '400' }}>
        {label}
      </AppText>
      <AppText
        variant="caption"
        numberOfLines={1}
        color={selected ? colors.onPrimary : colors.textMuted}
        style={{ fontWeight: '700' }}>
        {count}
      </AppText>
    </Pressable>
  );
}