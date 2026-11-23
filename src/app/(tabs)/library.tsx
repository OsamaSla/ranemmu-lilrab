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
import { useEffect, useMemo, useRef, useState, useCallback, useDeferredValue } from 'react';
import { Keyboard, Pressable, SectionList, TextInput, View } from 'react-native';
import type { ViewToken } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppBar } from '../../components/AppBar';
import { AppText } from '../../components/AppText';
import { CoachHint } from '../../components/CoachHint';
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
import { ensureSearchIndex, isSearchIndexReady, searchHymns, titleKey } from '../../data/search';
import { isTopicId, matchesTopic, TOPIC_COLORS, TOPIC_IDS, type TopicId } from '../../data/topics';
import type { BookId, HymnSummary, SearchMatch } from '../../data/types';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';
import { useCorpusVersion } from '../../store/corpus';
import { useSettings } from '../../store/settings';
import { noFocusRing, radius, spacing } from '../../theme/tokens';

/** Letter of the alphabet used to bucket the alphabetical sort. */
function firstLetter(text: string): string {
  const ch = text.trim().charAt(0) || '•';
  // Fold alef variants (أ إ آ ا ٱ) into a single bucket.
  const folded = 'أإآٱا'.includes(ch) ? 'ا' : ch;
  return folded.toUpperCase();
}

/** One list row: a plain hymn, or a hymn reached through a lyric hit. */
interface LibraryRow {
  hymn: HymnSummary;
  match?: SearchMatch;
}

interface MeasuredSection {
  key: string;
  header: number;
  rowHeights: number[];
  /** Cumulative offsets from the section start; length = rows + 1. */
  rowOffsets: number[];
  total: number;
  start: number;
}

/**
 * Only used until the first row reports its real height. Virtualization needs
 * a layout before anything has been rendered, but unlike the old fixed
 * ROW_HEIGHT/HEADER_HEIGHT these stop being consulted as soon as measurement
 * data exists (see measuredLayout below).
 */
const BOOTSTRAP_ROW_HEIGHT = 88;
const BOOTSTRAP_HEADER_HEIGHT = 40;

/** Matches the keyExtractor below, so measured heights survive re-renders. */
function libraryRowKey(row: LibraryRow): string {
  return row.match
    ? `${row.hymn.id}:${row.match.verseIndex}:${row.match.lineIndex}:${row.match.line}`
    : row.hymn.id;
}

