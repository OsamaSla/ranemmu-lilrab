/**
 * معلومات الترنيمة — the credits bottom sheet.
 *
 * Shows the metre (مقياس الكلام) when the book provides it. No metre means no
 * rows — the sheet stays ready and fills in the moment a metre is entered.
 */
import { Modal, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppText } from './AppText';
import { IconButton } from './IconButton';
import { MeterText } from './MeterText';
import { displayMeter } from '../data/meterFamilies';
import { allTopicsOf } from '../data/topics';
import type { Hymn } from '../data/types';
import { useT } from '../hooks/useT';
import { useTheme } from '../hooks/useTheme';
import type { TranslationKey } from '../i18n';
import { type as typeScale } from '../theme/fonts';
import { radius, spacing } from '../theme/tokens';

interface HymnInfoSheetProps {
  hymn: Hymn | null;
  onClose: () => void;
}

export function HymnInfoSheet({ hymn, onClose }: HymnInfoSheetProps) {
  const { t, direction } = useT();
  const { colors } = useTheme();
  const router = useRouter();

  const shownMeter = hymn ? displayMeter(hymn.id, hymn.meter) : '';
  const rows: { label: TranslationKey; value: string }[] = shownMeter
    ? [{ label: 'info.meter', value: shownMeter }]
    : [];
  const hymnTopics = hymn ? allTopicsOf(hymn) : [];

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

          {rows.map((row) => (
            <View
              key={row.label}
              style={{
                flexDirection: direction.row,
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: spacing.md,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}>
              <AppText variant="body" color={colors.textMuted}>
                {t(row.label)}
              </AppText>
              <MeterText
                meter={row.value}
                fontSize={typeScale.body}
                color={colors.text}
                bold
                numberOfLines={2}
                style={{ maxWidth: '60%' }}
              />
            </View>
          ))}

          {hymnTopics.length > 0 ? (
            <View
              style={{
                paddingVertical: spacing.md,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}>
              <AppText variant="body" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>
                {t('info.topics')}
              </AppText>
              <View style={{ flexDirection: direction.row, flexWrap: 'wrap', gap: spacing.sm }}>
                {hymnTopics.map((id) => {
                  const isPrimary = hymn?.primaryTopic === id;
                  return (
                    <Pressable
                      key={id}
                      onPress={() => {
                        onClose();
                        router.push(`/library?topic=${id}`);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={t(`topic.${id}` as const)}
                      android_ripple={{ color: colors.border }}
                      style={({ pressed }) => ({
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.xs,
                        borderRadius: radius.pill,
                        borderWidth: 1,
                        borderColor: isPrimary ? colors.primary : colors.border,
                        backgroundColor: isPrimary ? colors.primary : 'transparent',
                        opacity: pressed ? 0.7 : 1,
                      })}>
                      <AppText
                        variant="label"
                        color={isPrimary ? colors.onPrimary : colors.text}
                        style={{ fontWeight: isPrimary ? '700' : '400' }}>
                        {t(`topic.${id}` as const)}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
