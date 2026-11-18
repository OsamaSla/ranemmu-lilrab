/**
 * Client-side feedback sheet — an anonymous rating or a direct message.
 *
 * Feedback is shown inline rather than through `Alert.alert`: on the web
 * build (GitHub Pages) `Alert.alert` is a silent no-op, so a rejected write
 * looked like a dead button. The inline banner also names the actual failure
 * (offline, permission denied, unconfigured).
 *
 * The rating path never asks for a return address. The message path does, so
 * the admin can press Reply and reach the sender; the address is stored as
 * `replyEmail` and sent as Web3Forms' `replyto` field on the notification
 * (see docs/FEEDBACK_NOTIFICATIONS.md).
 */
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AppBar } from './AppBar';
import { AppText } from './AppText';
import { Card } from './Card';
import type { FeedbackError } from '../data/feedback';
import type { TranslationKey } from '../i18n';
import { useT } from '../hooks/useT';
import { useTheme } from '../hooks/useTheme';
import { radius, spacing } from '../theme/tokens';

const CATEGORIES: { value: string; labelKey: TranslationKey }[] = [
  { value: 'missing_hymn', labelKey: 'more.feedbackCatMissing' },
  { value: 'translation', labelKey: 'more.feedbackCatTranslation' },
  { value: 'bug', labelKey: 'more.feedbackCatBug' },
  { value: 'other', labelKey: 'more.feedbackCatOther' },
];

