import AdminPage from '@/components/Admin/AdminPage';
import { GlassPanel, glassCard, GlassRim } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';

/**
 * Glass-styled loading skeletons for the (dynamic) admin routes. Each composite
 * mirrors its real page's box — the same AdminPage wide/narrow wrapper, same
 * glass panels, real static header text where it isn't data-dependent — so the
 * `loading.tsx` fallback reads as the same page mid-load (no gray-screen flash,
 * no layout jump on swap). Server Components (static markup): they import only
 * AdminPage + Glass tokens + cn, never `server-only` modules, the registries,
 * or the `@/components` barrel.
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

/**
 * Placeholder column heights for the my-pay chart, one per trailing month.
 * Hand-picked and CONSTANT — a random walk would differ between the server and
 * client renders and blow up hydration.
 */
const COLUMN_HEIGHTS = [22, 30, 28, 41, 38, 52, 47, 60, 55, 71, 66, 88];

/**
 * Page shell: the busy status role + pulse live here, once per skeleton.
 *
 * `width` MUST match the token the real page passes to AdminPage, or the
 * loading state renders at one measure and the page snaps to another.
 */
function Shell({
  label,
  width = 'wide',
  children,
}: {
  label: string;
  width?: 'narrow' | 'wide' | 'table';
  children: React.ReactNode;
}) {
  return (
    <AdminPage
      width={width}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">{label}</span>
      <div className="animate-pulse">{children}</div>
    </AdminPage>
  );
}

/**
 * One inbox row skeleton — mirrors InboxRow (select box · dot · name/email ·
 * date). The checkbox is not decoration: InboxRow indents its whole link by
 * one when `onToggle` is passed, so a skeleton without it shifts every row
 * sideways on swap.
 */
const SkeletonInboxRow = ({ checkbox = true }: { checkbox?: boolean }) => (
  <li className="flex items-center">
    {checkbox && (
      <span className="flex items-center self-stretch pl-4 sm:pl-5">
        <span className="size-4 rounded-[3px] bg-foreground/10" />
      </span>
    )}
    <span
      className={cn(
        'flex min-w-0 flex-1 items-center gap-3.5 py-3.5 pr-4 sm:pr-5',
        checkbox ? 'pl-3' : 'pl-4 sm:pl-5',
      )}
    >
      <span className="h-2 w-2 shrink-0 rounded-full bg-foreground/10" />
      <span className="min-w-0 flex-1 space-y-2">
        <SkeletonLine className="w-2/5" />
        <SkeletonLine className="h-2.5 w-3/5" />
      </span>
      <SkeletonLine className="h-2.5 w-10 shrink-0" />
    </span>
  </li>
);

/** BulkActionBar's resting state — always rendered above the inbox rows, so
 *  leaving it out pushes the whole list up by ~36px until the data lands. */
const SkeletonBulkBar = ({ className }: { className?: string }) => (
  <div
    className={cn(
      'flex items-center gap-2 border-b border-white/40 px-4 py-2 sm:px-5 dark:border-white/10',
      className,
    )}
  >
    <span className="size-4 rounded-[3px] bg-foreground/10" />
    <SkeletonLine className="h-2.5 w-28" />
  </div>
);

/** The `hidden lg:block` keyboard legend that closes the keyboard lists. */
const SkeletonHintStrip = () => (
  <div className="hidden border-t border-white/40 px-4 py-2.5 lg:block dark:border-white/10">
    <SkeletonLine className="mx-auto h-2.5 w-96" />
  </div>
);

/**
 * A page header: eyebrow + title + subtitle, with an optional right-hand
 * control. Deliberately NOT reserving pagers anywhere — a pager renders only
 * above one page of results, so guessing wrong is a jump either way, and it
 * always sits below the fold where the two bits above it do not.
 */
const SkeletonHeader = ({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) => (
  <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        {eyebrow}
      </span>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
    {action}
  </header>
);

/** A trailing explanatory note under a panel (several pages close with one). */
const SkeletonNote = ({ lines = 2 }: { lines?: number }) => (
  <div className="mt-4 flex flex-col gap-2 px-1">
    {Array.from({ length: lines }).map((_, i) => (
      <SkeletonLine
        key={i}
        className={cn('h-2.5', i === lines - 1 ? 'w-2/5' : 'w-4/5')}
      />
    ))}
  </div>
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

/**
 * Constant bar heights for the overview's 14-day inbox strip (the
 * COLUMN_HEIGHTS rule: hand-picked, never random — hydration). Zeros render
 * the strip's baseline dot.
 */
const PULSE_HEIGHTS = [30, 0, 55, 20, 0, 40, 70, 25, 0, 45, 35, 60, 20, 90];

/**
 * Dashboard home — the bento: "Your day" hero beside the podium/quick-actions
 * rail, then the packed module grid. Mirrors the DEFAULT_AREAS shape (hero,
 * podium, quick actions, inbox pulse, tickets, recent) — the skeleton can't
 * know grants, the same compromise the old six-tile version made.
 */
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

      {/* Band A: hero (2 of 3) beside the rail. */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className={cn(glassCard, 'flex flex-col p-6 sm:p-8 lg:col-span-2')}>
          <GlassRim />
          <div className="flex items-baseline justify-between gap-3">
            <SkeletonLine className="h-2.5 w-16" />
            <SkeletonLine className="h-2.5 w-32" />
          </div>
          {/* The deadline triptych. */}
          <div className="mt-5 flex gap-8 sm:gap-12">
            {[0, 1, 2].map((i) => (
              <span key={i} className="flex flex-col gap-2">
                <SkeletonLine className="h-9 w-12 sm:h-11" />
                <SkeletonLine className="h-2.5 w-16" />
              </span>
            ))}
          </div>
          <div className="mt-6 border-t border-white/40 dark:border-white/10" />
          <ul className="divide-y divide-white/40 dark:divide-white/10">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <li key={i} className="flex items-center gap-3 py-2.5">
                <SkeletonLine className="h-2.5 w-14 shrink-0" />
                <span className="min-w-0 flex-1 space-y-2">
                  <SkeletonLine className="w-2/5" />
                  <SkeletonLine className="h-2.5 w-3/5" />
                </span>
                <SkeletonLine className="h-2.5 w-10 shrink-0" />
              </li>
            ))}
          </ul>
          <div className="mt-auto flex items-center justify-between gap-4 pt-4">
            <SkeletonLine className="h-2.5 w-32" />
            <SkeletonLine className="h-2.5 w-28 shrink-0" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:flex lg:flex-col">
          {/* The leaderboard podium. */}
          <div className={cn(glassCard, 'flex flex-col sm:col-span-2')}>
            <GlassRim />
            <div className="flex items-center justify-between gap-2 px-4 pt-4">
              <SkeletonLine className="h-2.5 w-36" />
              <SkeletonLine className="h-3.5 w-3.5 shrink-0" />
            </div>
            <div className="mx-2 mt-3 flex items-center gap-3 p-2.5">
              <SkeletonCircle size={30} />
              <span className="flex min-w-0 flex-1 flex-col gap-2">
                <SkeletonLine className="h-2 w-28" />
                <SkeletonLine className="h-3.5 w-24" />
              </span>
            </div>
            <ul className="mt-1 divide-y divide-white/40 px-4 dark:divide-white/10">
              {[0, 1, 2].map((i) => (
                <li key={i} className="py-2.5">
                  <div className="flex items-center gap-2.5">
                    <SkeletonLine className="h-3.5 w-4 shrink-0" />
                    <SkeletonCircle size={24} />
                    <SkeletonLine className="w-2/5" />
                    <SkeletonLine className="ml-auto h-2.5 w-8 shrink-0" />
                  </div>
                  <SkeletonLine className="mt-1.5 h-1.5 w-full rounded-full" />
                </li>
              ))}
            </ul>
            <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/40 px-4 py-3 dark:border-white/10">
              <SkeletonLine className="h-2.5 w-32" />
              <SkeletonLine className="h-2.5 w-20 shrink-0" />
            </div>
          </div>
          {/* Quick actions: the search field + link rows + pinned legend. */}
          <div
            className={cn(glassCard, 'flex flex-col p-4 sm:col-span-2 lg:flex-1')}
          >
            <GlassRim />
            <div className="h-9 w-full rounded-lg bg-foreground/10" />
            <div className="mt-2 flex flex-col">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2.5 py-2">
                  <SkeletonLine className="h-4 w-4 shrink-0" />
                  <SkeletonLine className="w-1/2" />
                </div>
              ))}
            </div>
            <div className="mt-auto flex flex-col gap-2 border-t border-white/40 pt-3 dark:border-white/10">
              <SkeletonLine className="h-2.5 w-3/5" />
              <SkeletonLine className="h-2.5 w-1/2" />
            </div>
          </div>
        </div>
      </section>

      {/* Band B: inbox pulse + tickets, then the submissions feed. */}
      <section className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <div
          className={cn(
            glassCard,
            'flex flex-col p-5 sm:col-span-2 lg:col-span-3',
          )}
        >
          <GlassRim />
          <div className="flex items-baseline justify-between gap-3">
            <SkeletonLine className="h-2.5 w-12" />
            <SkeletonLine className="h-2.5 w-20" />
          </div>
          <div className="mt-4 flex gap-10">
            {[0, 1].map((i) => (
              <span key={i} className="flex flex-col gap-2">
                <SkeletonLine className="h-7 w-10" />
                <SkeletonLine className="h-2.5 w-24" />
              </span>
            ))}
          </div>
          {/* Two elements like the real card: pt-5 on the wrapper, h-10 on
              the strip — folded together, border-box halves the bar scale. */}
          <div className="mt-auto pt-5">
            <div className="flex h-10 items-end gap-1">
              {PULSE_HEIGHTS.map((height, i) =>
                height === 0 ? (
                  <div
                    key={i}
                    className="h-0.5 flex-1 rounded-full bg-foreground/10"
                  />
                ) : (
                  <div
                    key={i}
                    style={{ height: `${height}%` }}
                    className="flex-1 rounded-full bg-foreground/10"
                  />
                ),
              )}
            </div>
          </div>
        </div>
        <div
          className={cn(
            glassCard,
            'flex flex-col p-5 sm:col-span-2 lg:col-span-3',
          )}
        >
          <GlassRim />
          <div className="flex items-baseline justify-between gap-3">
            <SkeletonLine className="h-2.5 w-14" />
            <SkeletonLine className="h-3.5 w-3.5 shrink-0" />
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <SkeletonLine className="h-7 w-10" />
            <SkeletonLine className="h-2.5 w-24" />
          </div>
          <div className="mt-auto flex flex-col gap-2 pt-4">
            <SkeletonLine className="h-1.5 w-full rounded-full" />
            <SkeletonLine className="h-2.5 w-40" />
          </div>
        </div>

        <div className={cn(glassCard, 'flex flex-col sm:col-span-2 lg:col-span-6')}>
          <GlassRim />
          <SkeletonLine className="mx-4 mt-4 h-2.5 w-14 sm:mx-5" />
          <ul className="mt-2 divide-y divide-white/40 dark:divide-white/10">
            {[0, 1, 2, 3, 4].map((i) => (
              <li
                key={i}
                className="flex items-center gap-3.5 px-4 py-3 sm:px-5"
              >
                <SkeletonPill className="h-4 w-[5.5rem] shrink-0" />
                <span className="min-w-0 flex-1 space-y-2">
                  <SkeletonLine className="w-2/5" />
                  <SkeletonLine className="h-2.5 w-3/5" />
                </span>
                <SkeletonLine className="h-2.5 w-10 shrink-0" />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </Shell>
  );
}

/**
 * The two triage inboxes (/admin/inquiries, /admin/applications). Mirrors
 * InboxListView top to bottom: header with the export menu on the right,
 * status tabs, filter bar, the always-rendered select-all bar, checkbox rows,
 * and the desktop keyboard legend.
 */
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
      <SkeletonHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        action={<SkeletonPill className="h-8 w-24 shrink-0" />}
      />

      <GlassPanel className="mt-6">
        {/* status tabs */}
        <div className="flex items-center gap-4 border-b border-white/40 px-4 py-3.5 sm:px-5 dark:border-white/10">
          <SkeletonLine className="h-2.5 w-12" />
          <SkeletonLine className="h-2.5 w-16" />
          <SkeletonLine className="h-2.5 w-12" />
        </div>
        {/* search + filter toolbar */}
        <div className="flex items-center gap-2 border-b border-white/40 px-3 py-2.5 sm:px-4 dark:border-white/10">
          <SkeletonLine className="h-8 w-full rounded-lg sm:w-64" />
          <SkeletonLine className="hidden h-8 w-24 rounded-lg sm:block" />
          <SkeletonLine className="hidden h-8 w-24 rounded-lg sm:block" />
          <SkeletonLine className="hidden h-8 w-20 rounded-lg sm:block" />
          <SkeletonLine className="hidden h-8 w-24 rounded-lg sm:block" />
        </div>
        <SkeletonBulkBar />
        <ul className="divide-y divide-white/40 dark:divide-white/10">
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonInboxRow key={i} />
          ))}
        </ul>
        <SkeletonHintStrip />
      </GlassPanel>
    </Shell>
  );
}

