import AdminPage from '@/components/Admin/AdminPage';
import { GlassPanel, glassCard, GlassRim } from '@/components/Admin/Glass';
// The tasks panel's own box tokens. Imported rather than copied: this file is
// only worth having if each row is the height of the row it stands in for, and
// five hand-copied class strings are exactly how that stopped being true.
import {
  agendaDay,
  calendarCell,
  calendarWeekday,
  panelDivider,
  panelRow,
  panelRowPad,
  tabItem,
  tabStrip,
  tableHeadCell,
  tableHeadTrigger,
  tallyRow,
  taskCardBody,
} from '@/components/Admin/tasks/menu';
// The posts list's own boxes, for the same reason and aliased because the
// tasks panel above already claims four of these names in this file. They are
// a separate surface's tokens, so they are imported rather than assumed equal
// to the tasks ones they currently happen to match.
import {
  panelDivider as blogPanelDivider,
  panelRow as blogPanelRow,
  postGrid as blogPostGrid,
  postHeadCell as blogHeadCell,
  postHeadRow as blogHeadRow,
  postMenuGutter as blogMenuGutter,
  postRowPad as blogRowPad,
  postRowShell as blogRowShell,
  tabItem as blogTabItem,
  tabStrip as blogTabStrip,
} from '@/components/Admin/blogs/listBox';
// The post editor's own boxes, and the body editor's. Same rule again: the
// bar's height, the rail's width and the canvas's padding must be the ones the
// page really uses, or loading.tsx renders one shape and the page snaps to
// another.
import {
  editorBar,
  editorBarActions,
  editorBarLead,
  editorCanvasColumn,
  editorLayout,
  editorRail,
  editorSaveState,
  editorTitleField,
  inspectorBody,
  inspectorGroup,
  inspectorPanel,
  inspectorTab,
  inspectorTabStrip,
  revisionChip,
  revisionChipCell,
  revisionGrid,
  revisionHeadRow,
  revisionRowActions,
  revisionRowPad,
  revisionRowShell,
  revisionTitleCell,
} from '@/components/Admin/blogs/postBox';
import {
  editorCanvas,
  editorShell,
  editorSkeletonLine,
  editorSkeletonToolbar,
  editorToolbar,
} from '@/components/Admin/blogs/editor/editorBox';
import { TASK_COLUMNS, type TaskColumn } from '@/lib/taskColumns';
import type { TaskViewMode } from '@/lib/taskFilters';
import { cn } from '@/lib/utils';

/**
 * Glass-styled loading skeletons for the (dynamic) admin routes. Each composite
 * mirrors its real page's box — the same AdminPage wide/narrow wrapper, same
 * glass panels, real static header text where it isn't data-dependent — so the
 * `loading.tsx` fallback reads as the same page mid-load (no gray-screen flash,
 * no layout jump on swap). Server Components (static markup): they import only
 * AdminPage, Glass tokens, cn and a real surface's own client-safe BOX tokens
 * (Admin/tasks/menu.ts) — never `server-only` modules, the registries, or the
 * `@/components` barrel. Quoting a box by import is the point: it is the only
 * thing that keeps a row the height of the row it stands in for.
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
 * A bar standing in for TEXT, in the line box that text would have occupied.
 *
 * Two nested spans, both load-bearing. The inner one is `inline-block`, so it
 * is laid out against the parent's strut instead of measuring its own height;
 * the outer one is a plain inline span, which does nothing inside a block
 * parent and becomes the block box that carries the strut inside a FLEX one
 * (a flex item is blockified, and a bare bar there would set the row's height
 * to the bar's).
 *
 * The upshot is that a row quoting a real component's `text-*` classes comes
 * out at the real component's height for free, whatever bar you put in it.
 * That is how the table head, the tabs, the tally line and the keyboard legend
 * are the right size here rather than 7 to 18px short, which is what a `h-2.5`
 * div in a padded box had them at.
 */
