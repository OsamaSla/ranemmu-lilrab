/**
 * Translation disclaimer shown above the first stanza.
 *
 * The AI badge only applies to the machine-made en/de drafts: its text comes
 * from `translationStatus`, which is one flag for the whole record, so printing
 * it over the Hebrew would claim a review the Hebrew never had. Hebrew gets the
 * disclaimer alone, always, and set right-to-left because the note mixes
 * Hebrew with "AI" and "100%" — without an RTL base the digits and dash land
 * on the wrong side of the sentence.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View } from 'react-native';

import { AppText } from '../AppText';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';
import { HEBREW_FONT_FAMILY } from '../../theme/fonts';
import { palette, radius, spacing } from '../../theme/tokens';
import { TRANSLATION_NOTES, TRANSLATION_STATUS_LABEL, type ReaderLang } from './readerText';

interface TranslationNoticeProps {
  parallel: ReaderLang;
  status: 'AI_DRAFT' | 'VERIFIED' | undefined;
  fullscreen: boolean;
}

export function TranslationNotice({ parallel, status, fullscreen }: TranslationNoticeProps) {
  const { colors } = useTheme();
  const { direction } = useT();
  const effective = status ?? 'AI_DRAFT';

  if (parallel !== 'en' && parallel !== 'de' && parallel !== 'he') return null;

  if (parallel === 'he') {
    return (
      <AppText
        variant="caption"
        center
        color={fullscreen ? palette.readerText : colors.textMuted}
        style={{
          opacity: fullscreen ? 0.75 : 1,
          marginBottom: spacing.md,
          paddingHorizontal: spacing.md,
          writingDirection: 'rtl',
          textAlign: 'center',
          lineHeight: 20,
          fontFamily: HEBREW_FONT_FAMILY,
        }}>
        {TRANSLATION_NOTES.he}
      </AppText>
    );
  }

  return (
    <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
      <View
        style={{
          flexDirection: direction.row,
          alignItems: 'center',
          gap: spacing.xs,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: effective === 'VERIFIED' ? colors.primary : colors.textMuted,
          backgroundColor: effective === 'VERIFIED' ? colors.primary : 'transparent',
        }}>
        <MaterialCommunityIcons
          name={effective === 'VERIFIED' ? 'check-circle' : 'robot-outline'}
          size={16}
          color={effective === 'VERIFIED' ? colors.onPrimary : colors.textMuted}
        />
        <AppText
          variant="caption"
          color={effective === 'VERIFIED' ? colors.onPrimary : colors.textMuted}
          style={{ fontWeight: '700' }}>
          {TRANSLATION_STATUS_LABEL[effective][parallel]}
        </AppText>
      </View>
      {effective === 'AI_DRAFT' ? (
        <AppText
          variant="caption"
          center
          color={fullscreen ? palette.readerText : colors.textMuted}
          style={{ opacity: fullscreen ? 0.75 : 1, marginTop: spacing.xs }}>
          {TRANSLATION_NOTES[parallel]}
        </AppText>
      ) : null}
    </View>
  );
}
