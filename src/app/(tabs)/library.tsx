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
import { HymnRow } from '../../components/HymnRow';
import { SegmentedControl } from '../../components/SegmentedControl';
import { getBooks, getSummaries } from '../../data/loader';
import { normalizeText } from '../../data/normalize';
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

  // Prefilled when arriving from the reader's jump bar with free text.
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(typeof q === 'string' ? q : '');

  // corpusVersion only retriggers this after admin edits land.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const summaries = useMemo(() => getSummaries(book), [corpusVersion, book]);

  // In-list search: digits match the hymn number (exact first, then prefix),
  // anything else matches the normalised title.
  const trimmed = query.trim();
  const filtered = useMemo(() => {
    const needle = normalizeText(trimmed);
    if (!needle) return summaries;
    if (/^\d+$/.test(needle)) {
      const digits = needle.replace(/^0+(?=\d)/, '');
      const exact = summaries.filter((s) => String(s.number) === digits);
      if (exact.length > 0) return exact;
      return summaries.filter((s) => String(s.number).startsWith(digits));
    }
    return summaries.filter((s) => normalizeText(s.title).includes(needle));
  }, [summaries, trimmed]);

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
          label: t('library.byNumber'),
          data: [...summaries].sort((a, b) => a.number - b.number),
        },
      ];
    }

    const buckets = new Map<string, HymnSummary[]>();
    for (const hymn of [...summaries].sort((a, b) => a.title.localeCompare(b.title, 'ar'))) {
      const key = firstLetter(hymn.title);
      const bucket = buckets.get(key);
      if (bucket) bucket.push(hymn);
      else buckets.set(key, [hymn]);
    }

    return [...buckets.entries()].map(([key, data]) => ({ key, label: key, data }));
  }, [order, summaries, filtered, trimmed, t]);

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
          <HymnRow hymn={item} onPress={() => router.push(`/hymn/${item.id}`)} />
        )}
        SectionSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
      />
    </View>
  );
}