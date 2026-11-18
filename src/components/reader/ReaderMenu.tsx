/**
 * Overflow menu for the reader. The screen owns the action list (and the
 * editor gate); this component only renders it, so the items stay typed and
 * the screen loses another block of modal styling.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { AppText } from '../AppText';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';
import { radius, spacing } from '../../theme/tokens';

export type ReaderMenuItem = {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  onPress: () => void;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  items: ReaderMenuItem[];
  /** Top padding so the menu drops below the header rather than covering it. */
  top: number;
};

export function ReaderMenu({ visible, onClose, items, top }: Props) {
  const { colors } = useTheme();
  const { direction } = useT();
  if (items.length === 0) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: colors.overlay,
          justifyContent: 'flex-start',
          alignItems: direction.isRTL ? 'flex-start' : 'flex-end',
          paddingTop: top,
          paddingHorizontal: spacing.sm,
        }}>
        <View
          onTouchStart={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            minWidth: 200,
            overflow: 'hidden',
          }}>
          {items.map((item, idx) => (
            <Pressable
              key={`${item.icon}-${idx}`}
              onPress={item.onPress}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              android_ripple={{ color: colors.border }}
              style={({ pressed }) => ({
                flexDirection: direction.row,
                alignItems: 'center',
                gap: spacing.sm,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.md,
                borderTopWidth: idx === 0 ? 0 : 1,
                borderTopColor: colors.border,
                opacity: pressed ? 0.7 : 1,
              })}>
              <MaterialCommunityIcons name={item.icon} size={20} color={colors.text} />
              <AppText variant="body" style={{ fontWeight: '500' }}>
                {item.label}
              </AppText>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}