/**
 * /admin/tickets — the same row rhythm as the inboxes but none of their
 * machinery: no search, no filters, no bulk select. The tabs are superadmin
 * only, so they are drawn (a triager is the common visitor) while the toolbar
 * the old shared skeleton painted here never existed at all.
 */
export function TicketsListSkeleton() {
  return (
    <Shell label="Loading tickets">
      <SkeletonHeader
        eyebrow="Support"
        title="Tickets"
        subtitle="Bug reports and issues raised in the admin panel."
        action={<SkeletonPill className="h-8 w-28 shrink-0" />}
      />

      <GlassPanel className="mt-6">
        <div className="flex items-center gap-4 border-b border-white/40 px-4 py-3.5 sm:px-5 dark:border-white/10">
          <SkeletonLine className="h-2.5 w-10" />
          <SkeletonLine className="h-2.5 w-20" />
          <SkeletonLine className="h-2.5 w-16" />
        </div>
        <ul className="divide-y divide-white/40 dark:divide-white/10">
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonInboxRow key={i} checkbox={false} />
          ))}
        </ul>
      </GlassPanel>
    </Shell>
  );
}

/**
 * /admin/users — a bare roster. Taller rows than an inbox: each carries an
 * avatar, role badges, a wrapped row of area chips and two actions.
 */
export function UsersListSkeleton() {
  return (
    <Shell label="Loading users">
      <SkeletonHeader
        eyebrow="Team"
        title="Users"
        subtitle="Who can sign in to the admin, and what each account can open."
        action={<SkeletonPill className="h-8 w-24 shrink-0" />}
      />

      <GlassPanel className="mt-6">
        <ul className="divide-y divide-white/40 dark:divide-white/10">
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i} className="px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-start gap-3.5">
                <SkeletonCircle size={36} />
                <div className="min-w-0 flex-1 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <SkeletonLine className="w-32" />
                    <SkeletonPill className="h-4 w-20" />
                  </div>
                  <SkeletonLine className="h-2.5 w-52" />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[0, 1, 2, 3, 4].map((j) => (
                      <SkeletonPill key={j} className="h-5 w-16" />
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <SkeletonPill className="h-8 w-8" />
                  <SkeletonPill className="h-8 w-8" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </GlassPanel>

      <SkeletonNote />
    </Shell>
  );
}

/**
 * /admin/projects — search + live count, then the two chip filter rows
 * (Category, Visibility), then rows that lead with a 56x40 cover thumb. The
 * panel has no `mt-6`: the real page's does not either.
 */
export function ProjectsListSkeleton() {
  return (
    <Shell label="Loading projects">
      <SkeletonHeader
        eyebrow="Portfolio"
        title="Projects"
        subtitle="The case files behind /projects: cards, detail pages, and where each one appears."
        action={<SkeletonPill className="h-8 w-28 shrink-0" />}
      />

      <GlassPanel>
        <div className="flex items-center gap-3 border-b border-white/40 px-3 py-2.5 sm:px-4 dark:border-white/10">
          <SkeletonLine className="h-8 w-full rounded-lg sm:w-64" />
          <SkeletonLine className="ml-auto h-2.5 w-16 shrink-0" />
        </div>
        <div className="flex flex-col gap-2 border-b border-white/40 px-3 py-2.5 sm:px-4 dark:border-white/10">
          {[6, 4].map((count, row) => (
            <div key={row} className="flex flex-wrap items-center gap-1.5">
              <SkeletonLine className="mr-1 h-2.5 w-16" />
              {Array.from({ length: count }).map((_, i) => (
                <SkeletonPill key={i} className="h-7 w-20" />
              ))}
            </div>
          ))}
        </div>
        <ul className="divide-y divide-white/40 dark:divide-white/10">
          {Array.from({ length: 8 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-2 sm:px-5">
              <span className="h-10 w-14 shrink-0 rounded-md bg-foreground/[0.06] ring-1 ring-foreground/10" />
              <span className="min-w-0 flex-1 space-y-2">
                <span className="flex items-center gap-2">
                  <SkeletonLine className="w-2/5" />
                  <SkeletonPill className="h-4 w-14" />
                </span>
                <SkeletonLine className="h-2.5 w-3/5" />
              </span>
              <SkeletonLine className="h-2.5 w-4 shrink-0" />
            </li>
          ))}
        </ul>
      </GlassPanel>
    </Shell>
  );
}

/**
 * /admin/feedback — a six-column table, not a list. The old shared inbox
 * skeleton painted a tab strip and a filter toolbar over a page that has
 * never had either.
 */
export function FeedbackTableSkeleton() {
  return (
    <Shell label="Loading feedback">
      <SkeletonHeader
        eyebrow="Journal"
        title="Feedback"
        subtitle="How readers rate each article."
      />

      <GlassPanel className="mt-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-foreground/10">
              <th scope="col" className="px-4 py-3 sm:px-5">
                <SkeletonLine className="h-2.5 w-12" />
              </th>
              {[0, 1, 2, 3].map((i) => (
                <th key={i} className="px-3 py-3">
                  <SkeletonLine className="ml-auto h-2.5 w-16" />
                </th>
              ))}
              <th scope="col" className="px-4 py-3 sm:px-5">
                <SkeletonLine className="ml-auto h-2.5 w-16" />
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }).map((_, i) => (
              <tr key={i} className="border-b border-foreground/5 last:border-b-0">
                <td className="px-4 py-2.5 sm:px-5">
                  <SkeletonLine className="w-3/4" />
                </td>
                {[0, 1, 2, 3].map((j) => (
                  <td key={j} className="px-3 py-2.5">
                    <SkeletonLine className="ml-auto h-2.5 w-8" />
                  </td>
                ))}
                <td className="px-4 py-2.5 sm:px-5">
                  <SkeletonLine className="ml-auto h-2.5 w-16" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassPanel>
    </Shell>
  );
}

/** The /admin/clients tile grid: real header + search toolbar + tile grid.
 *  Grid classes mirror ClientsGrid exactly so the swap doesn't reflow. */
export function ClientsGridSkeleton() {
  return (
    <Shell label="Loading clients">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Portfolio
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Clients
          </h1>
          <p className="text-sm text-muted-foreground">
            The roster behind case-file attribution and the logo marquee.
          </p>
        </div>
        <SkeletonPill className="h-9 w-28" />
      </header>

      <GlassPanel className="mt-6">
        {/* search toolbar */}
        <div className="flex items-center gap-3 border-b border-white/40 px-3 py-2.5 sm:px-4 dark:border-white/10">
          <SkeletonLine className="h-8 w-full rounded-lg sm:w-64" />
          <SkeletonLine className="ml-auto h-2.5 w-14 shrink-0" />
        </div>
        <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 sm:p-4 lg:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-2.5 rounded-xl border border-white/45 p-4 dark:border-white/10"
            >
              <SkeletonCircle size={56} />
              <SkeletonLine className="w-3/4" />
              <SkeletonLine className="h-2.5 w-1/2" />
              <SkeletonPill className="h-4 w-16" />
              <SkeletonLine className="h-2 w-2/3" />
            </div>
          ))}
        </div>
      </GlassPanel>

      <SkeletonNote />
    </Shell>
  );
}

