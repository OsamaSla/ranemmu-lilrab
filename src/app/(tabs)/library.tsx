/**
 * عرض جميع الترنيمات — the full corpus listing.
 *
 * Two orders: by the number printed in the book (the default, since that is how
 * a reader navigates physically) or alphabetically with letter headers.
 * A SectionList keeps header pinning and large lists efficient; with the bundled
 * corpus the data is already in memory, so there is no paging to manage.
 */
import { useMemo, useState } from 'react';
import { SectionList, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppBar } from '../../components/AppBar';
import { AppText } from '../../components/AppText';
import { EmptyState } from '../../components/EmptyState';
import { HymnRow } from '../../components/HymnRow';
import { SegmentedControl } from '../../components/SegmentedControl';
import { getSummaries } from '../../data/loader';
import type { HymnSummary } from '../../data/types';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';
import { spacing } from '../../theme/tokens';

/** Letter of the alphabet used to bucket the alphabetical sort. */
function firstLetter(text: string): string {
  return (text.trim().charAt(0) || '•').toUpperCase();
}

export default function LibraryScreen() {
  const router = useRouter();
  const { t } = useT();
  const { colors } = useTheme();
  const [order, setOrder] = useState<'number' | 'alpha'>('number');

  const summaries = getSummaries();

  const sections = useMemo(() => {
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
  }, [order, summaries, t]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <AppBar title={t('library.title')} subtitle={`${summaries.length}`} />

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
        stickySectionHeadersEnabled={order === 'alpha'}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
        ListEmptyComponent={<EmptyState icon="playlist-music-outline" title={t('library.title')} />}
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