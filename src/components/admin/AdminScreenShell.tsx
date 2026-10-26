/**
 * Frame shared by every Admin section: title bar, gate, and the section ruler.
 *
 * Each section is its own route (`/admin`, `/admin-hymns`, `/admin-feedback`,
 * `/admin-publish`, `/admin-security`) and renders its body as children. That
 * keeps a tab readable in one look and keeps the gate in a single place: hiding
 * a button is never enough, the routes are URL-reachable, so `useCanEdit()` is
 * checked here for all of them.
 */
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { AdminGate } from './AdminGate';
import { AdminSectionTabs, type AdminTab } from './AdminSectionTabs';
import { AppBar } from '../AppBar';
import { useCanEdit } from '../../hooks/useCanEdit';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';

interface AdminScreenShellProps {
  active: AdminTab;
  children: ReactNode;
}

export function AdminScreenShell({ active, children }: AdminScreenShellProps) {
  const { t } = useT();
  const { colors } = useTheme();
  const canEdit = useCanEdit();

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <AppBar title={t('admin.title')} showBack />
      {canEdit ? (
        <>
          <AdminSectionTabs active={active} />
          {children}
        </>
      ) : (
        <AdminGate />
      )}
    </View>
  );
}