/**
 * /admin/careers — real header (two header buttons: Categories + Add role),
 * the search + status-chip toolbar, then two category groups of listing rows.
 * Row internals mirror CareersRoster (title + pill line, chip line, the
 * trailing status select) so the swap doesn't reflow.
 */
export function CareersRosterSkeleton() {
  return (
    <Shell label="Loading careers">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Website
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Careers
          </h1>
          <p className="text-sm text-muted-foreground">
            Open, filled, and draft roles on the public careers page, grouped
            by category.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SkeletonPill className="h-9 w-28" />
          <SkeletonPill className="h-9 w-24" />
        </div>
      </header>

      <GlassPanel className="mt-6">
        {/* search + status chips + live count */}
        <div className="flex flex-wrap items-center gap-3 border-b border-white/40 px-3 py-2.5 sm:px-4 dark:border-white/10">
          <SkeletonLine className="h-8 w-full rounded-lg sm:w-64" />
          <div className="flex flex-wrap items-center gap-1.5">
            {['w-14', 'w-16', 'w-16', 'w-16'].map((w, i) => (
              <SkeletonPill key={i} className={cn('h-7', w)} />
            ))}
          </div>
          <SkeletonLine className="ml-auto h-2.5 w-14 shrink-0" />
        </div>
        {[3, 2].map((count, group) => (
          <section key={group}>
            <div className="flex items-center gap-2.5 border-b border-white/40 bg-foreground/[0.03] px-4 py-2 sm:px-5 dark:border-white/10">
              <SkeletonCircle size={24} />
              <SkeletonLine className="w-32" />
              <SkeletonPill className="h-4 w-12" />
              <SkeletonLine className="ml-auto h-2.5 w-12" />
            </div>
            <ul className="divide-y divide-white/40 dark:divide-white/10">
              {Array.from({ length: count }).map((_, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 px-4 py-3 sm:px-5"
                >
                  <span className="min-w-0 flex-1 space-y-2">
                    <span className="flex items-center gap-2">
                      <SkeletonLine className="w-2/5" />
                      <SkeletonPill className="h-4 w-12" />
                    </span>
                    <span className="flex items-center gap-1.5">
                      <SkeletonPill className="h-4 w-16" />
                      <SkeletonPill className="h-4 w-14" />
                      <SkeletonPill className="h-4 w-20" />
                    </span>
                    <SkeletonLine className="h-2.5 w-3/5" />
                  </span>
                  <SkeletonLine className="h-2.5 w-20 shrink-0" />
                  <SkeletonLine className="h-8 w-24 shrink-0 rounded-lg" />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </GlassPanel>

      <SkeletonNote />
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
    <Shell label={label} width="narrow">
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
    <Shell label="Loading new ticket" width="narrow">
      <SkeletonLine className="mb-6 h-2.5 w-28" />

      <header className="mb-6 flex flex-col gap-1.5">
        <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Support
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          New ticket
        </h1>
        <p className="text-sm text-muted-foreground">
          Spotted a bug or something off in the admin panel? Describe it here, and
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
          {/* Screenshot (optional) + its dashed dropzone — a whole block the
              old skeleton skipped, so the submit row jumped down on swap. */}
          <div className="space-y-2">
            <SkeletonLine className="h-2.5 w-36" />
            <div className="rounded-xl border border-dashed border-foreground/15 px-6 py-6">
              <SkeletonLine className="mx-auto h-2.5 w-56" />
              <SkeletonLine className="mx-auto mt-2 h-2 w-72" />
            </div>
          </div>
          <div className="flex justify-end border-t border-white/40 pt-4 dark:border-white/10">
            <SkeletonPill className="h-8 w-32" />
          </div>
        </div>
      </GlassPanel>
    </Shell>
  );
}

/**
 * /admin/projects/new — an eyebrow header (no back link) over one tall
 * ProjectForm panel. It used to borrow SubmissionDetailSkeleton, which drew a
 * back link that does not exist and three short detail sections.
 */
export function ProjectFormSkeleton() {
  return (
    <Shell label="Loading new project" width="narrow">
      <header className="mb-6 flex flex-col gap-1.5">
        <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Portfolio
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          New project
        </h1>
        <SkeletonLine className="mt-1 w-72" />
      </header>

      <SkeletonFormPanel />
    </Shell>
  );
}

/**
 * /admin/projects/[id] — back link, a two-line header, then FOUR tall panels:
 * the form, the cover, the gallery and the videos.
 */
export function ProjectEditSkeleton() {
  return (
    <Shell label="Loading project" width="narrow">
      <div className="mb-6 flex flex-col gap-2">
        <SkeletonLine className="h-2.5 w-28" />
        <SkeletonLine className="h-6 w-56" />
      </div>

      <div className="flex flex-col gap-6">
        <SkeletonFormPanel />
        {[0, 1, 2].map((i) => (
          <GlassPanel key={i} as="section" className="p-5 sm:p-6">
            <SkeletonLine className="mb-4 h-2.5 w-28" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[0, 1, 2, 3].map((j) => (
                <SkeletonLine key={j} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          </GlassPanel>
        ))}
      </div>
    </Shell>
  );
}

/** The tall ProjectForm body — paired inputs, chip rows, a textarea, save. */
const SkeletonFormPanel = () => (
  <GlassPanel as="section" className="p-5 sm:p-6">
    <div className="flex flex-col gap-5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[0, 1].map((j) => (
            <div key={j} className="space-y-2">
              <SkeletonLine className="h-2.5 w-20" />
              <SkeletonLine className="h-10 w-full" />
            </div>
          ))}
        </div>
      ))}
      <div className="space-y-2">
        <SkeletonLine className="h-2.5 w-16" />
        <div className="flex flex-wrap gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <SkeletonPill key={i} className="h-7 w-24" />
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <SkeletonLine className="h-2.5 w-24" />
        <SkeletonLine className="h-32 w-full" />
      </div>
      <div className="flex justify-end border-t border-white/40 pt-4 dark:border-white/10">
        <SkeletonPill className="h-8 w-28" />
      </div>
    </div>
  </GlassPanel>
);

/** The task table's column header row — ten cells, matching TaskBoard. */
const TASK_HEADER_CELL =
  'px-0 pb-2.5 pr-3 text-left align-bottom';

/**
 * /admin/tasks. TWO list skeletons, because the page has two renderings: a
 * stack of cards below md and an eleven-column <table> at md and up, switched
 * by the same CSS the board itself uses. Drawing only one of them puts the
 * wrong shape on half the devices — the table skeleton on a phone snapped
 * into cards on swap, which is the jump this file exists to prevent, and the
 * two-line rows it replaced did the same thing on a desktop. Header carries
 * its three real controls (export, view toggle, new-task actions) and the
 * bulk bar sits where TaskBulkBar does.
 */
export function TasksListSkeleton() {
  return (
    <Shell label="Loading tasks" width="table">
      <SkeletonHeader
        eyebrow="Team"
        title="Tasks"
        subtitle="Who’s doing what, for which client: the work log behind the monthly reports."
        action={
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <SkeletonPill className="h-8 w-28" />
            <SkeletonPill className="h-8 w-24" />
            <SkeletonPill className="h-8 w-28" />
          </div>
        }
      />

      <GlassPanel className="mt-6">
        {/* month band — which month this board is about. NOT breakpoint-gated:
            it sits above BOTH renderings, and the phone card list is below it
            too. The arrows carry the same max-sm:size-11 touch target the real
            MonthSwitcher does, or the band measures short on a phone and the
            whole panel jumps on swap. */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-white/40 px-3 py-2.5 sm:px-4 dark:border-white/10">
          <div className="flex items-center gap-1.5">
            <SkeletonLine className="size-8 rounded-lg max-sm:size-11" />
            <SkeletonLine className="h-8 w-36 rounded-lg" />
            <SkeletonLine className="size-8 rounded-lg max-sm:size-11" />
          </div>
          <SkeletonLine className="h-2.5 w-24" />
        </div>
        {/* status tabs */}
        <div className="flex items-center gap-4 border-b border-white/40 px-4 py-3.5 sm:px-5 dark:border-white/10">
          <SkeletonLine className="h-2.5 w-12" />
          <SkeletonLine className="h-2.5 w-12" />
          <SkeletonLine className="h-2.5 w-20" />
          <SkeletonLine className="h-2.5 w-12" />
          <SkeletonLine className="h-2.5 w-8" />
        </div>
        {/* search + filter toolbar. Below sm: the real bar folds its chips
            behind one "Filters" pill, so the skeleton draws that pill instead
            of the chips — the whole reason the pickers are sm:-gated here. */}
        <div className="flex items-center gap-2 border-b border-white/40 px-3 py-2.5 sm:px-4 dark:border-white/10">
          <SkeletonLine className="h-8 w-full min-w-0 flex-1 rounded-lg sm:w-56 sm:flex-none" />
          <SkeletonPill className="h-7 w-24 shrink-0 sm:hidden" />
          <SkeletonLine className="hidden h-8 w-20 rounded-lg sm:block" />
          <SkeletonLine className="hidden h-8 w-24 rounded-lg sm:block" />
          <SkeletonLine className="hidden h-8 w-24 rounded-lg sm:block" />
          <SkeletonLine className="hidden h-8 w-20 rounded-lg sm:block" />
        </div>
        {/* quick-add band — title, then the six compact pickers. The 32px
            square between title and Add is the phone's disclosure chevron;
            below sm: it is the only thing standing in for the pickers. */}
        <div className="flex items-center gap-2 border-b border-white/40 px-3 py-2.5 sm:px-4 dark:border-white/10">
          <SkeletonLine className="h-8 min-w-0 flex-1 rounded-lg" />
          <SkeletonLine className="h-8 w-8 shrink-0 rounded-lg sm:hidden" />
          {/* Literal widths — Tailwind's scanner can't see computed names. */}
          {['w-24', 'w-24', 'w-20', 'w-24', 'w-20', 'w-20'].map((w, i) => (
            <SkeletonLine
              key={i}
              className={cn('hidden h-8 shrink-0 rounded-lg sm:block', w)}
            />
          ))}
          <SkeletonLine className="h-8 w-14 shrink-0 rounded-lg" />
        </div>
        <SkeletonBulkBar className="md:hidden dark:border-foreground/10" />
        {/* Below md: the real board is a stack of cards, so the skeleton has
            to be one too — the table drawn here used to snap into cards on
            swap, which is the exact jump this whole file exists to prevent. */}
        <ul className="flex flex-col gap-2 p-3 md:hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <li
              key={i}
              className="rounded-xl border border-white/45 bg-white/35 py-3 pr-11 pl-11 dark:border-foreground/15 dark:bg-foreground/[0.06]"
            >
              <span className="flex flex-col gap-2">
                <SkeletonLine className="w-4/5" />
                <span className="flex items-center gap-1.5">
                  <SkeletonCircle size={16} />
                  <SkeletonLine className="h-2.5 w-32" />
                </span>
                <span className="flex items-center justify-between gap-3">
                  <SkeletonCircle size={20} />
                  <SkeletonLine className="h-2.5 w-10" />
                </span>
                <span className="flex items-center justify-between gap-3">
                  <SkeletonPill className="h-5 w-20" />
                  <SkeletonLine className="h-2.5 w-20" />
                </span>
              </span>
            </li>
          ))}
        </ul>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/40 dark:border-foreground/10">
                <th className={cn(TASK_HEADER_CELL, 'w-10 pl-4 sm:pl-5')}>
                  <span className="block size-4 rounded-[3px] bg-foreground/10" />
                </th>
                {['w-10', 'w-12', 'w-16', 'w-14', 'w-14', 'w-12', 'w-10', 'w-10'].map(
                  (w, i) => (
                    <th key={i} className={TASK_HEADER_CELL}>
                      <SkeletonLine className={cn('h-2 max-w-full', w)} />
                    </th>
                  ),
                )}
                <th className={cn(TASK_HEADER_CELL, 'pr-4 sm:pr-5')} />
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr
                  key={i}
                  className="border-b border-white/40 last:border-b-0 dark:border-foreground/10"
                >
                  <td className="w-10 py-3 pr-3 pl-4 sm:pl-5">
                    <span className="block size-4 rounded-[3px] bg-foreground/10" />
                  </td>
                  <td className="min-w-56 max-w-96 py-2 pr-3">
                    <SkeletonLine className="w-4/5" />
                  </td>
                  <td className="py-2 pr-3">
                    <span className="flex items-center gap-2">
                      <SkeletonCircle size={18} />
                      <SkeletonLine className="h-2.5 w-16" />
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    <SkeletonLine className="h-2.5 w-20" />
                  </td>
                  <td className="py-2 pr-3">
                    <span className="flex items-center gap-2">
                      <SkeletonCircle size={18} />
                      <SkeletonLine className="h-2.5 w-16" />
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    <SkeletonPill className="h-5 w-14" />
                  </td>
                  <td className="py-2 pr-3">
                    <SkeletonPill className="h-5 w-20" />
                  </td>
                  <td className="py-2 pr-3">
                    <SkeletonLine className="ml-auto h-2.5 w-8" />
                  </td>
                  <td className="py-2 pr-3">
                    <SkeletonLine className="ml-auto h-2.5 w-8" />
                  </td>
                  <td className="py-2 pr-4 text-right sm:pr-5">
                    <SkeletonLine className="ml-auto h-2.5 w-4" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <SkeletonHintStrip />
      </GlassPanel>
    </Shell>
  );
}

