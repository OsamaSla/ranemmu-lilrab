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
import { getLinks } from '../data/loader';
import { displayMeter } from '../data/meterFamilies';
import { TOPIC_COLORS, allTopicsOf } from '../data/topics';
import type { Hymn } from '../data/types';
import { bookLabelKey } from '../i18n';
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
  // Other books that print this same hymn. Resolved here (not passed in) so the
  // list follows admin renames and drops copies deleted on this device.
  const linked = hymn ? getLinks(hymn.id) : [];

  return (
    <Modal
      visible={hymn !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent>
      {/* Backdrop: tapping outside closes the sheet. It is deliberately not a
          `button` role — it wraps the whole panel, so declaring it one nests
          every row (topics, "also in", close) inside a button, which is invalid
          HTML on web and useless for screen readers. The close icon and
          onRequestClose carry the accessible dismissal. */}
      <Pressable
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

          {linked.length > 0 ? (
            <View
              style={{
                paddingVertical: spacing.md,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}>
              <AppText variant="body" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>
                {t('reader.alsoIn')}
              </AppText>
              {linked.map((sibling) => (
                <Pressable
                  key={sibling.id}
                  onPress={() => {
                    onClose();
                    router.push(`/hymn/${sibling.id}`);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${t(bookLabelKey(sibling.book))} ${sibling.number}`}
                  android_ripple={{ color: colors.border }}
                  style={({ pressed }) => ({
                    flexDirection: direction.row,
                    alignItems: 'center',
                    gap: spacing.sm,
                    paddingVertical: spacing.xs,
                    opacity: pressed ? 0.7 : 1,
                  })}>
                  <AppText variant="label" color={colors.link} style={{ fontWeight: '700' }}>
                    {t(bookLabelKey(sibling.book))} {sibling.number}
                  </AppText>
                  <AppText
                    variant="caption"
                    color={colors.textMuted}
                    numberOfLines={1}
                    style={{ flex: 1 }}>
                    {sibling.title}
                  </AppText>
                </Pressable>
              ))}
            </View>
          ) : null}

          {hymnTopics.length > 0 ? (            <View
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
                        borderColor: TOPIC_COLORS[id],
                        backgroundColor: isPrimary ? TOPIC_COLORS[id] : `${TOPIC_COLORS[id]}22`,
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
