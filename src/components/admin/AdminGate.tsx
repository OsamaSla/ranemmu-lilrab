/**
 * The locked state of the Admin area — the only way in.
 *
 * Two gates exist because a deployed build and an offline/dev build are
 * different situations (`hooks/useCanEdit`):
 *
 * - Firebase configured: email + password, and Firestore rules enforce the same
 *   thing server-side.
 * - Firebase missing: the legacy on-device PIN, unlocked into `store/adminGate`
 *   for the session. Purely a local speed bump, never security.
 *
 * Every Admin route renders this through `AdminScreenShell`, so the sign-in form
 * moved here instead of being duplicated per section.
 */
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { AdminButton } from './AdminButton';
import { AppText } from '../AppText';
import { Card } from '../Card';
import { isFirebaseConfigured } from '../../data/firebase';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';
import { useAdminGate } from '../../store/adminGate';
import { useSession } from '../../store/session';
import { useSettings } from '../../store/settings';
import { radius, spacing } from '../../theme/tokens';

export function AdminGate() {
  const { t, direction } = useT();
  const { colors, fontFamily } = useTheme();

  const adminPin = useSettings((s) => s.adminPin);
  const signIn = useSession((s) => s.signIn);
  const unlockAdmin = useAdminGate((s) => s.unlock);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [msg, setMsg] = useState('');

  const fieldStyle = {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    color: colors.text,
    fontFamily,
    fontSize: 16,
    textAlign: direction.textAlign,
  } as const;

  const doLogin = async () => {
    if (signingIn) return;
    setSigningIn(true);
    const ok = await signIn(email, password);
    setSigningIn(false);
    // On success this component unmounts (the shell renders the sections), so
    // there is nothing to reset here.
    if (!ok) setMsg(t('admin.authFailed'));
  };

  const unlock = () => {
    if (pin === adminPin) {
      unlockAdmin();
      setPinError(false);
      setPin('');
    } else {
      setPinError(true);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
      {isFirebaseConfigured ? (
        <Card style={{ padding: spacing.md }}>
          <AppText variant="body" style={{ fontWeight: '700', marginBottom: spacing.sm }}>
            {t('admin.title')}
          </AppText>
          <TextInput
            value={email}
            onChangeText={setEmail}
            onSubmitEditing={() => {
              void doLogin();
            }}
            returnKeyType="next"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t('admin.email')}
            placeholderTextColor={colors.textMuted}
            style={[fieldStyle, { marginBottom: spacing.sm }]}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={() => {
              void doLogin();
            }}
            returnKeyType="go"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t('admin.password')}
            placeholderTextColor={colors.textMuted}
            style={fieldStyle}
          />
          {msg ? (
            <AppText variant="caption" color={colors.danger} style={{ marginTop: spacing.xs }}>
              {msg}
            </AppText>
          ) : null}
          <AdminButton
            label={signingIn ? t('admin.publishing') : t('admin.signIn')}
            onPress={() => {
              void doLogin();
            }}
            disabled={signingIn}
          />
        </Card>
      ) : (
        <Card style={{ padding: spacing.md }}>
          <AppText variant="body" style={{ fontWeight: '700', marginBottom: spacing.sm }}>
            {t('admin.pinTitle')}
          </AppText>
          <TextInput
            value={pin}
            onChangeText={(v) => {
              setPin(v);
              setPinError(false);
            }}
            onSubmitEditing={unlock}
            returnKeyType="go"
            keyboardType="number-pad"
            secureTextEntry
            maxLength={8}
            placeholder={t('admin.pinPlaceholder')}
            placeholderTextColor={colors.textMuted}
            style={fieldStyle}
          />
          {pinError ? (
            <AppText variant="caption" color={colors.danger} style={{ marginTop: spacing.xs }}>
              {t('admin.wrongPin')}
            </AppText>
          ) : null}
          <AdminButton label={t('admin.unlock')} onPress={unlock} />
          <AppText variant="caption" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
            {t('admin.noCloud')}
          </AppText>
        </Card>
      )}
      <View style={{ height: spacing.md }} />
    </ScrollView>
  );
}
