import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AdminScreenShell } from '../../components/admin/AdminScreenShell';
import { AppText } from '../../components/AppText';
import { ensureAllChunks, getCorpus } from '../../data/loader';
import type { Hymn } from '../../data/types';
import { useCanEdit } from '../../hooks/useCanEdit';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';
import { useCorpusVersion } from '../../store/corpus';
import { radius, spacing } from '../../theme/tokens';
import { bookLabelKey, type TranslationKey } from '../../i18n';

const STATUS_LABELS = {
  AI_DRAFT: 'admin.statusDraft',
  VERIFIED: 'admin.verified',
} as const;

export default function AdminReviewScreen() {
  const router = useRouter();
  const { t, direction } = useT();
  const { colors } = useTheme();
  const canEdit = useCanEdit();
  const corpusVersion = useCorpusVersion();

  const [reviewLang, setReviewLang] = useState<'en' | 'de' | 'he'>('en');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'AI_DRAFT' | 'VERIFIED'>('AI_DRAFT');
  const [reviewBook, setReviewBook] = useState<'all' | 'main' | 'taranim' | 'book3'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (canEdit) void ensureAllChunks().catch(() => {});
  }, [canEdit]);

  const review = useMemo(() => {
    // getCorpus() reads a mutable cache; the version is the re-run trigger.
    void corpusVersion;
    // Hebrew is hand-authored and has no review flag of its own —
    // `translationStatus` belongs to the EN/DE translation review. So the
    // Hebrew queue lists every hymn carrying verses_he and ignores the
    // draft/reviewed filter; the rows show no status badge.
    const isHebrew = reviewLang === 'he';
    const statusOf = (h: Hymn) => h.translationStatus ?? 'AI_DRAFT';
    const bookOf = (h: Hymn) => h.book ?? 'main';
    const versesOf = (h: Hymn) =>
      reviewLang === 'en' ? h.verses_en : reviewLang === 'de' ? h.verses_de : h.verses_he;
    const q = searchQuery.trim().toLowerCase();
    const all = getCorpus().filter((h) => {
      if (!versesOf(h)?.length) return false;
      if (reviewBook !== 'all' && bookOf(h) !== reviewBook) return false;
      if (!q) return true;
      return (h.number + ' ' + h.title).toLowerCase().includes(q);
    });
    const verified = all.filter((h) => statusOf(h) === 'VERIFIED').length;
    const items = (isHebrew || reviewFilter === 'all'
      ? all
      : all.filter((h) => statusOf(h) === reviewFilter))
      .slice().sort((a, b) => a.number - b.number)
      .map((h) => ({
        id: h.id,
        number: h.number,
        title: h.title,
        book: bookOf(h),
        status: statusOf(h) as keyof typeof STATUS_LABELS,
      }));
    return { items, total: all.length, verified, isHebrew };
  }, [corpusVersion, reviewLang, reviewFilter, reviewBook, searchQuery]);

  const filters = [
    { value: 'all' as const, labelKey: 'admin.filterAll' as TranslationKey },
    { value: 'AI_DRAFT' as const, labelKey: 'admin.filterDrafts' as TranslationKey },
    { value: 'VERIFIED' as const, labelKey: 'admin.filterReviewed' as TranslationKey },
  ];

  return (
    <AdminScreenShell active="review">
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <AppText variant="body" style={{ fontWeight: '700', marginBottom: spacing.xs }}>{t('admin.reviewTitle')}</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {review.isHebrew ? review.total : `${t('admin.verified')}: ${review.verified} / ${review.total}`}
        </AppText>
        <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="بحث..." placeholderTextColor={colors.textMuted}
          style={[{ paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted, color: colors.text, fontSize: 14, minHeight: 44 }]} />
        <View style={{ flexDirection: direction.row, gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' }}>
          {(['all', 'main', 'taranim', 'book3'] as const).map((b) => (
            <Pressable key={b} onPress={() => setReviewBook(b)} style={({ pressed }) => ({ paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: reviewBook === b ? colors.primary : colors.border, backgroundColor: reviewBook === b ? colors.primary : 'transparent', opacity: pressed ? 0.75 : 1, alignSelf: 'flex-start' })}>
              <AppText variant="caption" color={reviewBook === b ? colors.onPrimary : colors.text} style={{ fontWeight: '700' }}>{b === 'all' ? t('admin.filterAll') : t(bookLabelKey(b))}</AppText>
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: direction.row, gap: spacing.sm, marginTop: spacing.sm }}>
          {(['en', 'de', 'he'] as const).map((lang) => (
            <Pressable key={lang} accessibilityRole="button" accessibilityState={{ selected: reviewLang === lang }} onPress={() => setReviewLang(lang)} style={({ pressed }) => ({ flex: 1, paddingVertical: spacing.xs, borderRadius: radius.pill, borderWidth: 1, borderColor: reviewLang === lang ? colors.primary : colors.border, backgroundColor: reviewLang === lang ? colors.primary : 'transparent', alignItems: 'center', opacity: pressed ? 0.75 : 1 })}>
              <AppText variant="label" color={reviewLang === lang ? colors.onPrimary : colors.text} style={{ fontWeight: '700' }}>{lang === 'en' ? t('common.enShort') : lang === 'de' ? t('common.deShort') : t('common.heShort')}</AppText>
            </Pressable>
          ))}
        </View>
        {!review.isHebrew ? (
          <View style={{ flexDirection: direction.row, flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm }}>
            {filters.map((option) => (
              <Pressable key={option.value} onPress={() => setReviewFilter(option.value)} accessibilityRole="button" accessibilityState={{ selected: reviewFilter === option.value }} style={({ pressed }) => ({ paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: reviewFilter === option.value ? colors.primary : colors.border, backgroundColor: reviewFilter === option.value ? colors.primary : 'transparent', opacity: pressed ? 0.75 : 1, alignSelf: 'flex-start' })}>
                <AppText variant="caption" color={reviewFilter === option.value ? colors.onPrimary : colors.text} style={{ fontWeight: '700' }}>{t(option.labelKey)}</AppText>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
      <FlatList
        data={review.items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
        ListEmptyComponent={<AppText variant="caption" color={colors.textMuted} center style={{ marginTop: spacing.md }}>{t('admin.reviewEmpty')}</AppText>}
        renderItem={({ item }) => {
          const reviewed = !review.isHebrew && item.status === 'VERIFIED';
          return (
            <Pressable onPress={() => router.push({ pathname: '/admin-edit', params: { id: item.id, lang: reviewLang } })} accessibilityRole="button" android_ripple={{ color: colors.border }} style={({ pressed }) => ({ flexDirection: direction.row, alignItems: 'center', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, opacity: pressed ? 0.65 : 1 })}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: review.isHebrew ? colors.textMuted : reviewed ? colors.primary : colors.favorite }} />
              <View style={{ flex: 1, marginHorizontal: spacing.sm }}>
                <AppText variant="body" numberOfLines={1}>{item.number}. {item.title}</AppText>
                <AppText variant="caption" color={colors.textMuted}>{t(bookLabelKey(item.book))}</AppText>
              </View>
              <AppText variant="caption" color={review.isHebrew ? colors.textMuted : reviewed ? colors.primary : colors.favorite} style={{ fontWeight: '700' }}>
                {review.isHebrew ? '—' : t(STATUS_LABELS[item.status])}
              </AppText>
            </Pressable>
          );
        }}
      />
    </AdminScreenShell>
  );
}
