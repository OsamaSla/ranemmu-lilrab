/**
 * الإدارة — PIN-gated admin area.
 *
 * Edits land in the on-device override store (instant everywhere), never in
 * the bundled corpus. "Export" shares the patch set as JSON for
 * scripts/apply-overrides.mjs to merge into content/hymns-imported.xlsx.
 */
import { useState } from 'react';
import { Pressable, ScrollView, Share, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppBar } from '../../components/AppBar';
import { AppText } from '../../components/AppText';
import { Card } from '../../components/Card';
import { getSummaries } from '../../data/loader';
import { normalize } from '../../data/normalize';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';
import { useOverrides } from '../../store/overrides';
import { useSettings } from '../../store/settings';
import { radius, spacing } from '../../theme/tokens';

function toNumber(raw: string): number | null {
  const digits = normalize(raw.trim()).text;
  if (!/^\d+$/.test(digits)) return null;
  const n = Number(digits);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

export default function AdminScreen() {
  const router = useRouter();
  const { t, direction } = useT();
  const { colors, fontFamily } = useTheme();

  const adminPin = useSettings((s) => s.adminPin);
  const setAdminPin = useSettings((s) => s.setAdminPin);
  const overrides = useOverrides((s) => s.overrides);
  const setOverride = useOverrides((s) => s.setOverride);
  const clearAll = useOverrides((s) => s.clearAll);

  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [num, setNum] = useState('');
  const [swapA, setSwapA] = useState('');
  const [swapB, setSwapB] = useState('');
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

  const button = (label: string, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      android_ripple={{ color: colors.border }}
      style={({ pressed }) => ({
        marginTop: spacing.sm,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        backgroundColor: colors.primary,
        alignItems: 'center',
        opacity: pressed ? 0.75 : 1,
      })}>
      <AppText variant="label" color={colors.onPrimary} style={{ fontWeight: '700' }}>
        {label}
      </AppText>
    </Pressable>
  );

  const unlock = () => {
    if (pin === adminPin) {
      setUnlocked(true);
      setPinError(false);
      setPin('');
    } else {
      setPinError(true);
    }
  };

  const openForEdit = () => {
    const n = toNumber(num);
    const target = n === null ? undefined : getSummaries().find((s) => s.number === n);
    if (!target) {
      setMsg(t('admin.notFound'));
      return;
    }
    setMsg('');
    setNum('');
    router.push({ pathname: '/admin-edit', params: { id: target.id } });
  };

  const doSwap = () => {
    const a = toNumber(swapA);
    const b = toNumber(swapB);
    if (a === null || b === null || a === b) {
      setMsg(t('admin.errNumber'));
      return;
    }
    const summaries = getSummaries();
    const ha = summaries.find((s) => s.number === a);
    const hb = summaries.find((s) => s.number === b);
    if (!ha || !hb) {
      setMsg(t('admin.errNumber'));
      return;
    }
    setOverride(ha.id, { number: b });
    setOverride(hb.id, { number: a });
    setSwapA('');
    setSwapB('');
    setMsg(t('admin.swapped'));
  };

  const changePin = () => {
    if (!/^\d{4}$/.test(newPin.trim())) {
      setMsg(t('admin.wrongPin'));
      return;
    }
    setAdminPin(newPin.trim());
    setNewPin('');
    setMsg(t('admin.pinSaved'));
  };

  const doExport = () => {
    const payload = JSON.stringify(
      { app: 'ranemmu.lilrab', version: 1, exportedAt: new Date().toISOString(), overrides },
      null,
      1,
    );
    Share.share({ message: payload }).catch(() => {
      /* Dismissed share sheet is not an error worth surfacing. */
    });
  };

  const pendingCount = Object.keys(overrides).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <AppBar title={t('admin.title')} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        {!unlocked ? (
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
            {button(t('admin.unlock'), unlock)}
          </Card>
        ) : (
          <>
            <Card style={{ marginBottom: spacing.md, padding: spacing.md }}>
              <AppText variant="body" style={{ fontWeight: '700', marginBottom: spacing.sm }}>
                {t('admin.editHymn')}
              </AppText>
              <TextInput
                value={num}
                onChangeText={setNum}
                onSubmitEditing={openForEdit}
                returnKeyType="go"
                keyboardType="number-pad"
                placeholder={t('admin.pickNumber')}
                placeholderTextColor={colors.textMuted}
                style={fieldStyle}
              />
              {button(t('admin.open'), openForEdit)}
            </Card>

            <Card style={{ marginBottom: spacing.md, padding: spacing.md }}>
                <AppText variant="body" style={{ fontWeight: '700', marginBottom: spacing.sm }}>
                  {t('admin.addHymn')}
                </AppText>
                {button(t('admin.addHymn'), () => router.push('/(tabs)/admin-add'))}
            </Card>

            <Card style={{ marginBottom: spacing.md, padding: spacing.md }}>
                <AppText variant="body" style={{ fontWeight: '700', marginBottom: spacing.sm }}>
                  {t('admin.swapTitle')}
              </AppText>
              <View style={{ flexDirection: direction.row, gap: spacing.sm }}>
                <TextInput
                  value={swapA}
                  onChangeText={setSwapA}
                  keyboardType="number-pad"
                  placeholder="55"
                  placeholderTextColor={colors.textMuted}
                  style={[fieldStyle, { flex: 1 }]}
                />
                <TextInput
                  value={swapB}
                  onChangeText={setSwapB}
                  keyboardType="number-pad"
                  placeholder="56"
                  placeholderTextColor={colors.textMuted}
                  style={[fieldStyle, { flex: 1 }]}
                />
              </View>
              {button(t('admin.swap'), doSwap)}
            </Card>

            <Card style={{ marginBottom: spacing.md, padding: spacing.md }}>
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
              {button(t('admin.save'), changePin)}
            </Card>

            <Card style={{ marginBottom: spacing.md, padding: spacing.md }}>
              <AppText variant="body" style={{ fontWeight: '700', marginBottom: spacing.sm }}>
                {t('admin.export')} ({pendingCount})
              </AppText>
              <AppText variant="caption" color={colors.textMuted}>
                {pendingCount === 0 ? t('admin.noChanges') : t('admin.export')}
              </AppText>
              {pendingCount > 0 ? button(t('admin.export'), doExport) : null}
              {pendingCount > 0 ? button(t('admin.clearSynced'), () => {
                clearAll();
                setMsg(t('admin.cleared'));
              }) : null}
            </Card>

            {msg ? (
              <AppText variant="body" center color={colors.primary} style={{ fontWeight: '700' }}>
                {msg}
              </AppText>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}