const ERROR_KEYS: Record<FeedbackError, TranslationKey> = {
  unconfigured: 'more.feedbackErrorUnconfigured',
  permission: 'more.feedbackErrorPermission',
  offline: 'more.feedbackErrorOffline',
  unknown: 'more.feedbackError',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Mode = 'rating' | 'message';
type Phase = 'idle' | 'sending' | 'success' | 'error';

export function FeedbackModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t, direction } = useT();
  const { colors } = useTheme();
  const [mode, setMode] = useState<Mode>('rating');
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState('other');
  const [comment, setComment] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<FeedbackError>('unknown');
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  // The form is cleared from the close handler (not a visible-effect) so an
  // opening never starts mid-render state updates and never loses a tap that
  // lands during the slide-in animation.
  const resetForm = () => {
    setMode('rating');
    setRating(0);
    setCategory('other');
    setComment('');
    setEmail('');
    setEmailError(false);
    setDropdownOpen(false);
    setPhase('idle');
    setError('unknown');
  };

  const close = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    resetForm();
    onClose();
  };

  const canSubmit = () =>
    mode === 'rating'
      ? rating >= 1
      : EMAIL_RE.test(email.trim()) && comment.trim().length > 0;

  const submit = async () => {
    if (phase === 'sending' || phase === 'success') return;
    if (!canSubmit()) {
      if (mode === 'message') setEmailError(!EMAIL_RE.test(email.trim()));
      return;
    }
    if (mode === 'message') setEmailError(false);
    setPhase('sending');
    let result: Awaited<ReturnType<typeof import('../data/feedback').submitFeedback>>;
    try {
      const { submitFeedback } = await import('../data/feedback');
      result = await submitFeedback({
        rating,
        category,
        comment: comment.trim(),
        kind: mode,
        replyEmail: mode === 'message' ? email.trim() : undefined,
      });
    } catch {
      // getFirebaseDb() itself can throw on a broken Firebase config.
      setError('unknown');
      setPhase('error');
      return;
    }
    if (!result.ok) {
      setError(result.error);
      setPhase('error');
      return;
    }
    setPhase('success');
    setRating(0);
    setCategory('other');
    setComment('');
    setEmail('');
    closeTimer.current = setTimeout(close, 1600);
  };

  const busy = phase === 'sending';
  const done = phase === 'success';
  const selectedCategory = CATEGORIES.find((c) => c.value === category) ?? CATEGORIES[CATEGORIES.length - 1];
  const inputStyle = {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    color: colors.text,
    fontSize: 15,
    textAlign: direction.textAlign,
  } as const;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: 'rgba(10,26,20,0.55)' }}>
        <View style={{ flex: 1, marginTop: 48, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, backgroundColor: colors.canvas, overflow: 'hidden' }}>
          <AppBar title={t('more.rateApp')} showBack={false} action={
            <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={24} color={colors.onPrimary} />
            </Pressable>
          } />

          <ScrollView
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
            keyboardShouldPersistTaps="handled">
            <Card style={{ padding: spacing.md }}>
              {/* Mode switch — rating stays anonymous, message carries email. */}
              <View style={{ flexDirection: direction.row, gap: spacing.xs, marginBottom: spacing.md }}>
                {(['rating', 'message'] as Mode[]).map((value) => {
                  const selected = mode === value;
                  return (
                    <Pressable
                      key={value}
                      onPress={() => {
                        setMode(value);
                        setEmailError(false);
                        if (phase === 'error') setPhase('idle');
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={({ pressed }) => ({
                        flex: 1,
                        paddingVertical: spacing.sm,
                        borderRadius: radius.pill,
                        borderWidth: 1,
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected ? colors.primary : 'transparent',
                        alignItems: 'center',
                        opacity: pressed ? 0.75 : 1,
                      })}>
                      <AppText
                        variant="label"
                        color={selected ? colors.onPrimary : colors.text}
                        style={{ fontWeight: '700' }}>
                        {t(value === 'rating' ? 'more.feedbackModeRating' : 'more.feedbackModeMessage')}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>

              {mode === 'rating' ? (
                <>
                  {/* Star rating */}
                  <AppText variant="label" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>
                    {t('more.feedbackRating')}
                  </AppText>
                  <View style={{ flexDirection: direction.row, gap: spacing.sm, marginBottom: spacing.xs }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Pressable
                        key={s}
                        onPress={() => {
                          setRating(s);
                          if (phase === 'error') setPhase('idle');
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`${s} / 5`}
                        hitSlop={4}
                        style={{ padding: 4 }}>
                        <MaterialCommunityIcons
                          name={rating >= s ? 'star' : 'star-outline'}
                          size={32}
                          color={rating >= s ? colors.primary : colors.textMuted}
                        />
                      </Pressable>
                    ))}
                  </View>
                  {rating < 1 ? (
                    <AppText variant="caption" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>
                      {t('more.feedbackPickRating')}
                    </AppText>
                  ) : (
                    <View style={{ height: spacing.sm + 6 }} />
                  )}

                  {/* Category dropdown */}
                  <AppText variant="label" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>
                    {t('more.feedbackCategory')}
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
                    <AppText variant="body">{t(selectedCategory.labelKey)}</AppText>
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
                          accessibilityRole="button"
                          style={({ pressed }) => ({
                            paddingVertical: spacing.sm,
                            paddingHorizontal: spacing.md,
                            backgroundColor: pressed || c.value === category ? colors.surfaceMuted : 'transparent',
                            borderBottomWidth: c.value === CATEGORIES[CATEGORIES.length - 1].value ? 0 : 1,
                            borderBottomColor: colors.border,
                          })}>
                          <AppText variant="body">{t(c.labelKey)}</AppText>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}

                  <AppText variant="label" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>
                    {t('more.feedbackCommentOptional')}
                  </AppText>
                  <TextInput
                    value={comment}
                    onChangeText={setComment}
                    placeholder={t('more.feedbackCommentPlaceholder')}
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={4}
                    maxLength={500}
                    editable={!busy && !done}
                    style={{ ...inputStyle, minHeight: 96, textAlignVertical: 'top', marginBottom: spacing.md }}
                  />
                </>
              ) : (
                <>
                  <AppText variant="body" style={{ fontWeight: '700', marginBottom: spacing.md }}>
                    {t('more.feedbackMessageHint')}
                  </AppText>

                  <AppText variant="label" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>
                    {t('more.feedbackEmail')}
                  </AppText>
                  <TextInput
                    value={email}
                    onChangeText={(value) => {
                      setEmail(value);
                      setEmailError(false);
                      if (phase === 'error') setPhase('idle');
                    }}
                    placeholder="name@example.com"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!busy && !done}
                    style={{ ...inputStyle, minHeight: 48, marginBottom: spacing.xs, textAlign: 'left' }}
                  />
                  <AppText
                    variant="caption"
                    color={emailError ? colors.danger : colors.textMuted}
                    style={{ marginBottom: spacing.md }}>
                    {t(emailError ? 'more.feedbackEmailInvalid' : 'more.feedbackEmailHint')}
                  </AppText>

                  <AppText variant="label" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>
                    {t('more.feedbackMessageBody')}
                  </AppText>
                  <TextInput
                    value={comment}
                    onChangeText={setComment}
                    placeholder={t('more.feedbackMessagePlaceholder')}
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={5}
                    maxLength={1000}
                    editable={!busy && !done}
                    style={{ ...inputStyle, minHeight: 120, textAlignVertical: 'top', marginBottom: spacing.md }}
                  />
                </>
              )}

              {/* Inline result — the only feedback that shows on web too. */}
              {phase === 'success' ? (
                <View
                  accessibilityRole="alert"
                  style={{
                    flexDirection: direction.row,
                    alignItems: 'center',
                    gap: spacing.sm,
                    backgroundColor: colors.surfaceMuted,
                    borderWidth: 1,
                    borderColor: colors.primary,
                    borderRadius: radius.md,
                    padding: spacing.sm,
                    marginBottom: spacing.md,
                  }}>
                  <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />
                  <AppText variant="caption" color={colors.primary} style={{ flex: 1, fontWeight: '700' }}>
                    {t(mode === 'message' ? 'more.feedbackMessageThanks' : 'more.feedbackThanks')}
                  </AppText>
                </View>
              ) : null}
              {phase === 'error' ? (
                <View
                  accessibilityRole="alert"
                  style={{
                    flexDirection: direction.row,
                    alignItems: 'center',
                    gap: spacing.sm,
                    backgroundColor: colors.surfaceMuted,
                    borderWidth: 1,
                    borderColor: colors.danger,
                    borderRadius: radius.md,
                    padding: spacing.sm,
                    marginBottom: spacing.md,
                  }}>
                  <MaterialCommunityIcons name="alert-circle" size={20} color={colors.danger} />
                  <AppText variant="caption" color={colors.danger} style={{ flex: 1 }}>
                    {t(ERROR_KEYS[error])}
                  </AppText>
                </View>
              ) : null}

              {/* Submit */}
              <Pressable
                onPress={() => {
                  void submit();
                }}
                disabled={!canSubmit() || busy || done}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSubmit() || busy || done, busy }}
                style={({ pressed }) => ({
                  paddingVertical: spacing.md,
                  borderRadius: radius.pill,
                  backgroundColor: done ? colors.accent : colors.primary,
                  alignItems: 'center',
                  opacity: !canSubmit() || busy ? 0.5 : pressed ? 0.75 : 1,
                })}>
                <AppText variant="label" color={colors.onPrimary} style={{ fontWeight: '700' }}>
                  {done
                    ? t('more.feedbackSubmitted')
                    : busy
                      ? t('more.feedbackSending')
                      : t(mode === 'message' ? 'more.feedbackSubmitMessage' : 'more.feedbackSubmit')}
                </AppText>
              </Pressable>
            </Card>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
