import type { Metadata } from 'next';

import { requireSuperadmin, viewerZone } from '@/lib/adminAccess';
import { listAdminUsers } from '@/db/adminQueries';
import { resolveAdminAvatar } from '@/lib/adminIdentity';
import { formatDate, formatRelative } from '@/components/Admin/inbox/format';
import { GlassPanel } from '@/components/Admin/Glass';
import AdminPage from '@/components/Admin/AdminPage';
import HelpButton from '@/components/Admin/HelpButton';
import { ADMIN_HELP } from '@/lib/adminHelp';
import AddUserButton from '@/components/Admin/users/AddUserButton';
import UserRow, { type UserRowProps } from '@/components/Admin/users/UserRow';

export const metadata: Metadata = {
  title: 'Users',
  description: 'Team accounts and what each one can open in the admin.',
};

/**
 * Role-gated user management (superadmin/owner): every account, its per-area
 * access chips (saved live), plus add / reset-password / delete. The owner
 * row is read-only for everyone; superadmin rows are fully owner-managed
 * (grants, resets, deletion); the sensitive chips (payroll, activity log)
 * flip only under the owner's cursor. Roles themselves stay
 * migration/SQL-territory.
 */
export default async function UsersPage() {
  const profile = await requireSuperadmin('/admin');
  const tz = await viewerZone();
  const users = await listAdminUsers();

  // Slim, serializable client props; dates formatted server-side (fixed
  // locale) so the client rows never do Date math — no hydration mismatch.
  const rows: UserRowProps[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    owner: u.owner,
    superadmin: u.superadmin,
    areas: u.areas,
    avatar: resolveAdminAvatar(u),
    passkeys: u.passkeys,
    createdLabel: formatDate(tz, u.createdAt),
    lastActiveLabel: u.lastActiveAt ? formatRelative(tz, u.lastActiveAt) : null,
    isSelf: u.id === profile.session.user.id,
    viewerIsOwner: profile.owner,
  }));

  return (
    <AdminPage>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Team
          </span>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Users
            </h1>
            <HelpButton topic={ADMIN_HELP.users} />
          </div>
          <p className="text-sm text-muted-foreground">
            Who can sign in to the admin, and what each account can open.
          </p>
        </div>
        <AddUserButton viewerIsOwner={profile.owner} />
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
