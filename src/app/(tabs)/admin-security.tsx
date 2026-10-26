/**
 * الإدارة ← الأمان — the legacy on-device PIN, only for builds without Firebase.
 *
 * With Firebase configured this screen deliberately shows nothing editable:
 * `useCanEdit()` gates on a signed-in admin account and never reads `adminPin`
 * (see `hooks/useCanEdit`), so a "change PIN" form here would be security
 * theatre — it writes a value nothing consults. The tab is hidden too
 * (`AdminSectionTabs`), but the route stays reachable by URL, hence the
 * explanation rather than a redirect.
 */
import { useState } from 'react';
import { ScrollView, TextInput } from 'react-native';

import { AdminButton } from '../../components/admin/AdminButton';
import { AdminScreenShell } from '../../components/admin/AdminScreenShell';
import { AppText } from '../../components/AppText';
import { Card } from '../../components/Card';
import { isFirebaseConfigured } from '../../data/firebase';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';
import { useSettings } from '../../store/settings';
import { radius, spacing } from '../../theme/tokens';

export default function AdminSecurityScreen() {
  const { t, direction } = useT();
  const { colors, fontFamily } = useTheme();

  const setAdminPin = useSettings((s) => s.setAdminPin);

  const [newPin, setNewPin] = useState('');
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

  const changePin = () => {
    if (!/^\d{4}$/.test(newPin.trim())) {
      setMsg(t('admin.wrongPin'));
      return;
    }
    setAdminPin(newPin.trim());
    setNewPin('');
    setMsg(t('admin.pinSaved'));
  };

  return (
    <AdminScreenShell active="security">
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        {isFirebaseConfigured ? (
          <Card style={{ padding: spacing.md }}>
            <AppText variant="body" style={{ fontWeight: '700', marginBottom: spacing.sm }}>
              {t('admin.securitySignInTitle')}
            </AppText>
            <AppText variant="caption" color={colors.textMuted}>
              {t('admin.securitySignInHint')}
            </AppText>
          </Card>
        ) : (
          <Card style={{ padding: spacing.md }}>
            <AppText variant="body" style={{ fontWeight: '700', marginBottom: spacing.sm }}>
              {t('admin.newPin')}
            </AppText>
            <TextInput
              value={newPin}
              onChangeText={setNewPin}
              onSubmitEditing={changePin}
              returnKeyType="done"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={8}
              placeholder={t('admin.pinPlaceholder')}
              placeholderTextColor={colors.textMuted}
              style={fieldStyle}
            />
            <AdminButton label={t('admin.save')} onPress={changePin} />
            {msg ? (
              <AppText
                variant="caption"
                color={msg === t('admin.pinSaved') ? colors.primary : colors.danger}
                style={{ marginTop: spacing.sm, fontWeight: '700' }}>
                {msg}
              </AppText>
            ) : null}
          </Card>
        )}
      </ScrollView>
    </AdminScreenShell>
  );
}
