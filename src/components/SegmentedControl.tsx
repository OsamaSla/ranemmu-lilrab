/**
 * Two-or-more-way pill selector, used for the library's sort order and the
 * theme picker in settings.
 *
 * Rendered as a row of Pressables rather than a native segmented control so the
 * selected state can follow the theme colours and the type scale.
 */
import { Pressable, View, type ViewStyle } from 'react-native';

import { AppText } from './AppText';
import { useT } from '../hooks/useT';
import { useTheme } from '../hooks/useTheme';
import { radius, spacing } from '../theme/tokens';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: ViewStyle;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();
  const { direction } = useT();

  return (
    <View
      accessibilityRole="tablist"
      style={[
        {
          flexDirection: direction.row,
          backgroundColor: colors.surfaceMuted,
          borderRadius: radius.pill,
          padding: 4,
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}>
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            style={({ pressed }) => [
              {
                flex: 1,
                paddingVertical: spacing.sm,
                borderRadius: radius.pill,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: selected ? colors.primary : 'transparent',
                opacity: pressed ? 0.75 : 1,
              },
            ]}>
            <AppText
              variant="label"
              numberOfLines={1}
              color={selected ? colors.onPrimary : colors.textMuted}
              style={{ fontWeight: selected ? '700' : '500' }}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}