/**
 * The reader's compact header: the hymn number owns its own line, and the icon
 * toolbar shares the second line with a horizontally scrollable language strip.
 *
 * Prev/next, fullscreen, favourite, search and the overflow menu live here so
 * the bottom tab bar never hides and no tall sheet covers the hymn text. Search
 * sits outside the overflow menu for one-tap reach. The setlist position badge
 * appears between prev/next only while reading inside a shared `?ids=` set.
 */
import { View } from 'react-native';

import { AppText } from '../AppText';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';
import type { HymnSummary } from '../../data/types';
import { palette } from '../../theme/tokens';
import { ReaderIconButton } from './ReaderIconButton';
import type { ReaderLang } from './readerText';

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
}: ReaderToolbarProps) {
  const { t, direction } = useT();
  const { colors } = useTheme();

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
      {/* Centred on its own line; language selection now lives in the rail. */}
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <AppText
          variant="heading"
          numberOfLines={1}
          color={dark ? palette.readerText : colors.onPrimary}
          style={{ fontWeight: '700', textAlign: 'center', flexShrink: 1 }}>
          {t('common.hymnNumber')} {number}
        </AppText>
      </View>
      <View
        style={{ flexDirection: direction.row, alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
        {iconToolbar()}
      </View>
    </>
  );
}
