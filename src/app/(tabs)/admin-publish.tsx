/**
 * الإدارة ← النشر — flush the on-device override set to Firestore.
 *
 * Edits already sync silently on every save (see `data/liveSync`); this screen
 * exists for the explicit flush, the pending count, and the account it uses.
 */
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { AdminButton } from '../../components/admin/AdminButton';
import { AdminScreenShell } from '../../components/admin/AdminScreenShell';
import { AppText } from '../../components/AppText';
import { Card } from '../../components/Card';
import { isFirebaseConfigured } from '../../data/firebase';
import { publishOverrides } from '../../data/publish';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';
import { useOverrides } from '../../store/overrides';
import { useSession } from '../../store/session';
import { spacing } from '../../theme/tokens';

export default function AdminPublishScreen() {
  const { t } = useT();
  const { colors } = useTheme();

  const overrides = useOverrides((s) => s.overrides);
  const clearAll = useOverrides((s) => s.clearAll);
  const sessionUser = useSession((s) => s.user);
  const signOut = useSession((s) => s.signOut);

  const [publishing, setPublishing] = useState(false);
  const [msg, setMsg] = useState('');

  const pendingCount = Object.keys(overrides ?? {}).length;

  const doPublish = async () => {
    if (publishing) return;
    setPublishing(true);
    setMsg(t('admin.publishing'));
    const result = await publishOverrides(overrides);
    setPublishing(false);
    // Everything local is in Firestore now, so the local copies only risk
    // masking fresher cloud data (an old empty mediaUrl, for example). The
    // live listener re-applies them from the cloud a moment later.
    if (result.ok) clearAll();
    setMsg(
      result.messageKey === 'admin.published'
        ? `${t(result.messageKey)} (${result.saved})`
        : t(result.messageKey),
    );
  };

  return (
    <AdminScreenShell active="publish">
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <Card style={{ marginBottom: spacing.md, padding: spacing.md }}>
          <AppText variant="body" style={{ fontWeight: '700', marginBottom: spacing.sm }}>
            {t('admin.publishTitle')} ({pendingCount})
          </AppText>
          {isFirebaseConfigured && sessionUser ? (
            <AppText variant="caption" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>
              {t('admin.signedInAs')} {sessionUser.email}
            </AppText>
          ) : null}
          {isFirebaseConfigured && !sessionUser ? (
            <AppText
              variant="caption"
              color={colors.primary}
              style={{ marginBottom: spacing.sm, fontWeight: '700' }}
            >
              {t('admin.notSignedIn')} — {t('admin.syncNoAuth')}
            </AppText>
          ) : null}
          {pendingCount > 0 ? (
            <AdminButton
              label={publishing ? t('admin.publishing') : t('admin.publishNow')}
              onPress={() => {
                void doPublish();
              }}
              disabled={publishing}
            />
          ) : (
            <AppText variant="caption" color={colors.textMuted}>
              {t('admin.noChanges')}
            </AppText>
          )}
          {isFirebaseConfigured && sessionUser ? (
            <AdminButton
              label={t('admin.signOut')}
              onPress={() => {
                void signOut();
              }}
            />
          ) : null}
        </Card>

        {msg ? (
          <AppText variant="body" center color={colors.primary} style={{ fontWeight: '700' }}>
            {msg}
          </AppText>
        ) : null}
        <View style={{ height: spacing.md }} />
      </ScrollView>
    </AdminScreenShell>
  );
}
