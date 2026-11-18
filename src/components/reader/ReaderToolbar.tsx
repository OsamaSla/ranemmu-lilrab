/**
 * The reader's compact header: the hymn number owns its own line, and the icon
 * toolbar shares the second line with a horizontally scrollable language strip.
 *
 * Prev/next, fullscreen, favourite, search and the overflow menu live here so
 * the bottom tab bar never hides and no tall sheet covers the hymn text. Search
 * sits outside the overflow menu for one-tap reach. The setlist position badge
 * appears between prev/next only while reading inside a shared `?ids=` set.
 */
import { Pressable, ScrollView, View } from 'react-native';

import { AppText } from '../AppText';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';
import type { HymnSummary } from '../../data/types';
import { palette, radius, spacing } from '../../theme/tokens';
import { ReaderIconButton } from './ReaderIconButton';
import { CHIP_COLORS, type ReaderLang } from './readerText';

/** Height of the slim compact toolbar row inside the header. */
export const TOOLBAR_HEIGHT = 48;

export interface TranslationOption {
  value: ReaderLang;
  label: string;
}

interface ReaderToolbarProps {
  dark: boolean;
  number: number;
  neighbours: { previous?: HymnSummary; next?: HymnSummary };
  inSet: boolean;
  setIndex: number;
  setTotal: number;
  onGoTo: (id: string) => void;
  fullscreen: boolean;
  onFullscreen: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onSearch: () => void;
  onOverflow: () => void;
  translationOptions: TranslationOption[];
  parallel: ReaderLang;
  onChooseLang: (lang: ReaderLang) => void;
}

export function ReaderToolbar({
  dark,
  number,
  neighbours,
  inSet,
  setIndex,
  setTotal,
  onGoTo,
  fullscreen,
  onFullscreen,
  isFavorite,
  onToggleFavorite,
  onSearch,
  onOverflow,
  translationOptions,
  parallel,
  onChooseLang,
}: ReaderToolbarProps) {
  const { t, direction } = useT();
  const { colors } = useTheme();

  const languageChips = () => {
    if (translationOptions.length <= 1) return null;
    // A roller rather than a fixed strip: on a 360px screen the four chips plus
    // the icon row cannot all fit, but the selected language stays reachable
    // and the hymn number gets the whole first line to itself.
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        accessibilityLabel={t('reader.translation')}
        style={{ flex: 1, minHeight: 34 }}
        contentContainerStyle={{
          flexDirection: direction.row,
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: 4,
        }}>
        {translationOptions.map((option) => {
          const selected = option.value === parallel;
          const short =
            option.value === 'ar'
              ? t('common.arShort')
              : option.value === 'en'
                ? t('common.enShort')
                : option.value === 'de'
                  ? t('common.deShort')
                  : t('common.heShort');
          const chip = CHIP_COLORS[option.value];
          return (
            <Pressable
              key={option.value}
              onPress={() => onChooseLang(option.value)}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              accessibilityState={{ selected }}
              hitSlop={4}
              android_ripple={{ color: dark ? 'rgba(255,255,255,0.3)' : colors.border }}
              style={({ pressed }) => ({
                minHeight: 30,
                minWidth: 34,
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: selected
                  ? 'transparent'
                  : dark
                    ? 'rgba(255,255,255,0.45)'
                    : 'rgba(255,255,255,0.55)',
                backgroundColor: selected ? chip.fill : chip.tint,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}>
              <AppText
                variant="label"
                numberOfLines={1}
                style={{
                  fontWeight: selected ? '700' : '500',
                  fontSize: 15,
                  lineHeight: 18,
                  fontFamily: 'Amiri',
                  color: selected ? (option.value === 'ar' ? '#1A1A1A' : '#FFFFFF') : '#1A1A1A',
                  textAlign: 'right',
                  direction: 'rtl',
                }}>
                {short}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    );
  };

  const iconToolbar = () => {
    const ink = dark ? palette.readerText : colors.onPrimary;
    const goPrev = () => {
      if (neighbours.previous) onGoTo(neighbours.previous.id);
    };
    const goNext = () => {
      if (neighbours.next) onGoTo(neighbours.next.id);
    };
    return (
      <View
        style={{
          flexDirection: direction.row,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          minHeight: TOOLBAR_HEIGHT,
          flexShrink: 0,
        }}>
        <ReaderIconButton
          name={direction.isRTL ? 'chevron-right' : 'chevron-left'}
          label={t('reader.previous')}
          disabled={!neighbours.previous}
          onPress={goPrev}
          dark={dark}
          box={32}
        />
        {inSet && setIndex >= 0 ? (
          <AppText
            variant="label"
            color={ink}
            useAppFont={false}
            style={{ minWidth: 38, textAlign: 'center', fontSize: 12, opacity: 0.85 }}>
            {`${setIndex + 1}/${setTotal}`}
          </AppText>
        ) : null}
        <ReaderIconButton
          name={direction.isRTL ? 'chevron-left' : 'chevron-right'}
          label={t('reader.next')}
          disabled={!neighbours.next}
          onPress={goNext}
          dark={dark}
          box={32}
        />
        <ReaderIconButton
          name={fullscreen ? 'fullscreen-exit' : 'fullscreen'}
          label={fullscreen ? t('reader.exitFullscreen') : t('reader.fullscreen')}
          onPress={onFullscreen}
          dark={dark}
          box={32}
        />
        <ReaderIconButton
          name={isFavorite ? 'star' : 'star-outline'}
          label={t('favorites.title')}
          onPress={onToggleFavorite}
          color={isFavorite ? colors.favorite : ink}
          dark={dark}
          box={32}
        />
        <ReaderIconButton
          name="magnify"
          label={t('search.placeholder')}
          onPress={onSearch}
          dark={dark}
          box={32}
        />
        <ReaderIconButton
          name="dots-vertical"
          label={t('reader.more')}
          onPress={onOverflow}
          dark={dark}
          box={32}
        />
      </View>
    );
  };

  return (
    <>
      {/* The number owns the whole line; chips used to squeeze it on phones. */}
      <View style={{ flexDirection: direction.row, alignItems: 'center' }}>
        <AppText
          variant="heading"
          numberOfLines={1}
          color={dark ? palette.readerText : colors.onPrimary}
          style={{ fontWeight: '700', flexShrink: 1 }}>
          {t('common.hymnNumber')} {number}
        </AppText>
      </View>
      <View
        style={{ flexDirection: direction.row, alignItems: 'center', marginTop: 2, gap: spacing.xs }}>
        {iconToolbar()}
        {languageChips()}
      </View>
    </>
  );
}
