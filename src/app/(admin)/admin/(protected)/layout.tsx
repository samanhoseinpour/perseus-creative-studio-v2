import { requireAdmin } from '@/lib/adminSession';
import { resolveAdminAvatar } from '@/lib/adminIdentity';
import { getNewSubmissionCounts } from '@/db/adminQueries';
import AdminSidebar from '@/components/Admin/AdminSidebar';
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
  const counts = await getNewSubmissionCounts();

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
        counts={counts}
      />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
