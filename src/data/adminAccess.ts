/**
 * Who counts as an admin.
 *
 * A Firebase session alone is not enough: any account that exists (a test
 * account, or a stranger if sign-up is ever re-opened in the console) would
 * otherwise unlock the whole Admin area and pass the Firestore rules, which
 * only ask for `request.auth != null`. The allowlist is the app-side half of
 * the same check `firestore.rules` makes server-side — keep them in sync.
 *
 * Configure with `EXPO_PUBLIC_ADMIN_EMAILS` (comma-separated). The fallback is
 * the owner account so a build without the variable still works as before.
 */
const RAW = process.env.EXPO_PUBLIC_ADMIN_EMAILS ?? 'osama.sla@gmail.com';

/** Lower-cased admin addresses; Firebase stores e-mail addresses lower-cased. */
export const ADMIN_EMAILS: string[] = RAW.split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
