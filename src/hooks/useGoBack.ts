/**
 * Back navigation that never strands the user on home.
 *
 * Pops the navigation history when there is one (deep links and fresh
 * launches have none — there back() would fall through to the home tab),
 * otherwise replaces to the library, the natural parent of pushed screens.
 */
import { useRouter } from 'expo-router';
import { useCallback } from 'react';

export function useGoBack(): () => void {
  const router = useRouter();
  return useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/library');
  }, [router]);
}
