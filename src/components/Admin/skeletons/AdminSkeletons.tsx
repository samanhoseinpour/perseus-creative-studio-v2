import { GlassPanel, glassCard, GlassRim } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';

/**
 * Glass-styled loading skeletons for the (dynamic) admin routes. Each composite
 * mirrors its real page's box — same `max-w-*`, same glass panels, real static
 * header text where it isn't data-dependent — so the `loading.tsx` fallback
 * reads as the same page mid-load (no gray-screen flash, no layout jump on
 * swap). Server Components (static markup): they import only Glass tokens + cn,
 * never `server-only` modules, the registries, or the `@/components` barrel.
 */

// --- primitives -----------------------------------------------------------

const SkeletonLine = ({ className }: { className?: string }) => (
  <div className={cn('h-3 rounded bg-foreground/10', className)} />
);

const SkeletonPill = ({ className }: { className?: string }) => (
  <div className={cn('h-6 w-20 rounded-full bg-foreground/10', className)} />
);

const SkeletonCircle = ({ size = 40 }: { size?: number }) => (
  <div
    style={{ width: size, height: size }}
    className="shrink-0 rounded-full bg-foreground/10"
  />
);

/** Page shell: the busy status role + pulse live here, once per skeleton. */
function Shell({
  label,
  narrow,
  children,
}: {
  label: string;
  narrow?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        'mx-auto w-full px-5 py-8 sm:px-8 lg:py-12',
        narrow ? 'max-w-3xl' : 'max-w-4xl',
      )}
    >
      <span className="sr-only">{label}</span>
      <div className="animate-pulse">{children}</div>
    </div>
  );
}

/** One inbox row skeleton — mirrors InboxRow (dot · name/email · date). */
const SkeletonInboxRow = () => (
  <li className="flex items-center gap-3.5 px-4 py-3.5 sm:px-5">
    <span className="h-2 w-2 shrink-0 rounded-full bg-foreground/10" />
    <span className="min-w-0 flex-1 space-y-2">
      <SkeletonLine className="w-2/5" />
      <SkeletonLine className="h-2.5 w-3/5" />
    </span>
    <SkeletonLine className="h-2.5 w-10 shrink-0" />
  </li>
);

/** A glass form/detail section — heading + N label→value field rows. */
const SkeletonSection = ({ rows = 3 }: { rows?: number }) => (
  <GlassPanel as="section" className="p-5 sm:p-6">
    <SkeletonLine className="mb-4 h-2.5 w-24" />
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <SkeletonLine className="h-2.5 w-28 shrink-0" />
          <SkeletonLine className="w-1/2" />
        </div>
      ))}
    </div>
  </GlassPanel>
);

// --- composites (one per route shape) --------------------------------------

/** Dashboard home: greeting + five stat tiles + activity feed + profile card. */
export function OverviewSkeleton() {
  return (
    <Shell label="Loading dashboard">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2.5">
          <SkeletonLine className="h-2.5 w-16" />
          <SkeletonLine className="h-6 w-52" />
          <SkeletonLine className="w-40" />
        </div>
        <SkeletonLine className="h-2.5 w-24 shrink-0" />
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={cn(glassCard, 'flex flex-col gap-3 p-5')}>
            <GlassRim />
            <SkeletonLine className="h-2.5 w-20" />
            <SkeletonLine className="h-7 w-10" />
          </div>
        ))}
      </section>

      <section className="mt-6">
        <SkeletonLine className="mb-3 h-2.5 w-24" />
        <GlassPanel>
          <ul className="divide-y divide-white/40 dark:divide-white/10">
            {[0, 1, 2, 3].map((i) => (
              <li
                key={i}
                className="flex items-center gap-3.5 px-4 py-3 sm:px-5"
              >
                <span className="min-w-0 flex-1 space-y-2">
                  <SkeletonLine className="w-2/5" />
                  <SkeletonLine className="h-2.5 w-3/5" />
                </span>
                <SkeletonLine className="h-2.5 w-10 shrink-0" />
              </li>
            ))}
          </ul>
        </GlassPanel>
      </section>

      <section className="mt-6">
        <div
          className={cn(
            glassCard,
            'flex items-center justify-between gap-4 p-5',
          )}
        >
          <GlassRim />
          <span className="flex items-center gap-4">
            <SkeletonCircle size={40} />
            <span className="flex flex-col gap-2">
              <SkeletonLine className="w-24" />
              <SkeletonLine className="h-2.5 w-48" />
            </span>
          </span>
          <SkeletonLine className="h-4 w-4 shrink-0" />
        </div>
      </section>
    </Shell>
  );
}

/** Inbox-style list (inquiries / applications / tickets): real header + tabs + N rows. */
export function InboxListSkeleton({
  title,
  subtitle,
  eyebrow = 'Inbox',
  rows = 7,
}: {
  title: string;
  subtitle: string;
  eyebrow?: string;
  rows?: number;
}) {
  return (
    <Shell label={`Loading ${title.toLowerCase()}`}>
      <header className="mb-6 flex flex-col gap-1.5">
        <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {eyebrow}
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </header>

      <GlassPanel className="mt-6">
        <div className="flex items-center gap-4 border-b border-white/40 px-4 py-3.5 sm:px-5 dark:border-white/10">
          <SkeletonLine className="h-2.5 w-12" />
          <SkeletonLine className="h-2.5 w-16" />
          <SkeletonLine className="h-2.5 w-12" />
        </div>
        <ul className="divide-y divide-white/40 dark:divide-white/10">
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonInboxRow key={i} />
          ))}
        </ul>
      </GlassPanel>
    </Shell>
  );
}

