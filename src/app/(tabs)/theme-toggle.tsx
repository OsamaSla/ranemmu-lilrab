/**
 * Theme toggle tab — a bottom-bar shortcut that flips light/dark mode
 * without leaving the current screen. The tab button itself performs the
 * toggle (see `(tabs)/_layout.tsx`); this screen is only a fallback target.
 */
import { Redirect } from 'expo-router';

export default function ThemeToggleScreen() {
  return <Redirect href="/" />;
}