/**
 * /admin/reports — the client picker. The three-tile stat band is the reason
 * this one mattered: without it the roster sat ~120px too high and the whole
 * page slid down on swap. Also carries the pinned Perseus row above the
 * searchable roster, and the studio-delivery trend below it.
 */
export function ReportsPickerSkeleton() {
  return (
    <Shell label="Loading client reports">
      <SkeletonHeader
        eyebrow="Reports"
        title="Client reports"
        subtitle="Monthly hours and deliverables per client."
        action={<SkeletonPill className="h-8 w-40 shrink-0" />}
      />

      <section className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className={cn(glassCard, 'flex flex-col gap-3 p-5')}>
            <GlassRim />
            <SkeletonLine className="h-2.5 w-24" />
            <SkeletonLine className="h-7 w-16" />
            <SkeletonLine className="h-2 w-28" />
          </div>
        ))}
      </section>

      <GlassPanel className="mt-6">
        {/* the pinned internal-studio row */}
        <div className="flex items-center gap-3.5 border-b border-white/40 px-4 py-3 sm:px-5 dark:border-white/10">
          <SkeletonCircle size={32} />
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <SkeletonLine className="w-24" />
            <SkeletonLine className="h-2 w-32" />
          </span>
          <SkeletonLine className="h-2.5 w-12 shrink-0" />
          <SkeletonLine className="h-2.5 w-10 shrink-0" />
        </div>
        <div className="flex items-center gap-3 border-b border-white/40 px-3 py-2.5 sm:px-4 dark:border-white/10">
          <SkeletonLine className="h-8 w-full rounded-lg sm:w-64" />
          <SkeletonLine className="ml-auto h-2.5 w-14 shrink-0" />
        </div>
        <ul className="divide-y divide-white/40 dark:divide-white/10">
          {Array.from({ length: 8 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3.5 px-4 py-3.5 sm:px-5">
              <SkeletonCircle size={32} />
              <SkeletonLine className="w-1/3" />
              <span className="ml-auto flex shrink-0 items-center gap-4">
                <SkeletonLine className="h-2.5 w-12" />
                <SkeletonLine className="h-2.5 w-10" />
                <SkeletonLine className="h-2.5 w-8" />
              </span>
            </li>
          ))}
        </ul>
      </GlassPanel>

      {/* Studio delivery over time */}
      <GlassPanel as="section" className="mt-6 p-5 sm:p-6">
        <SkeletonLine className="mb-5 h-2.5 w-44" />
        <div className="flex h-32 items-end gap-1.5">
          {COLUMN_HEIGHTS.map((h, i) => (
            <div
              key={i}
              style={{ height: `${h}%` }}
              className="flex-1 rounded-t-md bg-foreground/10"
            />
          ))}
        </div>
      </GlassPanel>
    </Shell>
  );
}

