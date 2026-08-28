import type { Metadata } from 'next';
import { LuBell } from 'react-icons/lu';

import { requireSuperadmin, viewerZone } from '@/lib/adminAccess';
import { listAdminUsers } from '@/db/adminQueries';
import { resolveAdminAvatar } from '@/lib/adminIdentity';
import { formatDate } from '@/components/Admin/inbox/format';
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
  // One clock for the whole list, so two rows can never disagree about how
  // long ago "now" was. The rows re-score against their own clock once mounted.
  const nowMs = Date.now();

  // Slim, serializable client props; dates formatted server-side (fixed
  // locale) so the client rows never format a date — no hydration mismatch.
  // Presence is the one live value, and it stays safe by shipping a number
  // rather than a formatter: see the lastSeen props below.
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
    // Presence travels as a NUMBER plus a server-formatted date, never as a
    // finished relative string: the row re-labels itself on a timer (an open
    // tab must not sit on a frozen "Online"), and doing that from a number
    // keeps every Intl call — and the reader's zone with it — on the server.
    // The absolute label is only spent past a week, where a relative figure
    // stops being useful.
    lastSeenMs: u.lastSeenAt ? u.lastSeenAt.getTime() : null,
    lastSeenAbsolute: u.lastSeenAt ? formatDate(tz, u.lastSeenAt) : null,
    serverNowMs: nowMs,
    pushDevices: u.pushDevices,
    // ABSOLUTE, not relative, and formatted here. Unlike presence this never
    // has to re-label itself on a timer, so there is no reason to ship a
    // number and do date maths in the browser — the house rule that a
    // formatter running on both sides drifts.
    lastNotifiedLabel: u.lastNotifiedAt ? formatDate(tz, u.lastNotifiedAt) : null,
    isSelf: u.id === profile.session.user.id,
    viewerIsOwner: profile.owner,
  }));

  // Folded from the rows already in hand — no query. While adoption is the
  // open question this is the figure that answers it, and per-row counts alone
  // make you total them by eye.
  const notified = rows.filter((r) => r.pushDevices > 0).length;

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
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground/80">
            <LuBell className="size-3.5 shrink-0" aria-hidden="true" />
            {notified === 0
              ? 'Nobody has notifications switched on yet.'
              : `${notified} of ${rows.length} ${notified === 1 ? 'has' : 'have'} notifications on.`}
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
        someone, delete the account. A password reset keeps their passkeys
        working.
      </p>
    </AdminPage>
  );
}
