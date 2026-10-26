/**
 * Single answer to "may the current visitor edit hymns?".
 *
 * Two gates exist, because the deployed build and an offline/dev build are
 * different situations:
 *
 * - Firebase configured (the live site): editing requires a signed-in admin.
 *   Firestore rules enforce the same thing server-side, so this only hides UI
 *   that would fail anyway.
 * - Firebase not configured: the legacy on-device PIN, unlocked on the Admin
 *   screen and held in `store/adminGate` for the session.
 *
 * Every editing entry point (reader settings sheet, admin-edit, admin-add) uses
 * this hook so the gates cannot drift apart again.
 */
import { isFirebaseConfigured } from '../data/firebase';
import { useAdminGate } from '../store/adminGate';
import { useSession } from '../store/session';

export function useCanEdit(): boolean {
  const user = useSession((s) => s.user);
  const unlocked = useAdminGate((s) => s.unlocked);

  return isFirebaseConfigured ? user !== null : unlocked;
}
