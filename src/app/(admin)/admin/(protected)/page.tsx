import Link from 'next/link';
import { LuArrowRight, LuArrowUpRight, LuUserRound } from 'react-icons/lu';

import { requireAdmin } from '@/lib/adminSession';
import { getNewSubmissionCounts } from '@/db/adminQueries';
import {
  glassSurface,
  glassHover,
  glassChip,
  GlassRim,
} from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';

// Dashboard home: who's signed in + how many submissions are waiting, and a way
// into the profile. The full inquiries/applications inbox (reading, triage,
// resume streaming) lands in Phase 2b — these counts are the preview.
export default async function AdminDashboard() {
  const { user } = await requireAdmin();
  const counts = await getNewSubmissionCounts();
  const firstName = user.name?.split(' ')[0] ?? '';

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8 lg:py-12">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Dashboard
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Welcome back{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {user.email}.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          View the website
          <LuArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <StatTile
          label="New inquiries"
          value={counts.project}
          hint="Project leads awaiting review"
          href="/admin/inquiries"
        />
        <StatTile
          label="New applications"
          value={counts.career}
          hint="Job applications awaiting review"
          href="/admin/applications"
        />
      </section>

      <section className="mt-4">
        <Link
          href="/admin/profile"
          className={cn(
            glassSurface,
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
              <span className="text-sm font-medium text-foreground">Your profile</span>
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

function StatTile({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: number;
  hint: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={cn(glassSurface, glassHover, 'group flex flex-col gap-1 p-5')}
    >
      <GlassRim />
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <LuArrowRight
          className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
          aria-hidden="true"
        />
      </div>
      <span className="text-3xl font-semibold tabular-nums text-foreground">
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{hint}</span>
    </Link>
  );
}
