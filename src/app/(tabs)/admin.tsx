/**
 * الإدارة ← المراجعة — the translation proofreading worklist.
 *
 * This is not navigation: the library already finds hymns by number, title and
 * lyric line, and every hymn page has its own edit button. What exists only here
 * is the *inventory* — which translations are still unreviewed, and how far the
 * proofreading has got (`verified / total`).
 *
 * The status lives on the hymn record (`translationStatus`, absent = AI_DRAFT);
 * `admin-edit` is the only screen that writes it, and this list is the only one
 * that reads it as a work queue.
 */
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
import { useOverrides } from '../../store/overrides';
import { useRemote } from '../../store/remote';
import { radius, spacing } from '../../theme/tokens';
import type { TranslationKey } from '../../i18n';

const STATUS_LABELS = {
  AI_DRAFT: 'admin.statusDraft',
  VERIFIED: 'admin.verified',
} as const;

export default function AdminReviewScreen() {
  const router = useRouter();
  const { t, direction } = useT();
  const { colors } = useTheme();
  const canEdit = useCanEdit();

  const overrides = useOverrides((s) => s.overrides);
  const remoteVersion = useRemote((s) => s.updatedAt);

  const [reviewLang, setReviewLang] = useState<'en' | 'de'>('en');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'AI_DRAFT' | 'VERIFIED'>('AI_DRAFT');
  const [reviewBook, setReviewBook] = useState<'all' | 'main' | 'taranim'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [chunksVersion, setChunksVersion] = useState(0);

  // The queue needs every hymn body, which lives in lazily imported chunks.
  // Load them once the admin unlocks the area.
  useEffect(() => {
    if (!canEdit) return;
    let active = true;
    ensureAllChunks()
      .then(() => {
        if (active) setChunksVersion((n) => n + 1);
      })
      .catch(() => {
        /* The queue simply lists the chunks that did load. */
      });
    return () => {
      active = false;
    };
  }, [canEdit]);

  // Recomputes on local edits, remote syncs and filter changes; absent status
  // counts as AI_DRAFT (legacy records).
  const review = useMemo(() => {
    const statusOf = (h: Hymn) => h.translationStatus ?? 'AI_DRAFT';
    const bookOf = (h: Hymn) => h.book ?? 'main';
    const q = searchQuery.trim().toLowerCase();
    const all = getCorpus().filter((h) => {
      if (reviewLang === 'en' ? !h.verses_en?.length : !h.verses_de?.length) return false;
      if (reviewBook !== 'all' && bookOf(h) !== reviewBook) return false;
      if (!q) return true;
      const text = `${h.number} ${h.title}`.toLowerCase();
      return text.includes(q);
    });
    const verified = all.filter((h) => statusOf(h) === 'VERIFIED').length;
    const items = (reviewFilter === 'all' ? all : all.filter((h) => statusOf(h) === reviewFilter))
      .slice()
      .sort((a, b) => a.number - b.number)
      .map((h) => ({
        id: h.id,
        number: h.number,
        title: h.title,
        book: bookOf(h),
        status: statusOf(h) as keyof typeof STATUS_LABELS,
      }));
    return { items, total: all.length, verified };
    // `overrides` and `remoteVersion` are deliberate re-run triggers, not inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overrides, remoteVersion, reviewLang, reviewFilter, chunksVersion]);

  const filters: { value: typeof reviewFilter; labelKey: TranslationKey }[] = [
    { value: 'all', labelKey: 'admin.filterAll' },
    { value: 'AI_DRAFT', labelKey: 'admin.filterDrafts' },
    { value: 'VERIFIED', labelKey: 'admin.filterReviewed' },
  ];

  return (
    <AdminScreenShell active="review">
      <FlatList
        data={review.items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.md }}>
            <AppText variant="body" style={{ fontWeight: '700', marginBottom: spacing.xs }}>
              {t('admin.reviewTitle')}
            </AppText>
            <AppText variant="caption" color={colors.textMuted}>
              {t('admin.verified')}: {review.verified} / {review.total}
            </AppText>

            <View style={{ marginTop: spacing.sm }}>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="بحث..."
                placeholderTextColor={colors.textMuted}
                style={[{
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceMuted,
                  color: colors.text,
                  fontSize: 14,
                  minHeight: 44,
                }]}
              />
            </View>

            <View style={{ flexDirection: direction.row, gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' }}>
              {(['all', 'main', 'taranim'] as const).map((b) => (
                <Pressable
                  key={b}
                  onPress={() => setReviewBook(b)}
                  style={({ pressed }) => ({
                    paddingVertical: spacing.xs,
                    paddingHorizontal: spacing.md,
                    borderRadius: radius.pill,
                    borderWidth: 1,
                    borderColor: reviewBook === b ? colors.primary : colors.border,
                    backgroundColor: reviewBook === b ? colors.primary : 'transparent',
                    opacity: pressed ? 0.75 : 1,
                  })}>
                  <AppText variant="caption" color={reviewBook === b ? colors.onPrimary : colors.text} style={{ fontWeight: '700' }}>
                    {b === 'all' ? t('admin.filterAll') : b === 'main' ? t('book.main') : t('book.taranim')}
                  </AppText>
                </Pressable>
              ))}
            </View>

            <View
              style={{
                flexDirection: direction.row,
                gap: spacing.sm,
                marginTop: spacing.sm,
              }}>
              {(['en', 'de'] as const).map((lang) => (
                <Pressable
                  key={lang}
                  onPress={() => setReviewLang(lang)}
                  accessibilityRole="button"
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: spacing.xs,
                    borderRadius: radius.pill,
                    borderWidth: 1,
                    borderColor: reviewLang === lang ? colors.primary : colors.border,
                    backgroundColor: reviewLang === lang ? colors.primary : 'transparent',
                    alignItems: 'center',
                    opacity: pressed ? 0.75 : 1,
                  })}>
                  <AppText
                    variant="label"
                    color={reviewLang === lang ? colors.onPrimary : colors.text}
                    style={{ fontWeight: '700' }}>
                    {lang === 'en' ? t('common.enShort') : t('common.deShort')}
                  </AppText>
                </Pressable>
              ))}
            </View>

            <View
              style={{
                flexDirection: direction.row,
                flexWrap: 'wrap',
                gap: spacing.xs,
                marginTop: spacing.sm,
              }}>
              {filters.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => setReviewFilter(option.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: reviewFilter === option.value }}
                  style={({ pressed }) => ({
                    paddingVertical: spacing.xs,
                    paddingHorizontal: spacing.md,
                    borderRadius: radius.pill,
                    borderWidth: 1,
                    borderColor: reviewFilter === option.value ? colors.primary : colors.border,
                    backgroundColor: reviewFilter === option.value ? colors.primary : 'transparent',
                    opacity: pressed ? 0.75 : 1,
                  })}>
                  <AppText
                    variant="caption"
                    color={reviewFilter === option.value ? colors.onPrimary : colors.text}
                    style={{ fontWeight: '700' }}>
                    {t(option.labelKey)}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <AppText variant="caption" color={colors.textMuted} center style={{ marginTop: spacing.md }}>
            {t('admin.reviewEmpty')}
          </AppText>
        }
        renderItem={({ item }) => {
          const reviewed = item.status === 'VERIFIED';
          return (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/admin-edit',
                  params: { id: item.id, lang: reviewLang },
                })
              }
              accessibilityRole="button"
              android_ripple={{ color: colors.border }}
              style={({ pressed }) => ({
                flexDirection: direction.row,
                alignItems: 'center',
                paddingVertical: spacing.sm,
                borderTopWidth: 1,
                borderTopColor: colors.border,
                opacity: pressed ? 0.65 : 1,
              })}>
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: reviewed ? colors.primary : colors.favorite,
                }}
              />
              <View style={{ flex: 1, marginHorizontal: spacing.sm }}>
                <AppText variant="body" numberOfLines={1}>
                  {item.number}. {item.title}
                </AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  {item.book === 'taranim' ? t('book.taranim') : t('book.main')}
                </AppText>
              </View>
              {/* Text, not just the dot: the list should explain itself. */}
              <AppText
                variant="caption"
                color={reviewed ? colors.primary : colors.favorite}
                style={{ fontWeight: '700' }}>
                {t(STATUS_LABELS[item.status])}
              </AppText>
            </Pressable>
          );
        }}
      />
    </AdminScreenShell>
  );
}
