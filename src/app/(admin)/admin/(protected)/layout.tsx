import { resolveAdminAvatar } from '@/lib/adminIdentity';
import { canAccessArea, getAccessProfile } from '@/lib/adminAccess';
import type { NavAccess } from '@/lib/adminNav';
import { getNewSubmissionCounts, getUserPasskeyCount } from '@/db/adminQueries';
import { getTicketStatusCounts } from '@/db/ticketQueries';
import AdminSidebar from '@/components/Admin/AdminSidebar';
import PasskeyPrompt from '@/components/Admin/PasskeyPrompt';
import CommandPalette from '@/components/Admin/CommandPalette';
import SmartLenis from '@/components/SmartLenis';
import ThemedShader from '@/components/ui/ThemedShader';

// The real authentication boundary. Middleware (src/proxy.ts) does a fast
// cookie-only bounce; getAccessProfile() validates the session AND reads the
// caller's fresh role/areas row on every protected render, redirecting to
// /admin/login when either is missing. Login and reset-password live OUTSIDE
// this group, so they stay reachable when logged out (no redirect loop). This
// layout also hosts the persistent dashboard chrome (sidebar + mobile drawer)
// around every protected page — but its guard covers ONLY renders: every page,
// server action, and route handler re-gates itself through adminAccess.ts.
export default async function ProtectedAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await getAccessProfile();
  const { user } = profile.session;
  const avatar = resolveAdminAvatar(user);
  // One access profile feeds the whole chrome: which nav items the sidebar +
  // ⌘K palette show, and which badge tallies are even queried — a count for
  // an area the viewer can't open must not leak through a badge. The tickets
  // badge is the all-open count, superadmins only.
  const access: NavAccess = {
    superadmin: profile.superadmin,
    areas: profile.areas,
  };
  const canInquiries = canAccessArea(profile, 'inquiries');
  const canApplications = canAccessArea(profile, 'applications');
  const [counts, passkeyCount, ticketCounts] = await Promise.all([
    canInquiries || canApplications
      ? getNewSubmissionCounts()
      : { project: 0, career: 0 },
    getUserPasskeyCount(user.id),
    profile.superadmin ? getTicketStatusCounts() : null,
  ]);

  return (
    <div className="relative isolate min-h-svh lg:flex">
      {/* Full-bleed, theme-aware shader — the same ambient glass environment as
          the login shell (bright Shader5 in light, dark-neon Shader4 in dark),
          fixed so it stays put while the dashboard scrolls. The isolate + the
          negative-z here trap the shader ABOVE the (admin) group layout's opaque
          `bg-background`; without the isolated stacking context that ancestor
          background would paint over the shader and hide it (see AdminAuthShell
          for the full rationale). Every panel's frost melts it into a soft wash. */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        aria-hidden="true"
      >
        <ThemedShader />
      </div>

      <AdminSidebar
        name={user.name}
        email={user.email}
        avatar={avatar}
        counts={{
          project: canInquiries ? counts.project : 0,
          career: canApplications ? counts.career : 0,
          ticket: ticketCounts?.open ?? 0,
        }}
        access={access}
      />
      <main className="min-w-0 flex-1">
        <SmartLenis>{children}</SmartLenis>
      </main>

      {/* Post-login nudge to enrol a passkey; self-suppresses once one exists.
          `userId` namespaces its 30-day snooze so one admin's dismissal can't
          hide the prompt from the next admin to sign in on this browser. */}
      <PasskeyPrompt hasPasskey={passkeyCount > 0} userId={user.id} />
      <CommandPalette access={access} />
    </div>
  );
}
