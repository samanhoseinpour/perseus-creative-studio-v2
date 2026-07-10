import 'server-only';
import { redirect } from 'next/navigation';

import { requireAdmin } from '@/lib/adminSession';

/**
 * The tickets permission seam. Every admin user can RAISE a ticket; only this
 * allow-list can see all tickets and change their status. It's an email list
 * (not a role column) on purpose: signup is disabled and the seed roster
 * (scripts/seed-admins.mts) is exactly these three accounts, so a DB-backed
 * role adds nothing today. When the user-management phase lands (Better Auth
 * admin plugin / role column), swap the internals of THIS module — every
 * privileged page, action, and route already resolves through it.
 */
export const TICKET_TRIAGERS = [
  'info@perseustudio.com',
  'aryangh1a@gmail.com',
  'samangithoseinpour@gmail.com',
];

/** Whether an account may view all tickets and triage status. */
export function isTicketTriager(email: string | null | undefined): boolean {
  return !!email && TICKET_TRIAGERS.includes(email.toLowerCase());
}

/**
 * Authorization gate for triager-only mutations/streams. Layers on
 * `requireAdmin()` (so signed-out → login); a signed-in non-triager is
 * bounced to the tickets list they're allowed to see.
 */
export async function requireTicketTriager() {
  const session = await requireAdmin();
  if (!isTicketTriager(session.user.email)) redirect('/admin/tickets');
  return session;
}
