/**
 * Compact dropdown filter: a 48px button that opens a bottom sheet with
 * the options. Used on the library screen so book + topic + order fit in
 * one slim row instead of three stacked blocks on small phones.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from './AppText';
import { useT } from '../hooks/useT';
import { useTheme } from '../hooks/useTheme';
import { radius, spacing } from '../theme/tokens';

export interface FilterOption {
  value: string;
  label: string;
  /** Shown muted after the label when present. */
  count?: number;
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
  const { t, direction } = useT();
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          onPress={close}
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
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      onChange(option.value);
                      close();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={option.label}
                    accessibilityState={{ selected: active }}
                    android_ripple={{ color: colors.border }}
                    style={({ pressed }) => ({
                      flexDirection: direction.row,
                      alignItems: 'center',
                      gap: spacing.sm,
                      paddingVertical: spacing.md,
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                      opacity: pressed ? 0.65 : 1,
                    })}>
                    <AppText
                      variant="body"
                      style={{ flex: 1, fontWeight: active ? '700' : '400' }}
                      color={active ? colors.primary : colors.text}>
                      {option.label}
                    </AppText>
                    {option.count !== undefined ? (
                      <AppText variant="caption" color={colors.textMuted}>
                        {option.count}
                      </AppText>
                    ) : null}
                    {active ? (
                      <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