/** A bar-list panel: heading, then N label/value rows over a track. */
const SkeletonBarPanel = ({ bars = 5 }: { bars?: number }) => (
  <GlassPanel as="section" className="mt-6 p-5 sm:p-6">
    <SkeletonLine className="mb-5 h-2.5 w-36" />
    <div className="flex flex-col gap-4">
      {Array.from({ length: bars }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <SkeletonLine className="h-2.5 w-28" />
            <SkeletonLine className="h-2.5 w-10" />
          </div>
          <SkeletonLine className="h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
  </GlassPanel>
);

/**
 * A client's month dashboard (/admin/reports/[slug] and /reports/internal).
 * FOUR tiles on a 2/4 grid — the three-tile `sm:grid-cols-3` version reflowed
 * the whole page on swap — a logo beside the title, the header's five
 * controls, and the real run of panels: highlights, retainer, category, week,
 * member, task table, readiness, internal KPIs, trend.
 */
export function ReportDashboardSkeleton() {
  return (
    <Shell label="Loading report" width="table">
      <SkeletonLine className="mb-6 h-2.5 w-28" />

      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2.5">
          <SkeletonLine className="h-2.5 w-16" />
          <span className="flex items-center gap-3">
            <SkeletonCircle size={40} />
            <SkeletonLine className="h-6 w-44" />
          </span>
          <SkeletonLine className="w-40" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SkeletonPill className="h-8 w-24" />
          <SkeletonPill className="h-8 w-28" />
          <SkeletonPill className="h-8 w-16" />
          <SkeletonPill className="h-8 w-28" />
          <SkeletonPill className="h-8 w-40" />
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={cn(glassCard, 'flex flex-col gap-3 p-5')}>
            <GlassRim />
            <SkeletonLine className="h-2.5 w-24" />
            <SkeletonLine className="h-7 w-14" />
            <SkeletonLine className="h-2 w-20" />
          </div>
        ))}
      </section>

      {/* Month highlights */}
      <GlassPanel as="section" className="mt-6 p-5 sm:p-6">
        <SkeletonLine className="mb-4 h-2.5 w-32" />
        <SkeletonLine className="h-2.5 w-4/5" />
        <SkeletonLine className="mt-2 h-2.5 w-2/3" />
      </GlassPanel>

      {/* Retainer burn */}
      <GlassPanel as="section" className="mt-6 p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <SkeletonLine className="h-2.5 w-32" />
          <SkeletonLine className="h-2.5 w-20" />
        </div>
        <SkeletonLine className="h-2.5 w-full rounded-full" />
      </GlassPanel>

      <SkeletonBarPanel />
      <SkeletonBarPanel bars={4} />

      {/* Members involved */}
      <GlassPanel as="section" className="mt-6 p-5 sm:p-6">
        <SkeletonLine className="mb-5 h-2.5 w-36" />
        <div className="flex flex-col gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <SkeletonCircle size={28} />
              <SkeletonLine className="w-28" />
              <SkeletonLine className="ml-auto h-2.5 w-12" />
            </div>
          ))}
        </div>
      </GlassPanel>

      {/* The delivered-work table */}
      <GlassPanel as="section" className="mt-6">
        <div className="border-b border-white/40 px-4 py-3 sm:px-5 dark:border-white/10">
          <SkeletonLine className="h-2.5 w-32" />
        </div>
        <ul className="divide-y divide-white/40 dark:divide-white/10">
          {Array.from({ length: 8 }).map((_, i) => (
            <li key={i} className="flex items-center gap-4 px-4 py-2.5 sm:px-5">
              <SkeletonLine className="w-2/5" />
              <SkeletonLine className="ml-auto h-2.5 w-24 shrink-0" />
              <SkeletonLine className="h-2.5 w-12 shrink-0" />
            </li>
          ))}
        </ul>
      </GlassPanel>

      {/* Readiness + internal KPIs — admin-only, never on the share link. */}
      {[3, 4].map((rows, i) => (
        <GlassPanel key={i} as="section" className="mt-6 p-5 sm:p-6">
          <SkeletonLine className="mb-4 h-2.5 w-40" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: rows }).map((_, j) => (
              <div key={j} className="flex items-center justify-between gap-4">
                <SkeletonLine className="h-2.5 w-48" />
                <SkeletonLine className="h-2.5 w-16 shrink-0" />
              </div>
            ))}
          </div>
        </GlassPanel>
      ))}

      {/* Delivery over time */}
      <GlassPanel as="section" className="mt-6 p-5 sm:p-6">
        <SkeletonLine className="mb-5 h-2.5 w-44" />
        <div className="flex h-32 items-end gap-1.5">
          {COLUMN_HEIGHTS.map((h, i) => (
            <div
              key={i}
              style={{ height: `${h}%` }}
              className="flex-1 rounded-t-md bg-foreground/10"
            />
          ))}
        </div>
      </GlassPanel>
    </Shell>
  );
}

/** The studio leaderboard: header + three tiles + champion ribbon + ranked rows. */
export function LeaderboardSkeleton() {
  return (
    <Shell label="Loading leaderboard">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2.5">
          <SkeletonLine className="h-2.5 w-14" />
          <SkeletonLine className="h-6 w-40" />
          <SkeletonLine className="w-56" />
        </div>
        {/* The range toggle AND the month switcher, not one pill. */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <SkeletonPill className="h-8 w-40" />
          <SkeletonPill className="h-8 w-44" />
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className={cn(glassCard, 'flex flex-col gap-3 p-5')}>
            <GlassRim />
            <SkeletonLine className="h-2.5 w-24" />
            <SkeletonLine className="h-7 w-14" />
          </div>
        ))}
      </section>

      <section className="mt-6">
        <div className={cn(glassCard, 'flex items-center gap-4 p-4 sm:p-5')}>
          <GlassRim />
          <SkeletonCircle size={48} />
          <span className="flex min-w-0 flex-1 flex-col gap-2">
            <SkeletonLine className="h-2.5 w-32" />
            <SkeletonLine className="h-4 w-40" />
            <SkeletonLine className="h-2.5 w-48" />
          </span>
        </div>
      </section>

      <section className="mt-6">
        <SkeletonLine className="mb-3 h-2.5 w-28" />
        <GlassPanel>
          <ul className="divide-y divide-white/40 dark:divide-white/10">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="px-4 py-3.5 sm:px-5">
                <div className="flex items-center gap-3">
                  <SkeletonLine className="h-4 w-5 shrink-0" />
                  <SkeletonCircle size={30} />
                  <span className="min-w-0 flex-1 space-y-2">
                    <SkeletonLine className="w-2/5" />
                    <SkeletonLine className="h-2.5 w-24" />
                  </span>
                  <SkeletonLine className="h-2.5 w-14 shrink-0" />
                </div>
                <SkeletonLine className="mt-2.5 h-2 w-full rounded-full" />
              </li>
            ))}
          </ul>
        </GlassPanel>
      </section>

      {/* Leading by category — a two-column avatar grid. */}
      <section className="mt-6">
        <SkeletonLine className="mb-3 h-2.5 w-36" />
        <GlassPanel>
          <ul className="grid gap-px bg-white/40 sm:grid-cols-2 dark:bg-white/10">
            {[0, 1, 2, 3].map((i) => (
              <li
                key={i}
                className="flex items-center gap-3 bg-white/60 p-4 sm:p-5 dark:bg-white/5"
              >
                <SkeletonCircle size={32} />
                <span className="flex min-w-0 flex-col gap-1.5">
                  <SkeletonLine className="h-2 w-20" />
                  <SkeletonLine className="w-28" />
                  <SkeletonLine className="h-2.5 w-36" />
                </span>
              </li>
            ))}
          </ul>
        </GlassPanel>
      </section>

      {/* Past champions — one wrapped chip row. */}
      <section className="mt-6">
        <SkeletonLine className="mb-3 h-2.5 w-32" />
        <GlassPanel>
          <ul className="flex flex-wrap gap-x-6 gap-y-3 p-5 sm:p-6">
            {[0, 1, 2, 3, 4].map((i) => (
              <li key={i} className="flex items-center gap-2">
                <SkeletonCircle size={22} />
                <SkeletonLine className="w-24" />
                <SkeletonLine className="h-2.5 w-28" />
              </li>
            ))}
          </ul>
        </GlassPanel>
      </section>
    </Shell>
  );
}

/**
 * The report sheet — the print page and the tokenized /share link, which
 * render the same document. Three bars used to stand in for the densest page
 * in the app; this mirrors the real box: the full-height ground, the print
 * button, the two-column masthead, the four-tile band, the bar sections and
 * the footer rule.
 *
 * Ink-tint bars, not literal neutral-200: the sheet itself is theme-aware, and
 * pinned-light bars on a dark sheet read as an inverted page that then swaps.
 */
