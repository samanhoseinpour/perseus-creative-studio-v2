import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getAdminSession } from '@/lib/adminSession';
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

  // Already signed in? Skip the form.
  const session = await getAdminSession();
  if (session) redirect(back ?? '/admin');

  // "Sign in to continue to Tasks." — only when there is somewhere specific
  // to continue to. Overview is the default landing, so naming it adds nothing,
  // and adminRouteLabel's 'Admin' fallback means "no idea", not a place.
  const label = back && back !== '/admin' ? adminRouteLabel(back.split('?')[0]) : null;
  const continueTo = label && label !== 'Admin' ? label : null;

  return <LoginForm next={back} continueTo={continueTo} />;
}
