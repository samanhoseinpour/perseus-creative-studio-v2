import { requireAdmin } from '@/lib/adminSession';
import { resolveAdminAvatar } from '@/lib/adminIdentity';
import { isTicketTriager } from '@/lib/ticketAccess';
import { getNewSubmissionCounts, getUserPasskeyCount } from '@/db/adminQueries';
import { getTicketStatusCounts } from '@/db/ticketQueries';
import AdminSidebar from '@/components/Admin/AdminSidebar';
import PasskeyPrompt from '@/components/Admin/PasskeyPrompt';
import CommandPalette from '@/components/Admin/CommandPalette';
import SmartLenis from '@/components/SmartLenis';
import ThemedShader from '@/components/ui/ThemedShader';

// The real authorization boundary. Middleware (src/proxy.ts) does a fast
// cookie-only bounce; requireAdmin() validates the session against the DB on
// every protected render and redirects to /admin/login when it's missing.
// Login and reset-password live OUTSIDE this group, so they stay reachable when
// logged out (no redirect loop). This layout also hosts the persistent
// dashboard chrome (sidebar + mobile drawer) around every protected page.
export default async function ProtectedAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user } = await requireAdmin();
  const avatar = resolveAdminAvatar(user);
  // The tickets badge (open count) is triager-only — everyone else gets 0,
  // which the sidebar renders as no badge.
  const [counts, passkeyCount, ticketCounts] = await Promise.all([
    getNewSubmissionCounts(),
    getUserPasskeyCount(user.id),
    isTicketTriager(user.email) ? getTicketStatusCounts() : null,
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
        counts={{ ...counts, ticket: ticketCounts?.open ?? 0 }}
      />
      <main className="min-w-0 flex-1">
        <SmartLenis>{children}</SmartLenis>
      </main>

      {/* Post-login nudge to enrol a passkey; self-suppresses once one exists.
          `userId` namespaces its 30-day snooze so one admin's dismissal can't
          hide the prompt from the next admin to sign in on this browser. */}
      <PasskeyPrompt hasPasskey={passkeyCount > 0} userId={user.id} />
      <CommandPalette />
    </div>
  );
}
