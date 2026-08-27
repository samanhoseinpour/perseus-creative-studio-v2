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
 * The same session, read FRESH from the database — the cookie cache skipped.
 *
 * The login page is the only caller, and the reason is that it is the only
 * surface whose decision is "you do NOT need this form". Everywhere else the
 * answer means "render the dashboard", and the cached read is right there:
 * it saves a round trip, and getAccessProfile() re-reads authorization from
 * the user row anyway, so none of the cache's staleness reaches permissions.
 *
 * Here it would be wrong, because the page this one hands you to disagrees.
 * getAccessProfile() bounces back to /admin/login when the user row is gone —
 * a deleted account whose signed cookie is still inside the 5-minute window —
 * so a cached "yes" sends the browser /admin -> /admin/login -> /admin until
 * the cache lapses. The login form is one of the two hops, which means nobody
 * can sign in on that browser while it spins. One round trip, on a page that
 * is not rendered in a loop, is what makes the two agree.
 */
export async function getLiveAdminSession() {
  return auth.api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });
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
