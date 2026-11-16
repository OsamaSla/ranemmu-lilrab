/**
 * One stanza of the hymn, memoised so a scroll event (which only moves the
 * rail highlight) never re-renders the whole hymn text.
 *
 * The Arabic line owns the reading column; a translation, when selected, is
 * rendered beneath it rather than replacing it. Readers get plain text;
 * editors additionally get a hold-to-fix target on each line — a normal tap
 * and a scroll still do nothing, so the reading experience is unchanged.
 */
import { memo } from 'react';
import { Pressable, Text as RNText, View, type LayoutChangeEvent } from 'react-native';

import { AppText } from '../AppText';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';
import type { HymnVerse } from '../../data/types';
import { HEBREW_FONT_FAMILY } from '../../theme/fonts';
import { palette, radius, spacing } from '../../theme/tokens';
import { refrainHeading, type ReaderLang } from './readerText';

interface VerseBlockProps {
  verseBlock: HymnVerse;
  verseIndex: number;
  chorusWord: string | undefined;
  transChorus: string | undefined;
  transLines: string[] | undefined;
  parallel: ReaderLang;
  readerSize: number;
  readerFont: string;
  readerFontBold: string;
  fullscreen: boolean;
  isDark: boolean;
  canEdit: boolean;
  onVerseLayout: (verseIndex: number) => (event: LayoutChangeEvent) => void;
  onLineLayout: (verseIndex: number, lineIndex: number) => (event: LayoutChangeEvent) => void;
  onLongPressLine: (verseIndex: number, lineIndex: number, stanzaLabel: string) => void;
}

export const VerseBlock = memo(function VerseBlock({
  verseBlock,
  verseIndex,
  chorusWord,
  transChorus,
  transLines,
  parallel,
  readerSize,
  readerFont,
  readerFontBold,
  fullscreen,
  isDark,
  canEdit,
  onVerseLayout,
  onLineLayout,
  onLongPressLine,
}: VerseBlockProps) {
  const { colors } = useTheme();
  const { t } = useT();
  const onDark = fullscreen || isDark;
  const chorus = verseBlock.chorus === true;
  const headingSize = Math.round(readerSize * (chorus ? 0.9 : 0.7));
  // The quick-fix sheet names the stanza the same way the reader does, so its
  // position line reads "المقطع القرار · السطر ٢" for a refrain.
  const stanzaLabel = chorus
    ? refrainHeading(chorusWord, transChorus, verseBlock.label)
    : verseBlock.label;
  const heading = chorus ? stanzaLabel : `(${stanzaLabel})`;

  const stanzaText = (body: string) => (
    <AppText
      variant="body"
      center
      useAppFont={false}
      style={{
        fontFamily: readerFont,
        fontSize: readerSize,
        lineHeight: Math.round(readerSize * 2),
        color: fullscreen ? palette.readerText : colors.text,
      }}>
      {body}
    </AppText>
  );

  /**
   * One translated line under its Arabic original. en/de use the reader's
   * Arabic font — they are Latin text inside an Arabic-typeset app. Hebrew is
   * typeset in the bundled Hebrew liturgical face (NotoSansHebrew), which is
   * the only registered font carrying Hebrew glyphs *and* GPOS niqqud
   * positioning; the platform font is only the fallback. Hebrew also reads
   * right-to-left and needs extra leading so the points are not clipped.
   */
  const translationText = (body: string) =>
    parallel === 'he' ? (
      <RNText
        style={{
          fontFamily: HEBREW_FONT_FAMILY,
          fontSize: Math.round(readerSize * 0.9),
          lineHeight: Math.round(readerSize * 1.9),
          color: fullscreen ? palette.readerText : colors.textMuted,
          writingDirection: 'rtl',
          textAlign: 'right',
          opacity: fullscreen ? 0.8 : 1,
        }}>
        {body}
      </RNText>
    ) : (
      <RNText
        style={{
          fontFamily: readerFont,
          fontSize: Math.round(readerSize * 0.85),
          lineHeight: Math.round(readerSize * 1.6),
          color: fullscreen ? palette.readerText : colors.textMuted,
          writingDirection: 'ltr',
          textAlign: 'left',
          opacity: fullscreen ? 0.8 : 1,
        }}>
        {body}
      </RNText>
    );

  return (
    <View
      onLayout={onVerseLayout(verseIndex)}
      style={{
        backgroundColor: fullscreen ? 'transparent' : colors.surface,
        borderRadius: radius.lg,
        borderWidth: fullscreen ? 0 : 1,
        borderColor: fullscreen ? 'transparent' : colors.border,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        marginBottom: spacing.md,
        marginStart: chorus ? spacing.xl : 0,
        borderStartWidth: chorus ? 3 : 0,
        borderStartColor: chorus ? colors.accent : 'transparent',
      }}>
      <AppText
        variant="label"
        center
        useAppFont={false}
        color={
          chorus
            ? onDark
              ? palette.refrainReader
              : palette.refrain
            : fullscreen
              ? palette.readerText
              : colors.primary
        }
        style={{
          fontFamily: chorus && parallel === 'he' ? HEBREW_FONT_FAMILY : readerFontBold,
          // The family alone selects the bold face but leaves the weight at
          // 400, which web renders as regular; refrain needs weight 700.
          fontWeight: chorus ? '700' : undefined,
          fontSize: headingSize,
          lineHeight: Math.round(headingSize * (chorus ? 1.4 : 1.5)),
          marginBottom: spacing.xs,
          opacity: fullscreen ? 0.85 : 1,
          ...(chorus
            ? {
                letterSpacing: 0.5,
                textShadowColor: onDark ? palette.refrainReaderGlow : palette.refrainGlow,
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 12,
              }
            : null),
        }}>
        {heading}
      </AppText>
      {verseBlock.lines.map((line, lineIndex) => {
        const translated = transLines?.[lineIndex];
        const marginBottom = lineIndex < verseBlock.lines.length - 1 ? spacing.sm : 0;
        const body = (
          <>
            {stanzaText(line)}
            {translated ? <View style={{ marginTop: 2 }}>{translationText(translated)}</View> : null}
          </>
        );
        return canEdit ? (
          <Pressable
            key={lineIndex}
            onLongPress={() => onLongPressLine(verseIndex, lineIndex, stanzaLabel)}
            delayLongPress={350}
            onLayout={onLineLayout(verseIndex, lineIndex)}
            accessibilityRole="button"
            accessibilityLabel={`${t('reader.fixTitle')} — ${t('reader.verseOf')} ${stanzaLabel} · ${t('reader.fixLine')} ${lineIndex + 1}`}
            accessibilityHint={t('reader.fixHint')}
            android_ripple={{ color: colors.border }}
            style={({ pressed }) => ({
              marginBottom,
              borderRadius: radius.sm,
              backgroundColor: pressed ? colors.surfaceMuted : 'transparent',
              // Web: a long press on text opens the browser's own selection
              // callout and swallows the gesture.
              userSelect: 'none',
            })}>
            {body}
          </Pressable>
        ) : (
          <View key={lineIndex} style={{ marginBottom }}>
            {body}
          </View>
        );
      })}
    </View>
  );
});