export function ReportPrintSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="min-h-svh bg-background"
    >
      <span className="sr-only">Preparing report</span>
      <div className="animate-pulse">
        {/* PrintButton is `fixed top-4 right-4`, so it takes no flow space —
            mirror that rather than reserving a row the real page never has. */}
        <div className="fixed top-4 right-4 z-10">
          <SkeletonPill className="h-8 w-32" />
        </div>

        <div className="mx-auto max-w-3xl px-6 py-12 sm:px-10">
          <header className="flex items-start justify-between gap-6 border-b border-border pb-6">
            <div className="flex flex-col gap-2">
              <SkeletonLine className="h-4 w-52" />
              <SkeletonLine className="h-2.5 w-36" />
            </div>
            <div className="flex items-center gap-2.5">
              <SkeletonCircle size={36} />
              <div className="flex flex-col items-end gap-2">
                <SkeletonLine className="h-5 w-40" />
                <SkeletonLine className="h-2.5 w-24" />
              </div>
            </div>
          </header>

          <section className="mt-8 grid grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-border px-4 py-3"
              >
                <SkeletonLine className="h-2 w-20" />
                <SkeletonLine className="mt-2.5 h-5 w-14" />
              </div>
            ))}
          </section>

          {/* Category · week · member bars, then the task table. */}
          {[5, 4, 4].map((bars, i) => (
            <section key={i} className="mt-8">
              <SkeletonLine className="mb-4 h-2 w-40" />
              <div className="flex flex-col gap-4">
                {Array.from({ length: bars }).map((_, j) => (
                  <div key={j} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <SkeletonLine className="h-2.5 w-32" />
                      <SkeletonLine className="h-2.5 w-12" />
                    </div>
                    <SkeletonLine className="h-2 w-full rounded-full" />
                  </div>
                ))}
              </div>
            </section>
          ))}

          <section className="mt-8">
            <SkeletonLine className="mb-4 h-2 w-32" />
            <div className="divide-y divide-foreground/10">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-2.5">
                  <SkeletonLine className="w-2/5" />
                  <SkeletonLine className="ml-auto h-2.5 w-20 shrink-0" />
                  <SkeletonLine className="h-2.5 w-12 shrink-0" />
                </div>
              ))}
            </div>
          </section>

          <div className="mt-10 border-t border-border pt-4">
            <SkeletonLine className="h-2.5 w-96 max-w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Profile: back link + identity header + four stacked form sections. */
/** /admin/my-pay — hero + chart, three tiles, the two-up, then the month list. */
/**
 * The payslip sheet. Mirrors the real route's box exactly: AdminPage `narrow`,
 * the print-hidden back-link/Print row, then the bordered `bg-background`
 * article with its header, five detail rows on `divide-y`, the change block and
 * the footer rule. It used to borrow {@link ReportPrintSkeleton}, which is cut
 * for the full-bleed reports print page (`max-w-3xl px-10 py-12`) — so the
 * payslip loaded a narrower, card-less block that jumped wider and grew a
 * toolbar on swap, and told screen readers it was "Preparing report".
 */
export function PayslipSkeleton() {
  return (
    <Shell label="Loading payslip" width="narrow">
      <div className="mb-6 flex items-center justify-between gap-4">
        <SkeletonLine className="h-2.5 w-20" />
        <SkeletonPill className="w-32" />
      </div>

      <div className="rounded-2xl border border-border bg-background p-8">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
          <div className="flex flex-col gap-2">
            <SkeletonLine className="h-2 w-40" />
            <SkeletonLine className="h-6 w-52" />
            <SkeletonLine className="h-3 w-44" />
          </div>
          <SkeletonPill className="w-24" />
        </header>

        <section className="mt-8">
          <SkeletonLine className="mb-4 h-2.5 w-24" />
          <div className="divide-y divide-foreground/10">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
              >
                <SkeletonLine className="h-3 w-36" />
                <SkeletonLine className="h-3 w-32" />
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <SkeletonLine className="h-2.5 w-16" />
            <SkeletonLine className="h-2.5 w-20" />
          </div>
          <SkeletonLine className="h-7 w-48" />
          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:gap-4">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="flex-1 rounded-xl bg-foreground/[0.04] px-4 py-3"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <SkeletonLine className="h-3 w-20" />
                  <SkeletonLine className="h-3 w-12" />
                </div>
                <SkeletonLine className="mt-2 h-2.5 w-32" />
              </div>
            ))}
          </div>
          <SkeletonLine className="mt-4 h-2.5 w-72" />
        </section>

        <div className="mt-10 border-t border-border pt-4">
          <SkeletonLine className="h-2.5 w-80" />
          <SkeletonLine className="mt-2 h-2.5 w-40" />
        </div>
      </div>
    </Shell>
  );
}

export function MyPaySkeleton() {
  return (
    <Shell label="Loading your pay">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2.5">
          <SkeletonLine className="h-2.5 w-14" />
          <SkeletonLine className="h-6 w-32" />
          <SkeletonLine className="w-64" />
        </div>
        <SkeletonPill className="h-9 w-36" />
      </header>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <GlassPanel className="flex flex-col justify-between gap-6 p-6 sm:p-8">
          <div className="flex flex-col gap-3">
            <SkeletonLine className="h-2.5 w-28" />
            <SkeletonLine className="h-10 w-56" />
            <SkeletonLine className="h-2.5 w-64" />
          </div>
          <div className="flex flex-col gap-3">
            <SkeletonLine className="w-56" />
            <div className="flex gap-2 pt-1">
              <SkeletonPill className="h-9 w-32" />
              <SkeletonPill className="h-9 w-36" />
            </div>
          </div>
        </GlassPanel>

        <div className={cn(glassCard, 'flex flex-col p-5 sm:p-6')}>
          <GlassRim />
          <div className="mb-5 flex items-baseline justify-between">
            <SkeletonLine className="h-2.5 w-28" />
            <SkeletonLine className="h-2.5 w-14" />
          </div>
          <div className="flex h-40 items-end gap-1 sm:h-48 sm:gap-1.5">
            {COLUMN_HEIGHTS.map((h, i) => (
              <div
                key={i}
                style={{ height: `${h}%` }}
                className="flex-1 rounded-t-md bg-foreground/10"
              />
            ))}
          </div>
          <div className="mt-2 flex gap-1 sm:gap-1.5">
            {COLUMN_HEIGHTS.map((_, i) => (
              <SkeletonLine key={i} className="h-2 flex-1" />
            ))}
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className={cn(glassCard, 'flex flex-col gap-3 p-5')}>
            <GlassRim />
            <SkeletonLine className="h-2.5 w-28" />
            <SkeletonLine className="h-7 w-36" />
            <SkeletonLine className="h-2.5 w-24" />
          </div>
        ))}
      </section>

      {/* No items-start: the real page comments that both columns stretch so
          they end on the same line. */}
      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className={cn(glassCard, 'flex flex-col p-5 sm:p-6')}>
            <GlassRim />
            <SkeletonLine className="mb-5 h-2.5 w-28" />
            <SkeletonLine className="h-24 w-full" />
            <div className="mt-5 flex flex-col gap-3.5">
              {[0, 1].map((j) => (
                <div key={j} className="flex items-center justify-between">
                  <SkeletonLine className="h-2.5 w-28" />
                  <SkeletonLine className="h-2.5 w-20" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Every month — year chips, then the month rows. */}
      <GlassPanel as="section" className="mt-6 p-5 sm:p-6">
        <div className="mb-5 flex items-baseline justify-between">
          <SkeletonLine className="h-2.5 w-32" />
          <SkeletonLine className="h-2 w-20" />
        </div>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {[0, 1, 2].map((i) => (
            <SkeletonPill key={i} className="h-6 w-14" />
          ))}
        </div>
        <div className="-mx-2 flex flex-col divide-y divide-white/40 dark:divide-white/10">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-baseline justify-between px-2 py-2.5">
              <SkeletonLine className="h-3 w-36" />
              <SkeletonLine className="h-3 w-28" />
            </div>
          ))}
        </div>
      </GlassPanel>

      {/* "How <month> was worked out" — the mechanics, demoted but present. */}
      <GlassPanel as="section" className="mt-6 p-5 sm:p-6">
        <SkeletonLine className="mb-5 h-2.5 w-52" />
        <div className="flex flex-col gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <SkeletonLine className="h-3 w-44" />
              <SkeletonLine className="h-3 w-24" />
            </div>
          ))}
        </div>
      </GlassPanel>

      <SkeletonNote lines={2} />
    </Shell>
  );
}