const SkeletonText = ({ className }: { className?: string }) => (
  <span>
    <span
      className={cn(
        'inline-block h-2.5 rounded bg-foreground/10 align-middle',
        className,
      )}
    />
  </span>
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

/**
 * The `hidden lg:block` keyboard legend that closes the keyboard lists. The
 * class string is byte-identical to the real one in TaskBoard and in
 * InboxKeyboardList (they already agree), `text-[0.7rem]` included: that is
 * what sets the row's 38px, and a bare bar in the same padding measured 31.
 */
const SkeletonHintStrip = () => (
  <div className="hidden border-t border-white/40 px-4 py-2.5 text-center text-[0.7rem] lg:block dark:border-white/10">
    <SkeletonText className="w-96 max-w-full" />
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
  extraLine,
}: {
  eyebrow: string;
  title: string;
  /** A real sentence where the page's is static; a bar where it is not. */
  subtitle: React.ReactNode;
  action?: React.ReactNode;
  /** A fifth row for the pages whose header carries one unconditionally — /admin/users
   *  always prints "N of M have notifications on." under the subtitle, and without a
   *  bar for it the whole roster sat a line too high until hydration. */
  extraLine?: React.ReactNode;
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
      {extraLine}
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
        {/* flex-wrap and no `hidden`: InboxFilterBar shows all four triggers at
            every width under a `w-full` search field, so a one-row skeleton
            snapped to a two/three-row toolbar and shoved the list down.
            ActivityListSkeleton, the same recipe, already had this right. */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/40 px-3 py-2.5 sm:px-4 dark:border-white/10">
          <SkeletonLine className="h-8 w-full rounded-lg sm:w-64" />
          <SkeletonLine className="h-8 w-24 rounded-lg" />
          <SkeletonLine className="h-8 w-24 rounded-lg" />
          <SkeletonLine className="h-8 w-20 rounded-lg" />
          <SkeletonLine className="h-8 w-24 rounded-lg" />
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
        extraLine={<SkeletonLine className="h-2.5 w-56" />}
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
        {/* The page wraps this table in its own scroller; without it the last
            two columns are simply clipped by the panel's overflow-hidden, and
            the columns re-flow when the real table lands. */}
        <div
          data-lenis-prevent-horizontal
          className="overflow-x-auto overscroll-x-contain"
        >
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
        </div>
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
        <div className="flex flex-wrap items-center gap-2">
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

/**
 * /admin/blogs — the posts list. Six status tabs, the filter bar, the head row,
 * the bulk bar, then rows.
 *
 * Every box comes from `Admin/blogs/listBox`, the real surface's own tokens,
 * so a padding change on the list moves this with it. The head row and the
 * rows share `postGrid` for the same reason they do on the page: a skeleton
 * whose seven columns are written separately lines up until the next edit.
 *
 * `Shell` takes `wide`, which is the token the page passes AdminPage. Anything
 * else and loading.tsx renders at one measure and the page snaps to another.
 */
export function BlogsListSkeleton() {
  return (
    <Shell label="Loading posts">
      <SkeletonHeader
        eyebrow="Website"
        title="Blog"
        subtitle="Drafts, scheduled posts and everything live on the public blog."
        // Authors, Categories, New post. All three are unconditional, so all
        // three are reserved: one pill under a header that renders three
        // leaves the row a control short and reflows it on swap.
        action={
          <div className="flex flex-wrap items-center gap-2">
            {['w-28', 'w-32', 'w-28'].map((w) => (
              <SkeletonPill key={w} className={cn(HEADER_CONTROL, w)} />
            ))}
          </div>
        }
      />

      <GlassPanel className="mt-6">
        {/* All, Draft, Scheduled, Published, Archived, Trash. Every one carries
            a count badge except the ones that happen to be empty, which is not
            knowable here, so all six reserve one. */}
        <div className={blogPanelDivider}>
          <div className={blogTabStrip}>
            {['w-6', 'w-10', 'w-16', 'w-16', 'w-14', 'w-10'].map((w, i) => (
              <span key={i} className={cn(blogTabItem, 'border-transparent')}>
                <SkeletonText className={cn('h-2.5', w)} />
                <span className="h-4 w-5 shrink-0 rounded-full bg-foreground/10" />
              </span>
            ))}
          </div>
        </div>

        {/* Search, author, category, sort. Clear filters is conditional and is
            deliberately not reserved. */}
        <div className={cn(blogPanelRow, 'flex flex-wrap items-center gap-2')}>
          <SkeletonLine className="h-8 w-full rounded-lg sm:w-64" />
          {['w-20', 'w-24', 'w-36'].map((w, i) => (
            <SkeletonLine key={i} className={cn('h-8 shrink-0 rounded-lg', w)} />
          ))}
        </div>

        <div className={blogHeadRow}>
          <div className={blogPostGrid}>
            {['w-10', 'w-12', 'w-12', 'w-16', 'w-24', 'w-14', 'w-16'].map((w, i) => (
              <span
                key={i}
                className={cn(blogHeadCell, i === 0 && 'pl-[1.625rem]')}
              >
                <SkeletonText className={cn('h-2', w)} />
              </span>
            ))}
          </div>
        </div>

        {/* The bulk bar is always rendered: it hosts the select-all checkbox. */}
        <div className={cn(blogPanelRow, 'flex items-center gap-2')}>
          <span className="ml-0.5 size-4 rounded-[3px] bg-foreground/10" />
          <SkeletonText className="h-2.5 w-14" />
        </div>

        <ul className="divide-y divide-white/40 dark:divide-white/10">
          {Array.from({ length: 8 }).map((_, i) => (
            <li key={i} className={blogRowShell}>
              <div className={cn(blogRowPad, blogPostGrid, 'min-w-0 flex-1')}>
                <span className="flex min-w-0 items-start gap-2.5">
                  <span className="mt-0.5 size-4 shrink-0 rounded-[3px] bg-foreground/10" />
                  <span className="min-w-0 flex-1">
                    <SkeletonText className="w-3/5" />
                    {/* The address line, then the phone-only meta line the
                        seven columns replace at lg. */}
                    <span className="mt-0.5 block text-xs">
                      <SkeletonText className="h-2 w-2/5" />
                    </span>
                    <span className="mt-1 block text-xs lg:hidden">
                      <SkeletonText className="h-2 w-1/2" />
                    </span>
                  </span>
                </span>
                <span className="hidden lg:block">
                  <SkeletonPill className="h-4 w-16" />
                  <span className="mt-1 block text-[0.7rem]">
                    <SkeletonText className="h-2 w-24" />
                  </span>
                </span>
                {['w-16', 'w-20', 'w-24', 'w-8', 'w-16'].map((w, j) => (
                  <span key={j} className="hidden text-xs lg:block">
                    <SkeletonText className={cn('h-2', w)} />
                  </span>
                ))}
              </div>
              <span className={blogMenuGutter}>
                <span className="size-4 rounded bg-foreground/10" />
              </span>
            </li>
          ))}
        </ul>
      </GlassPanel>

      <SkeletonNote />
    </Shell>
  );
}

/**
 * The post editor: sticky bar, the article column, the inspector rail.
 *
 * Every box comes from the two real modules (`blogs/postBox.ts` and
 * `blogs/editor/editorBox.ts`) rather than being copied, which is the whole
 * reason those files exist: the bar's height, the rail's width and the
 * canvas's padding all have to be the ones the page uses or the layout jumps
 * on swap. `wide` matches the page's own token for the same reason.
 *
 * The body editor's own skeleton (`BodyEditorLazy`'s `loading`) takes over the
 * moment the page renders, so this one draws the same shell at the same height
 * and the two hand off without a step.
 */
export function BlogEditorSkeleton() {
  return (
    <Shell label="Loading post">
      <div className={cn(editorBar, 'border-white/45 dark:border-white/10')}>
        <div className={editorBarLead}>
          <span className="size-8 shrink-0 rounded-lg bg-foreground/10" />
          <SkeletonPill className="h-5 w-16" />
          <span className={editorSaveState}>
            <SkeletonText className="h-2.5 w-14" />
          </span>
        </div>
        <div className={editorBarActions}>
          {/* Preview, Save, the primary action, the ⋯ trigger. Settings is
              phone-only and conditional, so it is deliberately not reserved. */}
          <SkeletonPill className="h-8 w-20" />
          <SkeletonPill className="h-8 w-16" />
          <SkeletonPill className="h-8 w-20" />
          <span className="size-8 shrink-0 rounded-lg bg-foreground/10" />
        </div>
      </div>

      <div className={editorLayout}>
        <div className={editorCanvasColumn}>
          <div className={editorTitleField}>
            <SkeletonText className="h-6 w-3/4" />
          </div>

          <div className="flex flex-col gap-3">
            <SkeletonLine className="h-2.5 w-20" />
            <div className="aspect-[16/10] w-full rounded-xl bg-foreground/10" />
            <SkeletonLine className="h-10 w-full rounded-md" />
            <SkeletonLine className="h-10 w-full rounded-md" />
          </div>

          <div className={editorShell}>
            <div className={editorToolbar}>
              <div className={editorSkeletonToolbar} />
            </div>
            <div className={editorCanvas}>
              <div className="flex flex-col gap-4">
                {['h-4 w-2/3', 'w-full', 'w-full', 'w-5/6', 'w-full', 'w-3/4'].map((w) => (
                  <span key={w} className="text-md">
                    <span className={cn(editorSkeletonLine, w)} />
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <aside className={editorRail}>
          <div className={inspectorPanel}>
            <GlassRim />
            <div className={inspectorTabStrip}>
              {['w-8', 'w-8'].map((w) => (
                <span key={w} className={cn(inspectorTab, 'border-transparent')}>
                  <SkeletonText className={cn('h-2.5', w)} />
                </span>
              ))}
            </div>
            <div className={inspectorBody}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={inspectorGroup}>
                  <SkeletonLine className="h-2.5 w-24" />
                  <SkeletonLine className="h-10 w-full rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </Shell>
  );
}

/**
 * A post's saved versions: header + head row + rows + the standing note.
 *
 * `wide`, the token its page passes. The rows quote `revisionGrid` and
 * `revisionRowPad` by import for this file's whole reason: a head row and a
 * body row whose widths are written twice line up until the next edit.
 *
 * How many rows to draw is a guess either way, so it draws SIX: a post that has
 * been through a publish and a handful of saves has about that many, and a
 * skeleton shorter than the list leaves the note below it jumping up the page
 * on swap.
 */
export function BlogRevisionsSkeleton() {
  return (
    <Shell label="Loading saved versions">
      <SkeletonHeader
        eyebrow="Website"
        title="Saved versions"
        // The post's own title, which is data, so it is a bar.
        subtitle={<SkeletonText className="h-2.5 w-56" />}
        action={<SkeletonPill className="h-8 w-36" />}
      />

      <GlassPanel className="mt-6">
        <div className={revisionHeadRow}>
          <div className={revisionGrid}>
            {['w-12', 'w-24', 'w-10', 'w-16', 'w-10', 'w-10', ''].map((w, i) => (
              <span key={i} className={blogHeadCell}>
                {w ? <SkeletonText className={cn('h-2', w)} /> : null}
              </span>
            ))}
          </div>
        </div>

        <ul>
          {Array.from({ length: 6 }).map((_, i) => (
            <li
              key={i}
              className={cn(revisionRowShell, blogPanelDivider, 'last:border-b-0')}
            >
              {/* Cell for cell against RevisionsTable, INCLUDING the three
                  `lg:` visibilities. Below `lg` the real row is a number, a
                  chip line, a title, a meta line and the two controls stacked;
                  a skeleton that drew the desktop shape at every width is short
                  by two rows on a phone, six rows deep. */}
              <div className={cn(revisionRowPad, revisionGrid, 'min-w-0 flex-1')}>
                <SkeletonText className="h-2.5 w-6" />
                <span className={revisionChipCell}>
                  <span className={cn(revisionChip, 'border-transparent')}>
                    <SkeletonText className="h-2 w-14" />
                  </span>
                </span>
                <span className={revisionTitleCell}>
                  <span className="block text-sm">
                    <SkeletonText className="h-2.5 w-3/4" />
                  </span>
                  <span className="mt-0.5 block text-xs lg:hidden">
                    <SkeletonText className="h-2 w-2/3" />
                  </span>
                </span>
                <span className="hidden text-xs lg:block">
                  <SkeletonText className="h-2.5 w-20" />
                </span>
                <span className="hidden text-xs lg:block">
                  <SkeletonText className="h-2.5 w-8" />
                </span>
                <span className="hidden text-xs lg:block">
                  <SkeletonText className="h-2.5 w-10" />
                </span>
                {/* Preview always; Restore only off the trash, which is not
                    knowable here, so both are reserved. */}
                <span className={revisionRowActions}>
                  <SkeletonPill className="h-8 w-20" />
                  <SkeletonPill className="h-8 w-20" />
                </span>
              </div>
            </li>
          ))}
        </ul>
      </GlassPanel>

      <SkeletonNote lines={2} />
    </Shell>
  );
}

/**
 * Submission/ticket detail: back link + header + three sections.
 *
 * `actions` is how many buttons the header slot will hold, because the two
 * callers do not agree. SubmissionActions renders three `size="small"` buttons
 * (34px, not SkeletonPill's default 24px); TicketActions renders NONE for a
 * reporter reading their own ticket, so reserving a row there drew two pills
 * that resolved to nothing at all.
 */
export function SubmissionDetailSkeleton({
  label = 'Loading submission',
  actions = 3,
}: {
  label?: string;
  actions?: number;
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
        {actions > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {Array.from({ length: actions }).map((_, i) => (
              <SkeletonPill key={i} className="h-[2.125rem] w-24" />
            ))}
          </div>
        )}
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

// ── /admin/tasks ────────────────────────────────────────────────────────────

/**
 * THREE skeletons, because `?view=` gives the page three renderings and they
 * differ from the tabs down: the digest has no tab strip at all, neither the
 * calendar nor the digest carries the list's Export and New-task controls, and
 * none of the three shares a body. `loading.tsx` gets no `searchParams`, so a
 * client leaf (TasksSkeletonSwitch) reads `?view=` and picks between the trees
 * below, through the same `resolveTaskViewMode` door the page itself uses.
 *
 * Every box quotes its real component BY IMPORT (`panelRow`, `tabItem`,
 * `tableHeadCell`, `tallyRow`, … from Admin/tasks/menu.ts) rather than by
 * copy. Five hand-copied class strings are how this drifted: the head row
 * measured 26px against the table's 44, the page tally was missing outright,
 * and the tabs were 3px short, so every arrival at the board jumped, which is
 * the one thing this file exists to prevent.
 */

/**
 * Placeholder widths for the nine column labels, keyed by the board's own
 * column list. A `Record<TaskColumn, string>` and not an array, because a
 * hand-kept one had already drifted: Tags landed on the board and never
 * reached here, so this was ten cells against the table's eleven. A column
 * added later is a type error.
 */
const HEADER_BAR_WIDTHS: Record<TaskColumn, string> = {
  title: 'w-10',
  client: 'w-12',
  category: 'w-16',
  tags: 'w-10',
  member: 'w-14',
  priority: 'w-14',
  status: 'w-12',
  time: 'w-10',
  dates: 'w-10',
};

/** Every control in the page header is one of these: `Button size="small"`,
 *  the Export anchor and the view toggle all come out at 34px. */
const HEADER_CONTROL = 'h-[2.125rem]';

/** The view toggle: three labelled pills in one rounded-full group, so it is
 *  much wider than the buttons beside it and is the reason the header row
 *  wraps where it does. */
const SkeletonViewToggle = () => (
  <SkeletonPill className={cn(HEADER_CONTROL, 'w-64')} />
);

/** The month band, on all three views. NOT breakpoint-gated: it sits above
 *  every rendering, and the phone card list is below it too. The arrows carry
 *  the same max-sm:size-11 touch target the real MonthSwitcher does, or the
 *  band measures short on a phone and the whole panel jumps on swap. */
const SkeletonMonthBand = () => (
  <div
    className={cn(
      'flex flex-wrap items-center justify-between gap-x-4 gap-y-2',
      panelRow,
    )}
  >
    <div className="flex items-center gap-1.5">
      <SkeletonLine className="size-8 rounded-lg" />
      <SkeletonLine className="h-8 w-36 rounded-lg" />
      <SkeletonLine className="size-8 rounded-lg" />
    </div>
    <SkeletonLine className="h-2.5 w-24" />
  </div>
);

/** Label widths for the eight status tabs, in TaskTabs' own order. Literal,
 *  per the Tailwind-scanner rule; `count` marks the tabs that usually carry a
 *  badge, which widens them. */
const TAB_BARS: { w: string; count: boolean }[] = [
  { w: 'w-10', count: true },
  { w: 'w-11', count: true },
  { w: 'w-20', count: true },
  { w: 'w-28', count: true },
  { w: 'w-10', count: true },
  { w: 'w-16', count: false },
  { w: 'w-12', count: false },
  { w: 'w-6', count: false },
];

/**
 * The status tabs. Borrows `tabStrip` and `tabItem` from the real component,
 * so the row is the same 42px: the height comes from the tab's own text line
 * box plus its `border-b-2` underline track, neither of which a bare bar in a
 * padded div reproduces.
 */
const SkeletonTaskTabs = () => (
  <div className={panelDivider}>
    <div className={tabStrip}>
      {TAB_BARS.map((tab, i) => (
        <span key={i} className={cn(tabItem, 'border-transparent')}>
          <SkeletonText className={cn('h-2.5', tab.w)} />
          {tab.count && (
            <span className="h-4 w-5 shrink-0 rounded-full bg-foreground/10" />
          )}
        </span>
      ))}
    </div>
  </div>
);

/** The chips between the search box and Sort, in TaskFilterBar's own order:
 *  Mine, Client, Category, Member, Priority, Tags, Dates, Views, and Group on
 *  the list only. They live inside a `sm:contents` wrapper there, folded on a
 *  phone behind the Filters button, which is why they are `sm:`-gated here. */
const FILTER_CHIP_WIDTHS = [
  'w-14',
  'w-24',
  'w-28',
  'w-20',
  'w-24',
  'w-16',
  'w-20',
  'w-16',
];

/**
 * Search box, the phone's Filters button, the chips, then Sort.
 *
 * Sort is deliberately OUTSIDE the `sm:hidden` fold in the real bar (it
 * reorders, it never narrows, so it is not one of the "Filters"), which means
 * a phone shows three controls here and not two. The two Clear buttons are
 * conditional and are not reserved, on the pager rule: a control that appears
 * only sometimes is a jump either way, and guessing it present is the worse
 * half of the bet.
 */
const SkeletonTaskFilterBar = ({ mode }: { mode: TaskViewMode }) => (
  <div className={cn('flex flex-wrap items-center gap-2', panelRow)}>
    {/* The search box, class for class off the real one. `max-sm:w-auto` is
        the load-bearing bit: with a bare `w-full` the field takes the whole
        phone row and pushes Filters and Sort onto a second one, which is
        the reflow this row exists to avoid. */}
    <SkeletonLine className="h-8 w-full rounded-lg max-sm:w-auto max-sm:min-w-36 max-sm:flex-1 sm:w-56" />
    <SkeletonPill className="h-8 w-24 shrink-0 sm:hidden" />
    {FILTER_CHIP_WIDTHS.map((w, i) => (
      <SkeletonLine
        key={i}
        className={cn('hidden h-8 shrink-0 rounded-lg sm:block', w)}
      />
    ))}
    {mode === 'list' && (
      <>
        <SkeletonLine className="hidden h-8 w-16 shrink-0 rounded-lg sm:block" />
        {/* Sort. Shown at every width, like the real one. */}
        <SkeletonLine className="h-8 w-24 shrink-0 rounded-lg" />
      </>
    )}
  </div>
);

/** Header + panel, the part all three views share. `after` is for the digest,
 *  whose day panels are SIBLINGS of the first panel rather than rows in it. */
const TasksShell = ({
  label,
  subtitle,
  actions,
  children,
  after,
}: {
  label: string;
  subtitle: React.ReactNode;
  actions: React.ReactNode;
  children: React.ReactNode;
  after?: React.ReactNode;
}) => (
  <Shell label={label} width="table">
    <SkeletonHeader
      eyebrow="Team"
      title="Tasks"
      subtitle={subtitle}
      action={
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      }
    />
    <GlassPanel className="mt-6">{children}</GlassPanel>
    {after}
  </Shell>
);

/** The calendar and the digest both title themselves off data the skeleton
 *  cannot know (the month, the field, the window), so their subtitle is a bar
 *  in the same `text-sm` line box the sentence would have occupied. */
const SkeletonSubtitle = ({ className }: { className?: string }) => (
  <p className="text-sm text-muted-foreground">
    <SkeletonText className={cn('h-3', className)} />
  </p>
);

/**
 * /admin/tasks, the list. TWO renderings inside it, because the board has two:
 * a stack of cards below md and an eleven-column <table> at md and up,
 * switched by the same CSS the board itself uses. Drawing only one of them
 * puts the wrong shape on half the devices.
 */
export function TasksListSkeleton() {
  return (
    <TasksShell
      label="Loading tasks"
      subtitle="Who’s doing what, for which client: the work log behind the monthly reports."
      actions={
        <>
          {/* Export CSV, the view toggle, then Categories, Tags, Templates and
              New task: six controls, not the three this used to draw. */}
          <SkeletonPill className={cn(HEADER_CONTROL, 'w-28')} />
          <SkeletonViewToggle />
          <SkeletonPill className={cn(HEADER_CONTROL, 'w-28')} />
          <SkeletonPill className={cn(HEADER_CONTROL, 'w-20')} />
          <SkeletonPill className={cn(HEADER_CONTROL, 'w-28')} />
          <SkeletonPill className={cn(HEADER_CONTROL, 'w-28')} />
        </>
      }
    >
      <SkeletonMonthBand />
      <SkeletonTaskTabs />
      <SkeletonTaskFilterBar mode="list" />
      {/* The quick-add band. A past month replaces it with a one-line note in
          a box of the same height, which is why one skeleton is right for
          both states. Eight always-on fields: Client, Category, Tags, the
          w-36 duration, Member, Priority, Status, Dates. Template and the
          completion day are conditional and are not reserved. */}
      <div className={panelDivider}>
        <div className={cn('flex flex-wrap items-center gap-2', panelRowPad)}>
          {/* The leading plus glyph, hidden on a phone exactly as it is there. */}
          <span className="hidden size-4 shrink-0 sm:block" />
          <SkeletonLine className="h-8 w-full min-w-40 flex-1 basis-52 rounded-lg" />
          {/* The phone's disclosure chevron; below sm: it stands in for every
              field at once. */}
          <SkeletonLine className="h-8 w-8 shrink-0 rounded-lg sm:hidden" />
          {['w-24', 'w-24', 'w-20', 'w-36', 'w-24', 'w-20', 'w-20', 'w-24'].map(
            (w, i) => (
              <SkeletonLine
                key={i}
                className={cn('hidden h-8 shrink-0 rounded-lg sm:block', w)}
              />
            ),
          )}
          <SkeletonLine className="h-8 w-14 shrink-0 rounded-lg" />
        </div>
      </div>
      <SkeletonBulkBar className="md:hidden dark:border-foreground/10" />
      {/* Below md the real board is a stack of cards, so this has to be one
          too: the table drawn here used to snap into cards on swap. The card
          body is `taskCardBody`, whose gap-1 the hand-copy had as gap-2. */}
      <ul className="flex flex-col gap-2 p-3 md:hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <li
            key={i}
            className="rounded-xl border border-white/45 bg-white/35 dark:border-foreground/15 dark:bg-foreground/[0.06]"
          >
            <span className={taskCardBody}>
              {/* w-full on the WRAPPER: the bar's percentage resolves against
                  it, and `items-start` above would otherwise size it to its
                  own content, i.e. to nothing. */}
              <span className="w-full text-sm">
                <SkeletonText className="h-3 w-4/5" />
              </span>
              <span className="flex items-center gap-1.5 text-xs">
                <SkeletonCircle size={16} />
                <SkeletonText className="h-2.5 w-32" />
              </span>
              <span className="mt-0.5 flex w-full items-center justify-between gap-3 text-xs">
                <SkeletonCircle size={20} />
                <SkeletonText className="h-2.5 w-10" />
              </span>
              <span className="flex w-full items-center justify-between gap-3 text-xs">
                <SkeletonPill className="h-5 w-20" />
                <SkeletonText className="h-2.5 w-20" />
              </span>
            </span>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/40 dark:border-foreground/10">
              <th className={cn(tableHeadCell, 'w-10 pl-4 sm:pl-5')}>
                <span className="block size-4 rounded-[3px] bg-foreground/10" />
              </th>
              {TASK_COLUMNS.map((column) => (
                <th key={column} className={tableHeadCell}>
                  {/* The label is a menu trigger now, so the bar sits in the
                      trigger's own box beside a spacer the width of its
                      chevron. That `py-0.5` plus the line box is what makes
                      this row 44px and not the 26 a bare bar measured. */}
                  <span className={tableHeadTrigger}>
                    <SkeletonText
                      className={cn('h-2', HEADER_BAR_WIDTHS[column])}
                    />
                    <span className="size-3 shrink-0" />
                  </span>
                </th>
              ))}
              <th className={cn(tableHeadCell, 'w-10 pr-4 sm:pr-5')} />
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
                  <span className="flex items-center gap-1.5">
                    <SkeletonPill className="h-4 w-10" />
                    <SkeletonPill className="h-4 w-8" />
                  </span>
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
      {/* The page-scoped totals line. It renders whenever the board has rows,
          i.e. every time this skeleton is standing in for something, and
          leaving it out dropped ~34px of panel onto the swap. */}
      <p className={tallyRow}>
        <SkeletonText className="h-2.5 w-40" />
      </p>
      <SkeletonHintStrip />
    </TasksShell>
  );
}

/**
 * /admin/tasks?view=calendar. Same panel head as the list (the month band and
 * the tabs are the same components), then the month grid at md and up and the
 * agenda below it, the two-tree split the board itself uses.
 */
export function TasksCalendarSkeleton() {
  return (
    <TasksShell
      label="Loading the task calendar"
      subtitle={<SkeletonSubtitle className="w-80" />}
      actions={<SkeletonViewToggle />}
    >
      <SkeletonMonthBand />
      <SkeletonTaskTabs />
      <SkeletonTaskFilterBar mode="calendar" />
      <div className="hidden md:block">
        <div className={cn('grid grid-cols-7', panelDivider)}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className={calendarWeekday}>
              <SkeletonText className="h-2 w-6" />
            </div>
          ))}
        </div>
        {/* Five weeks: every month spans five or six, and a six-row grid
            standing in for a five-row one is a whole 120px row of jump. */}
        <div className="grid grid-cols-7">
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className={calendarCell}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="size-5 rounded-full bg-foreground/10" />
                <SkeletonLine className="h-2 w-10" />
              </div>
              <span className="block h-[3px] rounded-full bg-foreground/[0.08]" />
              <div className="flex min-w-0 flex-col">
                {Array.from({ length: 3 }).map((_, j) => (
                  <span
                    key={j}
                    className="flex items-center gap-1.5 px-1 py-[0.1875rem] text-[0.65rem]"
                  >
                    <span className="size-1.5 shrink-0 rounded-full bg-foreground/10" />
                    <span className="min-w-0 flex-1">
                      <SkeletonText className="h-2 w-full" />
                    </span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* The agenda skips empty days, so it draws fewer sections than the grid
          has cells rather than one per day. */}
      <div className="flex flex-col md:hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={agendaDay}
          >
            <span className="flex items-baseline justify-between gap-2 pb-1">
              <SkeletonText className="h-2.5 w-24" />
              <SkeletonText className="h-2 w-16" />
            </span>
            <span className="flex flex-col">
              {Array.from({ length: 3 }).map((_, j) => (
                <span
                  key={j}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5"
                >
                  <span className="size-1.5 shrink-0 rounded-full bg-foreground/10" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs">
                      <SkeletonText className="h-2.5 w-4/5" />
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[0.65rem]">
                      <SkeletonCircle size={12} />
                      <SkeletonText className="h-2 w-24" />
                    </span>
                  </span>
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
    </TasksShell>
  );
}

/**
 * /admin/tasks?view=digest. NO tab strip: the digest is the one view without
 * one, so drawing the list's would put a 42px row on the page that never
 * arrives. The day panels below the first one are their own sections, exactly
 * as the view renders them.
 */
export function TasksDigestSkeleton() {
  return (
    <TasksShell
      label="Loading the task digest"
      subtitle={<SkeletonSubtitle className="w-96" />}
      actions={<SkeletonViewToggle />}
      after={
        <>
          {/* One section per day that shipped anything, each its own panel of
              member blocks. Three: fewer than a real week, but the sections
              below the first are under the fold, where SkeletonHeader's rule
              about not guessing already applies. */}
          {Array.from({ length: 3 }).map((_, d) => (
            <section key={d} className="mt-6">
              <span className="mb-3 flex items-baseline justify-between px-1">
                <SkeletonText className="h-2.5 w-28" />
                <SkeletonText className="h-2.5 w-32" />
              </span>
              <GlassPanel>
                {Array.from({ length: 2 }).map((_, m) => (
                  <div
                    key={m}
                    className={cn(
                      m > 0 && 'border-t border-white/40 dark:border-white/10',
                    )}
                  >
                    <div className="flex items-center justify-between gap-3 px-4 pt-3.5 sm:px-5">
                      <span className="flex min-w-0 items-center gap-2.5">
                        <SkeletonCircle size={28} />
                        <span className="text-sm">
                          <SkeletonText className="h-3 w-28" />
                        </span>
                      </span>
                      <span className="shrink-0 text-xs">
                        <SkeletonText className="h-2.5 w-28" />
                      </span>
                    </div>
                    <ul className="px-4 pt-1.5 pb-3.5 sm:px-5">
                      {Array.from({ length: 3 }).map((_, l) => (
                        <li key={l} className="py-1 text-xs">
                          <SkeletonText className="h-2.5 w-3/5" />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </GlassPanel>
            </section>
          ))}
        </>
      }
    >
      <SkeletonMonthBand />
      <SkeletonTaskFilterBar mode="digest" />
      {/* The month wrap-up: eyebrow, one summary line, then a bar per
          category. These last two rows keep their literals rather than a
          token: they have one consumer each (TasksDigestView), they sit on
          `px-4 sm:px-5` rather than the panel row's `px-3 sm:px-4`, and the
          wrap-up is conditional anyway. Keep them in step with
          TasksDigestView by hand. */}
      <div className="border-t border-white/40 px-4 py-3.5 sm:px-5 dark:border-white/10">
        <SkeletonLine className="h-2 w-24" />
        <p className="mt-1 text-sm">
          <SkeletonText className="h-3 w-72" />
        </p>
        <ul className="mt-2.5 flex flex-col gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="flex items-center gap-2.5">
              <span className="w-32 shrink-0 text-xs sm:w-40">
                <SkeletonText className="h-2.5 w-24" />
              </span>
              <span className="h-1.5 min-w-0 flex-1 rounded-full bg-foreground/[0.07]" />
              <span className="w-16 shrink-0 text-right text-xs">
                <SkeletonText className="h-2.5 w-10" />
              </span>
            </li>
          ))}
        </ul>
      </div>
      {/* The tag-mix strip. */}
      <div className="border-t border-white/40 px-4 py-2.5 sm:px-5 dark:border-white/10">
        <span className="flex flex-wrap items-center gap-1.5">
          {['w-16', 'w-20', 'w-14', 'w-24', 'w-16'].map((w, i) => (
            <SkeletonPill key={i} className={cn('h-5', w)} />
          ))}
        </span>
      </div>
    </TasksShell>
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
 * A month dashboard. FOUR tiles on a 2/4 grid — the three-tile
 * `sm:grid-cols-3` version reflowed the whole page on swap — a logo beside the
 * title, the header's five controls, and the real run of panels: highlights,
 * retainer, category, week, member, task table, readiness, internal KPIs, trend.
 *
 * `variant` because /admin/reports/internal is a DIFFERENT page, not a narrower
 * one: its report object has no note, no retainer and no readiness, it draws a
 * single tile, and its header holds only a MonthSwitcher. Standing in for it
 * with the client shape meant ~400px of phantom panels collapsing on hydration
 * and everything below jumping up the page.
 */
export function ReportDashboardSkeleton({
  variant = 'client',
}: {
  variant?: 'client' | 'internal';
} = {}) {
  const internal = variant === 'internal';
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
          {internal ? (
            <>
              {/* MonthSwitcher alone: prev / trigger / next. */}
              <SkeletonPill className="h-8 w-8" />
              <SkeletonPill className="h-8 w-36" />
              <SkeletonPill className="h-8 w-8" />
            </>
          ) : (
            <>
              <SkeletonPill className="h-8 w-24" />
              <SkeletonPill className="h-8 w-28" />
              <SkeletonPill className="h-8 w-16" />
              <SkeletonPill className="h-8 w-28" />
              <SkeletonPill className="h-8 w-40" />
            </>
          )}
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(internal ? [0] : [0, 1, 2, 3]).map((i) => (
          <div key={i} className={cn(glassCard, 'flex flex-col gap-3 p-5')}>
            <GlassRim />
            <SkeletonLine className="h-2.5 w-24" />
            <SkeletonLine className="h-7 w-14" />
            <SkeletonLine className="h-2 w-20" />
          </div>
        ))}
      </section>

      {/* Month highlights and retainer burn — a client month only. The internal
          report has neither on its report object. */}
      {!internal && (
        <>
          <GlassPanel as="section" className="mt-6 p-5 sm:p-6">
            <SkeletonLine className="mb-4 h-2.5 w-32" />
            <SkeletonLine className="h-2.5 w-4/5" />
            <SkeletonLine className="mt-2 h-2.5 w-2/3" />
          </GlassPanel>

          <GlassPanel as="section" className="mt-6 p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <SkeletonLine className="h-2.5 w-32" />
              <SkeletonLine className="h-2.5 w-20" />
            </div>
            <SkeletonLine className="h-2.5 w-full rounded-full" />
          </GlassPanel>
        </>
      )}

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

      {/* Readiness + internal KPIs — admin-only, never on the share link. The
          internal report has no readiness, so it draws the KPI panel alone. */}
      {(internal ? [4] : [3, 4]).map((rows, i) => (
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
        {/* The print page floats its PrintButton, so it takes no flow space —
            mirror that rather than reserving a row the real page never has.
            Same offsets as the page: clear of the admin mobile top bar. */}
        <div className="fixed right-4 top-[calc(3.5rem+env(safe-area-inset-top)+1rem)] z-20 lg:top-4">
          <SkeletonPill className="h-8 w-32" />
        </div>

        <div className="mx-auto max-w-3xl px-6 pt-12 pb-28 sm:px-10 lg:pb-12">
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

          <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
        {/* The payslip renders PrintButton inline in this row, and a
            `size="small"` Button is 34px. */}
        <SkeletonPill className="h-[2.125rem] w-32" />
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
        <div className="flex flex-wrap items-center gap-2">
          {/* MonthSwitcher is prev / trigger / next — three boxes, always. */}
          <SkeletonPill className="h-8 w-8" />
          <SkeletonPill className="h-8 w-36" />
          <SkeletonPill className="h-8 w-8" />
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
        <div className="flex flex-wrap items-center gap-2">
          {/* MonthSwitcher is prev / trigger / next — three boxes, always. */}
          <SkeletonPill className="h-8 w-8" />
          <SkeletonPill className="h-8 w-36" />
          <SkeletonPill className="h-8 w-8" />
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
        <div className="flex flex-wrap items-center gap-2">
          {/* MonthSwitcher is prev / trigger / next — three boxes, always. */}
          <SkeletonPill className="h-8 w-8" />
          <SkeletonPill className="h-8 w-36" />
          <SkeletonPill className="h-8 w-8" />
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
        <div className="flex flex-wrap items-center gap-2">
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
        <div className="flex flex-wrap items-center gap-2">
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
