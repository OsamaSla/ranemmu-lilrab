/**
 * The Admin panel's section ruler: one row of pills, one section visible.
 *
 * Sections are real routes (`admin`, `admin-hymns`, `admin-feedback`,
 * `admin-publish`, `admin-security`) switched with `replace`, so tapping through
 * them does not grow the back stack — the AppBar chevron still leaves Admin
 * entirely. Each route renders this same row, which is why the active tab is a
 * prop rather than read from the path: the screen already knows which it is.
 *
 * "الأمان" only exists in builds without Firebase. With sign-in configured the
 * on-device PIN is never consulted (`hooks/useCanEdit`), so the tab would offer
 * a control that nothing reads.
 */
import { Pressable, ScrollView } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { AppText } from '../AppText';
import { isFirebaseConfigured } from '../../data/firebase';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';
import { radius, spacing } from '../../theme/tokens';
import type { TranslationKey } from '../../i18n';

export type AdminTab = 'review' | 'hymns' | 'feedback' | 'publish' | 'security';

const ITEMS: { key: AdminTab; href: Href; labelKey: TranslationKey; offlineOnly?: boolean }[] = [
  { key: 'review', href: '/admin', labelKey: 'admin.tabReview' },
  { key: 'hymns', href: '/admin-hymns', labelKey: 'admin.tabHymns' },
  { key: 'feedback', href: '/admin-feedback', labelKey: 'admin.tabFeedback' },
  { key: 'publish', href: '/admin-publish', labelKey: 'admin.tabPublish' },
  { key: 'security', href: '/admin-security', labelKey: 'admin.tabSecurity', offlineOnly: true },
];

interface AdminSectionTabsProps {
  active: AdminTab;
}

export function AdminSectionTabs({ active }: AdminSectionTabsProps) {
  const router = useRouter();
  const { t, direction } = useT();
  const { colors } = useTheme();

  const items = ITEMS.filter((item) => !item.offlineOnly || !isFirebaseConfigured);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // The row must scroll freely inside a vertical screen; the pills are the
      // only tappable thing here, so no nested-list conflicts.
      directionalLockEnabled
      contentContainerStyle={{
        flexDirection: direction.row,
        gap: spacing.xs,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
      }}>
      {items.map((item) => {
        const selected = item.key === active;
        return (
          <Pressable
            key={item.key}
            onPress={() => {
              if (selected) return;
              router.replace(item.href);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={({ pressed }) => ({
              paddingVertical: spacing.xs,
              paddingHorizontal: spacing.md,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: selected ? colors.primary : colors.border,
              backgroundColor: selected ? colors.primary : 'transparent',
              opacity: pressed ? 0.75 : 1,
            })}>
            <AppText
              variant="caption"
              color={selected ? colors.onPrimary : colors.text}
              style={{ fontWeight: '700' }}>
              {t(item.labelKey)}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