/** /admin/payroll — the month screen: run header, tiles, then the lines table. */
export function PayrollMonthSkeleton() {
  return (
    <Shell label="Loading payroll" width="table">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2.5">
          <SkeletonLine className="h-2.5 w-16" />
          <SkeletonLine className="h-6 w-40" />
          <SkeletonLine className="w-52" />
        </div>
        <div className="flex gap-2">
          <SkeletonPill className="h-8 w-8" />
          <SkeletonPill className="h-8 w-36" />
          <SkeletonPill className="h-9 w-28" />
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={cn(glassCard, 'flex flex-col gap-3 p-5')}>
            <GlassRim />
            <SkeletonLine className="h-2.5 w-24" />
            <SkeletonLine className="h-7 w-28" />
          </div>
        ))}
      </section>

      {/* Six-column table, no avatars — the roster's avatar rows were the
          wrong page's shape and every column snapped left on swap. */}
      <section className="mt-6">
        <GlassPanel>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/40 dark:border-white/10">
                  {['w-16', 'w-20', 'w-20', 'w-24', 'w-12'].map((w, i) => (
                    <th key={i} className="px-0 py-2.5 first:pl-4 sm:first:pl-5">
                      <SkeletonLine className={cn('h-2', w)} />
                    </th>
                  ))}
                  <th className="w-10 pr-4 sm:pr-5" />
                </tr>
              </thead>
              <tbody>
                {[0, 1, 2, 3].map((i) => (
                  <tr
                    key={i}
                    className="border-b border-white/40 last:border-b-0 dark:border-white/10"
                  >
                    <td className="py-3 pl-4 sm:pl-5">
                      <SkeletonLine className="w-32" />
                    </td>
                    {[0, 1, 2].map((j) => (
                      <td key={j} className="py-3 pr-3">
                        <SkeletonLine className="ml-auto h-2.5 w-20" />
                      </td>
                    ))}
                    <td className="py-3 pr-3">
                      <SkeletonPill className="h-5 w-16" />
                    </td>
                    <td className="w-10 py-3 pr-4 text-right sm:pr-5">
                      <SkeletonLine className="ml-auto h-2.5 w-4" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassPanel>
      </section>

      <SkeletonNote lines={1} />

      {/* Company cost over time */}
      <GlassPanel as="section" className="mt-6 p-5 sm:p-6">
        <div className="mb-5 flex items-baseline justify-between">
          <SkeletonLine className="h-2.5 w-44" />
          <SkeletonLine className="h-2 w-24" />
        </div>
        <div className="flex h-32 items-end gap-1.5">
          {COLUMN_HEIGHTS.map((h, i) => (
            <div
              key={i}
              style={{ height: `${h}%` }}
              className="flex-1 rounded-t-md bg-foreground/10"
            />
          ))}
        </div>
      </GlassPanel>

      <SkeletonNote lines={1} />
      <SkeletonNote lines={2} />
    </Shell>
  );
}

/** /admin/payroll/[memberId] — one member's history. */
export function PayrollMemberSkeleton() {
  return (
    <Shell label="Loading member">
      <SkeletonLine className="mb-6 h-2.5 w-28" />
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2.5">
          <SkeletonLine className="h-2.5 w-16" />
          <SkeletonLine className="h-6 w-48" />
          <SkeletonLine className="w-56" />
        </div>
        <SkeletonLine className="h-2.5 w-28 shrink-0" />
      </header>
      <section className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className={cn(glassCard, 'flex flex-col gap-3 p-5')}>
            <GlassRim />
            <SkeletonLine className="h-2.5 w-24" />
            <SkeletonLine className="h-7 w-24" />
          </div>
        ))}
      </section>
      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className={cn(glassCard, 'flex flex-col p-5 sm:p-6')}>
            <GlassRim />
            <div className="mb-5 flex items-baseline justify-between">
              <SkeletonLine className="h-2.5 w-28" />
              <SkeletonLine className="h-2.5 w-14" />
            </div>
            <div className="flex h-40 items-end gap-1 sm:h-48 sm:gap-1.5">
              {COLUMN_HEIGHTS.map((h, j) => (
                <div
                  key={j}
                  style={{ height: `${h}%` }}
                  className="flex-1 rounded-t-md bg-foreground/10"
                />
              ))}
            </div>
          </div>
        ))}
      </section>
      {/* Salary history, then annual totals — two DetailList sections. */}
      {[5, 2].map((rows, i) => (
        <GlassPanel key={i} as="section" className="mt-6 p-5 sm:p-6">
          <SkeletonLine className="mb-5 h-2.5 w-32" />
          <div className="flex flex-col gap-4">
            {Array.from({ length: rows }).map((_, j) => (
              <div key={j} className="flex items-center justify-between">
                <SkeletonLine className="h-3 w-36" />
                <SkeletonLine className="h-3 w-28" />
              </div>
            ))}
          </div>
        </GlassPanel>
      ))}

      {/* Every month — the history list this skeleton used to end before. */}
      <section className="mt-6">
        <SkeletonLine className="mb-3 h-2.5 w-28" />
        <GlassPanel>
          <ul className="divide-y divide-white/40 dark:divide-white/10">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <li
                key={i}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-5"
              >
                <div className="min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <SkeletonLine className="w-24" />
                    <SkeletonPill className="h-4 w-16" />
                  </div>
                  <SkeletonLine className="h-2.5 w-48" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="space-y-2 text-right">
                    <SkeletonLine className="ml-auto w-24" />
                    <SkeletonLine className="ml-auto h-2.5 w-20" />
                  </div>
                  <SkeletonPill className="h-8 w-8" />
                </div>
              </li>
            ))}
          </ul>
        </GlassPanel>
      </section>
    </Shell>
  );
}

export function ProfileSkeleton() {
  return (
    <Shell label="Loading profile" width="narrow">
      <SkeletonLine className="mb-6 h-2.5 w-28" />

      <header className="mb-8 flex items-center gap-4">
        <SkeletonCircle size={72} />
        <div className="flex flex-col gap-2">
          <SkeletonLine className="h-5 w-40" />
          <SkeletonLine className="h-2.5 w-52" />
          <SkeletonPill className="mt-1 h-4 w-16" />
        </div>
      </header>

      {/* Seven, in page order: display name, timezone, password, passkeys,
          notifications, sessions, what's new. (InstallDashboardCard is not
          counted — it renders null unless this device can actually install;
          nor is NotificationsCard's suppressed state.) Keep this list in step
          with profile/page.tsx: the timezone card once arrived without it, and
          a skeleton one section short renders at a different height than the
          page it stands in for, so the layout jumps on swap. What's new is
          LAST and short now — a fixed-height readout, not the history. */}
      <div className="flex flex-col gap-4">
        <SkeletonSection rows={1} />
        <SkeletonSection rows={2} />
        <SkeletonSection rows={2} />
        <SkeletonSection rows={2} />
        <SkeletonSection rows={2} />
        <SkeletonSection rows={3} />
        <SkeletonSection rows={2} />
      </div>
    </Shell>
  );
}

/**
 * /admin/logs — the activity timeline. Mirrors its real box: header, the
 * filter row, a day heading, then rail-and-text rows, so the swap doesn't
 * shift layout.
 */
export function ActivityListSkeleton() {
  return (
    <Shell label="Loading activity">
      <header className="mb-6 flex flex-col gap-2.5">
        <SkeletonLine className="h-6 w-32" />
        <SkeletonLine className="w-72" />
      </header>

      <GlassPanel>
        <div className="flex flex-wrap items-center gap-2 border-b border-white/40 px-3 py-2.5 sm:px-4 dark:border-white/10">
          <SkeletonLine className="h-8 w-full rounded-lg sm:w-64" />
          {[0, 1, 2, 3].map((i) => (
            <SkeletonLine key={i} className="h-8 w-24 rounded-lg" />
          ))}
        </div>

        <div className="border-b border-white/40 px-4 py-1.5 dark:border-white/10">
          <SkeletonLine className="h-2.5 w-16" />
        </div>

        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="flex gap-3 px-4 py-3 sm:gap-4">
            <div className="flex w-7 shrink-0 justify-center">
              <SkeletonCircle size={28} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
              {/* Two widths alternating: a single width reads as a table,
                  which is precisely what this feed is not. */}
              <SkeletonLine className={i % 2 === 0 ? 'w-3/5' : 'w-2/5'} />
            </div>
            <SkeletonLine className="mt-1 h-2.5 w-12 shrink-0" />
          </div>
        ))}

        {/* entry count + pagination */}
        <div className="flex items-center justify-between gap-4 border-t border-white/40 p-3 dark:border-white/10">
          <SkeletonLine className="h-2.5 w-28" />
          <SkeletonLine className="h-2.5 w-32 shrink-0" />
        </div>
      </GlassPanel>
    </Shell>
  );
}

/**
 * The costs month screen: header + four tiles + the charges table + two bar
 * strips. `table` width, matching the page — a skeleton at a different measure
 * makes the real page visibly snap on swap.
 */
