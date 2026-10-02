/**
 * نظم — hymns grouped by tune and metre.
 *
 * This is the "similar hymns" grouping surfaced as its own destination, for a
 * reader who knows a tune and wants everything singable to it. Groups collapse
 * independently and remember nothing, since the grouping is cheap to compute.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, SectionList, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppBar } from '../components/AppBar';
import { AppText } from '../components/AppText';
import { EmptyState } from '../components/EmptyState';
import { HymnRow } from '../components/HymnRow';
import { getSummaries } from '../data/loader';
import { toArabicDigits } from '../data/normalize';
import { groupByStructure } from '../data/search';
import { useT } from '../hooks/useT';
import { useTheme } from '../hooks/useTheme';
import { spacing } from '../theme/tokens';

export default function StructureScreen() {
  const router = useRouter();
  const { t, direction } = useT();
  const { colors } = useTheme();
  const [open, setOpen] = useState<Set<string>>(new Set());

  const groups = useMemo(() => groupByStructure(getSummaries()), []);

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <AppBar title={t('structure.title')} subtitle={t('structure.subtitle')} />

      <SectionList
        sections={groups.map((group) => ({
          key: group.key,
          label: group.label,
          hymns: group.hymns,
          data: open.has(group.key) ? group.hymns : [],
        }))}
        keyExtractor={(hymn) => hymn.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
        ListEmptyComponent={<EmptyState icon="music-note" title={t('structure.empty')} />}
        renderSectionHeader={({ section }) => {
          const expanded = open.has(section.key);
          const typed = section as unknown as { label: string; hymns: { id: string }[] };

          return (
            <Pressable
              onPress={() => toggle(section.key)}
              accessibilityRole="button"
              accessibilityLabel={typed.label}
              accessibilityState={{ expanded }}
              style={({ pressed }) => [
                {
                  flexDirection: direction.row,
                  alignItems: 'center',
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.md,
                  marginBottom: spacing.sm,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}>
              <MaterialCommunityIcons name="music-note" size={20} color={colors.primary} />
              <AppText variant="body" style={{ fontWeight: '700', flex: 1, marginHorizontal: spacing.sm }} numberOfLines={1}>
                {typed.label}
              </AppText>
              <AppText variant="caption" color={colors.textMuted}>
                {toArabicDigits(typed.hymns.length)}
              </AppText>
              <MaterialCommunityIcons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textMuted}
              />
            </Pressable>
          );
        }}
        renderItem={({ item }) => (
          <View style={{ paddingStart: spacing.lg }}>
            <HymnRow hymn={item} onPress={() => router.push(`/hymn/${item.id}`)} />
          </View>
        )}
      />
    </View>
  );
}
