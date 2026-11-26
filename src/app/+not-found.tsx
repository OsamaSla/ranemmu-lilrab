import { Link, Stack } from 'expo-router';
import { View } from 'react-native';

import { AppText } from '../components/AppText';
import { useT } from '../hooks/useT';
import { useTheme } from '../hooks/useTheme';
import { spacing } from '../theme/tokens';

export default function NotFoundScreen() {
  const { colors } = useTheme();
  const { t } = useT();

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
      <Stack.Screen options={{ title: t('notFound.title'), headerShown: false }} />
      <AppText variant="heading" style={{ color: colors.text, marginBottom: spacing.md, textAlign: 'center' }}>
        {t('notFound.title')} ({t('common.notFound')})
      </AppText>
      <Link href="/" style={{ marginTop: spacing.md, paddingVertical: spacing.sm }}>
        <AppText variant="body" style={{ color: colors.accent, fontWeight: '700' }}>
          {t('notFound.home')}
        </AppText>
      </Link>
    </View>
  );
}