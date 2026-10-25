/**
 * الإدارة — admin area behind Firebase sign-in (legacy PIN when unconfigured).
 *
 * Edits land in the on-device override store (instant on this device) and
 * sync to Firestore: silently on every save plus explicitly via the Publish
 * button. "Export" shares the patch set as JSON for local backup.
 */
import { useMemo, useState, useEffect } from 'react';
import { Alert, FlatList, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppBar } from '../../components/AppBar';
import { AppText } from '../../components/AppText';
import { Card } from '../../components/Card';
import { getCorpus, getSummaries } from '../../data/loader';
import { normalizeText } from '../../data/normalize';
import { isFirebaseConfigured } from '../../data/firebase';
import { deleteHymnFromCloud, publishOverrides } from '../../data/publish';
import {
  fetchFeedbacks,
  updateFeedbackStatus,
  updateFeedbackNotes,
  deleteFeedback,
  type Feedback,
} from '../../data/feedback';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';
import { useOverrides } from '../../store/overrides';
import { useRemote } from '../../store/remote';
import { useSession } from '../../store/session';
import { useSettings } from '../../store/settings';
import type { Hymn } from '../../data/types';
import { radius, spacing } from '../../theme/tokens';

function toNumber(raw: string): number | null {
  const digits = normalizeText(raw.trim());
  if (!/^\d+$/.test(digits)) return null;
  const n = Number(digits);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

export default function AdminScreen() {
  const router = useRouter();
  const { t, direction } = useT();
  const { colors, fontFamily } = useTheme();

  const adminPin = useSettings((s) => s.adminPin);
  const setAdminPin = useSettings((s) => s.setAdminPin);
  const overrides = useOverrides((s) => s.overrides);
  const markDeleted = useOverrides((s) => s.markDeleted);
  const sessionUser = useSession((s) => s.user);
  const signIn = useSession((s) => s.signIn);
  const signOut = useSession((s) => s.signOut);

  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [reviewLang, setReviewLang] = useState<'en' | 'de'>('en');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'AI_DRAFT' | 'VERIFIED'>('AI_DRAFT');
  const remoteVersion = useRemote((s) => s.updatedAt);
  const [num, setNum] = useState('');
  const [feedbacks, setFeedbacks] = useState<(Feedback & { id: string })[]>([]);
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [feedbackNotesEdit, setFeedbackNotesEdit] = useState<Record<string, string>>({});
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [newPin, setNewPin] = useState('');
  const [msg, setMsg] = useState('');

  const fieldStyle = {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    color: colors.text,
    fontFamily,
    fontSize: 16,
    textAlign: direction.textAlign,
  } as const;

  const button = (label: string, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      android_ripple={{ color: colors.border }}
      style={({ pressed }) => ({
        marginTop: spacing.sm,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        backgroundColor: colors.primary,
        alignItems: 'center',
        opacity: pressed ? 0.75 : 1,
      })}>
      <AppText variant="label" color={colors.onPrimary} style={{ fontWeight: '700' }}>
        {label}
      </AppText>
    </Pressable>
  );

  const unlock = () => {
    if (pin === adminPin) {
      setUnlocked(true);
      setPinError(false);
      setPin('');
    } else {
      setPinError(true);
    }
  };

  const doDelete = () => {
    const n = toNumber(num);
    const target = n === null ? undefined : getSummaries().find((s) => s.number === n);
    if (!target) {
      setMsg(t('admin.notFound'));
      return;
    }
    Alert.alert(t('admin.deleteConfirmTitle'), `${target.number}. ${target.title}`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('admin.deleteHymn'),
        style: 'destructive',
        onPress: () => {
          markDeleted(target.id);
          void deleteHymnFromCloud(target.id);
          setNum('');
          setMsg(t('admin.deleted'));
        },
      },
    ]);
  };

  const changePin = () => {
    if (!/^\d{4}$/.test(newPin.trim())) {
      setMsg(t('admin.wrongPin'));
      return;
    }
    setAdminPin(newPin.trim());
    setNewPin('');
    setMsg(t('admin.pinSaved'));
  };

  const doPublish = async () => {
    if (publishing) return;
    setPublishing(true);
    setMsg(t('admin.publishing'));
    const result = await publishOverrides(overrides);
    setPublishing(false);
    setMsg(
      result.messageKey === 'admin.published'
        ? `${t(result.messageKey)} (${result.saved})`
        : t(result.messageKey),
    );
  };

  const doLogin = async () => {
    if (signingIn) return;
    setSigningIn(true);
    const ok = await signIn(email, password);
    setSigningIn(false);
    if (ok) {
      setEmail('');
      setPassword('');
      setMsg('');
    } else {
      setMsg(t('admin.authFailed'));
    }
  };

  const loadFeedback = async () => {
    setFeedbackLoading(true);
    const data = await fetchFeedbacks(feedbackFilter === 'all' ? undefined : feedbackFilter);
    setFeedbacks(data);
    setFeedbackLoading(false);
  };

  // Firebase configured: the signed-in admin edits. Otherwise the legacy
  // on-device PIN gate applies and everything stays local-only.
  const canEdit = isFirebaseConfigured ? !!sessionUser : unlocked;

  useEffect(() => {
    if (canEdit) {
      void loadFeedback();
    }
  }, [canEdit]);

  // Proofreading queue: hymns carrying the selected translation, filtered
  // by review status. A typed query turns the box above into global search
  // (number, title or any line, all languages) feeding this same list.
  // Recomputes on local edits, remote syncs and filter changes; absent
  // status counts as AI_DRAFT (legacy records).
  const review = useMemo(() => {
    const statusOf = (h: Hymn) => h.translationStatus ?? 'AI_DRAFT';
    const bookOf = (h: Hymn) => h.book ?? 'main';
    const q = normalizeText(query.trim());
    let pool = getCorpus();
    if (q.length > 0) {
      const byNumber = /^\d+$/.test(q);
      pool = pool.filter((h) => {
        if (byNumber && String(h.number).includes(q)) return true;
        if (normalizeText(h.title).includes(q)) return true;
        const lines = [
          ...h.verses.flatMap((v) => v.lines),
          ...(h.verses_en ?? []).flatMap((v) => v.lines),
          ...(h.verses_de ?? []).flatMap((v) => v.lines),
        ];
        return lines.some((line) => normalizeText(line).includes(q));
      });
    } else {
      pool = pool.filter((h) => (reviewLang === 'en' ? h.verses_en?.length : h.verses_de?.length));
    }
    const all = pool;
    const verified = all.filter((h) => statusOf(h) === 'VERIFIED').length;
    const items = (q.length > 0 || reviewFilter === 'all'
      ? all
      : all.filter((h) => statusOf(h) === reviewFilter)
    )
      .slice()
      .sort((a, b) => a.number - b.number)
      .map((h) => ({
        id: h.id,
        number: h.number,
        title: h.title,
        book: bookOf(h),
        status: statusOf(h),
      }));
    return { items, total: all.length, verified };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overrides, remoteVersion, reviewLang, reviewFilter, query]);

  const pendingCount = Object.keys(overrides ?? {}).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <AppBar title={t('admin.title')} showBack />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        {!canEdit ? (
          isFirebaseConfigured ? (
            <Card style={{ padding: spacing.md }}>
              <AppText variant="body" style={{ fontWeight: '700', marginBottom: spacing.sm }}>
                {t('admin.title')}
              </AppText>
              <TextInput
                value={email}
                onChangeText={setEmail}
                onSubmitEditing={() => {
                  void doLogin();
                }}
                returnKeyType="next"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={t('admin.email')}
                placeholderTextColor={colors.textMuted}
                style={[fieldStyle, { marginBottom: spacing.sm }]}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={() => {
                  void doLogin();
                }}
                returnKeyType="go"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={t('admin.password')}
                placeholderTextColor={colors.textMuted}
                style={fieldStyle}
              />
              {button(signingIn ? t('admin.publishing') : t('admin.signIn'), () => {
                void doLogin();
              })}
            </Card>
          ) : (
            <Card style={{ padding: spacing.md }}>
              <AppText variant="body" style={{ fontWeight: '700', marginBottom: spacing.sm }}>
                {t('admin.pinTitle')}
              </AppText>
              <TextInput
                value={pin}
                onChangeText={(v) => {
                  setPin(v);
                  setPinError(false);
                }}
                onSubmitEditing={unlock}
                returnKeyType="go"
                keyboardType="number-pad"
                secureTextEntry
                maxLength={8}
                placeholder={t('admin.pinPlaceholder')}
                placeholderTextColor={colors.textMuted}
                style={fieldStyle}
              />
              {pinError ? (
                <AppText variant="caption" color={colors.danger} style={{ marginTop: spacing.xs }}>
                  {t('admin.wrongPin')}
                </AppText>
              ) : null}
              {button(t('admin.unlock'), unlock)}
              <AppText variant="caption" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
                {t('admin.noCloud')}
              </AppText>
            </Card>
          )
        ) : (
          <>
            <Card style={{ marginBottom: spacing.md, padding: spacing.md }}>
              <AppText variant="body" style={{ fontWeight: '700', marginBottom: spacing.sm }}>
                {t('admin.editHymn')}
              </AppText>
              <TextInput
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
                placeholder={t('search.placeholder')}
                placeholderTextColor={colors.textMuted}
                style={fieldStyle}
              />
            </Card>

            <Card style={{ marginBottom: spacing.md, padding: spacing.md }}>
                <AppText variant="body" style={{ fontWeight: '700', marginBottom: spacing.sm }}>
                  {t('admin.addHymn')}
                </AppText>
                {button(t('admin.addHymn'), () => router.push('/(tabs)/admin-add'))}
            </Card>

            <Card style={{ marginBottom: spacing.md, padding: spacing.md }}>
              <AppText variant="body" style={{ fontWeight: '700' }}>
                {t('admin.reviewTitle')}
              </AppText>
              <AppText variant="caption" color={colors.textMuted} style={{ marginVertical: spacing.xs }}>
                {t('admin.verified')}: {review.verified} / {review.total}
              </AppText>
              <View style={{ flexDirection: direction.row, gap: spacing.sm, marginBottom: spacing.sm }}>
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
                {(
                  [
                    { value: 'all', label: t('admin.filterAll') },
                    { value: 'AI_DRAFT', label: t('admin.filterDrafts') },
                    { value: 'VERIFIED', label: t('admin.verified') },
                  ] as const
                ).map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => setReviewFilter(option.value)}
                    accessibilityRole="button"
                    style={({ pressed }) => ({
                      flex: 1,
                      paddingVertical: spacing.xs,
                      borderRadius: radius.pill,
                      borderWidth: 1,
                      borderColor: reviewFilter === option.value ? colors.primary : colors.border,
                      backgroundColor: reviewFilter === option.value ? colors.primary : 'transparent',
                      alignItems: 'center',
                      opacity: pressed ? 0.75 : 1,
                    })}>
                    <AppText
                      variant="label"
                      color={reviewFilter === option.value ? colors.onPrimary : colors.text}
                      style={{ fontWeight: '700' }}>
                      {option.label}
                    </AppText>
                  </Pressable>
                ))}
              </View>
              <FlatList
                data={review.items}
                keyExtractor={(item) => item.id}
                initialNumToRender={20}
                windowSize={11}
                maxToRenderPerBatch={20}
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: 320 }}
                ListEmptyComponent={
                  <AppText variant="caption" color={colors.textMuted} center>
                    {t('admin.reviewEmpty')}
                  </AppText>
                }
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => router.push({ pathname: '/admin-edit', params: { id: item.id } })}
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
                        backgroundColor:
                          item.status === 'VERIFIED' ? colors.primary : colors.favorite,
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
                  </Pressable>
                )}
              />
            </Card>

            <Card style={{ marginBottom: spacing.md, padding: spacing.md }}>
              <AppText variant="body" style={{ fontWeight: '700', marginBottom: spacing.sm }}>إدارة التقييمات</AppText>
              <Pressable onPress={() => void loadFeedback()} style={{ paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center' }}>
                <AppText variant="label" color={colors.onPrimary} style={{ fontWeight: '700' }}>تحديث القائمة</AppText>
              </Pressable>
              {feedbacks.length === 0 ? (
                <AppText variant="caption" color={colors.textMuted} style={{ marginTop: spacing.md }}>لا توجد تقييمات</AppText>
              ) : (
                feedbacks.map((fb) => (
                  <View key={fb.id} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: spacing.md }}>
                    <AppText variant="label" style={{ fontWeight: '700' }}>{fb.rating}/5 — {fb.category}</AppText>
                    <AppText variant="body">{fb.comment || '—'}</AppText>
                  </View>
                ))
              )}
            </Card>

            <Card style={{ marginBottom: spacing.md, padding: spacing.md }}>
              <AppText variant="body" style={{ fontWeight: '700', marginBottom: spacing.sm }}>
                {t('admin.deleteHymn')}
              </AppText>
              <TextInput
                value={num}
                onChangeText={setNum}
                onSubmitEditing={doDelete}
                returnKeyType="go"
                keyboardType="number-pad"
                placeholder={t('admin.pickNumber')}
                placeholderTextColor={colors.textMuted}
                style={fieldStyle}
              />
              {button(t('admin.deleteHymn'), doDelete)}
            </Card>

            <Card style={{ marginBottom: spacing.md, padding: spacing.md }}>
              <AppText variant="body" style={{ fontWeight: '700', marginBottom: spacing.sm }}>
                {t('admin.newPin')}
              </AppText>
              <TextInput
                value={newPin}
                onChangeText={setNewPin}
                onSubmitEditing={changePin}
                returnKeyType="done"
                keyboardType="number-pad"
                secureTextEntry
                maxLength={8}
                placeholder={t('admin.pinPlaceholder')}
                placeholderTextColor={colors.textMuted}
                style={fieldStyle}
              />
              {button(t('admin.save'), changePin)}
            </Card>

            <Card style={{ marginBottom: spacing.md, padding: spacing.md }}>
              <AppText variant="body" style={{ fontWeight: '700', marginBottom: spacing.sm }}>
                {t('admin.publishTitle')} ({pendingCount})
              </AppText>
              {isFirebaseConfigured && sessionUser ? (
                <AppText variant="caption" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>
                  {t('admin.signedInAs')} {sessionUser.email}
                </AppText>
              ) : null}
              {pendingCount > 0
                ? button(publishing ? t('admin.publishing') : t('admin.publishNow'), () => {
                    void doPublish();
                  })
                : null}
              {isFirebaseConfigured && sessionUser
                ? button(t('admin.signOut'), () => {
                    void signOut();
                  })
                : null}
            </Card>

            {msg ? (
              <AppText variant="body" center color={colors.primary} style={{ fontWeight: '700' }}>
                {msg}
              </AppText>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}
