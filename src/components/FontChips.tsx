/**
 * Horizontal run of font-family chips.
 *
 * Each chip previews its own family name in that family, so the choice is
 * visible rather than abstract — particularly important for Arabic, where the
 * families differ more than their Latin labels suggest.
 */
import { Pressable, ScrollView, View } from 'react-native';

import { AppText } from './AppText';
import { useT } from '../hooks/useT';
import { useTheme } from '../hooks/useTheme';
import { FONT_FAMILIES } from '../theme/fonts';
import { radius, spacing } from '../theme/tokens';

interface FontChipsProps {
  value: string;
  onChange: (id: string) => void;
  /**
   * One row that scrolls instead of a block that wraps. The reader's settings
   * sheet is height-critical, so it passes this; the settings screen keeps the
   * wrapped block, where vertical space is free.
   */
  scroll?: boolean;
}

export function FontChips({ value, onChange, scroll = false }: FontChipsProps) {
  const { colors } = useTheme();
  const { direction } = useT();

  const chips = FONT_FAMILIES.map((family) => {
    const selected = family.id === value;

    return (
      <Pressable
        key={family.id}
        onPress={() => onChange(family.id)}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={family.label}
        android_ripple={{ color: colors.border }}
        style={({ pressed }) => ({
          minHeight: 48,
          justifyContent: 'center',
          // The scrolling row is width-critical: tighter padding leaves a fifth
          // chip visibly cut at the edge, which is the only cue that the row
          // scrolls. Height stays 48, so the touch target does not shrink.
          paddingHorizontal: scroll ? spacing.sm : spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: selected ? colors.accent : colors.border,
          backgroundColor: selected ? colors.accent : colors.surface,
          opacity: pressed ? 0.75 : 1,
        })}>
        <AppText
          variant="label"
          color={selected ? colors.onPrimary : colors.text}
          style={{ fontFamily: family.regular }}>
          {family.label}
        </AppText>
      </Pressable>
    );
  });

  if (scroll) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          flexDirection: direction.row,
          gap: scroll ? spacing.xs : spacing.sm,
        }}>
        {chips}
      </ScrollView>
    );
  }

  return (
    <View style={{ flexDirection: direction.row, flexWrap: 'wrap', gap: spacing.sm }}>{chips}</View>
  );
}
