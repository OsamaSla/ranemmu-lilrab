/**
 * الإعدادات — appearance, language, typography and data.
 *
 * Every control writes straight into the persisted stores, so there is no save
 * step to forget and leaving the screen never loses a change.
 */
import { Alert, Pressable, ScrollView, View } from 'react-native';
import Constants from 'expo-constants';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';

import { AppBar } from '../../components/AppBar';
import { AppText } from '../../components/AppText';
import { Card } from '../../components/Card';
import { FontChips } from '../../components/FontChips';
import { IconButton } from '../../components/IconButton';
import { SegmentedControl } from '../../components/SegmentedControl';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';
import { useLibrary } from '../../store/library';
import {
  APP_SCALE_MAX,
  APP_SCALE_MIN,
  APP_SCALE_STEP,
  READER_SIZE_MAX,
  READER_SIZE_MIN,
  READER_SIZE_STEP,
  useSettings,
  type ThemePreference,
} from '../../store/settings';
import { spacing } from '../../theme/tokens';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export default function SettingsScreen() {
  const { t } = useT();
  const { colors } = useTheme();

  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);
  const fontFamily = useSettings((s) => s.fontFamily);
  const setFontFamily = useSettings((s) => s.setFontFamily);
  const appScale = useSettings((s) => s.appScale);
  const setAppScale = useSettings((s) => s.setAppScale);
  const readerSize = useSettings((s) => s.readerSize);
  const setReaderSize = useSettings((s) => s.setReaderSize);
  const clearRecents = useLibrary((s) => s.clearRecents);

  const confirmClearRecents = () =>
    Alert.alert(t('recents.clear'), t('recents.emptyHint'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.ok'), style: 'destructive', onPress: clearRecents },
    ]);

  // Translations live per hymn in the reader now; the chrome stays Arabic.
  const percent = '٪';

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <AppBar title={t('settings.title')} />

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <Section title={t('settings.appearance')}>
          <Label text={t('settings.theme')} />
          <SegmentedControl
            value={theme}
            onChange={(value) => setTheme(value as ThemePreference)}
            options={[
              { value: 'light', label: t('settings.themeLight') },
              { value: 'dark', label: t('settings.themeDark') },
              { value: 'system', label: t('settings.themeSystem') },
            ]}
          />
        </Section>

        <Section title={t('reader.fontFamily')}>
          <FontChips value={fontFamily} onChange={setFontFamily} />
        </Section>

        <Section title={t('settings.appFontSize')}>
          <Stepper
            value={`${Math.round(appScale * 100)}${percent}`}
            decreaseLabel={t('reader.decreaseFont')}
            increaseLabel={t('reader.increaseFont')}
            onDecrease={() => setAppScale(appScale - APP_SCALE_STEP)}
            onIncrease={() => setAppScale(appScale + APP_SCALE_STEP)}
            decreaseDisabled={appScale <= APP_SCALE_MIN + 1e-9}
            increaseDisabled={appScale >= APP_SCALE_MAX - 1e-9}
          />
        </Section>

        <Section title={t('settings.readerFontSize')}>
          <Stepper
            value={`${readerSize}`}
            decreaseLabel={t('reader.decreaseFont')}
            increaseLabel={t('reader.increaseFont')}
            onDecrease={() => setReaderSize(readerSize - READER_SIZE_STEP)}
            onIncrease={() => setReaderSize(readerSize + READER_SIZE_STEP)}
            decreaseDisabled={readerSize <= READER_SIZE_MIN}
            increaseDisabled={readerSize >= READER_SIZE_MAX}
          />
        </Section>

        <Section title={t('settings.data')}>
          <IconRowButton
            icon="history"
            label={t('recents.clear')}
            destructive
            onPress={confirmClearRecents}
          />
        </Section>

        <Section title={t('settings.about')}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="body">{t('appName')}</AppText>
            <AppText variant="body" color={colors.textMuted}>
              {t('settings.version')} {APP_VERSION}
            </AppText>
          </View>
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card style={{ marginBottom: spacing.md, padding: spacing.md }}>
      <AppText variant="body" style={{ fontWeight: '700', marginBottom: spacing.md }}>
        {title}
      </AppText>
      {children}
    </Card>
  );
}

function Label({ text }: { text: string }) {
  const { colors } = useTheme();

  return (
    <AppText variant="label" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>
      {text}
    </AppText>
  );
}

function Stepper({
  value,
  decreaseLabel,
  increaseLabel,
  onDecrease,
  onIncrease,
  decreaseDisabled,
  increaseDisabled,
}: {
  value: string;
  decreaseLabel: string;
  increaseLabel: string;
  onDecrease: () => void;
  onIncrease: () => void;
  decreaseDisabled: boolean;
  increaseDisabled: boolean;
}) {
  const { colors } = useTheme();
  const { direction } = useT();

  return (
    <View style={{ flexDirection: direction.row, alignItems: 'center', justifyContent: 'space-between' }}>
      <IconButton
        name="minus"
        label={decreaseLabel}
        onPress={onDecrease}
        disabled={decreaseDisabled}
        style={{ opacity: decreaseDisabled ? 0.35 : 1 }}
      />
      <AppText variant="title" color={colors.text} style={{ fontWeight: '700' }}>
        {value}
      </AppText>
      <IconButton
        name="plus"
        label={increaseLabel}
        onPress={onIncrease}
        disabled={increaseDisabled}
        style={{ opacity: increaseDisabled ? 0.35 : 1 }}
      />
    </View>
  );
}

function IconRowButton({
  icon,
  label,
  destructive,
  onPress,
}: {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  destructive?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const { direction } = useT();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      android_ripple={{ color: colors.border }}
      style={({ pressed }) => ({
        flexDirection: direction.row,
        alignItems: 'center',
        minHeight: 48,
        opacity: pressed ? 0.65 : 1,
      })}>
      <MaterialCommunityIcons
        name={icon}
        size={24}
        color={destructive ? colors.danger : colors.text}
      />
      <AppText
        variant="body"
        color={destructive ? colors.danger : colors.text}
        style={{ marginHorizontal: spacing.md }}>
        {label}
      </AppText>
    </Pressable>
  );
}
