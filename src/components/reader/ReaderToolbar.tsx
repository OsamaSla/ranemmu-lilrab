/**
 * The reader's compact header row: language chips above a single icon toolbar.
 *
 * Prev/next, fullscreen, favourite and the overflow menu live here so the
 * bottom tab bar never hides and no tall sheet covers the hymn text. The
 * setlist position badge appears between prev/next only while reading inside a
 * shared `?ids=` set.
 */
import { Pressable, View } from 'react-native';

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
  onOverflow,
  translationOptions,
  parallel,
  onChooseLang,
}: ReaderToolbarProps) {
  const { t, direction } = useT();
  const { colors } = useTheme();

  const languageChips = () => {
    if (translationOptions.length <= 1) return null;
    return (
      <View
        style={{
          flexDirection: direction.row,
          alignItems: 'center',
          gap: 4,
          paddingRight: 9,
          paddingLeft: 8,
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
              hitSlop={6}
              android_ripple={{ color: dark ? 'rgba(255,255,255,0.3)' : colors.border }}
              style={({ pressed }) => ({
                minHeight: 32,
                minWidth: 40,
                paddingHorizontal: spacing.sm,
                paddingVertical: 4,
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
                  fontSize: 18,
                  lineHeight: 21,
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
      </View>
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
          flex: 1,
        }}>
        <ReaderIconButton
          name={direction.isRTL ? 'chevron-right' : 'chevron-left'}
          label={t('reader.previous')}
          disabled={!neighbours.previous}
          onPress={goPrev}
          dark={dark}
          box={36}
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
          box={36}
        />
        <ReaderIconButton
          name={fullscreen ? 'fullscreen-exit' : 'fullscreen'}
          label={fullscreen ? t('reader.exitFullscreen') : t('reader.fullscreen')}
          onPress={onFullscreen}
          dark={dark}
          box={36}
        />
        <ReaderIconButton
          name={isFavorite ? 'star' : 'star-outline'}
          label={t('favorites.title')}
          onPress={onToggleFavorite}
          color={isFavorite ? colors.favorite : ink}
          dark={dark}
          box={36}
        />
        <ReaderIconButton
          name="dots-vertical"
          label={t('reader.more')}
          onPress={onOverflow}
          dark={dark}
          box={36}
        />
      </View>
    );
  };

  return (
    <>
      <View style={{ flexDirection: direction.row, alignItems: 'center', justifyContent: 'center' }}>
        <AppText
          variant="heading"
          numberOfLines={1}
          color={dark ? palette.readerText : colors.onPrimary}
          style={{ fontWeight: '700', marginEnd: spacing.md, flexShrink: 1 }}>
          {t('common.hymnNumber')} {number}
        </AppText>
        {languageChips()}
      </View>
      <View
        style={{ flexDirection: direction.row, alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
        {iconToolbar()}
      </View>
    </>
  );
}
