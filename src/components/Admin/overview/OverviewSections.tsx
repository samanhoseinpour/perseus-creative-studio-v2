import Link from 'next/link';
import type { IconType } from 'react-icons';
import {
  LuActivity,
  LuArrowRight,
  LuBanknote,
  LuPencil,
} from 'react-icons/lu';

import EmptyState from '@/components/Admin/EmptyState';
import {
  GlassRim,
  adminLink,
  glassCard,
  glassChip,
  glassHover,
  glassRowHover,
} from '@/components/Admin/Glass';
import Kbd from '@/components/Admin/Kbd';
import { ACTION_ICON, ACTION_TONE } from '@/components/Admin/logs/ActivityFeed';
import SearchTrigger from '@/components/Admin/overview/SearchTrigger';
import { cn } from '@/lib/utils';
import type {
  ActivityPeekRow,
  DayHeroData,
  HeroDueState,
  InboxPulseData,
  MoneyPulseData,
  PayChipData,
  RecentSubmissionRow,
  StudioMonthData,
  TicketsGaugeData,
} from './overviewData';

/**
 * The overview bento's modules. Server components throughout — the page's
 * only client leaves stay AdminGreeting, HelpButton and SearchTrigger — and
 * every figure arrives pre-formatted from overviewData (no date or duration
 * math here). All material is the one glass system; the two accents are
 * borrowed vocabularies, not new ones: rose is the board's overdue tone
 * (TaskRow's DUE_TONE), amber stays the leaderboard's gold.
 */

/** In-module section heading — the house h2 scale, inside the card. */
const moduleHeading =
  'text-xs font-medium uppercase tracking-wide text-muted-foreground';

/** The trailing inline link every module closes with ("Open your board"). */
function ModuleLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground',
        adminLink,
      )}
    >
      {children}
      <LuArrowRight aria-hidden="true" className="size-3.5" />
    </Link>
  );
}

/**
 * The PayColumns hover readout — a pointer affordance, not the carrier: the
 * guaranteed-visible numbers on these charts are the totals beside them, and
 * each bar's own value lives in its aria-label (the pill is aria-hidden so
 * screen readers don't hear every figure twice).
 */
const readoutPill = (group: string) =>
  cn(
    'pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 w-max max-w-none -translate-x-1/2',
    'rounded-md bg-foreground px-1.5 py-0.5 text-[0.65rem] font-medium tabular-nums text-background',
    'opacity-0 transition-opacity duration-150 ease-out',
    group,
    'motion-reduce:transition-none',
  );

// ── Your day ────────────────────────────────────────────────────────────────

/** Rose only for a missed deadline (the board's rule); due-today stays ink
 *  here because amber already means "leaderboard" one card to the right. */
const HERO_DUE_TONE: Record<HeroDueState, string> = {
  overdue: 'font-medium text-rose-600 dark:text-rose-400',
  today: 'font-medium text-foreground',
  week: 'text-muted-foreground',
  later: 'text-muted-foreground',
  none: 'text-muted-foreground',
};

function HeroFigure({
  value,
  label,
  href,
  tone,
  hedged,
}: {
  value: number;
  label: string;
  href: string;
  tone?: string;
  hedged?: boolean;
}) {
  return (
    <Link href={href} className="group flex min-w-0 flex-col">
      <span
        className={cn(
          'text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl',
          value === 0 ? 'text-foreground/30' : (tone ?? 'text-foreground'),
        )}
      >
        {value}
        {hedged && value > 0 ? '+' : ''}
      </span>
      <span className="mt-1 text-xs text-muted-foreground transition-colors group-hover:text-foreground">
        {label}
      </span>
    </Link>
  );
}

/**
 * The page's one big object: a three-figure deadline meter over the viewer's
 * own worklist. Every figure's link opens a list with exactly that many rows:
 * Overdue and Due today are windowed board slices, and "All open" is the
 * window-count total of the unfiltered board — so the meter is a claim the
 * reader can always check.
 */
