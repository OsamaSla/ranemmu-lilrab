/**
 * Topic classification editor: one primary topic + secondary tags.
 *
 * The secondary row hides the selected primary (a topic can never be both —
 * the corpus validator rejects that), and `onSave` callers still filter
 * defensively. Used by the admin edit and add screens.
 */
import { Pressable, View } from 'react-native';

import { AppText } from './AppText';
import { TOPIC_COLORS, TOPIC_IDS, type TopicId } from '../data/topics';
import { useT } from '../hooks/useT';
import { useTheme } from '../hooks/useTheme';
import { radius, spacing } from '../theme/tokens';

interface TopicPickerProps {
  /** '' means no primary assigned yet. */
  primary: TopicId | '';
  secondary: TopicId[];
  onPrimary: (id: TopicId | '') => void;
  onToggleSecondary: (id: TopicId) => void;
}

export function TopicPicker({ primary, secondary, onPrimary, onToggleSecondary }: TopicPickerProps) {
  const { t, direction } = useT();
  const { colors } = useTheme();

  const chip = (id: TopicId, selected: boolean, onPress: () => void) => {
    const topicColor = TOPIC_COLORS[id];
    return (
      <Pressable
        key={id}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t(`topic.${id}` as const)}
        accessibilityState={{ selected }}
        android_ripple={{ color: colors.border }}
        style={({ pressed }) => ({
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: selected ? topicColor : colors.border,
          backgroundColor: selected ? topicColor : colors.surface,
          opacity: pressed ? 0.75 : 1,
        })}>
        <AppText
          variant="label"
          numberOfLines={1}
          color={selected ? '#FFFFFF' : colors.text}
          style={{ fontWeight: selected ? '700' : '400' }}>
          {t(`topic.${id}` as const)}
        </AppText>
      </Pressable>
    );
  };

  return (
    <View>
      <AppText variant="label" color={colors.textMuted} style={{ marginBottom: spacing.xs }}>
        {t('admin.primaryTopic')}
      </AppText>
      <View style={{ flexDirection: direction.row, flexWrap: 'wrap', gap: spacing.sm }}>
        <Pressable
          onPress={() => onPrimary('')}
          accessibilityRole="button"
          accessibilityLabel={t('admin.noTopic')}
          accessibilityState={{ selected: primary === '' }}
          android_ripple={{ color: colors.border }}
          style={({ pressed }) => ({
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: primary === '' ? colors.primary : colors.border,
            backgroundColor: primary === '' ? colors.primary : colors.surface,
            opacity: pressed ? 0.75 : 1,
          })}>
          <AppText
            variant="label"
            color={primary === '' ? colors.onPrimary : colors.text}
            style={{ fontWeight: primary === '' ? '700' : '400' }}>
            {t('admin.noTopic')}
          </AppText>
        </Pressable>
        {TOPIC_IDS.map((id) => chip(id, primary === id, () => onPrimary(primary === id ? '' : id)))}
      </View>

      <AppText
        variant="label"
        color={colors.textMuted}
        style={{ marginTop: spacing.md, marginBottom: spacing.xs }}>
        {t('admin.secondaryTopics')}
      </AppText>
      <View style={{ flexDirection: direction.row, flexWrap: 'wrap', gap: spacing.sm }}>
        {TOPIC_IDS.filter((id) => id !== primary).map((id) =>
          chip(id, secondary.includes(id), () => onToggleSecondary(id)),
        )}
      </View>
    </View>
  );
}
