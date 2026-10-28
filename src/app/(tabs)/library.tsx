/**
 * عرض جميع الترنيمات — the full corpus listing, with in-list search.
 *
 * Two orders: by the number printed in the book (the default, since that is how
 * a reader navigates physically) or alphabetically with letter headers.
 * A SectionList keeps header pinning and large lists efficient; with the bundled
 * corpus the data is already in memory, so there is no paging to manage.
 *
 * The search field filters this same list. Digits match the printed number;
 * free text matches titles immediately and, once the lazily imported chunks
 * are in memory, the lyrics too — with the matched span highlighted in place.
 * It can be prefilled from the reader's jump bar via `?q=`.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, SectionList, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppBar } from '../../components/AppBar';
import { AppText } from '../../components/AppText';
import { EmptyState } from '../../components/EmptyState';
import { FilterSelect } from '../../components/FilterSelect';
import { HymnRow } from '../../components/HymnRow';
import { LyricsMatchRow } from '../../components/LyricsMatchRow';
import {
  areAllChunksLoaded,
  ensureAllChunks,
  getBooks,
  getCorpus,
  getSummaries,
  getTopicCounts,
} from '../../data/loader';
import { normalizeText } from '../../data/normalize';
import { searchHymns } from '../../data/search';
import { isTopicId, matchesTopic, TOPIC_COLORS, TOPIC_IDS, type TopicId } from '../../data/topics';
import type { BookId, HymnSummary, SearchMatch } from '../../data/types';
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

/** One list row: a plain hymn, or a hymn reached through a lyric hit. */
interface LibraryRow {
  hymn: HymnSummary;
  match?: SearchMatch;
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

  // In-list search. A number stays a cheap summary lookup (no chunk import).
  // Free text matches titles straight away from the summaries, then the
  // lyrics once the lazily imported chunks are in memory.
  const trimmed = query.trim();
  const needle = normalizeText(trimmed);
  const isNumberQuery = /^\d+$/.test(needle);
  const wantsLyrics = needle.length >= 2 && !isNumberQuery;

  const titleMatches = useMemo(() => {
    if (!needle) return topicFiltered;
    if (isNumberQuery) {
      const digits = needle.replace(/^0+(?=\d)/, '');
      const exact = topicFiltered.filter((s) => String(s.number) === digits);
      if (exact.length > 0) return exact;
      return topicFiltered.filter((s) => String(s.number).startsWith(digits));
    }
    return topicFiltered.filter((s) => normalizeText(s.title).includes(needle));
  }, [topicFiltered, needle, isNumberQuery]);

  // Hymn bodies are lazily imported, so the first text query pulls every
  // chunk (full-text search needs them all) and re-renders when they land —
  // `lyricsReady` flipping to true is what recomputes the results below.
  const [, setChunksVersion] = useState(0);
  useEffect(() => {
    if (!wantsLyrics) return;
    let active = true;
    ensureAllChunks()
      .then(() => {
        if (active) setChunksVersion((n) => n + 1);
      })
      .catch(() => {
        /* Leave the title results in place if a chunk fails to load. */
      });
    return () => {
      active = false;
    };
  }, [wantsLyrics]);

  const lyricsReady = areAllChunksLoaded();
  const lyricsLoading = wantsLyrics && !lyricsReady;

  // Lyrics hits, capped at two lines per hymn so one hymn cannot flood the
  // list. Hymns already listed as title matches are not repeated here.
  const lyricMatches = useMemo(() => {
    if (!wantsLyrics || !lyricsReady) return [];
    const titleIds = new Set(titleMatches.map((s) => s.id));
    const perHymn = new Map<string, SearchMatch[]>();
    for (const hit of searchHymns(getCorpus(book), trimmed, 400)) {
      if (hit.inTitle || titleIds.has(hit.hymn.id)) continue;
      if (topic && !matchesTopic(hit.hymn, topic)) continue;
      const bucket = perHymn.get(hit.hymn.id);
      if (!bucket) perHymn.set(hit.hymn.id, [hit]);
      else if (bucket.length < 2) bucket.push(hit);
    }
    return [...perHymn.values()].flat().slice(0, 60);
  }, [wantsLyrics, lyricsReady, trimmed, titleMatches, topic, book]);

  const sections = useMemo<{ key: string; label: string; data: LibraryRow[] }[]>(() => {
    if (trimmed) {
      const rows: { key: string; label: string; data: LibraryRow[] }[] = [];
      if (titleMatches.length > 0) {
        rows.push({
          key: 'titles',
          label: isNumberQuery
            ? `${titleMatches.length} ${t('search.resultCount')}`
            : `${t('search.inTitles')} · ${titleMatches.length}`,
          data: titleMatches.map((hymn) => ({ hymn })),
        });
      }
      if (lyricMatches.length > 0) {
        rows.push({
          key: 'lyrics',
          label: `${t('search.inLyrics')} · ${lyricMatches.length}`,
          data: lyricMatches.map((match) => ({ hymn: match.hymn, match })),
        });
      }
      return rows;
    }
    if (order === 'number') {
      return [
        {
          key: 'number',
          label: topic ? t(`topic.${topic}`) : t('library.byNumber'),
          data: [...topicFiltered]
            .sort((a, b) => a.number - b.number)
            .map((hymn) => ({ hymn })),
        },
      ];
    }

    const buckets = new Map<string, LibraryRow[]>();
    for (const hymn of [...topicFiltered].sort((a, b) => a.title.localeCompare(b.title, 'ar'))) {
      const key = firstLetter(hymn.title);
      const bucket = buckets.get(key);
      if (bucket) bucket.push({ hymn });
      else buckets.set(key, [{ hymn }]);
    }

    return [...buckets.entries()].map(([key, data]) => ({ key, label: key, data }));
  }, [order, topic, topicFiltered, titleMatches, lyricMatches, isNumberQuery, trimmed, t]);

