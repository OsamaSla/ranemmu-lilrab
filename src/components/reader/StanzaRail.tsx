/**
 * Slim vertical stanza rail ("انتقال إلى مقطع") docked on the physical left
 * side of the hymn text. It is an in-flow column with its own reserved width,
 * so it can never cover the text. Dots are inset from the screen edge by at
 * least spacing.sm (plus the notch safe-area) and use HIT_SLOP on native, so
 * they stay tappable on small phones. Hidden for single-stanza hymns with no
 * linked copies.
 *
 * The edge props are physical (`paddingLeft`, `borderRightWidth`): the app is
 * RTL, so `paddingStart` here would resolve to the right-hand side and put the
 * safe-area gap on the text edge instead of against the screen.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../AppText';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';
import type { HymnSummary, HymnVerse } from '../../data/types';
import { bookLabelKey } from '../../i18n';
import { HIT_SLOP, palette, radius, spacing } from '../../theme/tokens';
import { CHIP_COLORS, refrainHeading, type ReaderLang } from './readerText';

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
  translationOptions: { value: ReaderLang; label: string }[];
  parallel: ReaderLang;
  onChooseLang: (lang: ReaderLang) => void;
  fullscreen: boolean;
  onExitFullscreen: () => void;
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
  translationOptions,
  parallel,
  onChooseLang,
  fullscreen,
  onExitFullscreen,
}: StanzaRailProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useT();

  // A translated single-stanza hymn still needs the rail for the language
  // switcher; fullscreen always needs it for the exit button.
  if (!fullscreen && verses.length < 2 && linked.length === 0 && translationOptions.length <= 1) return null;

  const shortLang = (lang: ReaderLang) =>
    lang === 'ar'
      ? t('common.arShort')
      : lang === 'en'
        ? t('common.enShort')
        : lang === 'de'
          ? t('common.deShort')
          : t('common.heShort');

  // One button, no popup: swiping it rolls through the languages. A tap also
  // advances, so a mouse or a keyboard can change language without a swipe.
  const cycleLanguage = (step: number) => {
    if (translationOptions.length < 2) return;
    const index = translationOptions.findIndex((option) => option.value === parallel);
    const next = (index + step + translationOptions.length) % translationOptions.length;
    onChooseLang(translationOptions[next].value);
  };
  const swipeLanguage = Gesture.Pan().onEnd((event) => {
    if (Math.abs(event.translationX) >= 18) cycleLanguage(event.translationX < 0 ? 1 : -1);
  });
  const tapLanguage = Gesture.Tap().onEnd(() => cycleLanguage(1));
  // Exclusive so a swipe never also fires the tap and skips a language.
  const languageGesture = Gesture.Exclusive(swipeLanguage, tapLanguage);

  return (
    <View
      accessibilityRole="menu"
      accessibilityLabel={t('reader.stanzas')}
      style={{
        width: RAIL_WIDTH,
        paddingLeft: Math.max(insets.left, spacing.sm),
        paddingRight: spacing.sm,
        borderRightWidth: 1,
        borderRightColor: dark ? 'rgba(255,255,255,0.22)' : colors.border,
        backgroundColor: 'transparent',
      }}>
      {/* Language picker above the stanza dots: the rail is the natural home
          for "view settings" of the text column, and it frees the header for
          a centred, untruncated hymn number. */}
      {translationOptions.length > 1 ? (
        <View style={{ alignItems: 'center', paddingTop: spacing.xl, paddingBottom: spacing.md }}>
          <GestureDetector gesture={languageGesture}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t('reader.translation')}: ${shortLang(parallel)}. ${t('reader.swipeLanguage')}`}
              hitSlop={HIT_SLOP}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                width: RAIL_DOT,
                minHeight: 30,
                borderRadius: radius.pill,
                backgroundColor: CHIP_COLORS[parallel].tint,
                borderWidth: 1,
                borderColor: CHIP_COLORS[parallel].fill,
                opacity: pressed ? 0.7 : 1,
              })}>
              <MaterialCommunityIcons name="chevron-left" size={10} color="#1A1A1A" style={{ opacity: 0.55 }} />
              <AppText
                variant="label"
                useAppFont={false}
                style={{ fontFamily: readerFontBold, fontSize: 12, fontWeight: '700', color: '#1A1A1A', marginHorizontal: 1 }}>
                {shortLang(parallel)}
              </AppText>
              <MaterialCommunityIcons name="chevron-right" size={10} color="#1A1A1A" style={{ opacity: 0.55 }} />
            </Pressable>
          </GestureDetector>
        </View>
      ) : null}
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
          // A refrain is a stanza too: it highlights when tapped or when its
          // text becomes the centred stanza, and looks normal otherwise.
          const isActive = activeVerseIndex === verseIndex;
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
                backgroundColor: isActive
                  ? colors.accent
                  : dark
                    ? 'rgba(255,255,255,0.14)'
                    : colors.surfaceMuted,
                borderWidth: isActive ? 2 : 1,
                borderColor: isActive
                  ? colors.accent
                  : dark
                    ? 'rgba(255,255,255,0.3)'
                    : colors.border,
                shadowColor: isActive ? colors.accent : undefined,
                shadowOffset: isActive ? { width: 0, height: 0 } : undefined,
                shadowOpacity: isActive ? 0.4 : 0,
                shadowRadius: isActive ? 8 : 0,
                elevation: isActive ? 4 : 0,
                opacity: pressed ? 0.6 : 1,
              })}>
              {isChorus ? (
                <MaterialCommunityIcons
                  name="repeat"
                  size={16}
                  color={isActive ? colors.onPrimary : dark ? palette.readerText : colors.text}
                />
              ) : (
                <AppText
                  variant="label"
                  useAppFont={false}
                  style={{
                    fontFamily: readerFontBold,
                    fontSize: 12,
                    fontWeight: '700',
                    color: isActive
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

      {/* Fullscreen has no top bar, so the exit control sits at the foot of the
          rail — away from the screen edge and near the thumb on a phone. */}
      {fullscreen ? (
        <View
          style={{
            alignItems: 'center',
            paddingTop: spacing.md,
            paddingBottom: insets.bottom + spacing.xl,
          }}>
          <Pressable
            onPress={onExitFullscreen}
            accessibilityRole="button"
            accessibilityLabel={t('reader.exitFullscreen')}
            hitSlop={HIT_SLOP}
            style={({ pressed }) => ({
              width: RAIL_DOT,
              height: RAIL_DOT,
              borderRadius: RAIL_DOT / 2,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.14)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.3)',
              opacity: pressed ? 0.6 : 1,
            })}>
            <MaterialCommunityIcons name="fullscreen-exit" size={18} color={palette.readerText} />
          </Pressable>
        </View>
      ) : null}
      {/* The same hymn as printed by another book. It sits at the foot of the
          rail — the empty stretch below the stanza dots — rather than in the
          header, so the "where am I" column also answers "where else is it".
          Outside the ScrollView so it stays reachable with many stanzas. */}
      {linked.length > 0 && !fullscreen ? (
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