export function DayHero({ data }: { data: DayHeroData }) {
  const { counts, countsExact, tasks, links } = data;
  return (
    <div className={cn(glassCard, 'flex h-full flex-col p-6 sm:p-8')}>
      <GlassRim />
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Your day
        </h2>
        <span className="text-xs tabular-nums text-muted-foreground">
          {data.todayLabel}
        </span>
      </div>

      <div className="mt-5 flex items-start gap-8 sm:gap-12">
        <HeroFigure
          value={counts.overdue}
          label="Overdue"
          href={links.overdue}
          tone="text-rose-600 dark:text-rose-400"
          hedged={!countsExact}
        />
        <HeroFigure
          value={counts.today}
          label="Due today"
          href={links.dueToday}
          hedged={!countsExact}
        />
        <HeroFigure value={counts.open} label="All open" href={links.board} />
      </div>

      <div className="mt-6 border-t border-white/40 dark:border-white/10" />

      {tasks.length > 0 ? (
        <ul className="divide-y divide-white/40 dark:divide-white/10">
          {tasks.map((task) => (
            <li key={task.id}>
              <Link
                href={task.href}
                className={cn(
                  'group -mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5',
                  glassRowHover,
                )}
              >
                <span
                  className={cn(
                    'w-14 shrink-0 text-[0.65rem] tabular-nums',
                    HERO_DUE_TONE[task.dueState],
                  )}
                >
                  {task.dueLabel || '—'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {task.title}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {task.secondary}
                    {task.sharedLabel && ` · ${task.sharedLabel}`}
                  </span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {task.estimateLabel}
                </span>
                <LuArrowRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground motion-reduce:transition-none"
                />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          All clear — nothing on your plate.
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-4 pt-4">
        <span className="min-w-0 truncate text-xs tabular-nums text-muted-foreground">
          {data.moreLabel}
        </span>
        <ModuleLink href={links.board}>Open your board</ModuleLink>
      </div>
    </div>
  );
}

// ── Inbox pulse ─────────────────────────────────────────────────────────────

function PulseCount({
  value,
  label,
  href,
}: {
  value: number;
  label: string;
  href: string;
}) {
  return (
    <Link href={href} className="group flex min-w-0 flex-col">
      <span
        className={cn(
          'text-3xl font-semibold tabular-nums',
          value === 0 ? 'text-foreground/30' : 'text-foreground',
        )}
      >
        {value}
      </span>
      <span className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground transition-colors group-hover:text-foreground">
        {label}
      </span>
    </Link>
  );
}

/** New-submission counts wired to a 14-day texture strip — each day a
 *  hoverable bar, a zero day an honest baseline dot. */
export function InboxPulse({ data }: { data: InboxPulseData }) {
  const primaryHref = data.inquiries
    ? '/admin/inquiries'
    : '/admin/applications';
  return (
    <div className={cn(glassCard, 'flex h-full flex-col p-5')}>
      <GlassRim />
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={moduleHeading}>Inbox</h2>
        <ModuleLink href={primaryHref}>Open inbox</ModuleLink>
      </div>

      <div className="mt-4 flex gap-10">
        {data.inquiries && (
          <PulseCount
            value={data.inquiries.value}
            label="New inquiries"
            href={data.inquiries.href}
          />
        )}
        {data.applications && (
          <PulseCount
            value={data.applications.value}
            label="New applications"
            href={data.applications.href}
          />
        )}
      </div>

      <div className="mt-auto pt-5">
        <span className="sr-only">{data.rangeAria}</span>
        <div className="flex h-10 items-end gap-1">
          {data.days.map((day) => (
            <div key={day.key} className="group flex h-full flex-1 items-end">
              <div
                className="relative w-full"
                style={{
                  height: day.pct > 0 ? `${day.pct}%` : undefined,
                }}
              >
                <span
                  aria-hidden="true"
                  className={readoutPill('group-hover:opacity-100')}
                >
                  {day.hoverLabel}
                </span>
                {day.pct > 0 ? (
                  <div
                    role="img"
                    aria-label={day.ariaLabel}
                    className={cn(
                      'h-full w-full rounded-full transition-colors duration-200 motion-reduce:transition-none',
                      day.isToday
                        ? 'bg-foreground'
                        : 'bg-foreground/25 group-hover:bg-foreground/45',
                    )}
                  />
                ) : (
                  <div
                    role="img"
                    aria-label={day.ariaLabel}
                    className={cn(
                      'h-0.5 w-full rounded-full',
                      day.isToday ? 'bg-foreground/40' : 'bg-foreground/15',
                    )}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tickets gauge ───────────────────────────────────────────────────────────

/** Open count plus (for triagers) a status spine — the composition of every
 *  ticket's state in one strip. The whole card is the shortcut. */
export function TicketsGauge({ data }: { data: TicketsGaugeData }) {
  return (
    <Link
      href="/admin/tickets"
      className={cn(
        glassCard,
        glassHover,
        'group flex h-full flex-col p-5',
      )}
    >
      <GlassRim />
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={moduleHeading}>Tickets</h2>
        <LuArrowRight
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground motion-reduce:transition-none"
        />
      </div>

      <div className="mt-4 flex min-w-0 flex-col">
        <span
          className={cn(
            'text-3xl font-semibold tabular-nums',
            data.open === 0 ? 'text-foreground/30' : 'text-foreground',
          )}
        >
          {data.open}
        </span>
        <span className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {data.scopeLabel}
        </span>
      </div>

      <div className="mt-auto pt-4">
        {data.spine ? (
          <>
            <div
              role="img"
              aria-label={data.spine.legend}
              className="flex h-1.5 overflow-hidden rounded-full bg-foreground/[0.08]"
            >
              {/* flex-grow by raw count: always divides the strip exactly,
                  where independently-rounded widths sum to 99/101%. */}
              {data.spine.segments.map((seg) => (
                <div
                  key={seg.key}
                  className={cn(
                    'h-full',
                    seg.key === 'open' && 'bg-foreground',
                    seg.key === 'pending' && 'bg-foreground/40',
                    seg.key === 'closed' && 'bg-foreground/[0.15]',
                  )}
                  style={{ flexGrow: seg.count, flexBasis: 0 }}
                />
              ))}
            </div>
            <p className="mt-2 text-xs tabular-nums text-muted-foreground">
              {data.spine.legend}
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            {data.open === 0
              ? 'Nothing waiting on you.'
              : 'Tickets you reported.'}
          </p>
        )}
      </div>
    </Link>
  );
}

// ── Studio month ────────────────────────────────────────────────────────────

/**
 * The studio's heartbeat — this month's delivery beside twelve months of
 * rhythm, in the PayColumns grammar (hover readouts, dashed honest gaps).
 * The whole card links to Reports, so the bars use a named group.
 */
export function StudioMonth({ data }: { data: StudioMonthData }) {
  return (
    <Link
      href="/admin/reports"
      className={cn(
        glassCard,
        glassHover,
        'group/card flex h-full flex-col p-5',
      )}
    >
      <GlassRim />
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={moduleHeading}>Studio · {data.monthName}</h2>
        <span className="inline-flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
          last 12 months
          <LuArrowRight
            aria-hidden="true"
            className="size-3.5 shrink-0 transition-transform group-hover/card:translate-x-0.5 group-hover/card:text-foreground motion-reduce:transition-none"
          />
        </span>
      </div>

      <div className="mt-4 flex gap-10">
        <span className="flex min-w-0 flex-col">
          <span className="text-3xl font-semibold tabular-nums text-foreground">
            {data.hoursLabel}
          </span>
          <span className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Hours delivered
          </span>
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-3xl font-semibold tabular-nums text-foreground">
            {data.tasksLabel}
          </span>
          <span className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Tasks done
            {/* Deliverables, not rows — three rounds on one video are one
                video. Stating the rounds beside the count is what keeps the
                figure honest against the hours, which take every row. */}
            {data.revisionsLabel && (
              <span className="ml-1 normal-case tracking-normal">
                · {data.revisionsLabel}
              </span>
            )}
          </span>
        </span>
      </div>

      <div className="mt-auto pt-5">
        <div className="flex h-16 items-end gap-1">
          {data.columns.map((col) => (
            <div
              key={col.key}
              className="group/bar flex h-full flex-1 items-end"
            >
              <div
                className="relative w-full"
                style={{ height: col.pct > 0 ? `${col.pct}%` : undefined }}
              >
                <span
                  aria-hidden="true"
                  className={readoutPill('group-hover/bar:opacity-100')}
                >
                  {col.valueLabel}
                </span>
                {col.pct > 0 ? (
                  <div
                    role="img"
                    aria-label={col.ariaLabel}
                    className={cn(
                      'h-full w-full rounded-t-md transition-colors duration-200 motion-reduce:transition-none',
                      col.current
                        ? 'bg-foreground'
                        : 'bg-foreground/25 group-hover/bar:bg-foreground/45',
                    )}
                  />
                ) : (
                  <div
                    role="img"
                    aria-label={col.ariaLabel}
                    className="w-full border-t border-dashed border-foreground/20"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
        <div aria-hidden="true" className="mt-1.5 flex gap-1">
          {data.columns.map((col) => (
            <span
              key={col.key}
              className={cn(
                'flex-1 text-center text-[0.6rem]',
                col.current
                  ? 'font-semibold text-foreground'
                  : 'text-muted-foreground',
              )}
            >
              {col.letter}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

// ── Money ───────────────────────────────────────────────────────────────────

/**
 * What left the company this month — salaries, wire fees and bills in one
 * figure, over a spine showing the split.
 *
 * Rendered ONLY for a viewer holding both money grants (page.tsx gates it), for
 * the reason requireSpendOverview() states: this is a claim about the whole, so
 * half the grants would read a partial total under a complete label.
 *
 * No `tone` prop — like SpendSections and InternalKpiPanel, having no print
 * variant is what makes it impossible to put the company's cost base on a sheet
 * that leaves the building. The fills come from the shared ink ramp, so this
 * card and /admin/spend cannot disagree about which shade means "salaries".
 */
export function MoneyPulse({ data }: { data: MoneyPulseData }) {
  return (
    <Link
      href={data.href}
      className={cn(glassCard, glassHover, 'group flex h-full flex-col p-5')}
    >
      <GlassRim />
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={moduleHeading}>Money · {data.monthName}</h2>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          Open Spend
          <LuArrowRight
            aria-hidden="true"
            className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground motion-reduce:transition-none"
          />
        </span>
      </div>

      {/* StudioMonth's figure block verbatim, and deliberately so: the two sit
          side by side in the same row and are a pair — what the studio made,
          and what it cost. The spine below is what tells them apart. */}
      <div className="mt-4 flex min-w-0 flex-col">
        <span
          className={cn(
            'truncate text-3xl font-semibold tabular-nums',
            data.hasSpend ? 'text-foreground' : 'text-foreground/30',
          )}
        >
          {data.totalLabel}
        </span>
        <span className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Out this month
        </span>
      </div>

      <div className="mt-auto pt-5">
        {data.hasSpend ? (
          <div
            role="img"
            aria-label={data.legend}
            className="flex h-1.5 overflow-hidden rounded-full bg-foreground/[0.08]"
          >
            {/* flex-grow by raw cents — the TicketsGauge trick: it divides the
                strip exactly, where independently-rounded widths sum to
                99/101%. A zero bucket contributes no width and no seam. */}
            {data.segments.map((seg) => (
              <div
                key={seg.key}
                className={cn('h-full', seg.fill)}
                style={{ flexGrow: seg.cents, flexBasis: 0 }}
              />
            ))}
          </div>
        ) : (
          // The honest gap (the PayColumns rule): nothing recorded is a dashed
          // rule, never a zero-width bar pretending to be a measurement.
          <div
            role="img"
            aria-label="Nothing recorded this month"
            className="h-1.5 border-t border-dashed border-foreground/20"
          />
        )}
        <p className="mt-2 truncate text-xs tabular-nums text-muted-foreground">
          {data.hasSpend ? data.legend : 'Nothing recorded yet'}
        </p>
        {/* Payroll excludes drafts from spend; a bill has no status at all. The
            asymmetry is stated, or the total quietly fails to reconcile with
            /admin/payroll and reads as a bug. */}
        {data.draftNote && (
          <p className="mt-1 text-xs text-muted-foreground">{data.draftNote}</p>
        )}
      </div>
    </Link>
  );
}

// ── Activity peek ───────────────────────────────────────────────────────────

/** Four ledger lines off the audit trail, in the feed's own thread-and-node
 *  grammar (ACTION_ICON / ACTION_TONE are the feed's, imported). */
export function ActivityPeek({ rows }: { rows: ActivityPeekRow[] }) {
  return (
    <div className={cn(glassCard, 'flex h-full flex-col p-5')}>
      <GlassRim />
      <h2 className={moduleHeading}>Activity log</h2>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No recent activity.
        </p>
      ) : (
        <ol className="mt-3">
          {rows.map((row) => {
            const Icon = ACTION_ICON[row.action] ?? LuPencil;
            return (
              <li key={row.id} className="flex gap-3 py-1.5">
                <div className="relative flex w-6 shrink-0 justify-center">
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-foreground/10"
                  />
                  <span
                    className={cn(
                      'relative mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full ring-1',
                      ACTION_TONE[row.action] ?? glassChip,
                    )}
                  >
                    <Icon aria-hidden="true" className="h-3 w-3" />
                  </span>
                </div>
                <p className="min-w-0 flex-1 self-center truncate text-sm">
                  <span className="font-medium text-foreground">
                    {row.actorName}
                  </span>{' '}
                  <span className="text-muted-foreground">{row.summary}</span>
                </p>
                <span className="shrink-0 self-center font-mono text-[0.7rem] tabular-nums text-muted-foreground">
                  {row.timeLabel}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-auto flex justify-end pt-3">
        <ModuleLink href="/admin/logs">Full log</ModuleLink>
      </div>
    </div>
  );
}

// ── Recent submissions ──────────────────────────────────────────────────────

/** The deliberately quiet module: the inbox feed in the page's row grammar,
 *  with a kind mark so the mixed feed scans without reading secondaries. */
export function RecentSubmissions({ rows }: { rows: RecentSubmissionRow[] }) {
  return (
    <div className={cn(glassCard, 'flex h-full flex-col')}>
      <GlassRim />
      <h2 className={cn(moduleHeading, 'px-4 pt-4 sm:px-5')}>Recent</h2>

      {rows.length === 0 ? (
        <EmptyState
          icon={LuActivity}
          title="No submissions yet"
          description="Submissions will appear here as they arrive."
        />
      ) : (
        <ul className="mt-2 divide-y divide-white/40 dark:divide-white/10">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={row.href}
                className={cn(
                  'group flex items-center gap-3.5 px-4 py-3 sm:px-5',
                  glassRowHover,
                )}
              >
                {/* Fixed-width kind column: "Application" and "Inquiry" pills
                    would otherwise differ in width and stagger every name's
                    left edge down the feed. */}
                <span
                  className={cn(
                    'inline-flex w-[5.5rem] shrink-0 items-center justify-center rounded-full py-0.5 text-[0.6rem] font-medium uppercase tracking-wide',
                    glassChip,
                  )}
                >
                  {row.kindLabel}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {row.name}
                  </span>
                  {row.secondary && (
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {row.secondary}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {row.relative}
                </span>
                <LuArrowRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground motion-reduce:transition-none"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Pay chip ────────────────────────────────────────────────────────────────

/** One tint per state, borrowed from PayrollStatusBadge's palette so the
 *  dot and the badge a click away can never disagree. */
const PAY_DOT: Record<PayChipData['state'], string> = {
  sent: 'bg-amber-500',
  flagged: 'bg-destructive',
  received: 'bg-foreground',
};

/**
 * A status utterance, not a tile — deliberately figure-free (the fold never
 * reads an amount, so none can render). Links to My pay, which owns the rest.
 */
export function PayStatusChip({ data }: { data: PayChipData }) {
  return (
    <Link
      href={data.href}
      className={cn(
        glassCard,
        glassHover,
        // h-full so a stretched grid cell (the sm rail pair, or Band B for a
        // no-tasks viewer) doesn't leave bare shader under a short chip; the
        // items-center row just centers in the taller card.
        'group flex h-full items-center gap-3 p-4',
      )}
    >
      <GlassRim />
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          glassChip,
        )}
      >
        <LuBanknote aria-hidden="true" className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Your pay
          <span
            aria-hidden="true"
            className={cn('size-1.5 rounded-full', PAY_DOT[data.state])}
          />
        </span>
        <span className="mt-0.5 block truncate text-sm font-medium text-foreground">
          {data.line}
        </span>
      </span>
      <LuArrowRight
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground motion-reduce:transition-none"
      />
    </Link>
  );
}

// ── Quick actions ───────────────────────────────────────────────────────────

/** A slice of AdminNavItem — page.tsx hands these straight from ADMIN_ROUTES,
 *  so the card can never list a door the rail doesn't know about. */
export type QuickLink = {
  href: string;
  label: string;
  icon: IconType;
};

/** Past this many, the links go two-up instead of running the card long. */
const QUICK_LINK_COLUMNS_AT = 5;

/**
 * The command surface — the ⌘K palette's physical home on the page plus every
 * granted door the bento shows no module for. `expanded` (rail slack, known
 * server-side) pins a shortcuts legend to the bottom instead of leaving dead
 * glass.
 *
 * The list is DERIVED in page.tsx rather than written here; this component only
 * lays it out, which is why the count can be anything from one (a member with
 * no grants gets Profile alone) to nine.
 */
export function QuickActions({
  links,
  expanded,
}: {
  links: QuickLink[];
  expanded: boolean;
}) {
  const twoUp = links.length > QUICK_LINK_COLUMNS_AT;
  return (
    <div className={cn(glassCard, 'flex h-full flex-col p-4')}>
      <GlassRim />
      <SearchTrigger />

      <nav
        aria-label="Quick actions"
        className={cn(
          'mt-2',
          // Literal both ways — the Tailwind scanner cannot see a computed
          // class name.
          twoUp ? 'grid grid-cols-2 gap-x-1' : 'flex flex-col',
        )}
      >
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'group -mx-1.5 flex items-center gap-2.5 rounded-lg px-1.5 py-2 text-sm',
              glassRowHover,
            )}
          >
            <link.icon
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
            />
            <span className="min-w-0 flex-1 truncate font-medium text-foreground">
              {link.label}
            </span>
            {/* The arrow is the first thing to go when the row halves in
                width — the label is what someone is reading for. */}
            {!twoUp && (
              <LuArrowRight
                aria-hidden="true"
                className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground motion-reduce:transition-none"
              />
            )}
          </Link>
        ))}
      </nav>

      {expanded && (
        <div className="mt-auto border-t border-white/40 pt-3 dark:border-white/10">
          <dl className="flex flex-col gap-1.5 text-xs text-muted-foreground">
            <div className="flex items-center justify-between gap-3">
              <dt>Search anywhere</dt>
              <dd>
                <Kbd>⌘K</Kbd>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt>Collapse the sidebar</dt>
              <dd>
                <Kbd>⌘B</Kbd>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt>Focus a list&apos;s search</dt>
              <dd>
                <Kbd>/</Kbd>
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
