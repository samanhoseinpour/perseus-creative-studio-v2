import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getAdminSession } from '@/lib/adminSession';
import LoginForm from './LoginForm';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to the Perseus Creative Studio admin dashboard.',
};

// Already signed in? Skip the form.
export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session) redirect('/admin');

  return <LoginForm />;
}
