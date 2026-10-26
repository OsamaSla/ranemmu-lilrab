/**
 * إدارة التقييمات — app ratings triage on its own screen.
 *
 * Split out of the Admin screen: this list only grows, and each row carries
 * status pills plus a notes field, so it dominated a page that is otherwise a
 * short list of settings.
 *
 * The whole collection is read once and filtered on the client on purpose —
 * see data/feedback.ts: `where('status') + orderBy('createdAt')` needs a
 * composite index, and a missing index fails the list instead of degrading.
 */
import { useEffect, useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppBar } from '../../components/AppBar';
import { AppText } from '../../components/AppText';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { TextButton } from '../../components/TextButton';
import {
  deleteFeedback,
  fetchFeedbacks,
  updateFeedbackNotes,
  updateFeedbackStatus,
  type Feedback,
  type FeedbackStatus,
} from '../../data/feedback';
import { useCanEdit } from '../../hooks/useCanEdit';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';
import { radius, spacing } from '../../theme/tokens';

const FEEDBACK_FILTERS: { value: FeedbackStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'الكل' },
  { value: 'pending', label: 'جديدة' },
  { value: 'in_progress', label: 'قيد المعالجة' },
  { value: 'completed', label: 'مكتملة' },
];

const FEEDBACK_STATUS_LABEL: Record<FeedbackStatus, string> = {
  pending: 'جديدة',
  in_progress: 'قيد المعالجة',
  completed: 'مكتملة',
};

const FEEDBACK_CATEGORY_LABEL: Record<string, string> = {
  missing_hymn: 'اقتراح ترنيمة',
  translation: 'الترجمة',
  bug: 'مشكلة تقنية',
  other: 'أخرى',
};

