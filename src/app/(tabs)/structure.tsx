/**
 * مقياس الكلام — hymns grouped by metre family (النظم), like the printed
 * book's "الترنيمات مرتبة حسب النظم" index.
 *
 * Transcribed families render as a grid of cells; tapping a cell opens the
 * family with one section per exact sub-metre (base first, then variants).
 * Books without families keep the plain exact-metre list.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, SectionList, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppBar } from '../../components/AppBar';
import { AppText } from '../../components/AppText';
import { EmptyState } from '../../components/EmptyState';
import { HymnRow } from '../../components/HymnRow';
import { IconButton } from '../../components/IconButton';
import { MeterText } from '../../components/MeterText';
import type { HymnSummary } from '../../data/types';
import { getSummaries } from '../../data/loader';
import { METER_FAMILIES } from '../../data/meterFamilies';
import { groupByStructure } from '../../data/search';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';
import { useOverrides } from '../../store/overrides';
import { useSettings } from '../../store/settings';
import { type as typeScale } from '../../theme/fonts';
import { spacing } from '../../theme/tokens';

export default function StructureScreen() {
  const router = useRouter();
  const { t, direction } = useT();
  const { colors } = useTheme();
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const corpusVersion = useOverrides((s) => s.updatedAt);
  const book = useSettings((s) => s.book);

  // corpusVersion only retriggers this after admin edits land.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const summaries = useMemo(() => getSummaries(book), [corpusVersion, book]);

  const byId = useMemo(() => new Map(summaries.map((s) => [s.id, s])), [summaries]);

  // Families present in this book, in index order.
  const families = useMemo(
    () =>
      METER_FAMILIES.map((f) => ({
        label: f.label,
        hymns: f.hymnIds
          .map((id) => byId.get(id))
          .filter((s): s is HymnSummary => s !== undefined)
          .sort((a, b) => a.number - b.number),
      })).filter((f) => f.hymns.length > 0),
    [byId],
  );

  // Plain exact-metre groups, for books without transcribed families.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const exactGroups = useMemo(() => groupByStructure(summaries), [summaries]);

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Exact sub-metres inside one family: base (most hymns) first, the length
  // variants after — mirroring the printed index. A hymn with no exact
  // metre joins under the family label itself.
  const familySections = (label: string) => {
    const family = families.find((f) => f.label === label);
    if (!family) return [];
    const buckets = new Map<string, HymnSummary[]>();
    for (const hymn of family.hymns) {
      const key = (hymn.meter ?? '').trim() || label;
      const bucket = buckets.get(key);
      if (bucket) bucket.push(hymn);
      else buckets.set(key, [hymn]);
    }
    return [...buckets.entries()]
      .map(([meter, hymns]) => ({ meter, hymns }))
      .sort((a, b) => b.hymns.length - a.hymns.length || a.meter.localeCompare(b.meter, 'ar'));
  };

  const headerRow = (key: string, label: string, count: number) => {
    const expanded = open.has(key);
    return (
      <Pressable
        onPress={() => toggle(key)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded }}
        android_ripple={{ color: colors.border }}
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
        <MeterText
          meter={label}
          fontSize={typeScale.body}
          color={colors.text}
          bold
          numberOfLines={1}
          style={{ flex: 1, marginHorizontal: spacing.sm }}
        />
        <AppText variant="caption" color={colors.textMuted}>
          {count}
        </AppText>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textMuted}
        />
      </Pressable>
    );
  };

  // No transcribed families in this book: the plain exact-metre list.
  if (families.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        <AppBar title={t('structure.title')} subtitle={t('structure.subtitle')} />
        <SectionList
          sections={exactGroups.map((group) => ({
            key: group.key,
            label: group.label,
            hymns: group.hymns,
            data: open.has(group.key) ? group.hymns : [],
          }))}
          keyExtractor={(hymn) => hymn.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
          ListEmptyComponent={<EmptyState icon="music-note" title={t('structure.empty')} />}
          renderSectionHeader={({ section }) => {
            const typed = section as unknown as { label: string; hymns: { id: string }[] };
            return headerRow(section.key, typed.label, typed.hymns.length);
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

  // One open family: sub-metre pills with their hymns, like the printed page.
  if (selected) {
    const sections = familySections(selected);
    const total = sections.reduce((n, s) => n + s.hymns.length, 0);
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        <AppBar title={t('structure.title')} subtitle={t('structure.subtitle')} />
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
          <View style={{ flexDirection: direction.row, alignItems: 'center', marginBottom: spacing.md }}>
            <IconButton
              name={direction.isRTL ? 'chevron-right' : 'chevron-left'}
              label={t('common.back')}
              onPress={() => setSelected(null)}
            />
            <MeterText
              meter={selected}
              fontSize={typeScale.title}
              color={colors.text}
              bold
              align="center"
              style={{ flex: 1 }}
            />
            <AppText variant="caption" color={colors.textMuted}>
              {total}
            </AppText>
          </View>
          {sections.map((section) => (
            <View key={section.meter} style={{ marginBottom: spacing.md }}>
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  marginBottom: spacing.sm,
                }}>
                <MeterText
                  meter={section.meter}
                  fontSize={typeScale.body}
                  color={colors.text}
                  bold
                  align="center"
                />
              </View>
              {section.hymns.map((hymn) => (
                <HymnRow key={hymn.id} hymn={hymn} onPress={() => router.push(`/hymn/${hymn.id}`)} />
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  // Family grid only — no fallback list.
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <AppBar title={t('structure.title')} subtitle={t('structure.subtitle')} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <View style={{ flexDirection: direction.row, flexWrap: 'wrap', marginHorizontal: -spacing.xs / 2 }}>
          {families.map((family) => (
            <View key={family.label} style={{ width: '25%', padding: spacing.xs / 2 }}>
              <Pressable
                onPress={() => setSelected(family.label)}
                accessibilityRole="button"
                accessibilityLabel={family.label}
                android_ripple={{ color: colors.border }}
                style={({ pressed }) => ({
                  aspectRatio: 0.92,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: spacing.xs,
                  opacity: pressed ? 0.7 : 1,
                })}>
                <MeterText
                  meter={family.label}
                  fontSize={typeScale.body + 2}
                  color={colors.text}
                  bold
                  align="center"
                  numberOfLines={2}
                />
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
