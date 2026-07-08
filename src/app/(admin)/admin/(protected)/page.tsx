import { headers } from 'next/headers';

import { auth } from '@/lib/auth';
import DashboardActions from './DashboardActions';

// Phase 1 dashboard placeholder: confirms who's signed in and lets the team
// enroll a passkey / sign out. The real inbox over contact_submissions lands in
// a later phase.
export default async function AdminDashboard() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-10 px-6 py-16">
      <header className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Perseus · Admin
        </span>
        <h1 className="text-2xl font-semibold text-foreground">
          Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {user?.email}. The submissions inbox is coming next —
          for now, secure your account.
        </p>
      </header>

      <DashboardActions />
    </main>
  );
}
