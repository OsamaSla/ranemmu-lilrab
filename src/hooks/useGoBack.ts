/**
 * Back navigation to the previous browsed page.
 *
 * Pops the navigation history when there is one (deep links and fresh
 * launches have none — there back() would do nothing), otherwise replaces
 * to the home tab, the only screen without a back arrow.
 */
import { useRouter } from 'expo-router';
import { useCallback } from 'react';

export function useGoBack(): () => void {
  const router = useRouter();
  return useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);
}
