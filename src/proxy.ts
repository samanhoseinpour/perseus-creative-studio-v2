import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

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
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Runs for /admin and everything beneath it; nothing else on the site.
  matcher: ['/admin', '/admin/:path*'],
};
