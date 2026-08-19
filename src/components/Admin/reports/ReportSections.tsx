import { LuCircleAlert, LuLink } from 'react-icons/lu';

import AdminAvatar from '@/components/Admin/AdminAvatar';
import { GlassPanel, GlassRim, glassCard } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';
import type { RowAvatar } from '@/components/Admin/tasks/types';
import type { ReadinessCheck } from './reportData';

/**
 * The monthly report's presentational sections, shared verbatim between the
 * /admin/reports/[slug] dashboard (tone="glass") and its /print page
 * (tone="print"). Print tone uses LITERAL neutrals so `dark:` never applies
 * and backgrounds survive print without color-adjust hacks; every number
 * arrives pre-formatted from the server (hydration-safe, and the print page
 * renders the exact same strings the dashboard showed).
 */

export type ReportTone = 'glass' | 'print';

export type CategoryBarGroup = {
  label: string;
  hoursLabel: string;
  /** 0–100, server-computed against the month total (2% floor for slivers). */
  pct: number;
  /** The same share WITHOUT the visibility floor — bars can round up to stay
   *  visible, printed percentages may not. */
  sharePct: number;
  fine: {
    label: string;
    hoursLabel: string;
    pct: number;
    sharePct: number;
  }[];
};

export type MemberBarRow = {
  /** Stable identity: assigneeId, or the name-keyed fallback for deleted
   *  accounts — NEVER the display name alone (a departed member's snapshot
   *  line and a same-named live account may both appear in one month). */
  key: string;
  name: string;
  /** Resolved face — rendered in glass tone only (the print page's literal
   *  neutrals can't host AdminAvatar's theme tokens); null → initials. */
  avatar: RowAvatar | null;
  tasksLabel: string;
  hoursLabel: string;
  /** Scaled to the top member. */
  pct: number;
  /** Share of the month's total hours — dashboard only. */
  sharePct: number;
};

export type WeekBarRow = {
  /** The week's Monday, as a YYYY-MM-DD key. */
  key: string;
  label: string;
  /** 'Aug 4 – 10', clipped to the month's last day. */
  rangeLabel: string;
  hoursLabel: string;
  tasks: number;
  /** Scaled to the busiest week of the month. */
  pct: number;
  busiest: boolean;
};

export type ReportTaskItem = {
  id: string;
  title: string;
  deliverableUrl: string;
  categoryLabel: string;
  assigneeName: string;
  hoursLabel: string;
  completedLabel: string;
};

function Section({
  tone,
  title,
  children,
}: {
  tone: ReportTone;
  title: string;
  children: React.ReactNode;
}) {
  if (tone === 'print') {
    return (
      <section className="mt-8 break-inside-avoid">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground print:text-neutral-500">
          {title}
        </h2>
        {children}
      </section>
    );
  }
  return (
    <section className="mt-6">
      <h2 className="mb-3 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <GlassPanel className="p-5 sm:p-6">{children}</GlassPanel>
    </section>
  );
}

/* Print tone = theme tokens on SCREEN, literal neutrals on PAPER. These sheets
 * are read in the browser (and, for /share, by a client who may well be in dark
 * mode) long before anyone prints them, and `--color-white`/`--color-black` are
 * FLIP tokens here — pinning the ink both ways left it near-black on a sheet
 * that had itself turned near-black. The `print:` half keeps the printer
 * honest: `text-foreground` from dark mode is white ink on white paper. */
const track = (tone: ReportTone) =>
  tone === 'print'
    ? 'bg-foreground/[0.08] print:bg-neutral-100'
    : 'bg-foreground/[0.08]';
const fill = (tone: ReportTone) =>
  tone === 'print' ? 'bg-foreground print:bg-neutral-900' : 'bg-foreground';
/** The quieter fill for non-highlighted bars in a set where one is called out
 *  (the rhythm strip's busiest week). */
const baseFill = (tone: ReportTone) =>
  tone === 'print'
    ? 'bg-foreground/40 print:bg-neutral-400'
    : 'bg-foreground/40';
const primaryText = (tone: ReportTone) =>
  tone === 'print'
    ? 'text-foreground print:text-neutral-900'
    : 'text-foreground';
const mutedText = (tone: ReportTone) =>
  tone === 'print'
    ? 'text-muted-foreground print:text-neutral-500'
    : 'text-muted-foreground';

