/**
 * The starred hymns, in the order they were starred.
 *
 * Favourites store hymn ids, not text, so entries resolve against the current
 * corpus and silently drop anything the content pipeline removed.
 */
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, View } from 'react-native';

import { AppBar } from '../../components/AppBar';
import { EmptyState } from '../../components/EmptyState';
import { HymnRow } from '../../components/HymnRow';
import { getSummaries } from '../../data/loader';
import type { HymnSummary } from '../../data/types';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';
import { useLibrary } from '../../store/library';
import { spacing } from '../../theme/tokens';

export default function FavoritesScreen() {
  const router = useRouter();
  const { t } = useT();
  const { colors } = useTheme();
  const favorites = useLibrary((s) => s.favorites);

  const rows = useMemo(() => {
    const byId = new Map(getSummaries().map((s) => [s.id, s]));
    const resolved: HymnSummary[] = [];
    for (const id of favorites) {
      const summary = byId.get(id);
      if (summary) resolved.push(summary);
    }
    return resolved;
  }, [favorites]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <AppBar title={t('favorites.title')} />

      <FlatList
        data={rows}
        keyExtractor={(hymn) => hymn.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
        ListEmptyComponent={
          <EmptyState
            icon="star-outline"
            title={t('favorites.empty')}
            hint={t('favorites.emptyHint')}
          />
        }
        renderItem={({ item }) => (
          <HymnRow hymn={item} onPress={() => router.push(`/hymn/${item.id}`)} />
        )}
      />
    </View>
  );
}
