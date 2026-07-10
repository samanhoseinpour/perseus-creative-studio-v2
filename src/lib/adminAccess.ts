import 'server-only';
import { redirect } from 'next/navigation';

import { requireAdmin } from '@/lib/adminSession';

/**
 * The privileged-admin seam. Every admin user can sign in, raise tickets, and
 * work the inboxes; only this allow-list can triage tickets and open the
 * fully-private surfaces (/admin/database). It's an email list (not a role
 * column) on purpose: signup is disabled and the seed roster
 * (scripts/seed-admins.mts) is exactly these three accounts, so a DB-backed
 * role adds nothing today. When the user-management phase lands (Better Auth
 * admin plugin / role column), swap the internals of THIS module — every
 * privileged page, action, and route already resolves through it.
 */
export const PRIVILEGED_ADMINS = [
  'info@perseustudio.com',
  'aryangh1a@gmail.com',
  'samangithoseinpour@gmail.com',
];

/** Whether an account is on the privileged allow-list. */
export function isPrivilegedAdmin(email: string | null | undefined): boolean {
  return !!email && PRIVILEGED_ADMINS.includes(email.toLowerCase());
}

/**
 * Authorization gate for privileged-only pages/mutations/streams. Layers on
 * `requireAdmin()` (so signed-out → login); a signed-in non-privileged admin
 * is bounced to `redirectTo` — pass the closest page they ARE allowed to see
 * (e.g. '/admin/tickets' from ticket triage, '/admin' from the database).
 */
export async function requirePrivilegedAdmin(redirectTo = '/admin') {
  const session = await requireAdmin();
  if (!isPrivilegedAdmin(session.user.email)) redirect(redirectTo);
  return session;
}
