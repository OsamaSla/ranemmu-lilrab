/**
 * معلومات الترنيمة — the credits bottom sheet.
 *
 * Shows, in the reference app's order: نظم (tune) · المؤلف (author) ·
 * كورد (key) · الملحن (composer) · مقياس الكلام (metre). Fields the book does
 * not provide render the "not available" label rather than being omitted, so a
 * missing credit is distinguishable from a loading fault.
 */
import { Modal, Pressable, View } from 'react-native';

import { AppText } from './AppText';
import { IconButton } from './IconButton';
import type { Hymn } from '../data/types';
import { useT } from '../hooks/useT';
import { useTheme } from '../hooks/useTheme';
import type { TranslationKey } from '../i18n';
import { radius, spacing } from '../theme/tokens';

interface HymnInfoSheetProps {
  hymn: Hymn | null;
  onClose: () => void;
}

export function HymnInfoSheet({ hymn, onClose }: HymnInfoSheetProps) {
  const { t, direction } = useT();
  const { colors } = useTheme();

  const rows: { label: TranslationKey; value: string | undefined }[] = [
    { label: 'info.tune', value: hymn?.tune },
    { label: 'info.author', value: hymn?.author },
    { label: 'info.key', value: hymn?.key },
    { label: 'info.composer', value: hymn?.composer },
    { label: 'info.meter', value: hymn?.meter },
  ];

  return (
    <Modal
      visible={hymn !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent>
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
              marginBottom: spacing.md,
            }}>
            <AppText variant="title" style={{ fontWeight: '700' }}>
              {t('reader.info')}
            </AppText>
            <IconButton name="close" label={t('common.close')} onPress={onClose} />
          </View>

          {hymn ? (
            <AppText variant="body" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>
              {t('common.hymnNumber')} {hymn.number} — {hymn.title}
            </AppText>
          ) : null}

          {rows.map((row) => {
            const value = row.value?.trim() ? row.value : t('info.missing');

            return (
              <View
                key={row.label}
                style={{
                  flexDirection: direction.row,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: spacing.md,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                  opacity: row.value?.trim() ? 1 : 0.6,
                }}>
                <AppText variant="body" color={colors.textMuted}>
                  {t(row.label)}
                </AppText>
                <AppText variant="body" style={{ fontWeight: '700', maxWidth: '60%' }} numberOfLines={2}>
                  {value}
                </AppText>
              </View>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
