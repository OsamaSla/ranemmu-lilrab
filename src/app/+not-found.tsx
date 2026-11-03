import { Link, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { useTheme } from '../hooks/useTheme';
import { spacing } from '../theme/tokens';

export default function NotFoundScreen() {
  const { colors } = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'الصفحة غير موجودة', headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.canvas }]}>
        <AppText variant="heading" style={{ color: colors.text, marginBottom: spacing.md }}>
          الصفحة غير موجودة (404)
        </AppText>
        <Link href="/" style={styles.link}>
          <AppText variant="body" style={{ color: colors.accent, fontWeight: '700' }}>
            العودة إلى الصفحة الرئيسية
          </AppText>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  link: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
});
