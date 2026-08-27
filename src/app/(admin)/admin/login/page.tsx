import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getLiveAdminSession } from '@/lib/adminSession';
import { adminRouteLabel } from '@/lib/adminNav';
import { safeAdminReturnPath } from '@/lib/sessionPolicy';
import LoginForm from './LoginForm';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to the Perseus Creative Studio admin dashboard.',
};

type Props = { searchParams: Promise<{ next?: string | string[] }> };

/**
 * `?next=` is written by src/proxy.ts when it bounces a sessionless request,
 * so that signing back in lands on the page you were heading for rather than
 * Overview. It is re-validated HERE, not trusted: anyone can type a query
 * string, and safeAdminReturnPath (the same guard the proxy used to write it)
 * is what keeps this from being an open redirect. Anything it refuses falls
 * back to /admin.
 *
 * The copy never claims WHY you are here. The proxy cannot tell an expired
 * session from a first visit — the browser has already dropped the cookie in
 * both cases — and "your session expired" shown to someone who simply opened
 * a bookmark would be a lie.
 */
export default async function AdminLoginPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const back = safeAdminReturnPath(Array.isArray(next) ? next[0] : next);

  // Already signed in? Skip the form — but ask the DATABASE, not the cookie
  // cache. This is the one decision that has to agree with the page it hands
  // you to: getAccessProfile() reads the user row fresh and redirects straight
  // back here when the account is gone, so a cached "yes" would ping-pong
  // /admin and /admin/login until the cache lapsed — with this form as one of
  // the two hops, so nobody could sign in on that browser meanwhile.
  const session = await getLiveAdminSession();
  if (session) redirect(back ?? '/admin');

  // "Sign in to continue to Tasks." — only when there is somewhere specific
  // to continue to. Overview is the default landing, so naming it adds nothing,
  // and adminRouteLabel's 'Admin' fallback means "no idea", not a place.
  //
  // Compare the PATH, never `back` itself: safeAdminReturnPath preserves the
  // query verbatim, so a `/admin?utm_source=…` return path would slip past a
  // bare `back !== '/admin'` and name Overview after all.
  const path = back?.split('?')[0] ?? null;
  const label = path && path !== '/admin' ? adminRouteLabel(path) : null;
  const continueTo = label && label !== 'Admin' ? label : null;

  return <LoginForm next={back} continueTo={continueTo} />;
}
