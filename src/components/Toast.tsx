/**
 * Transient message bar with one action.
 *
 * The reader uses it to confirm a line correction and to offer a short undo:
 * the change is already written to the override store, so the message must not
 * block the text or ask for a second confirmation. A new message restarts the
 * dismiss timer; the same message does not, so re-renders cannot make a toast
 * outlive its five seconds.
 */
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from './AppText';
import { useTheme } from '../hooks/useTheme';
import { palette, radius, spacing } from '../theme/tokens';

interface ToastProps {
  message: string;
  /** Optional action rendered at the end of the bar (e.g. تراجع). */
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
  /** Distance from the bottom edge, so callers clear the safe area. */
  bottom: number;
  duration?: number;
}

export function Toast({
  message,
  actionLabel,
  onAction,
  onDismiss,
  bottom,
  duration = 5000,
}: ToastProps) {
  const { colors, isDark } = useTheme();

  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
    // `onDismiss` is expected to be stable (useCallback) — otherwise every
    // parent render would restart the clock.
  }, [message, duration, onDismiss]);

  // Inverted bar: the theme's text colour is the bubble, so it never competes
  // with the hymn surface. The action needs its own hue per theme: bright gold
  // on the dark bubble, deep gold on the cream one.
  const actionColor = isDark ? colors.primaryDeep : palette.gold;

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 0, right: 0, bottom, alignItems: 'center' }}>
      <View
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          maxWidth: 480,
          marginHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.pill,
          backgroundColor: colors.text,
        }}>
        <AppText
          variant="label"
          color={colors.canvas}
          style={{ flexShrink: 1 }}
          numberOfLines={3}>
          {message}
        </AppText>
        {actionLabel && onAction ? (
          <Pressable
            onPress={onAction}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            hitSlop={8}
            style={({ pressed }) => ({
              paddingVertical: spacing.xs,
              paddingHorizontal: spacing.sm,
              opacity: pressed ? 0.6 : 1,
            })}>
            <AppText variant="label" color={actionColor} style={{ fontWeight: '700' }}>
              {actionLabel}
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
