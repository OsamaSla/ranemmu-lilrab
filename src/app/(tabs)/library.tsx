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
import { Pressable, SectionList, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppBar } from '../../components/AppBar';
import { AppText } from '../../components/AppText';
import { EmptyState } from '../../components/EmptyState';
import { FilterSelect } from '../../components/FilterSelect';
import { HymnRow } from '../../components/HymnRow';
import { getBooks, getSummaries, getTopicCounts } from '../../data/loader';
import { normalizeText } from '../../data/normalize';
import { isTopicId, matchesTopic, TOPIC_IDS, type TopicId } from '../../data/topics';
import type { BookId, HymnSummary } from '../../data/types';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';
import { useOverrides } from '../../store/overrides';
import { useRemote } from '../../store/remote';
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
  // Re-runs the queries below when cloud edits stream in.
  const remoteVersion = useRemote((s) => s.updatedAt);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const books = useMemo(() => getBooks(), [corpusVersion, remoteVersion]);

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
  const summaries = useMemo(() => getSummaries(book), [corpusVersion, remoteVersion, book]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const topicCounts = useMemo(() => getTopicCounts(book), [corpusVersion, remoteVersion, book]);

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
          keyboardType={(() => {
            const norm = normalizeText(query.trim());
            const isNumericQuery = /^\d+$/.test(norm) && norm.length <= 4;
            const digits = isNumericQuery ? norm.replace(/^0+(?=\d)/, '') : '';
            const hasMatch = isNumericQuery && (digits.length > 0) && (
              topicFiltered.some((s) => String(s.number) === digits) ||
              topicFiltered.some((s) => String(s.number).startsWith(digits))
            );
            return hasMatch ? 'numeric' : 'default';
          })()}
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

      {/* Two slim filter rows: book + sort toggle, then topic full-width
          so long topic names are never truncated. They combine into a
          single hybrid query (topic counts follow the chosen book). */}
      <View
        style={{
          flexDirection: direction.row,
          gap: spacing.sm,
          paddingHorizontal: spacing.lg,
          marginTop: spacing.md,
        }}>
        {books.length > 1 ? (
          <FilterSelect
            title={t('book.choose')}
            icon="book-open-page-variant"
            options={books.map((b) => ({
              value: b.id,
              label: t(`book.${b.id}` as const),
              count: b.count,
            }))}
            value={book}
            onChange={(value) => setBook(value as BookId)}
            style={{ flex: 1 }}
          />
        ) : null}
        <Pressable
          onPress={() => setOrder(order === 'number' ? 'alpha' : 'number')}
          accessibilityRole="button"
          accessibilityLabel={`${t('library.sortOrder')}: ${t(order === 'number' ? 'library.byNumber' : 'library.alphabetical')}`}
          android_ripple={{ color: colors.border }}
          style={({ pressed }) => ({
            width: 48,
            minHeight: 48,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            opacity: pressed ? 0.75 : 1,
          })}>
          <MaterialCommunityIcons
            name={order === 'number' ? 'sort-numeric-ascending' : 'sort-alphabetical-ascending'}
            size={22}
            color={colors.primary}
          />
        </Pressable>
      </View>
      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.sm }}>
        <FilterSelect
          title={t('library.topics')}
          icon="tag-outline"
          options={[
            { value: '', label: t('library.allTopics'), count: summaries.length },
            ...TOPIC_IDS.map((id) => ({
              value: id,
              label: t(`topic.${id}` as const),
              count: topicCounts[id],
            })),
          ]}
          value={topic ?? ''}
          onChange={(value) => setTopic(isTopicId(value) ? value : null)}
        />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(hymn) => hymn.id}
        stickySectionHeadersEnabled={order === 'alpha' && !trimmed}
        keyboardShouldPersistTaps="handled"
        style={{ marginTop: spacing.sm }}
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
            subtitle={item.primaryTopic ? t(`topic.${item.primaryTopic}` as const) : undefined}
            onPress={() => {
              // Returning lands on a clean search field, ready for lookup.
              setQuery('');
              router.push(`/hymn/${item.id}`);
            }}
          />
        )}
        SectionSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
      />
    </View>
  );
}