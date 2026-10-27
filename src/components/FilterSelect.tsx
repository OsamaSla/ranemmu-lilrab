/**
 * Compact dropdown filter: a 48px button that opens a bottom sheet with
 * the options. Used on the library screen so book + topic + order fit in
 * one slim row instead of three stacked blocks on small phones.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from './AppText';
import { useT } from '../hooks/useT';
import { useTheme } from '../hooks/useTheme';
import { radius, spacing } from '../theme/tokens';

export interface FilterOption {
  value: string;
  label: string;
  /** Shown muted after the label when present. */
  count?: number;
  /** Optional color dot shown before the label. */
  color?: string;
}

interface FilterSelectProps {
  /** Sheet title and button accessibility label. */
  title: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  style?: StyleProp<ViewStyle>;
}

export function FilterSelect({ title, icon, options, value, onChange, style }: FilterSelectProps) {
  const { direction } = useT();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.value === value);
  const close = () => setOpen(false);

  return (
    <View style={style}>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${selected?.label ?? ''}`}
        android_ripple={{ color: colors.border }}
        style={({ pressed }) => ({
          flexDirection: direction.row,
          alignItems: 'center',
          gap: spacing.xs,
          minHeight: 48,
          paddingHorizontal: spacing.md,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          opacity: pressed ? 0.75 : 1,
        })}>
        <MaterialCommunityIcons name={icon} size={18} color={colors.primary} />
        <AppText variant="label" numberOfLines={1} style={{ flex: 1, fontWeight: '700' }}>
          {selected?.label ?? ''}
        </AppText>
        <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={close}
        statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
          <Pressable onPress={close} style={{ flex: 1 }} />
          <View
            onTouchStart={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.lg,
              borderTopRightRadius: radius.lg,
              padding: spacing.lg,
              paddingBottom: spacing.xl,
              maxHeight: '70%',
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
            <AppText variant="title" style={{ fontWeight: '700', marginBottom: spacing.sm }}>
              {title}
            </AppText>
            <ScrollView>
              {options.map((option) => {
                const active = option.value === value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => {
                      onChange(option.value);
                      close();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={option.label}
                    accessibilityState={{ selected: active }}
                    activeOpacity={0.65}
                    style={{
                      flexDirection: direction.row,
                      alignItems: 'center',
                      gap: spacing.sm,
                      paddingVertical: spacing.md,
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                    }}>
                    <View style={{ flexDirection: direction.row, alignItems: 'center', gap: spacing.sm, flex: 1 }}>
                      {option.color ? (
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: option.color }} />
                      ) : null}
                      <AppText
                        variant="body"
                        style={{ flex: 1, fontWeight: active ? '700' : '400' }}
                        color={active ? colors.primary : colors.text}>
                        {option.label}
                      </AppText>
                    </View>
                    {option.count !== undefined ? (
                      <AppText variant="caption" color={colors.textMuted}>
                        {option.count}
                      </AppText>
                    ) : null}
                    {active ? (
                      <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
