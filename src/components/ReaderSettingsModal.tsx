/**
 * إعدادات النص — the in-reader text settings sheet.
 *
 * Mirrors the reference app: an A+/A− stepper with a progress track and a
 * horizontal run of font chips. Changes apply immediately and persist, so the
 * reader updates behind the sheet and keeps the setting for the next hymn.
 *
 * Also hosts the hymn's melody link ("استمع إلى اللحن"): the curated
 * recording when an admin has set one, otherwise a YouTube search for the
 * hymn number + title — so every hymn is listenable with zero data entry.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Modal, Pressable, View } from 'react-native';

import { AppText } from './AppText';
import { FontChips } from './FontChips';
import { IconButton } from './IconButton';
import { SegmentedControl } from './SegmentedControl';
import { openHymnMedia, resolveHymnMediaUrl } from '../data/media';
import type { Hymn } from '../data/types';
import { useT } from '../hooks/useT';
import { useTheme } from '../hooks/useTheme';
import {
  READER_SIZE_MAX,
  READER_SIZE_MIN,
  useSettings,
  type ThemePreference,
} from '../store/settings';
import { radius, spacing } from '../theme/tokens';

interface ReaderSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  /** Hymn whose melody link is offered. Omit to hide the listen section. */
  hymn?: Pick<Hymn, 'number' | 'title' | 'mediaUrl'>;
}

export function ReaderSettingsModal({ visible, onClose, hymn }: ReaderSettingsModalProps) {
  const { t, direction } = useT();
  const { colors } = useTheme();

  const readerSize = useSettings((s) => s.readerSize);
  const increaseReaderSize = useSettings((s) => s.increaseReaderSize);
  const decreaseReaderSize = useSettings((s) => s.decreaseReaderSize);
  const fontFamily = useSettings((s) => s.fontFamily);
  const setFontFamily = useSettings((s) => s.setFontFamily);
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);

  const progress = (readerSize - READER_SIZE_MIN) / (READER_SIZE_MAX - READER_SIZE_MIN);

  const media = hymn ? resolveHymnMediaUrl(hymn) : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent>
      {/* Tap the scrim to dismiss, but not the sheet itself. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
        onPress={onClose}
        style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
        <Pressable
          onPress={() => {
            /* Swallow: keeps the sheet open while it's being interacted with. */
          }}
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            padding: spacing.lg,
            paddingBottom: spacing.xl,
          }}>
          <View
            style={{
              alignSelf: 'center',
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.border,
              marginBottom: spacing.md,
            }}
          />

          <View
            style={{
              flexDirection: direction.row,
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing.lg,
            }}>
            <AppText variant="title" style={{ fontWeight: '700' }}>
              {t('reader.settings')}
            </AppText>
            <IconButton name="close" label={t('common.close')} onPress={onClose} />
          </View>

          {/* Font size: the stepper the reference app shows as A+ / A- */}
          <View style={{ marginBottom: spacing.lg }}>
            <AppText variant="label" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>
              {t('reader.fontSize')} ({readerSize})
            </AppText>
            <View
              style={{
                flexDirection: direction.row,
                alignItems: 'center',
              }}>
              <IconButton
                name="format-font-size-decrease"
                label={t('reader.decreaseFont')}
                onPress={decreaseReaderSize}
                disabled={readerSize <= READER_SIZE_MIN}
              />
              <View
                style={{
                  flex: 1,
                  height: 4,
                  backgroundColor: colors.border,
                  marginHorizontal: spacing.md,
                  borderRadius: 2,
                  overflow: 'hidden',
                }}>
                <View
                  style={{
                    width: `${Math.round(progress * 100)}%`,
                    height: 4,
                    backgroundColor: colors.accent,
                    borderRadius: 2,
                  }}
                />
              </View>
              <IconButton
                name="format-font-size-increase"
                label={t('reader.increaseFont')}
                onPress={increaseReaderSize}
                disabled={readerSize >= READER_SIZE_MAX}
              />
            </View>
          </View>

          {/* Font family chips */}
          <View style={{ marginBottom: spacing.lg }}>
            <AppText variant="label" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>
              {t('reader.fontFamily')}
            </AppText>
            <FontChips value={fontFamily} onChange={setFontFamily} />
          </View>

          <View>
            <AppText variant="label" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>
              {t('settings.theme')}
            </AppText>
            <SegmentedControl
              value={theme}
              onChange={(value) => setTheme(value as ThemePreference)}
              options={[
                { value: 'light', label: t('settings.themeLight') },
                { value: 'dark', label: t('settings.themeDark') },
                { value: 'system', label: t('settings.themeSystem') },
              ]}
            />
          </View>

          {media ? (
            <Pressable
              onPress={() => {
                void openHymnMedia(media.url);
              }}
              accessibilityRole="link"
              accessibilityLabel={t(media.curated ? 'reader.listen' : 'reader.listenSearch')}
              android_ripple={{ color: colors.border }}
              style={({ pressed }) => ({
                flexDirection: direction.row,
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.sm,
                marginTop: spacing.lg,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.md,
                borderRadius: radius.pill,
                backgroundColor: colors.primary,
                opacity: pressed ? 0.8 : 1,
              })}>
              <MaterialCommunityIcons
                name={media.curated ? 'play-circle-outline' : 'youtube'}
                size={22}
                color={colors.onPrimary}
              />
              <AppText variant="label" color={colors.onPrimary} style={{ fontWeight: '700' }}>
                {t(media.curated ? 'reader.listen' : 'reader.listenSearch')}
              </AppText>
            </Pressable>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
