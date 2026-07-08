import 'server-only';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';

/**
 * Shared admin-session access. The `auth.api.getSession({ headers })` call was
 * copy-pasted across the protected layout, the dashboard page, and the login
 * page; centralize it so every admin surface reads the session the same way.
 *
 * `getSession` returns `{ session, user } | null`. The `session.cookieCache`
 * (see src/lib/auth.ts) means most calls resolve from a signed cookie without a
 * DB round-trip, so calling this per-render is cheap.
 */
export async function getAdminSession() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Authorization gate for protected admin routes: returns the live session or
 * redirects to the login page. Use in the protected layout and any protected
 * page/server action that needs the acting user.
 */
export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  return session;
}
