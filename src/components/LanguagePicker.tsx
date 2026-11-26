/**
 * App-language switcher.
 *
 * The UI is translated into Arabic, English, German and Hebrew. This is the
 * visible control for it: a compact globe pill for the app bar / home header,
 * plus the shared `LANGUAGE_OPTIONS` list the Settings screen renders as a
 * segmented control.
 *
 * The language names are deliberately written in their own language
 * («العربية», English, «Deutsch», «עברית»): someone who cannot read the
 * current UI language must still recognise their own.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { AppText } from './AppText';
import { Card } from './Card';
import { useT } from '../hooks/useT';
import { useTheme } from '../hooks/useTheme';
import type { LocaleCode } from '../i18n';
import { useSettings } from '../store/settings';
import { radius, spacing } from '../theme/tokens';

export const LANGUAGE_OPTIONS: { value: LocaleCode; label: string; code: string }[] = [
  { value: 'ar', label: 'العربية', code: 'AR' },
  { value: 'en', label: 'English', code: 'EN' },
  { value: 'de', label: 'Deutsch', code: 'DE' },
  { value: 'he', label: 'עברית', code: 'HE' },
];

export function LanguageButton({ style }: { style?: ViewStyle }) {
  const { t } = useT();
  const { colors } = useTheme();
  const locale = useSettings((s) => s.locale);
  const setLocale = useSettings((s) => s.setLocale);
  const [open, setOpen] = useState(false);

  const current = LANGUAGE_OPTIONS.find((option) => option.value === locale) ?? LANGUAGE_OPTIONS[0];
  const close = () => setOpen(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${t('settings.language')} — ${current.label}`}
        android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
        style={({ pressed }) => [
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            minHeight: 36,
            paddingHorizontal: spacing.sm,
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.28)',
            backgroundColor: 'rgba(255,255,255,0.16)',
            opacity: pressed ? 0.7 : 1,
          },
          style,
        ]}>
        <MaterialCommunityIcons name="translate" size={16} color={colors.onPrimary} />
        <AppText variant="caption" color={colors.onPrimary} style={{ fontWeight: '700', letterSpacing: 0.5 }}>
          {current.code}
        </AppText>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.lg,
          }}>
          {/* Backdrop: covers the screen and closes on tap, but sits behind the
              sheet so a tap inside the list never dismisses it. */}
          <Pressable
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,26,20,0.55)' }]}
          />
          <Card style={{ width: '100%', maxWidth: 420, padding: spacing.lg }}>
            <AppText variant="title" style={{ fontWeight: '700', marginBottom: spacing.sm }}>
              {t('settings.language')}
            </AppText>
            {LANGUAGE_OPTIONS.map((option, index) => {
              const selected = option.value === locale;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    setLocale(option.value);
                    close();
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={option.label}
                  android_ripple={{ color: colors.border }}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    minHeight: 48,
                    paddingVertical: spacing.sm,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: colors.border,
                    opacity: pressed ? 0.7 : 1,
                  })}>
                  <AppText variant="body" style={{ flex: 1, fontWeight: selected ? '700' : '400' }}>
                    {option.label}
                  </AppText>
                  {selected ? (
                    <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
                  ) : null}
                </Pressable>
              );
            })}
          </Card>
        </View>
      </Modal>
    </>
  );
}
