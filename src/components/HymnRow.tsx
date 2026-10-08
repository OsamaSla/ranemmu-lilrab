/**
 * One row in any hymn list: library, favourites, recents, metre groups.
 *
 * The number is rendered in Arabic-Indic digits regardless of the UI locale,
 * because it has to match the number printed in the book the reader is holding.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { AppText } from './AppText';
import { Card } from './Card';
import type { HymnSummary } from '../data/types';
import { useT } from '../hooks/useT';
import { useTheme } from '../hooks/useTheme';
import { useLibrary } from '../store/library';
import { radius, spacing } from '../theme/tokens';

interface HymnRowProps {
  hymn: HymnSummary;
  onPress: () => void;
  /** Secondary line under the title, e.g. the metre or "read 2h ago". */
  subtitle?: string;
  showStar?: boolean;
  onToggleFavorite?: () => void;
}

export function HymnRow({ hymn, onPress, subtitle, showStar = true, onToggleFavorite }: HymnRowProps) {
  const { colors } = useTheme();
  const { direction } = useT();
  const favorite = useLibrary((s) => s.favorites.includes(hymn.id));

  const toggle = onToggleFavorite ?? (() => useLibrary.getState().toggleFavorite(hymn.id));

  return (
    <Card padded={false} style={{ marginBottom: spacing.sm }}>
      <View
        style={{
          flexDirection: direction.row,
          alignItems: 'center',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.lg,
        }}>
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`${hymn.number} ${hymn.title}`}
          android_ripple={{ color: colors.border }}
          style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.7 : 1 }]}>
          <View style={{ flexDirection: direction.row, alignItems: 'center' }}>
            <View
              style={{
                minWidth: 44,
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                borderRadius: radius.md,
                backgroundColor: colors.primary,
                alignItems: 'center',
              }}>
              <AppText variant="label" color={colors.onPrimary} useAppFont={false} style={{ fontWeight: '700' }}>
                {hymn.number}
              </AppText>
            </View>

            <View style={{ flex: 1, paddingHorizontal: spacing.md }}>
              <AppText variant="body" numberOfLines={2}>
                {hymn.title}
              </AppText>
              {subtitle ? (
                <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
                  {subtitle}
                </AppText>
              ) : null}
            </View>
          </View>
        </Pressable>

        {showStar ? (
          <Pressable
            onPress={toggle}
            hitSlop={8}
            android_ripple={{ color: colors.border }}
            accessibilityRole="button"
            accessibilityLabel={hymn.title}
            accessibilityState={{ selected: favorite }}
            style={({ pressed }) => [{ padding: spacing.xs, opacity: pressed ? 0.6 : 1 }]}>
            <MaterialCommunityIcons
              name={favorite ? 'star' : 'star-outline'}
              size={24}
              color={favorite ? colors.favorite : colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}