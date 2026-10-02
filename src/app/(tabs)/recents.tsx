/**
 * الحديثة — recently read hymns, newest first.
 */
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, View } from 'react-native';

import { AppBar } from '../../components/AppBar';
import { EmptyState } from '../../components/EmptyState';
import { HymnRow } from '../../components/HymnRow';
import { TextButton } from '../../components/TextButton';
import { getSummaries } from '../../data/loader';
import type { HymnSummary } from '../../data/types';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';
import { useLibrary } from '../../store/library';
import { spacing } from '../../theme/tokens';

export default function RecentsScreen() {
  const router = useRouter();
  const { t } = useT();
  const { colors } = useTheme();

  const recents = useLibrary((s) => s.recents);
  const clearRecents = useLibrary((s) => s.clearRecents);

  // Resolving ids to summaries drops entries whose hymn no longer exists, which
  // happens whenever the corpus is rebuilt with different content.
  const rows = useMemo(() => {
    const byId = new Map(getSummaries().map((s) => [s.id, s]));
    const resolved: { id: string; summary: HymnSummary }[] = [];
    for (const entry of recents) {
      const summary = byId.get(entry.id);
      if (summary) resolved.push({ id: entry.id, summary });
    }
    return resolved;
  }, [recents]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <AppBar
        title={t('recents.title')}
        action={
          rows.length > 0 ? (
            <TextButton label={t('recents.clear')} onPress={clearRecents} color={colors.onPrimary} />
          ) : undefined
        }
      />

      <FlatList
        data={rows}
        keyExtractor={(row) => row.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
        ListEmptyComponent={
          <EmptyState icon="history" title={t('recents.empty')} hint={t('recents.emptyHint')} />
        }
        renderItem={({ item }) => (
          <HymnRow hymn={item.summary} onPress={() => router.push(`/hymn/${item.summary.id}`)} />
        )}
      />
    </View>
  );
}