/** Firestore Timestamp → localized date/time, or '' when not stamped yet. */
function formatFeedbackDate(value: unknown): string {
  const toMillis = (value as { toMillis?: () => number } | null | undefined)?.toMillis;
  const millis = typeof toMillis === 'function' ? toMillis.call(value) : 0;
  if (!millis) return '';
  const date = new Date(millis);
  return `${date.toLocaleDateString('ar-EG')} ${date.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export default function AdminFeedbackScreen() {
  const router = useRouter();
  const { t, direction } = useT();
  const { colors, fontFamily } = useTheme();
  // URL-reachable, so the route itself is gated — same reasoning as admin-edit.
  const canEdit = useCanEdit();

  const [items, setItems] = useState<(Feedback & { id: string })[]>([]);
  const [filter, setFilter] = useState<FeedbackStatus | 'all'>('all');
  const [notesEdit, setNotesEdit] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [reload, setReload] = useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  const smallButton = (
    label: string,
    onPress: () => void,
    tone: 'primary' | 'danger' | 'muted' = 'muted',
  ) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flex: 1,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor:
          tone === 'primary' ? colors.primary : tone === 'danger' ? colors.danger : colors.border,
        backgroundColor: tone === 'primary' ? colors.primary : colors.surfaceMuted,
        alignItems: 'center',
        opacity: pressed ? 0.75 : 1,
      })}>
      <AppText
        variant="caption"
        color={tone === 'primary' ? colors.onPrimary : tone === 'danger' ? colors.danger : colors.text}
        style={{ fontWeight: '700' }}>
        {label}
      </AppText>
    </Pressable>
  );

  // Reads happen inside the async body on purpose: setting state before the
  // first await would render synchronously from the effect (React Compiler).
  // The token lets the refresh button and the chips re-run this same load.
  useEffect(() => {
    if (!canEdit) return;
    let cancelled = false;
    void (async () => {
      const result = await fetchFeedbacks(filter);
      if (cancelled) return;
      if (result.ok) {
        setItems(result.items);
      } else {
        setItems([]);
        setMsg(
          result.error === 'unconfigured'
            ? t('admin.noCloud')
            : result.error === 'permission'
              ? 'تعذّر قراءة التقييمات — سجّل الدخول بحساب الإدارة'
              : result.error === 'offline'
                ? 'تعذّر الاتصال بالخادم — تحقق من الإنترنت'
                : 'تعذّر تحميل التقييمات',
        );
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [canEdit, filter, reload, t]);

  const refresh = () => {
    setLoading(true);
    setMsg('');
    setReload((n) => n + 1);
  };

  const changeStatus = async (id: string, status: FeedbackStatus) => {
    const ok = await updateFeedbackStatus(id, status);
    if (!ok) {
      setMsg('تعذّر تحديث حالة التقييم');
      return;
    }
    setItems((prev) => prev.map((fb) => (fb.id === id ? { ...fb, status } : fb)));
    // A status change may move the item out of the active filter.
    if (filter !== 'all' && filter !== status) {
      setItems((prev) => prev.filter((fb) => fb.id !== id));
    }
    setMsg('تم تحديث الحالة');
  };

  const saveNotes = async (id: string) => {
    const notes = notesEdit[id] ?? '';
    const ok = await updateFeedbackNotes(id, notes);
    if (!ok) {
      setMsg('تعذّر حفظ الملاحظات');
      return;
    }
    setItems((prev) => prev.map((fb) => (fb.id === id ? { ...fb, adminNotes: notes } : fb)));
    setMsg('تم حفظ الملاحظات');
  };

  const remove = async (id: string) => {
    setConfirmDeleteId(null);
    const ok = await deleteFeedback(id);
    if (!ok) {
      setMsg('تعذّر حذف التقييم');
      return;
    }
    setItems((prev) => prev.filter((fb) => fb.id !== id));
    setNotesEdit((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setMsg('تم حذف التقييم');
  };

  if (!canEdit) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        <AppBar title={t('admin.feedbackTitle')} showBack />
        <EmptyState icon="lock-outline" title={t('admin.lockedTitle')} hint={t('admin.lockedHint')} />
        <View style={{ flexDirection: direction.row, justifyContent: 'center' }}>
          <TextButton label={t('admin.backToAdmin')} onPress={() => router.push('/admin')} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <AppBar title={t('admin.feedbackTitle')} showBack />
      <FlatList
        data={items}
        keyExtractor={(fb) => fb.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
        ListHeaderComponent={
          <View>
            <View
              style={{
                flexDirection: direction.row,
                flexWrap: 'wrap',
                gap: spacing.xs,
                marginBottom: spacing.sm,
              }}>
              {FEEDBACK_FILTERS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    if (option.value === filter) return;
                    setLoading(true);
                    setMsg('');
                    setFilter(option.value);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: filter === option.value }}
                  style={({ pressed }) => ({
                    paddingVertical: spacing.xs,
                    paddingHorizontal: spacing.md,
                    borderRadius: radius.pill,
                    borderWidth: 1,
                    borderColor: filter === option.value ? colors.primary : colors.border,
                    backgroundColor: filter === option.value ? colors.primary : 'transparent',
                    opacity: pressed ? 0.75 : 1,
                  })}>
                  <AppText
                    variant="caption"
                    color={filter === option.value ? colors.onPrimary : colors.text}
                    style={{ fontWeight: '700' }}>
                    {option.label}
                  </AppText>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={refresh}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="تحديث القائمة"
              style={({ pressed }) => ({
                paddingVertical: spacing.sm,
                borderRadius: radius.pill,
                backgroundColor: colors.primary,
                alignItems: 'center',
                opacity: loading ? 0.5 : pressed ? 0.75 : 1,
              })}>
              <AppText variant="label" color={colors.onPrimary} style={{ fontWeight: '700' }}>
                {loading ? 'جارٍ التحميل...' : 'تحديث القائمة'}
              </AppText>
            </Pressable>

            {msg ? (
              <AppText
                variant="caption"
                color={msg.startsWith('تم') ? colors.primary : colors.danger}
                style={{ marginTop: spacing.sm, fontWeight: '700' }}>
                {msg}
              </AppText>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading || msg ? null : (
            <AppText variant="caption" color={colors.textMuted} center style={{ marginTop: spacing.md }}>
              لا توجد تقييمات
            </AppText>
          )
        }
        renderItem={({ item: fb }) => {
          const stars = '★'.repeat(Math.max(0, Math.min(5, Math.round(fb.rating))));
          const createdAt = formatFeedbackDate(fb.createdAt);
          return (
            <Card style={{ marginTop: spacing.md, padding: spacing.md }}>
              <View
                style={{
                  flexDirection: direction.row,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: spacing.sm,
                }}>
                <View
                  style={{
                    flexDirection: direction.row,
                    alignItems: 'center',
                    gap: spacing.xs,
                    flexShrink: 1,
                  }}>
                  <AppText variant="label" color={colors.primary} style={{ fontWeight: '700' }}>
                    {stars}
                  </AppText>
                  <AppText variant="label" style={{ fontWeight: '700', flexShrink: 1 }} numberOfLines={2}>
                    {FEEDBACK_CATEGORY_LABEL[fb.category] ?? fb.category}
                  </AppText>
                </View>
                <AppText variant="caption" color={colors.textMuted} style={{ fontWeight: '700' }}>
                  {FEEDBACK_STATUS_LABEL[fb.status] ?? fb.status}
                </AppText>
              </View>

              <AppText variant="body" style={{ marginTop: spacing.xs }}>
                {fb.comment?.trim() ? fb.comment : 'بدون تعليق'}
              </AppText>

              {createdAt ? (
                <AppText variant="caption" color={colors.textMuted} style={{ marginTop: spacing.xs }}>
                  {createdAt}
                </AppText>
              ) : null}

              <View style={{ flexDirection: direction.row, gap: spacing.xs, marginTop: spacing.sm }}>
                {(Object.keys(FEEDBACK_STATUS_LABEL) as FeedbackStatus[]).map((status) => (
                  <Pressable
                    key={status}
                    onPress={() => {
                      void changeStatus(fb.id, status);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: fb.status === status }}
                    style={({ pressed }) => ({
                      flex: 1,
                      paddingVertical: spacing.xs,
                      borderRadius: radius.pill,
                      borderWidth: 1,
                      borderColor: fb.status === status ? colors.primary : colors.border,
                      backgroundColor: fb.status === status ? colors.primary : 'transparent',
                      alignItems: 'center',
                      opacity: pressed ? 0.75 : 1,
                    })}>
                    <AppText
                      variant="caption"
                      color={fb.status === status ? colors.onPrimary : colors.text}
                      style={{ fontWeight: '700' }}>
                      {FEEDBACK_STATUS_LABEL[status]}
                    </AppText>
                  </Pressable>
                ))}
              </View>

              <TextInput
                value={notesEdit[fb.id] ?? fb.adminNotes ?? ''}
                onChangeText={(value) => setNotesEdit((prev) => ({ ...prev, [fb.id]: value }))}
                placeholder="ملاحظات الإدارة"
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={1000}
                style={[
                  fieldStyle,
                  { minHeight: 44, marginTop: spacing.sm, paddingTop: spacing.sm, fontSize: 14 },
                ]}
              />

              <View style={{ flexDirection: direction.row, gap: spacing.sm, marginTop: spacing.sm }}>
                {confirmDeleteId === fb.id ? (
                  <>
                    {smallButton(
                      'تأكيد الحذف',
                      () => {
                        void remove(fb.id);
                      },
                      'danger',
                    )}
                    {smallButton('إلغاء', () => setConfirmDeleteId(null))}
                  </>
                ) : (
                  <>
                    {smallButton(
                      'حفظ الملاحظات',
                      () => {
                        void saveNotes(fb.id);
                      },
                      'primary',
                    )}
                    {smallButton('حذف', () => setConfirmDeleteId(fb.id), 'danger')}
                  </>
                )}
              </View>
            </Card>
          );
        }}
      />
    </View>
  );
}