/** Submission/ticket detail: back link + header + three sections. */
export function SubmissionDetailSkeleton({
  label = 'Loading submission',
}: {
  label?: string;
} = {}) {
  return (
    <Shell label={label} narrow>
      <SkeletonLine className="mb-6 h-2.5 w-28" />

      <header className="mb-6 flex flex-col gap-4 border-b border-white/45 pb-6 lg:flex-row lg:items-start lg:justify-between dark:border-white/10">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <SkeletonLine className="h-6 w-40" />
            <SkeletonPill className="w-16" />
          </div>
          <SkeletonLine className="w-48" />
        </div>
        <div className="flex gap-2">
          <SkeletonPill />
          <SkeletonPill className="w-16" />
        </div>
      </header>

      <div className="flex flex-col gap-4">
        <SkeletonSection rows={4} />
        <SkeletonSection rows={4} />
        <SkeletonSection rows={2} />
      </div>
    </Shell>
  );
}

/** New-ticket form: back link + real header + one tall form section. */
export function TicketFormSkeleton() {
  return (
    <Shell label="Loading new ticket" narrow>
      <SkeletonLine className="mb-6 h-2.5 w-28" />

      <header className="mb-6 flex flex-col gap-1.5">
        <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Support
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          New ticket
        </h1>
        <p className="text-sm text-muted-foreground">
          Spotted a bug or something off in the admin panel? Describe it here —
          the team is notified right away.
        </p>
      </header>

      <GlassPanel as="section" className="p-5 sm:p-6">
        <div className="flex flex-col gap-5">
          <div className="space-y-2">
            <SkeletonLine className="h-2.5 w-12" />
            <SkeletonLine className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <SkeletonLine className="h-2.5 w-16" />
            <div className="flex gap-1.5">
              <SkeletonPill className="w-14" />
              <SkeletonPill className="w-16" />
              <SkeletonPill className="w-14" />
            </div>
          </div>
          <div className="space-y-2">
            <SkeletonLine className="h-2.5 w-32" />
            <div className="flex flex-wrap gap-1.5">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <SkeletonPill key={i} className="w-20" />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <SkeletonLine className="h-2.5 w-24" />
            <SkeletonLine className="h-32 w-full" />
          </div>
          <SkeletonLine className="h-12 w-full" />
        </div>
      </GlassPanel>
    </Shell>
  );
}

/** Database browser: real header + table tabs + meta line + grid rows. */
export function DatabaseSkeleton() {
  return (
    <Shell label="Loading database">
      <header className="mb-6 flex flex-col gap-1.5">
        <span className="text-[0.6rem] font-medium tracking-[0.2em] text-muted-foreground uppercase">
          Data
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Database
        </h1>
        <p className="text-sm text-muted-foreground">
          Read-only view of every table. Sensitive values are redacted.
        </p>
      </header>

      <GlassPanel className="mt-6">
        <div className="flex items-center gap-4 border-b border-white/40 px-4 py-3.5 sm:px-5 dark:border-white/10">
          {['w-24', 'w-12', 'w-16', 'w-16', 'w-20', 'w-14'].map((w, i) => (
            <SkeletonLine key={i} className={cn('h-2.5 shrink-0', w)} />
          ))}
        </div>
        <div className="border-b border-white/40 px-4 py-2.5 sm:px-5 dark:border-white/10">
          <SkeletonLine className="h-2.5 w-32" />
        </div>
        <ul className="divide-y divide-white/40 dark:divide-white/10">
          {Array.from({ length: 8 }).map((_, i) => (
            <li key={i} className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
              <SkeletonLine className="h-2.5 w-20 shrink-0" />
              <SkeletonLine className="h-2.5 w-28 shrink-0" />
              <SkeletonLine className="h-2.5 w-24 shrink-0" />
              <SkeletonLine className="h-2.5 w-32 shrink-0" />
              <SkeletonLine className="h-2.5 w-16 shrink-0" />
            </li>
          ))}
        </ul>
      </GlassPanel>
    </Shell>
  );
}

/** Profile: back link + identity header + four stacked form sections. */
export function ProfileSkeleton() {
  return (
    <Shell label="Loading profile" narrow>
      <SkeletonLine className="mb-6 h-2.5 w-28" />

      <header className="mb-8 flex items-center gap-4">
        <SkeletonCircle size={64} />
        <div className="flex flex-col gap-2">
          <SkeletonLine className="h-5 w-40" />
          <SkeletonLine className="h-2.5 w-52" />
          <SkeletonPill className="mt-1 h-4 w-16" />
        </div>
      </header>

      <div className="flex flex-col gap-4">
        <SkeletonSection rows={1} />
        <SkeletonSection rows={2} />
        <SkeletonSection rows={2} />
        <SkeletonSection rows={3} />
      </div>
    </Shell>
  );
}
