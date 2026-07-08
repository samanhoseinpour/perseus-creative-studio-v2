import { redirect } from 'next/navigation';

import { getAdminSession } from '@/lib/adminSession';
import LoginForm from './LoginForm';

// Already signed in? Skip the form.
export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session) redirect('/admin');

  return <LoginForm />;
}
