/**
 * Reader header, shared by the normal and fullscreen branches. It carries only
 * the back button and the compact toolbar now: the author and topics lines were
 * removed because both already live in «معلومات الترنيمة» (whose topic rows
 * still navigate to the filtered library), and on a narrow phone those lines
 * cost a quarter of the screen for duplicated information. Keeping the two
 * modes in one place prevents them from drifting apart.
 */
import type { ComponentProps } from 'react';
import { View } from 'react-native';

import { IconButton } from '../IconButton';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';
import { spacing } from '../../theme/tokens';
import { ReaderIconButton } from './ReaderIconButton';
import { ReaderToolbar } from './ReaderToolbar';

type Props = {
  fullscreen: boolean;
  onBack: () => void;
  topInset: number;
  toolbarProps: ComponentProps<typeof ReaderToolbar>;
};

export function ReaderHeader({ fullscreen, onBack, topInset, toolbarProps }: Props) {
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
      <View style={{ flexDirection: direction.row, alignItems: 'center' }}>
        <IconButton
          name={direction.isRTL ? 'chevron-right' : 'chevron-left'}
          label={backLabel}
          color={colors.onPrimary}
          onPress={onBack}
        />
        <View style={{ flex: 1, paddingHorizontal: spacing.xs }}>
          <ReaderToolbar {...toolbarProps} dark={false} />
        </View>
      </View>
    </View>
  );
}
