import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import LoginForm from './LoginForm';

// Already signed in? Skip the form.
export default async function AdminLoginPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect('/admin');

  return <LoginForm />;
}
