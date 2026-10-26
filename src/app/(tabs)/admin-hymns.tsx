/**
 * الإدارة ← الترنيمات — the two rare, structural actions.
 *
 * Both are here rather than on the review tab because they are one-offs, not a
 * workflow: adding a hymn opens its own screen, and deleting one is destructive
 * and needs a typed number, so neither belongs next to a list you scroll while
 * proofreading.
 */
import { useState } from 'react';
import { Alert, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';

import { AdminButton } from '../../components/admin/AdminButton';
import { AdminScreenShell } from '../../components/admin/AdminScreenShell';
import { AppText } from '../../components/AppText';
import { Card } from '../../components/Card';
import { getSummaries } from '../../data/loader';
import { normalizeText } from '../../data/normalize';
import { deleteHymnFromCloud } from '../../data/publish';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';
import { useOverrides } from '../../store/overrides';
import { radius, spacing } from '../../theme/tokens';

function toNumber(raw: string): number | null {
  const digits = normalizeText(raw.trim());
  if (!/^\d+$/.test(digits)) return null;
  const n = Number(digits);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

export default function AdminHymnsScreen() {
  const router = useRouter();
  const { t, direction } = useT();
  const { colors, fontFamily } = useTheme();

  const markDeleted = useOverrides((s) => s.markDeleted);

  const [num, setNum] = useState('');
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

  const doDelete = () => {
    const n = toNumber(num);
    const target = n === null ? undefined : getSummaries().find((s) => s.number === n);
    if (!target) {
      setMsg(t('admin.notFound'));
      return;
    }
    Alert.alert(t('admin.deleteConfirmTitle'), `${target.number}. ${target.title}`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('admin.deleteHymn'),
        style: 'destructive',
        onPress: () => {
          markDeleted(target.id);
          void deleteHymnFromCloud(target.id);
          setNum('');
          setMsg(t('admin.deleted'));
        },
      },
    ]);
  };

  return (
    <AdminScreenShell active="hymns">
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <Card style={{ marginBottom: spacing.md, padding: spacing.md }}>
          <AppText variant="body" style={{ fontWeight: '700', marginBottom: spacing.sm }}>
            {t('admin.addHymn')}
          </AppText>
          <AdminButton
            label={t('admin.addHymn')}
            onPress={() => router.push('/(tabs)/admin-add')}
          />
        </Card>

        <Card style={{ marginBottom: spacing.md, padding: spacing.md }}>
          <AppText variant="body" style={{ fontWeight: '700', marginBottom: spacing.sm }}>
            {t('admin.deleteHymn')}
          </AppText>
          <TextInput
            value={num}
            onChangeText={setNum}
            onSubmitEditing={doDelete}
            returnKeyType="go"
            keyboardType="number-pad"
            placeholder={t('admin.pickNumber')}
            placeholderTextColor={colors.textMuted}
            style={fieldStyle}
          />
          <AdminButton label={t('admin.deleteHymn')} onPress={doDelete} />
        </Card>

        {msg ? (
          <AppText variant="body" center color={colors.primary} style={{ fontWeight: '700' }}>
            {msg}
          </AppText>
        ) : null}
      </ScrollView>
    </AdminScreenShell>
  );
}