/** Hours by service category — rolled up to the site's five service areas,
 *  fine-grained categories nested beneath. Bars are plain divs (no chart
 *  dep); the numbers are in the aria-label AND visible text, so the bar is
 *  redundant decoration. */
export function CategoryBars({
  tone,
  groups,
  totalLabel,
}: {
  tone: ReportTone;
  groups: CategoryBarGroup[];
  totalLabel: string;
}) {
  return (
    <Section tone={tone} title="Hours by service">
      <div className="flex flex-col gap-5">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className={cn('font-medium', primaryText(tone))}>
                {group.label}
              </span>
              <span className={cn('tabular-nums', mutedText(tone))}>
                {/* The share is the point of a mix — reading it off the bar
                    length was guesswork, and it's absent from the PDF. */}
                {group.sharePct}% · {group.hoursLabel}
              </span>
            </div>
            <div
              role="img"
              aria-label={`${group.label}: ${group.hoursLabel} of ${totalLabel}, ${group.sharePct} percent`}
              className={cn(
                'mt-1.5 h-2 overflow-hidden rounded-full',
                track(tone),
              )}
            >
              <div
                className={cn('h-full rounded-full', fill(tone))}
                style={{ width: `${group.pct}%` }}
              />
            </div>
            {group.fine.length > 1 && (
              <div className="mt-2 flex flex-col gap-1.5 pl-4">
                {group.fine.map((fine) => (
                  <div key={fine.label}>
                    <div className="flex items-baseline justify-between gap-3 text-xs">
                      <span className={mutedText(tone)}>{fine.label}</span>
                      <span className={cn('tabular-nums', mutedText(tone))}>
                        {fine.sharePct}% · {fine.hoursLabel}
                      </span>
                    </div>
                    <div
                      role="img"
                      aria-label={`${fine.label}: ${fine.hoursLabel}, ${fine.sharePct} percent`}
                      className={cn(
                        'mt-1 h-1 overflow-hidden rounded-full',
                        track(tone),
                      )}
                    >
                      <div
                        className={cn(
                          'h-full rounded-full',
                          tone === 'print'
                            ? 'bg-foreground/50 print:bg-neutral-400'
                            : 'bg-foreground/50',
                        )}
                        style={{ width: `${fine.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

/**
 * Delivery rhythm — hours per week across the month, so a client can see
 * whether the work arrived steadily or all landed in the last three days.
 * Weekly buckets rather than daily: at the studio's volume a 31-bar strip is
 * mostly empty, and an empty chart says nothing.
 *
 * Vertical bars, unlike every other section here, because cadence is read
 * left-to-right along a timeline — the same data as horizontal rows would
 * read as a ranking instead of a sequence.
 */
export function WeekBars({
  tone,
  weeks,
}: {
  tone: ReportTone;
  weeks: WeekBarRow[];
}) {
  const busiest = weeks.find((week) => week.busiest);
  return (
    <Section tone={tone} title="Delivery rhythm">
      <div className="flex items-end gap-2 sm:gap-3">
        {weeks.map((week) => (
          <div key={week.key} className="flex flex-1 flex-col items-center">
            <span
              className={cn(
                'mb-1.5 text-[0.7rem] tabular-nums',
                week.tasks > 0 ? primaryText(tone) : mutedText(tone),
              )}
            >
              {week.hoursLabel}
            </span>
            <div
              role="img"
              aria-label={`${week.label}, ${week.rangeLabel}: ${week.hoursLabel} across ${week.tasks} task${week.tasks === 1 ? '' : 's'}`}
              className={cn(
                'flex h-24 w-full items-end overflow-hidden rounded-md',
                track(tone),
              )}
            >
              <div
                className={cn(
                  'w-full rounded-md',
                  week.busiest ? fill(tone) : baseFill(tone),
                )}
                // A zero week still shows a hairline, so the strip reads as a
                // timeline with a gap rather than a missing bar.
                style={{ height: `${Math.max(week.pct, 2)}%` }}
              />
            </div>
            <span className={cn('mt-1.5 text-[0.7rem]', mutedText(tone))}>
              {week.rangeLabel}
            </span>
          </div>
        ))}
      </div>
      {busiest && (
        <p className={cn('mt-4 text-xs', mutedText(tone))}>
          Busiest week: {busiest.rangeLabel} — {busiest.hoursLabel} across{' '}
          {busiest.tasks} task{busiest.tasks === 1 ? '' : 's'}.
        </p>
      )}
    </Section>
  );
}

/**
 * Work that is finished and sitting with the client. The one piece of live
 * state that travels to the share link and the PDF, because it is the only
 * thing on the report the reader can act on — everything else is history.
 * Rendered only on the current month, and only when the count is non-zero.
 */
export function AwaitingApproval({
  tone,
  count,
  titles,
}: {
  tone: ReportTone;
  count: number;
  titles: string[];
}) {
  const rest = count - titles.length;
  return (
    <Section tone={tone} title="Waiting on your approval">
      <p className={cn('text-sm', primaryText(tone))}>
        {count} item{count === 1 ? ' is' : 's are'} finished and waiting for
        your sign-off.
      </p>
      <ul className="mt-3 flex flex-col gap-1.5">
        {titles.map((title) => (
          <li
            key={title}
            className={cn('flex gap-2 text-sm', primaryText(tone))}
          >
            <span aria-hidden className={mutedText(tone)}>
              •
            </span>
            {title}
          </li>
        ))}
      </ul>
      {rest > 0 && (
        <p className={cn('mt-2 text-xs', mutedText(tone))}>
          and {rest} more.
        </p>
      )}
    </Section>
  );
}

/** Per-member contribution, scaled to the month's top contributor. */
export function MemberBars({
  tone,
  members,
  showShare = false,
}: {
  tone: ReportTone;
  members: MemberBarRow[];
  /** Share-of-month percentages beside each name. Dashboard-only: on a client
   *  PDF it reads as an internal staffing breakdown they didn't ask for. */
  showShare?: boolean;
}) {
  return (
    <Section tone={tone} title="Team on this account">
      <div className="flex flex-col gap-4">
        {members.map((member) => (
          <div key={member.key}>
            {/* items-center hosts the avatar in glass tone; print has no
                avatar, so it keeps the baseline grid of the other sections. */}
            <div
              className={cn(
                'flex justify-between gap-3 text-sm',
                tone === 'glass' ? 'items-center' : 'items-baseline',
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                {tone === 'glass' && (
                  <AdminAvatar
                    name={member.name}
                    size={22}
                    {...(member.avatar ?? {})}
                  />
                )}
                <span className={cn('truncate font-medium', primaryText(tone))}>
                  {member.name}
                </span>
              </span>
              <span className={cn('shrink-0 text-xs tabular-nums', mutedText(tone))}>
                {showShare && `${member.sharePct}% · `}
                {member.tasksLabel} · {member.hoursLabel}
              </span>
            </div>
            <div
              role="img"
              aria-label={`${member.name}: ${member.hoursLabel}`}
              className={cn(
                'mt-1.5 h-2 overflow-hidden rounded-full',
                track(tone),
              )}
            >
              <div
                className={cn('h-full rounded-full', fill(tone))}
                style={{ width: `${member.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

export type TrendBarRow = {
  month: string;
  label: string;
  /** '—' when the month had nothing. */
  hoursLabel: string;
  /** Scaled to the busiest month (2% floor; zero stays zero). */
  pct: number;
  /** The month the surrounding report is showing — emphasized. */
  current: boolean;
};

/** Trailing-12-month delivered hours, oldest first — the dashboard and the
 *  share page (the print PDF stays a tight single-month document, the same
 *  reasoning that keeps the tile deltas off it). */
export function TrendBars({
  tone,
  rows,
  title = 'Delivery over time',
}: {
  tone: ReportTone;
  rows: TrendBarRow[];
  title?: string;
}) {
  return (
    <Section tone={tone} title={title}>
      <div className="flex flex-col gap-2.5">
        {rows.map((row) => (
          <div key={row.month}>
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span
                className={
                  row.current
                    ? cn('font-semibold', primaryText(tone))
                    : mutedText(tone)
                }
              >
                {row.label}
              </span>
              <span
                className={cn(
                  'tabular-nums',
                  row.current ? primaryText(tone) : mutedText(tone),
                )}
              >
                {row.hoursLabel}
              </span>
            </div>
            <div
              role="img"
              aria-label={`${row.label}: ${
                row.hoursLabel === '—' ? 'nothing delivered' : row.hoursLabel
              }`}
              className={cn(
                'mt-1 h-1.5 overflow-hidden rounded-full',
                track(tone),
              )}
            >
              <div
                className={cn(
                  'h-full rounded-full',
                  row.current
                    ? fill(tone)
                    : tone === 'print'
                      ? 'bg-foreground/50 print:bg-neutral-400'
                      : 'bg-foreground/50',
                )}
                style={{ width: `${row.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/** Headline stat tile — glass surfaces only (the report dashboards and the
 *  roster's studio strip; print composes its own ink-on-white tiles). */
export function ReportTile({
  label,
  value,
  reading,
  hint,
}: {
  label: string;
  value: string;
  /** An interpretation of the number directly above it ('≈ 3.3 work days
   *  (8h each)'), so it sits closest to it. Its own line, not joined to
   *  `hint` — two short lines scan; one long one wraps into mush. */
  reading?: string;
  /** The vs-previous-month comparison ('+3 vs July'). Dashboard only. */
  hint?: string;
}) {
  return (
    <div className={cn(glassCard, 'flex flex-col gap-1 p-5')}>
      <GlassRim />
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-3xl font-semibold tabular-nums text-foreground">
        {value}
      </span>
      {reading && (
        <span className="text-xs tabular-nums text-foreground/70">
          {reading}
        </span>
      )}
      {hint && (
        <span className="text-xs tabular-nums text-muted-foreground">
          {hint}
        </span>
      )}
    </div>
  );
}

/** Delivered-vs-agreed when the client has a monthly retainer target. The
 *  numbers render as visible text; the bar caps at 100% with the overage
 *  called out beside it (the admin's amber accent — ticket-pending
 *  precedent — or plain ink in print). */
export function RetainerBar({
  tone,
  usedLabel,
  targetLabel,
  pct,
  overLabel,
}: {
  tone: ReportTone;
  usedLabel: string;
  targetLabel: string;
  /** Already capped at 100. */
  pct: number;
  /** e.g. "+3 h over" — empty when at/under target. */
  overLabel: string;
}) {
  return (
    <Section tone={tone} title="Retainer">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className={cn('font-medium', primaryText(tone))}>
          {usedLabel} of {targetLabel}
        </span>
        {overLabel && (
          <span
            className={cn(
              'text-xs font-medium tabular-nums',
              tone === 'print'
                ? 'text-amber-700 dark:text-amber-400 print:text-neutral-900'
                : 'text-amber-700 dark:text-amber-400',
            )}
          >
            {overLabel}
          </span>
        )}
      </div>
      <div
        role="img"
        aria-label={`${usedLabel} of the ${targetLabel} monthly target`}
        className={cn('mt-2 h-2.5 overflow-hidden rounded-full', track(tone))}
      >
        <div
          className={cn('h-full rounded-full', fill(tone))}
          style={{ width: `${pct}%` }}
        />
      </div>
    </Section>
  );
}

/**
 * Studio diagnostics — how the month actually went, as opposed to what the
 * client is told. Deliberately takes NO `tone`: there is no print variant,
 * because this must never reach a PDF or a share link. On-time delivery in
 * particular reads 0% while retroactively-logged rows sit in the window, and
 * estimate drift is a statement about internal discipline.
 */
/**
 * What to fix before this month goes out. Like InternalKpiPanel it takes NO
 * `tone` prop, which is the enforcement rather than a convention: with no way
 * to render in print colours it structurally cannot reach the PDF or the
 * tokenized share page, where "no highlights written" would be an admission
 * rather than a checklist.
 *
 * Silent when everything passes — a green all-clear panel is furniture.
 */
export function ReportReadiness({ checks }: { checks: ReadinessCheck[] }) {
  if (checks.length === 0) return null;
  return (
    <Section tone="glass" title="Before you send this">
      <ul className="flex flex-col gap-3">
        {checks.map((check) => (
          <li key={check.id} className="flex items-start gap-2.5">
            <LuCircleAlert
              aria-hidden="true"
              className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400"
            />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">
                {check.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {check.hint}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function InternalKpiPanel({
  onTimeLabel,
  onTimePct,
  noDueDates,
  driftLabel,
  driftHint,
  open,
}: {
  onTimeLabel: string;
  onTimePct: number;
  noDueDates: number;
  driftLabel: string;
  driftHint: string;
  /** Live open-work state; null when viewing a past month. */
  open: {
    todo: number;
    inProgress: number;
    awaitingApproval: number;
    overdue: number;
  } | null;
}) {
  const carrying = open
    ? open.todo + open.inProgress + open.awaitingApproval
    : 0;
  // Nothing measurable yet — better silent than a panel of em-dashes.
  if (!onTimeLabel && !driftLabel && !carrying) return null;

  return (
    <Section tone="glass" title="Studio view — not shared with the client">
      <dl className="grid gap-5 sm:grid-cols-3">
        {onTimeLabel && (
          <Diagnostic
            label="On time"
            value={`${onTimePct}%`}
            hint={
              noDueDates > 0
                ? `${onTimeLabel} · ${noDueDates} had no due date`
                : onTimeLabel
            }
          />
        )}
        {driftLabel && (
          <Diagnostic
            label="Hours vs estimate"
            value={driftLabel}
            hint={driftHint}
          />
        )}
        {open && carrying > 0 && (
          <Diagnostic
            label="Still open"
            value={String(carrying)}
            hint={[
              open.awaitingApproval > 0 &&
                `${open.awaitingApproval} awaiting approval`,
              open.overdue > 0 && `${open.overdue} overdue`,
            ]
              .filter(Boolean)
              .join(' · ')}
          />
        )}
      </dl>
    </Section>
  );
}

function Diagnostic({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums text-foreground">
        {value}
      </dd>
      {hint && (
        <dd className="mt-0.5 text-xs text-muted-foreground">{hint}</dd>
      )}
    </div>
  );
}

/** The month's task list (feedback-page table recipe). */
export function ReportTaskTable({
  tone,
  tasks,
  deliverables = 0,
}: {
  tone: ReportTone;
  tasks: ReportTaskItem[];
  /** How many rows carry a deliverable link. Renders as a caption only when
   *  non-zero — the field is barely used yet, and "0 deliverables" on a
   *  client's PDF would be a worse lie than saying nothing. */
  deliverables?: number;
}) {
  const headerCell = cn(
    'pb-2.5 pr-3 text-left text-[0.65rem] font-medium uppercase tracking-[0.15em]',
    mutedText(tone),
  );
  const border =
    tone === 'print'
      ? 'border-foreground/12 print:border-neutral-200'
      : 'border-white/40 dark:border-white/10';
  return (
    <Section tone={tone} title="Delivered work">
      {deliverables > 0 && (
        <p className={cn('mb-3 text-xs', mutedText(tone))}>
          {deliverables} of {tasks.length} shipped with a linked deliverable.
        </p>
      )}
      <div
        {...(tone === 'glass' ? { 'data-lenis-prevent': true } : {})}
        className="overflow-x-auto"
      >
        <table className="w-full text-sm">
          <thead>
            <tr className={cn('border-b', border)}>
              <th scope="col" className={headerCell}>
                Task
              </th>
              <th scope="col" className={headerCell}>
                Category
              </th>
              <th scope="col" className={headerCell}>
                Member
              </th>
              <th scope="col" className={cn(headerCell, 'text-right')}>
                Hours
              </th>
              <th scope="col" className={cn(headerCell, 'pr-0 text-right')}>
                Completed
              </th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr
                key={task.id}
                className={cn('border-b last:border-b-0', border)}
              >
                <td className={cn('max-w-96 py-2.5 pr-3', primaryText(tone))}>
                  <span className="flex items-center gap-1.5">
                    <span className="min-w-0 truncate">{task.title}</span>
                    {task.deliverableUrl && (
                      <a
                        href={task.deliverableUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open deliverable for ${task.title}`}
                        className={cn(
                          'shrink-0 transition-colors print:hidden',
                          mutedText(tone),
                          tone === 'glass' && 'hover:text-foreground',
                        )}
                      >
                        <LuLink aria-hidden="true" className="size-3.5" />
                      </a>
                    )}
                  </span>
                </td>
                <td className={cn('whitespace-nowrap pr-3 text-xs', mutedText(tone))}>
                  {task.categoryLabel}
                </td>
                <td className={cn('whitespace-nowrap pr-3 text-xs', mutedText(tone))}>
                  {task.assigneeName}
                </td>
                <td
                  className={cn(
                    'whitespace-nowrap pr-3 text-right text-xs tabular-nums',
                    primaryText(tone),
                  )}
                >
                  {task.hoursLabel}
                </td>
                <td
                  className={cn(
                    'whitespace-nowrap pr-0 text-right text-xs tabular-nums',
                    mutedText(tone),
                  )}
                >
                  {task.completedLabel}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
