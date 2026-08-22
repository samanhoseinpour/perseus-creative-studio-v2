import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

import { safeAdminReturnPath } from '@/lib/sessionPolicy';

// Next 16's "proxy" convention (formerly "middleware"). Optimistic gate for the
// admin area: this ONLY checks that a session cookie exists (no DB call,
// edge-safe) so unauthenticated visitors are bounced to the login page fast. It
// is NOT the real authorization boundary — the (protected)/layout.tsx server
// component validates the session against the DB.
//
// /admin/login and /admin/reset-password are intentionally reachable without a
// session, otherwise a logged-out user could never reach the login form.
const PUBLIC_ADMIN_PATHS = ['/admin/login', '/admin/reset-password'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_ADMIN_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (isPublic) return NextResponse.next();

  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const loginUrl = new URL('/admin/login', request.url);
    // Carry the page they were heading for, so the login page can send them
    // back to it — with a 24-hour idle window the bounce is routine, and
    // landing on Overview instead of the report you opened is what makes
    // re-signing-in feel like a punishment. The proxy also runs for RSC
    // prefetches, whose query carries Next's `_rsc` cache-busting hash; strip
    // it or the return URL would remember a stale one. safeAdminReturnPath is
    // the open-redirect guard, shared with the login page that reads this.
    // No loop: /admin/login is public and returned above before this branch.
    const params = new URLSearchParams(request.nextUrl.search);
    params.delete('_rsc');
    const qs = params.toString();
    const back = safeAdminReturnPath(qs ? `${pathname}?${qs}` : pathname);
    if (back) loginUrl.searchParams.set('next', back);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Runs for /admin and everything beneath it; nothing else on the site.
  matcher: ['/admin', '/admin/:path*'],
};
