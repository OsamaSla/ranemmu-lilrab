/**
 * Slim vertical stanza rail ("انتقال إلى مقطع") docked on the physical right
 * side of the hymn text. It is an in-flow column with its own reserved width,
 * so it can never cover the text. Dots are inset from the screen edge by at
 * least spacing.sm (plus the notch safe-area) and use HIT_SLOP on native, so
 * they stay tappable on small phones. Hidden for single-stanza hymns with no
 * linked copies.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../AppText';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';
import type { HymnSummary, HymnVerse } from '../../data/types';
import { bookLabelKey } from '../../i18n';
import { HIT_SLOP, palette, spacing } from '../../theme/tokens';
import { refrainHeading } from './readerText';

/** Width of the reserved rail column and the diameter of one jump dot. */
export const RAIL_WIDTH = 52;
const RAIL_DOT = 36;

interface StanzaRailProps {
  dark: boolean;
  verses: HymnVerse[];
  linked: HymnSummary[];
  chorusWord: string | undefined;
  transChorus: string | undefined;
  activeVerseIndex: number | null;
  onVerseSelect: (verseIndex: number) => void;
  readerFont: string;
  readerFontBold: string;
}

export function StanzaRail({
  dark,
  verses,
  linked,
  chorusWord,
  transChorus,
  activeVerseIndex,
  onVerseSelect,
  readerFont,
  readerFontBold,
}: StanzaRailProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useT();

  if (verses.length < 2 && linked.length === 0) return null;

  return (
    <View
      accessibilityRole="menu"
      accessibilityLabel={t('reader.stanzas')}
      style={{
        width: RAIL_WIDTH,
        paddingStart: spacing.sm,
        paddingEnd: Math.max(insets.right, spacing.sm),
        borderLeftWidth: 1,
        borderLeftColor: dark ? 'rgba(255,255,255,0.22)' : colors.border,
        backgroundColor: 'transparent',
      }}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          alignItems: 'center',
          paddingTop: spacing.md,
          paddingBottom: spacing.sm,
          gap: spacing.sm,
        }}>
        {verses.map((verseBlock, verseIndex) => {
          const isChorus = verseBlock.chorus;
          const isActive = !isChorus && activeVerseIndex === verseIndex;
          const label = isChorus
            ? refrainHeading(chorusWord, transChorus, verseBlock.label)
            : `${t('reader.verseOf')} ${verseBlock.label}`;
          return (
            <Pressable
              key={`${verseIndex}-${verseBlock.label}`}
              onPress={() => onVerseSelect(verseIndex)}
              accessibilityRole="button"
              accessibilityLabel={label}
              hitSlop={HIT_SLOP}
              android_ripple={{ color: colors.border }}
              style={({ pressed }) => ({
                width: RAIL_DOT,
                height: RAIL_DOT,
                borderRadius: RAIL_DOT / 2,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isChorus
                  ? colors.accent
                  : isActive
                    ? colors.accent
                    : dark
                      ? 'rgba(255,255,255,0.14)'
                      : colors.surfaceMuted,
                borderWidth: isActive || isChorus ? 2 : 1,
                borderColor: isChorus
                  ? colors.accent
                  : isActive
                    ? colors.accent
                    : dark
                      ? 'rgba(255,255,255,0.3)'
                      : colors.border,
                shadowColor: isActive || isChorus ? colors.accent : undefined,
                shadowOffset: isActive || isChorus ? { width: 0, height: 0 } : undefined,
                shadowOpacity: isActive || isChorus ? 0.4 : 0,
                shadowRadius: isActive || isChorus ? 8 : 0,
                elevation: isActive || isChorus ? 4 : 0,
                opacity: pressed ? 0.6 : 1,
              })}>
              {isChorus ? (
                <MaterialCommunityIcons name="repeat" size={16} color={colors.onPrimary} />
              ) : (
                <AppText
                  variant="label"
                  useAppFont={false}
                  style={{
                    fontFamily: readerFontBold,
                    fontSize: 12,
                    fontWeight: '700',
                    color:
                      isActive || isChorus
                        ? colors.onPrimary
                        : dark
                          ? palette.readerText
                          : colors.text,
                    lineHeight: 16,
                  }}>
                  {verseBlock.label}
                </AppText>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* The same hymn as printed by another book. It sits at the foot of the
          rail — the empty stretch below the stanza dots — rather than in the
          header, so the "where am I" column also answers "where else is it".
          Outside the ScrollView so it stays reachable with many stanzas. */}
      {linked.length > 0 ? (
        <View
          accessibilityRole="menu"
          accessibilityLabel={t('reader.alsoIn')}
          style={{
            alignItems: 'center',
            gap: 6,
            paddingTop: spacing.sm,
            // The tab bar overlays the bottom of the screen (same reason the
            // text scroller ends with xxl), so the badge must clear it.
            paddingBottom: insets.bottom + spacing.xxl,
            borderTopWidth: 1,
            borderTopColor: dark ? 'rgba(255,255,255,0.22)' : colors.border,
          }}>
          <AppText
            useAppFont={false}
            style={{
              fontFamily: readerFont,
              fontSize: 9,
              lineHeight: 12,
              textAlign: 'center',
              color: dark ? palette.readerText : colors.textMuted,
              opacity: 0.75,
            }}>
            {t('reader.alsoInShort')}
          </AppText>
          {linked.map((sibling) => (
            <Pressable
              key={sibling.id}
              onPress={() => router.push(`/hymn/${sibling.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`${t(bookLabelKey(sibling.book))} ${sibling.number}`}
              hitSlop={HIT_SLOP}
              android_ripple={{ color: colors.border }}
              style={({ pressed }) => ({
                width: RAIL_DOT,
                alignItems: 'center',
                paddingVertical: 5,
                paddingHorizontal: 1,
                borderRadius: 10,
                gap: 1,
                backgroundColor: dark ? 'rgba(255,255,255,0.12)' : colors.surfaceMuted,
                borderWidth: 1,
                borderColor: dark ? 'rgba(255,255,255,0.3)' : colors.border,
                opacity: pressed ? 0.6 : 1,
              })}>
              <MaterialCommunityIcons
                name="book-open-variant"
                size={13}
                color={dark ? palette.readerText : colors.textMuted}
              />
              <AppText
                useAppFont={false}
                numberOfLines={2}
                style={{
                  fontFamily: readerFont,
                  fontSize: 9,
                  lineHeight: 11,
                  textAlign: 'center',
                  color: dark ? palette.readerText : colors.textMuted,
                }}>
                {t(bookLabelKey(sibling.book))}
              </AppText>
              <AppText
                useAppFont={false}
                style={{
                  fontFamily: readerFontBold,
                  fontSize: 12,
                  lineHeight: 14,
                  fontWeight: '700',
                  color: dark ? palette.readerText : colors.text,
                }}>
                {sibling.number}
              </AppText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
