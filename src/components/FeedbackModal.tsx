/**
 * Client-side feedback modal for 'تقييم التطبيق'.
 */
import { useState } from 'react';
import { Modal, Pressable, ScrollView, TextInput, View, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AppBar } from './AppBar';
import { AppText } from './AppText';
import { Card } from './Card';
import { submitFeedback } from '../data/feedback';
import { useT } from '../hooks/useT';
import { useTheme } from '../hooks/useTheme';
import { radius, spacing } from '../theme/tokens';

const CATEGORIES = [
  { value: 'missing_hymn', label: 'اقتراح ترنيمة جديدة' },
  { value: 'translation', label: 'ملاحظة حول الترجمة' },
  { value: 'bug', label: 'مشكلة تقنية' },
  { value: 'other', label: 'أخرى' },
];

export function FeedbackModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useT();
  const { colors } = useTheme();
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState('other');
  const [comment, setComment] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    if (rating < 1) {
      Alert.alert('تنبيه', 'يرجى اختيار تقييم (نجمة واحدة على الأقل)');
      return;
    }
    setSubmitting(true);
    const ok = await submitFeedback({ rating, category, comment: comment.trim() || '' });
    setSubmitting(false);
    if (ok) {
      setSubmitted(true);
      setRating(0);
      setCategory('other');
      setComment('');
      Alert.alert('تم الإرسال', 'شكراً لتقييمك، تم إرسال الملاحظات');
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 1200);
    } else {
      Alert.alert('خطأ', 'لم يتم الإرسال، يرجى المحاولة لاحقاً');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(10,26,20,0.55)' }}>
        <View style={{ flex: 1, marginTop: 48, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, backgroundColor: colors.canvas, overflow: 'hidden' }}>
          <AppBar title={t('more.rateApp')} showBack={false} action={
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={24} color={colors.onPrimary} />
            </Pressable>
          } />

          <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
            <Card style={{ padding: spacing.md }}>
              <AppText variant="body" style={{ fontWeight: '700', marginBottom: spacing.md }}>
                {t('more.rateApp')}
              </AppText>

              {/* Star rating */}
              <AppText variant="label" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>
                التقييم
              </AppText>
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setRating(s)}
                    accessibilityRole="button"
                    accessibilityLabel={`${s} stars`}
                    style={{ padding: 4 }}>
                    <MaterialCommunityIcons
                      name={rating >= s ? 'star' : 'star-outline'}
                      size={32}
                      color={rating >= s ? '#C8A84D' : colors.textMuted}
                    />
                  </Pressable>
                ))}
              </View>

              {/* Category dropdown */}
              <AppText variant="label" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>
                الفئة
              </AppText>
              <Pressable
                onPress={() => setDropdownOpen(!dropdownOpen)}
                accessibilityRole="button"
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                  backgroundColor: colors.surfaceMuted,
                  marginBottom: dropdownOpen ? spacing.sm : spacing.md,
                }}>
                <AppText variant="body">{CATEGORIES.find((c) => c.value === category)?.label}</AppText>
              </Pressable>
              {dropdownOpen ? (
                <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden', marginBottom: spacing.md }}>
                  {CATEGORIES.map((c) => (
                    <Pressable
                      key={c.value}
                      onPress={() => {
                        setCategory(c.value);
                        setDropdownOpen(false);
                      }}
                      style={({ pressed }) => ({
                        paddingVertical: spacing.sm,
                        paddingHorizontal: spacing.md,
                        backgroundColor: pressed ? colors.surfaceMuted : 'transparent',
                        borderBottomWidth: c.value === CATEGORIES[CATEGORIES.length - 1].value ? 0 : 1,
                        borderBottomColor: colors.border,
                      })}>
                      <AppText variant="body">{c.label}</AppText>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {/* Comment */}
              <AppText variant="label" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>
                التعليق (اختياري)
              </AppText>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="اكتب ملاحظتك..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                maxLength={500}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  backgroundColor: colors.surfaceMuted,
                  padding: spacing.md,
                  minHeight: 96,
                  textAlignVertical: 'top',
                  color: colors.text,
                  fontSize: 15,
                  marginBottom: spacing.md,
                }}
              />

              {/* Submit */}
              <Pressable
                onPress={submit}
                disabled={rating < 1 || submitting || submitted}
                accessibilityRole="button"
                style={({ pressed }) => ({
                  paddingVertical: spacing.md,
                  borderRadius: radius.pill,
                  backgroundColor: submitted ? colors.accent : colors.primary,
                  alignItems: 'center',
                  opacity: rating < 1 || submitting ? 0.5 : pressed ? 0.75 : 1,
                })}>
                <AppText variant="label" color={colors.onPrimary} style={{ fontWeight: '700' }}>
                  {submitted ? 'تم الإرسال' : submitting ? 'جارٍ الإرسال...' : 'إرسال التقييم'}
                </AppText>
              </Pressable>
            </Card>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
