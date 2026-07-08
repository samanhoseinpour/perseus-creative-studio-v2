import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';

// The real authorization boundary. Middleware does a fast cookie-only bounce;
// this validates the session against the DB on every protected render. Login
// and reset-password live OUTSIDE this group, so they stay reachable when
// logged out (no redirect loop).
export default async function ProtectedAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/admin/login');

  return <>{children}</>;
}
