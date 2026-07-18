import type { Metadata } from 'next';

import { requireSuperadmin } from '@/lib/adminAccess';
import { listAdminUsers } from '@/db/adminQueries';
import { resolveAdminAvatar } from '@/lib/adminIdentity';
import { formatDate, formatRelative } from '@/components/Admin/inbox/format';
import { GlassPanel } from '@/components/Admin/Glass';
import AdminPage from '@/components/Admin/AdminPage';
import AddUserButton from '@/components/Admin/users/AddUserButton';
import UserRow, { type UserRowProps } from '@/components/Admin/users/UserRow';

export const metadata: Metadata = {
  title: 'Users',
  description: 'Team accounts and what each one can open in the admin.',
};

/**
 * Superadmin-only user management: every account, its per-area access chips
 * (saved live), plus add / reset-password / delete. Superadmin rows render
 * read-only — the seed roster is managed by migration/SQL, never from here.
 */
export default async function UsersPage() {
  const profile = await requireSuperadmin('/admin');
  const users = await listAdminUsers();

  // Slim, serializable client props; dates formatted server-side (fixed
  // locale) so the client rows never do Date math — no hydration mismatch.
  const rows: UserRowProps[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    superadmin: u.superadmin,
    areas: u.areas,
    avatar: resolveAdminAvatar(u),
    passkeys: u.passkeys,
    createdLabel: formatDate(u.createdAt),
    lastActiveLabel: u.lastActiveAt ? formatRelative(u.lastActiveAt) : null,
    isSelf: u.id === profile.session.user.id,
  }));

  return (
    <AdminPage>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Team
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Users
          </h1>
          <p className="text-sm text-muted-foreground">
            Who can sign in to the admin, and what each account can open.
          </p>
        </div>
        <AddUserButton />
      </header>

      <GlassPanel className="mt-6">
        <ul className="divide-y divide-white/40 dark:divide-white/10">
          {rows.map((row) => (
            <UserRow key={row.id} {...row} />
          ))}
        </ul>
      </GlassPanel>

      <p className="mt-4 px-1 text-xs text-muted-foreground">
        Access changes apply on the person&rsquo;s next navigation. To offboard
        someone, delete the account — a password reset keeps their passkeys
        working.
      </p>
    </AdminPage>
  );
}
