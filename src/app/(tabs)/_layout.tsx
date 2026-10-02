/**
 * Bottom tab bar: الرئيسية · الحديثة · مساعدة · المزيد
 *
 * Tab labels come from i18n, but the order is fixed: the icon order follows the
 * same reading direction as the labels, so no reordering is needed per locale.
 *
 * The remaining screens live in this group with `href: null` — reachable by
 * navigation but with no tab button — so the bottom bar stays visible on every
 * screen. Route groups don't change URLs, so `/library` etc. keep working.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';

export default function TabsLayout() {
  const { colors } = useTheme();
  const { t } = useT();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontSize: 11, marginBottom: 4 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="recents"
        options={{
          title: t('tabs.recents'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="history" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="help"
        options={{
          title: t('tabs.help'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="book-open-page-variant" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t('tabs.more'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="dots-horizontal" color={color} size={size} />
          ),
        }}
      />
      {/* Hidden routes: pushed screens that keep the tab bar. */}
      <Tabs.Screen name="library" options={{ href: null, title: t('library.title') }} />
      <Tabs.Screen name="search" options={{ href: null, title: t('search.placeholder') }} />
      <Tabs.Screen name="structure" options={{ href: null, title: t('structure.title') }} />
      <Tabs.Screen name="favorites" options={{ href: null, title: t('favorites.title') }} />
      <Tabs.Screen name="settings" options={{ href: null, title: t('settings.title') }} />
      <Tabs.Screen name="hymn/[id]" options={{ href: null, title: t('common.hymnNumber') }} />
    </Tabs>
  );
}