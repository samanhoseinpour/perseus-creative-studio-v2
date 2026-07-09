import type { Metadata } from 'next';
import Link from 'next/link';
import {
  LuArrowRight,
  LuArrowUpRight,
  LuUserRound,
  LuActivity,
} from 'react-icons/lu';

import { requireAdmin } from '@/lib/adminSession';
import { getOverviewStats, getRecentSubmissions } from '@/db/adminQueries';
import { secondaryLine } from '@/components/Admin/inbox/secondary';
import { formatRelative } from '@/components/Admin/inbox/format';
import AdminGreeting from '@/components/Admin/AdminGreeting';
import EmptyState from '@/components/Admin/EmptyState';
import {
  glassCard,
  glassHover,
  glassChip,
  glassRowHover,
  GlassRim,
  GlassPanel,
  adminLink,
} from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Overview',
  description: 'Dashboard overview of recent inquiries and applications.',
};

// Dashboard home: a time-aware greeting, four at-a-glance stat tiles, a merged
// recent-activity feed across both submission kinds, and the profile card.
export default async function AdminDashboard() {
  const { user } = await requireAdmin();
  const [stats, recent] = await Promise.all([
    getOverviewStats(),
    getRecentSubmissions(6),
  ]);

  const activity = recent.map((row) => ({
    id: row.id,
    name: row.name,
    secondary: secondaryLine(row),
    relative: formatRelative(row.createdAt),
    href:
      row.kind === 'project'
        ? `/admin/inquiries/${row.id}`
        : `/admin/applications/${row.id}`,
  }));

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8 lg:py-12">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Dashboard
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            <AdminGreeting name={user.name} />
          </h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {user.email}.
          </p>
        </div>
        <Link
          href="/"
          className={cn(
            'inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground',
            adminLink,
          )}
        >
          View the website
          <LuArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="New inquiries"
          value={stats.newProject}
          href="/admin/inquiries"
        />
        <StatTile
          label="New applications"
          value={stats.newCareer}
          href="/admin/applications"
        />
        <StatTile label="Archived" value={stats.archived} />
        <StatTile label="Flagged as spam" value={stats.spam} />
      </section>

      <section className="mt-6">
        <h2 className="mb-3 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Recent activity
        </h2>
        <GlassPanel>
          {activity.length === 0 ? (
            <EmptyState
              icon={LuActivity}
              title="No activity yet"
              description="Submissions will appear here as they arrive."
            />
          ) : (
            <ul className="divide-y divide-white/40 dark:divide-white/10">
              {activity.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={cn(
                      'group flex items-center gap-3.5 px-4 py-3 sm:px-5',
                      glassRowHover,
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {item.name}
                      </span>
                      {item.secondary && (
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {item.secondary}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {item.relative}
                    </span>
                    <LuArrowRight
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </GlassPanel>
      </section>

      <section className="mt-6">
        <Link
          href="/admin/profile"
          className={cn(
            glassCard,
            glassHover,
            'group flex items-center justify-between gap-4 p-5',
          )}
        >
          <GlassRim />
          <span className="flex items-center gap-4">
            <span
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                glassChip,
              )}
            >
              <LuUserRound className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-medium text-foreground">
                Your profile
              </span>
              <span className="text-xs text-muted-foreground">
                Avatar, password, passkeys &amp; active sessions
              </span>
            </span>
          </span>
          <LuArrowRight
            className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
            aria-hidden="true"
          />
        </Link>
      </section>
    </div>
  );
}

// A stat tile. With `href` it's an interactive link (hover-lift + arrow); without
// (cross-kind Archived/Spam totals that don't map to a single route) it's a plain
// readout.
function StatTile({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href?: string;
}) {
  const body = (
    <>
      <GlassRim />
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {href && (
          <LuArrowRight
            className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
            aria-hidden="true"
          />
        )}
      </div>
      <span className="text-3xl font-semibold tabular-nums text-foreground">
        {value}
      </span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(glassCard, glassHover, 'group flex flex-col gap-1 p-5')}
      >
        {body}
      </Link>
    );
  }
  return (
    <div className={cn(glassCard, 'group flex flex-col gap-1 p-5')}>
      {body}
    </div>
  );
}
