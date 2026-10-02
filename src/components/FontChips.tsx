/**
 * Horizontal run of font-family chips.
 *
 * Each chip previews its own family name in that family, so the choice is
 * visible rather than abstract — particularly important for Arabic, where the
 * families differ more than their Latin labels suggest.
 */
import { Pressable, View } from 'react-native';

import { AppText } from './AppText';
import { useTheme } from '../hooks/useTheme';
import { FONT_FAMILIES } from '../theme/fonts';
import { radius, spacing } from '../theme/tokens';

interface FontChipsProps {
  value: string;
  onChange: (id: string) => void;
}

export function FontChips({ value, onChange }: FontChipsProps) {
  const { colors } = useTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {FONT_FAMILIES.map((family) => {
        const selected = family.id === value;

        return (
          <Pressable
            key={family.id}
            onPress={() => onChange(family.id)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={family.label}
            style={({ pressed }) => ({
              paddingHorizontal: spacing.md,
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
      })}
    </View>
  );
}