export function CostMonthSkeleton() {
  return (
    <Shell label="Loading bills" width="table">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Private
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Bills
          </h1>
          <SkeletonLine className="w-52" />
        </div>
        <div className="flex gap-2">
          <SkeletonPill className="h-8 w-8" />
          <SkeletonPill className="h-8 w-36" />
          <SkeletonPill className="h-9 w-36" />
          <SkeletonPill className="h-9 w-32" />
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={cn(glassCard, 'flex flex-col gap-3 p-5')}>
            <GlassRim />
            <SkeletonLine className="h-2.5 w-24" />
            <SkeletonLine className="h-7 w-28" />
          </div>
        ))}
      </section>

      <section className="mt-6">
        <div className="mb-3 px-1">
          <SkeletonLine className="h-2.5 w-24" />
        </div>
        <GlassPanel>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/40 dark:border-white/10">
                  {['w-16', 'w-16', 'w-12', 'w-16', 'w-16', 'w-10'].map(
                    (w, i) => (
                      <th
                        key={i}
                        className="px-0 py-2.5 first:pl-4 sm:first:pl-5"
                      >
                        <SkeletonLine className={cn('h-2', w)} />
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {[0, 1, 2, 3].map((i) => (
                  <tr
                    key={i}
                    className="border-b border-white/40 last:border-b-0 dark:border-white/10"
                  >
                    <td className="py-3 pl-4 sm:pl-5">
                      <SkeletonLine className="w-32" />
                    </td>
                    <td className="py-3 pr-3">
                      <SkeletonLine className="h-2.5 w-20" />
                    </td>
                    <td className="py-3 pr-3">
                      <SkeletonPill className="h-4 w-16" />
                    </td>
                    <td className="py-3 pr-3">
                      <SkeletonLine className="h-2.5 w-20" />
                    </td>
                    <td className="py-3 pr-3">
                      <SkeletonLine className="ml-auto h-2.5 w-16" />
                    </td>
                    <td className="py-3 pr-4 sm:pr-5">
                      <SkeletonLine className="ml-auto h-2.5 w-8" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassPanel>
      </section>

      {[0, 1].map((section) => (
        <section key={section} className="mt-6">
          <div className="mb-3 flex items-baseline justify-between px-1">
            <SkeletonLine className="h-2.5 w-28" />
            <SkeletonLine className="h-2 w-20" />
          </div>
          <GlassPanel className="p-5 sm:p-6">
            <div className="flex flex-col gap-2.5">
              {COLUMN_HEIGHTS.slice(0, section === 0 ? 4 : 8).map((h, i) => (
                <div key={i}>
                  <div className="flex items-baseline justify-between">
                    <SkeletonLine className="h-2 w-16" />
                    <SkeletonLine className="h-2 w-14" />
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-foreground/[0.08]">
                    <div
                      style={{ width: `${h}%` }}
                      className="h-full rounded-full bg-foreground/15"
                    />
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>
        </section>
      ))}

      <SkeletonNote lines={1} />
    </Shell>
  );
}

/**
 * /admin/spend. `table` to match the page — it is the widest money surface and
 * a mismatch here would snap the measure on swap.
 */
/** A stack of label-over-bar placeholders — the Spend screen's one repeated
 *  shape, used by the buckets, both line lists and the trend. */
function SkeletonBars({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i}>
          <div className="flex items-baseline justify-between gap-3">
            <SkeletonLine className="h-2.5 w-28" />
            <SkeletonLine className="h-2.5 w-16" />
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-foreground/10" />
        </div>
      ))}
    </div>
  );
}

export function SpendMonthSkeleton() {
  return (
    <Shell label="Loading spend" width="table">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Private
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Spend
          </h1>
          <SkeletonLine className="w-64" />
        </div>
        <div className="flex gap-2">
          <SkeletonPill className="h-8 w-36" />
          <SkeletonPill className="h-9 w-36" />
        </div>
      </header>

      {/* Six columns with the headline tile spanning two — the page's own
          grid. A skeleton on a different column count reflows the whole row
          the moment the real tiles land. */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              glassCard,
              'flex h-full flex-col gap-3 p-5',
              i === 0 && 'xl:col-span-2',
            )}
          >
            <GlassRim />
            <SkeletonLine className="h-2.5 w-24" />
            {/* The first tile is the page's headline figure (text-4xl), so its
                placeholder is taller — otherwise the swap nudges the row. */}
            <SkeletonLine className={i === 0 ? 'h-9 w-32' : 'h-7 w-28'} />
            <SkeletonLine className="h-2.5 w-20" />
          </div>
        ))}
      </section>

      <SkeletonNote lines={2} />

      {/* "Where it went" — four buckets, then the two line lists beneath them
          in the same two columns the real section uses. */}
      <section className="mt-6">
        <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
          <SkeletonLine className="h-2.5 w-28" />
          <SkeletonLine className="h-2.5 w-20" />
        </div>
        <GlassPanel className="p-5 sm:p-6">
          <SkeletonBars rows={4} />
          <div className="mt-5 grid gap-6 border-t border-white/40 pt-5 md:grid-cols-2 md:gap-x-8 dark:border-white/10">
            {[0, 1].map((col) => (
              <div key={col}>
                <div className="mb-2.5 flex items-baseline justify-between gap-3">
                  <SkeletonLine className="h-2.5 w-16" />
                  <SkeletonLine className="h-2.5 w-14" />
                </div>
                <SkeletonBars rows={3} />
              </div>
            ))}
          </div>
        </GlassPanel>
      </section>

      {/* The trend. Rows are capped at the twelve the window can hold, but the
          real strip trims its oldest empty months, so this is a ceiling rather
          than a promise — six keeps the swap from jumping in either direction
          on a studio whose ledger is younger than a year. */}
      <section className="mt-6">
        <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
          <SkeletonLine className="h-2.5 w-40" />
          <SkeletonLine className="h-2.5 w-24" />
        </div>
        <GlassPanel className="p-5 sm:p-6">
          <SkeletonBars rows={6} />
        </GlassPanel>
      </section>

      <SkeletonNote />
    </Shell>
  );
}

/**
 * /admin/spend/commitments. `wide` to match the page: a single-column list,
 * where extra width would only drag each monthly figure away from its name.
 */
export function CommitmentsSkeleton() {
  return (
    <Shell label="Loading commitments">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Private
          </span>
          {/* Deliberately a placeholder, not the word "Commitments": the real
              heading depends on which halves the viewer holds, and printing one
              of the three here would flash the wrong title at a single-grant
              viewer before the page corrected it. */}
          <SkeletonLine className="h-7 w-48" />
          <SkeletonLine className="w-56" />
        </div>
        <div className="flex gap-2">
          <SkeletonPill className="h-9 w-32" />
          <SkeletonPill className="h-9 w-28" />
        </div>
      </header>

      <GlassPanel>
        <div className="flex flex-wrap items-center gap-3 border-b border-white/40 px-3 py-2.5 sm:px-4 dark:border-white/10">
          <SkeletonLine className="h-8 w-full rounded-lg sm:w-64" />
          <div className="flex flex-wrap items-center gap-1.5">
            {['w-14', 'w-16', 'w-14', 'w-16'].map((w, i) => (
              <SkeletonPill key={i} className={cn('h-7', w)} />
            ))}
          </div>
          <SkeletonLine className="ml-auto h-2.5 w-20 shrink-0" />
        </div>
        <ul className="divide-y divide-white/40 dark:divide-white/10">
          {Array.from({ length: 7 }).map((_, i) => (
            <li
              key={i}
              className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-5"
            >
              <span className="min-w-0 flex-1 basis-full space-y-2 sm:basis-auto">
                <span className="flex items-center gap-2">
                  <SkeletonLine className="w-1/3" />
                  <SkeletonPill className="h-4 w-14" />
                  <SkeletonPill className="h-4 w-14" />
                </span>
                <SkeletonLine className="h-2.5 w-2/5" />
                <SkeletonLine className="h-2.5 w-3/5" />
              </span>
              <span className="shrink-0 space-y-1.5 text-right">
                <SkeletonLine className="h-4 w-20" />
                <SkeletonLine className="h-2.5 w-16" />
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                <SkeletonLine className="h-8 w-8 rounded-lg" />
                <SkeletonLine className="h-8 w-16 rounded-lg" />
                <SkeletonLine className="h-8 w-16 rounded-lg" />
              </span>
            </li>
          ))}
        </ul>
      </GlassPanel>

      <SkeletonNote />
    </Shell>
  );
}

/** Label/value rows inside a panel that already has its own glass. */
const SkeletonRows = ({ rows }: { rows: number }) => (
  <div className="flex flex-col gap-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center justify-between gap-4">
        <SkeletonLine className="h-2.5 w-36" />
        <SkeletonPill className="h-4 w-14" />
      </div>
    ))}
  </div>
);

/**
 * /admin/monitoring — `wide` like the real page. The status tile, three
 * figure tiles, the column chart beside a list, then two list panels: the
 * same boxes MonitoringPage draws, so the swap moves nothing.
 */
export function MonitoringSkeleton() {
  return (
    <Shell label="Loading monitoring" width="wide">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Private
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Monitoring
          </h1>
          <SkeletonLine className="w-64" />
        </div>
        <div className="flex gap-2">
          <SkeletonPill className="h-8 w-44" />
          <SkeletonPill className="h-8 w-28" />
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={cn(glassCard, 'flex flex-col gap-3 p-5')}>
            <GlassRim />
            <SkeletonLine className="h-2.5 w-24" />
            {i === 0 ? (
              <SkeletonPill className="h-7 w-24" />
            ) : (
              <SkeletonLine className="h-7 w-16" />
            )}
            <SkeletonLine className="h-2 w-32" />
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className={cn(glassCard, 'flex flex-col p-5 sm:p-6 lg:col-span-2')}>
          <GlassRim />
          <div className="mb-5 flex items-baseline justify-between">
            <SkeletonLine className="h-2.5 w-24" />
            <SkeletonLine className="h-2 w-20" />
          </div>
          <div className="flex h-40 items-end gap-1 sm:h-48 sm:gap-1.5">
            {PULSE_HEIGHTS.slice(0, 12).map((h, i) => (
              <div key={i} className="flex h-full flex-1 items-end">
                {h > 0 ? (
                  <div
                    style={{ height: `${h}%` }}
                    className="w-full rounded-t-md bg-foreground/15"
                  />
                ) : (
                  <div className="w-full border-t border-dashed border-foreground/20" />
                )}
              </div>
            ))}
          </div>
          <SkeletonLine className="mt-4 h-2 w-40" />
        </div>
        <div className={cn(glassCard, 'flex flex-col p-5 sm:p-6')}>
          <GlassRim />
          <SkeletonLine className="mb-5 h-2.5 w-28" />
          <SkeletonRows rows={4} />
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className={cn(glassCard, 'flex flex-col p-5 sm:p-6')}>
            <GlassRim />
            <div className="mb-5 flex items-baseline justify-between">
              <SkeletonLine className="h-2.5 w-24" />
              <SkeletonLine className="h-2 w-16" />
            </div>
            <SkeletonRows rows={i === 0 ? 6 : 5} />
          </div>
        ))}
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-baseline justify-between px-1">
          <SkeletonLine className="h-2.5 w-20" />
          <SkeletonLine className="h-2 w-16" />
        </div>
        <GlassPanel className="p-5 sm:p-6">
          <SkeletonRows rows={2} />
        </GlassPanel>
      </section>
    </Shell>
  );
}
