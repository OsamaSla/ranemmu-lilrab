/**
 * Reader header, shared by the normal and fullscreen branches. Only the
 * surface and the author/topics lines differ; the back button and the compact
 * toolbar are identical, so keeping them in one place prevents the two modes
 * from drifting apart.
 */
import type { ComponentProps } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '../AppText';
import { IconButton } from '../IconButton';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';
import { spacing } from '../../theme/tokens';
import { ReaderIconButton } from './ReaderIconButton';
import { ReaderToolbar } from './ReaderToolbar';

type Props = {
  fullscreen: boolean;
  number: number;
  author?: string;
  authorOriginal?: string;
  topicsLine?: string;
  onTopicsPress?: () => void;
  onBack: () => void;
  topInset: number;
  toolbarProps: ComponentProps<typeof ReaderToolbar>;
};

export function ReaderHeader({
  fullscreen,
  number,
  author,
  authorOriginal,
  topicsLine,
  onTopicsPress,
  onBack,
  topInset,
  toolbarProps,
}: Props) {
  const { colors } = useTheme();
  const { t, direction } = useT();
  const backLabel = t('common.back');

  if (fullscreen) {
    return (
      <View
        style={{
          paddingTop: topInset + spacing.sm,
          flexDirection: direction.row,
          alignItems: 'center',
          paddingHorizontal: spacing.sm,
        }}>
        <ReaderIconButton name={direction.isRTL ? 'chevron-right' : 'chevron-left'} label={backLabel} onPress={onBack} dark />
        <View style={{ flex: 1, paddingHorizontal: spacing.xs }}>
          <ReaderToolbar {...toolbarProps} dark />
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        paddingTop: topInset + spacing.sm,
        paddingBottom: spacing.sm,
        paddingHorizontal: spacing.sm,
        backgroundColor: colors.primaryDeep,
      }}>
      {author || authorOriginal ? (
        <AppText
          variant="caption"
          numberOfLines={1}
          color={colors.onPrimary}
          style={{ opacity: 0.75, fontSize: 11, textAlign: direction.textAlign, paddingHorizontal: spacing.sm }}>
          {author ?? ''}
          {author && authorOriginal ? ' · ' : ''}
          {authorOriginal ?? ''}
        </AppText>
      ) : null}
      <View style={{ flexDirection: direction.row, alignItems: 'flex-start' }}>
        <IconButton
          name={direction.isRTL ? 'chevron-right' : 'chevron-left'}
          label={backLabel}
          color={colors.onPrimary}
          onPress={onBack}
        />
        <View style={{ flex: 1, paddingHorizontal: spacing.xs }}>
          <ReaderToolbar {...toolbarProps} dark={false} />
          {topicsLine ? (
            <Pressable
              onPress={onTopicsPress}
              accessibilityRole="button"
              accessibilityLabel={t('info.topics')}
              android_ripple={{ color: 'rgba(255,255,255,0.3)' }}>
              <AppText
                variant="caption"
                numberOfLines={1}
                color={colors.onPrimary}
                style={{ opacity: 0.85, textAlign: 'right', direction: 'rtl' }}>
                {topicsLine}
              </AppText>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}