export default function LibraryScreen() {
  const router = useRouter();
  const { t, direction } = useT();
  const { colors, fontFamily } = useTheme();
  const [order, setOrder] = useState<'number' | 'alpha'>('number');
  const book = useSettings((s) => s.book);
  const setBook = useSettings((s) => s.setBook);
  // The picker can widen the list to every book without touching the global
  // selection (the home grid still opens one book). A changed global book —
  // arriving from a home card — snaps the scope back to that book.
  const [bookScope, setBookScope] = useState<{ source: BookId; all: boolean }>({
    source: book,
    all: false,
  });
  if (bookScope.source !== book) setBookScope({ source: book, all: false });
  const allBooks = bookScope.all;
  const activeBook: BookId | undefined = allBooks ? undefined : book;
  // Re-reads the merged corpus whenever a chunk, override or cloud patch lands.
  const corpusVersion = useCorpusVersion();
  const books = useMemo(() => {
    void corpusVersion; // getBooks() reads a mutable cache.
    return getBooks();
  }, [corpusVersion]);

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

  const summaries = useMemo(() => {
    void corpusVersion;
    return getSummaries(activeBook);
  }, [corpusVersion, activeBook]);
  const topicCounts = useMemo(() => {
    void corpusVersion;
    return getTopicCounts(activeBook);
  }, [corpusVersion, activeBook]);

  // Topic filter first (primary or secondary tag), so book + topic combine
  // into one hybrid query and text search runs within the topic.
  const topicFiltered = useMemo(
    () => (topic ? summaries.filter((s) => matchesTopic(s, topic)) : summaries),
    [summaries, topic],
  );

  // In-list search. A number stays a cheap summary lookup (no chunk import).
  // Free text matches titles straight away from the summaries, then the
  // lyrics once the lazily imported chunks are in memory.
  const deferredQuery = useDeferredValue(query);
  const trimmed = deferredQuery.trim();
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
    return topicFiltered.filter((s) => titleKey(s).includes(needle));
  }, [topicFiltered, needle, isNumberQuery]);

  // Hymn bodies are lazily imported, so the first text query pulls every
  // chunk (full-text search needs them all). Each chunk and the search index
  // bump the corpus version, which re-renders this screen and recomputes
  // `lyricsReady` below — no local version state needed.
  useEffect(() => {
    if (!wantsLyrics) return;
    void Promise.all([ensureAllChunks(), ensureSearchIndex()]).catch(() => {
      /* Leave the title results in place if a chunk fails to load. */
    });
  }, [wantsLyrics]);

  // Both the hymn bodies (for the originals and highlights) and the
  // pre-normalised index must be in memory before the first lyric search,
  // otherwise that first keystroke would pay the normalisation cost itself.
  const lyricsReady = areAllChunksLoaded() && isSearchIndexReady();
  const lyricsLoading = wantsLyrics && !lyricsReady;

  // Lyrics hits, capped at two lines per hymn so one hymn cannot flood the
  // list. Hymns already listed as title matches are not repeated here.
  // Translated-title hits (EN/DE/HE) surfaced by searchHymns as inTitle are
  // collected separately so they render as normal HymnRow rows.
  const { lyricMatches, extraTitleMatches } = useMemo(() => {
    if (!wantsLyrics || !lyricsReady) return { lyricMatches: [], extraTitleMatches: [] };
    const titleIds = new Set(titleMatches.map((s) => s.id));
    const perHymn = new Map<string, SearchMatch[]>();
    const extra: HymnSummary[] = [];
    const extraSeen = new Set<string>();
    for (const hit of searchHymns(getCorpus(), trimmed, 400, activeBook)) {
      if (titleIds.has(hit.hymn.id)) continue;
      if (topic && !matchesTopic(hit.hymn, topic)) continue;
      if (hit.inTitle) {
        if (!extraSeen.has(hit.hymn.id)) {
          extraSeen.add(hit.hymn.id);
          extra.push(hit.hymn);
        }
        continue;
      }
      const bucket = perHymn.get(hit.hymn.id);
      if (!bucket) perHymn.set(hit.hymn.id, [hit]);
      else if (bucket.length < 2) bucket.push(hit);
    }
    return {
      lyricMatches: [...perHymn.values()].flat().slice(0, 60),
      extraTitleMatches: extra,
    };
  }, [wantsLyrics, lyricsReady, trimmed, titleMatches, topic, activeBook]);

  const allTitleMatches = useMemo(
    () => [...titleMatches, ...extraTitleMatches],
    [titleMatches, extraTitleMatches],
  );

  const sections = useMemo<{ key: string; label: string; data: LibraryRow[] }[]>(() => {
    if (trimmed) {
      const rows: { key: string; label: string; data: LibraryRow[] }[] = [];
      if (allTitleMatches.length > 0) {
        rows.push({
          key: 'titles',
          label: isNumberQuery
            ? `${allTitleMatches.length} ${t('search.resultCount')}`
            : `${t('search.inTitles')} · ${allTitleMatches.length}`,
          data: allTitleMatches.map((hymn) => ({ hymn })),
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
      // With every book in view, keep each book's printed sequence together:
      // hymn numbers repeat across the three books, so a plain number sort
      // would interleave unrelated hymns.
      const bookRank: Record<BookId, number> = { main: 0, taranim: 1, book3: 2 };
      return [
        {
          key: 'number',
          label: topic ? t(`topic.${topic}`) : t('library.byNumber'),
          data: [...topicFiltered]
            .sort((a, b) =>
              allBooks
                ? bookRank[a.book ?? 'main'] - bookRank[b.book ?? 'main'] || a.number - b.number
                : a.number - b.number,
            )
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
  }, [order, topic, topicFiltered, allTitleMatches, lyricMatches, isNumberQuery, trimmed, t, allBooks]);

  const listRef = useRef<SectionList<LibraryRow>>(null);
  /** Flat index of the row at the top edge; the ±50 buttons anchor to it. */
  const scrollIndexRef = useRef(0);
  /** Timestamp until which viewability reports are ignored (a jump is animating). */
  const jumpSettledAtRef = useRef(0);

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

  /** Where each section starts in the flat list (view tokens carry per-section indices). */
  const sectionOffsets = useMemo(() => {
    const offsets = new Map<string, number>();
    let acc = 0;
    for (const section of sections) {
      offsets.set(section.key, acc);
      acc += section.data.length;
    }
    return offsets;
  }, [sections]);

  // The callbacks below are captured once by the list, so they read the latest
  // data through refs instead of closing over it.
  const flatRowsRef = useRef<typeof flatRows>([]);
  const sectionOffsetsRef = useRef<Map<string, number>>(new Map());

  /** Rendered heights, keyed the same way as the rows and section headers. */
  const rowHeightsRef = useRef<Map<string, number>>(new Map());
  const headerHeightsRef = useRef<Map<string, number>>(new Map());
  const rowHeightSumRef = useRef(0);
  const rowHeightCountRef = useRef(0);
  const layoutCacheRef = useRef<MeasuredSection[] | null>(null);

  useEffect(() => {
    flatRowsRef.current = flatRows;
  }, [flatRows]);

  useEffect(() => {
    sectionOffsetsRef.current = sectionOffsets;
    // Heights are keyed by row, so a new data set needs fresh offsets.
    layoutCacheRef.current = null;
  }, [sectionOffsets, sections]);

  const recordHeight = useCallback((key: string, height: number) => {
    if (height <= 0) return;
    const heights = rowHeightsRef.current;
    const previous = heights.get(key);
    if (previous === height) return;
    if (previous === undefined) {
      rowHeightSumRef.current += height;
      rowHeightCountRef.current += 1;
    } else {
      rowHeightSumRef.current += height - previous;
    }
    heights.set(key, height);
    layoutCacheRef.current = null;
  }, []);

  const recordHeaderHeight = useCallback((key: string, height: number) => {
    if (height <= 0 || headerHeightsRef.current.get(key) === height) return;
    headerHeightsRef.current.set(key, height);
    layoutCacheRef.current = null;
  }, []);

  const rowHeight = (row: LibraryRow): number =>
    rowHeightsRef.current.get(libraryRowKey(row)) ??
    (rowHeightCountRef.current
      ? rowHeightSumRef.current / rowHeightCountRef.current
      : BOOTSTRAP_ROW_HEIGHT);
  const averageRowHeight = () =>
    rowHeightCountRef.current
      ? rowHeightSumRef.current / rowHeightCountRef.current
      : BOOTSTRAP_ROW_HEIGHT;

  /**
   * Cumulative offsets from measured (or not-yet-measured bootstrap) sizes,
   * rebuilt only when a measurement arrives or the data changes. A layout is
   * essential: without one VirtualizedList clamps its tail spacer to the
   * measured cells, so a 50-row jump can never reach an unmeasured row. The
   * old fixed 90 px guess is now only a bootstrap, replaced by the real
   * heights the rows report through onLayout — important for wrapped titles
   * and large appScale, where a constant guess causes jumpy/blank scrolling.
   */
  const measuredLayout = (): MeasuredSection[] => {
    if (layoutCacheRef.current) return layoutCacheRef.current;
    let start = 0;
    const layout = sections.map((section) => {
      const header = headerHeightsRef.current.get(section.key) ?? BOOTSTRAP_HEADER_HEIGHT;
      const rowHeights = section.data.map(rowHeight);
      const rowOffsets = [0];
      for (const height of rowHeights) {
        rowOffsets.push(rowOffsets[rowOffsets.length - 1] + height);
      }
      const total = header + rowOffsets[rowOffsets.length - 1];
      const measured = { key: section.key, header, rowHeights, rowOffsets, total, start };
      start += total;
      return measured;
    });
    layoutCacheRef.current = layout;
    return layout;
  };

  const getItemLayout = (_data: unknown, cellIndex: number) => {
    let cell = 0;
    for (const section of measuredLayout()) {
      const count = section.rowHeights.length;
      if (cellIndex < cell + count + 2) {
        const inSection = cellIndex - cell;
        if (inSection === 0) {
          return { index: cellIndex, offset: section.start, length: section.header };
        }
        if (inSection <= count) {
          return {
            index: cellIndex,
            offset: section.start + section.header + section.rowOffsets[inSection - 1],
            length: section.rowHeights[inSection - 1],
          };
        }
        // SectionList reserves an empty footer slot after each section.
        return { index: cellIndex, offset: section.start + section.total, length: 0 };
      }
      cell += count + 2;
    }
    return { index: cellIndex, offset: 0, length: averageRowHeight() };
  };

  /**
   * Tracks the row at the top edge, so a tap always pages from what the reader
   * is looking at rather than from the last jump.
   */
  const viewabilityConfig = { itemVisiblePercentThreshold: 0 };
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      // Mid-jump the list reports every row it flies past; those are not where
      // the reader is heading, so only trust reports once the jump has settled.
      if (Date.now() < jumpSettledAtRef.current) return;
      let top = Number.POSITIVE_INFINITY;
      for (const token of viewableItems) {
        if (!token.isViewable || token.index == null) continue;
        const base = sectionOffsetsRef.current.get(token.section?.key);
        if (base === undefined) continue;
        top = Math.min(top, base + token.index);
      }
      if (Number.isFinite(top)) scrollIndexRef.current = top;
    },
    []
  );

  const scrollToRow = (rowIndex: number) => {
    const target = flatRowsRef.current[rowIndex];
    if (!target) return;
    listRef.current?.scrollToLocation({
      sectionIndex: target.sectionIndex,
      itemIndex: target.itemIndex,
      animated: true,
    });
  };

  const jumpBy = (delta: number) => {
    if (flatRows.length === 0) return;
    // Paging while the search field is focused must not just dismiss the
    // keyboard on Android — the tap has to move the list too.
    Keyboard.dismiss();
    const nextIndex = Math.max(0, Math.min(flatRows.length - 1, scrollIndexRef.current + delta));
    // Assume the jump lands so repeated taps stack; viewability corrects this
    // to the row that actually ends up on screen once the scroll settles.
    scrollIndexRef.current = nextIndex;
    jumpSettledAtRef.current = Date.now() + 600;
    scrollToRow(nextIndex);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <AppBar title={t('library.title')} subtitle={`${summaries.length}`} showBack />

      {/* Two slim filter rows first: book + sort toggle, then topic
          full-width so long topic names are never truncated. The search field
          sits under them and filters the list they scope. */}
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
            options={[
              {
                value: '',
                label: t('book.all'),
                count: books.reduce((sum, b) => sum + b.count, 0),
              },
              ...books.map((b) => ({
                value: b.id,
                label: t(`book.${b.id}` as const),
                count: b.count,
              })),
            ]}
            value={allBooks ? '' : book}
            onChange={(value) => {
              if (!value) {
                setBookScope({ source: book, all: true });
                return;
              }
              setBookScope({ source: value as BookId, all: false });
              setBook(value as BookId);
            }}
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

      {/* In-list search: filters the hymns below, no separate screen. The ±50
          paging buttons are stacked at the field's trailing edge (the left side
          in Arabic) so they sit beside the list they move instead of taking a
          row of their own. */}
      <View
        style={{
          flexDirection: direction.row,
          alignItems: 'center',
          gap: spacing.sm,
          marginHorizontal: spacing.lg,
          marginTop: spacing.md,
        }}>
        <View
          style={{
            flex: 1,
            flexDirection: direction.row,
            alignItems: 'center',
            backgroundColor: colors.surfaceMuted,
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: spacing.md,
            height: 56,
          }}>
          <MaterialCommunityIcons name="magnify" size={22} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={(text) => {
              // Auto-convert Arabic-Indic digits (٠-٩) to Western (0-9) so number search works seamlessly
              const converted = text.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (ch) => {
                return String.fromCharCode(ch.charCodeAt(0) - 0x0660 + 48);
              });
              setQuery(converted);
              scrollIndexRef.current = 0;
            }}
            placeholder={t('search.placeholder')}
            placeholderTextColor={colors.textMuted}
            keyboardType="default"
            returnKeyType="search"
            onSubmitEditing={() => {
              if (!isNumberQuery) return;
              const digits = needle.replace(/^0+(?=\d)/, '');
              const match = summaries.find((s) => String(s.number) === digits);
              if (match) {
                setQuery('');
                router.push(`/hymn/${match.id}`);
              }
            }}
            underlineColorAndroid="transparent"
            style={{
              flex: 1,
              marginHorizontal: spacing.sm,
              color: colors.text,
              fontFamily,
              fontSize: 18,
              writingDirection: direction.dir,
              textAlign: direction.textAlign,
              ...noFocusRing,
            }}
          />
          {query.length > 0 ? (
            <Pressable
              onPress={() => setQuery('')}
              accessibilityRole="button"
              accessibilityLabel={t('search.clear')}
              hitSlop={8}
              android_ripple={{ color: colors.border }}
              style={{ padding: spacing.xs, ...noFocusRing }}>
              <MaterialCommunityIcons name="close-circle" size={24} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <View style={{ gap: 4 }}>
          <Pressable
            onPress={() => jumpBy(-50)}
            accessibilityRole="button"
            accessibilityLabel="Scroll up by 50"
            android_ripple={{ color: colors.border }}
            style={({ pressed }) => ({
              width: 44,
              height: 26,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.sm,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              ...noFocusRing,
              opacity: pressed ? 0.75 : 1,
            })}>
            <MaterialCommunityIcons name="chevron-up" size={16} color={colors.primary} />
          </Pressable>
          <Pressable
            onPress={() => jumpBy(50)}
            accessibilityRole="button"
            accessibilityLabel="Scroll down by 50"
            android_ripple={{ color: colors.border }}
            style={({ pressed }) => ({
              width: 44,
              height: 26,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.sm,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              ...noFocusRing,
              opacity: pressed ? 0.75 : 1,
            })}>
            <MaterialCommunityIcons name="chevron-down" size={16} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <CoachHint id="library.search" icon="magnify" label={t('coach.searchHint')} />

      <SectionList
        ref={listRef}
        sections={sections}
        keyExtractor={(item) => {
          // Viewability reports section header/footer cells as well, and for
          // those the list hands us the section object instead of a row.
          if (!item?.hymn) {
            return `section:${(item as unknown as { key?: string })?.key ?? 'unknown'}`;
          }
          return libraryRowKey(item);
        }}
        stickySectionHeadersEnabled={order === 'alpha' && !trimmed}
        keyboardShouldPersistTaps="handled"
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        getItemLayout={getItemLayout}
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
            onLayout={(event) => recordHeaderHeight(section.key ?? 'section', event.nativeEvent.layout.height)}
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
              onMeasured={recordHeight}
              subtitle={
                allBooks
                  ? t(`book.${hymn.book ?? 'main'}` as const)
                  : hymn.primaryTopic
                    ? t(`topic.${hymn.primaryTopic}` as const)
                    : undefined
              }
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