  const listRef = useRef<SectionList<LibraryRow>>(null);
  const [scrollIndex, setScrollIndex] = useState(0);

  const flatRows = useMemo(
    () =>
      sections.flatMap((section, sectionIndex) =>
        section.data.map((item, itemIndex) => ({
          sectionIndex,
          itemIndex,
          item,
        })),
      ),
    [sections],
  );

  const jumpBy = (delta: number) => {
    if (flatRows.length === 0) return;
    const nextIndex = Math.max(0, Math.min(flatRows.length - 1, scrollIndex + delta));
    setScrollIndex(nextIndex);
    const target = flatRows[nextIndex];
    listRef.current?.scrollToLocation({
      sectionIndex: target.sectionIndex,
      itemIndex: target.itemIndex,
      animated: true,
    });
  };

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
          onChangeText={(text) => {
            // Auto-convert Arabic-Indic digits (٠-٩) to Western (0-9) so number search works seamlessly
            const converted = text.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (ch) => {
              return String.fromCharCode(ch.charCodeAt(0) - 0x0660 + 48);
            });
            setQuery(converted);
            setScrollIndex(0);
          }}
          placeholder={t('search.placeholder')}
          placeholderTextColor={colors.textMuted}
          keyboardType="default"
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
              color: TOPIC_COLORS[id],
            })),
          ]}
          value={topic ?? ''}
          onChange={(value) => setTopic(isTopicId(value) ? value : null)}
        />
      </View>

      <View
        style={{
          flexDirection: direction.row,
          justifyContent: 'space-between',
          paddingHorizontal: spacing.lg,
          marginTop: spacing.md,
          gap: spacing.sm,
        }}>
        <Pressable
          onPress={() => jumpBy(-50)}
          accessibilityRole="button"
          accessibilityLabel="Scroll up by 50"
          android_ripple={{ color: colors.border }}
          style={({ pressed }) => ({
            flex: 1,
            paddingVertical: spacing.sm,
            alignItems: 'center',
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            opacity: pressed ? 0.75 : 1,
          })}>
          <AppText variant="label" color={colors.primary} style={{ fontWeight: '700' }}>
            −50
          </AppText>
        </Pressable>
        <Pressable
          onPress={() => jumpBy(50)}
          accessibilityRole="button"
          accessibilityLabel="Scroll down by 50"
          android_ripple={{ color: colors.border }}
          style={({ pressed }) => ({
            flex: 1,
            paddingVertical: spacing.sm,
            alignItems: 'center',
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            opacity: pressed ? 0.75 : 1,
          })}>
          <AppText variant="label" color={colors.primary} style={{ fontWeight: '700' }}>
            +50
          </AppText>
        </Pressable>
      </View>

      <SectionList
        ref={listRef}
        sections={sections}
        keyExtractor={(item) =>
          item.match
            ? `${item.hymn.id}:${item.match.verseIndex}:${item.match.lineIndex}:${item.match.line}`
            : item.hymn.id
        }
        stickySectionHeadersEnabled={order === 'alpha' && !trimmed}
        keyboardShouldPersistTaps="handled"
        onScroll={() => setScrollIndex((current) => current)}
        style={{ marginTop: spacing.sm }}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
        ListEmptyComponent={
          lyricsLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: spacing.xxl * 2 }}>
              <AppText variant="body" color={colors.textMuted} center>
                {t('search.lyricsLoading')}
              </AppText>
            </View>
          ) : (
            <EmptyState
              icon={trimmed ? 'text-search' : 'playlist-music-outline'}
              title={trimmed ? t('search.noResults') : t('library.title')}
              hint={trimmed ? t('search.noResultsHint') : undefined}
            />
          )
        }
        ListFooterComponent={
          lyricsLoading && titleMatches.length > 0 ? (
            <AppText
              variant="caption"
              color={colors.textMuted}
              center
              style={{ paddingVertical: spacing.lg }}>
              {t('search.lyricsLoading')}
            </AppText>
          ) : null
        }
        renderSectionHeader={({ section }) => (
          <View
            style={{
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.sm,
              backgroundColor: colors.canvas,
            }}>
            <AppText variant="label" color={colors.textMuted} style={{ fontWeight: '700' }}>
              {section.label}
            </AppText>
          </View>
        )}
        renderItem={({ item }) => {
          const { hymn, match } = item;
          if (match) {
            return (
              <LyricsMatchRow
                match={match}
                onPress={() => {
                  setQuery('');
                  router.push({
                    pathname: '/hymn/[id]',
                    params: { id: hymn.id, verse: String(match.verseIndex) },
                  });
                }}
              />
            );
          }
          return (
            <HymnRow
              hymn={hymn}
              highlight={trimmed || undefined}
              subtitle={hymn.primaryTopic ? t(`topic.${hymn.primaryTopic}` as const) : undefined}
              onPress={() => {
                // Returning lands on a clean search field, ready for lookup.
                setQuery('');
                router.push(`/hymn/${hymn.id}`);
              }}
            />
          );
        }}
        SectionSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
      />
    </View>
  );
}
