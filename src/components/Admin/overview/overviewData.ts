import 'server-only';

import { formatRelative } from '@/components/Admin/inbox/format';
import { secondaryLine } from '@/components/Admin/inbox/secondary';
import { monthLabel, monthShortLabel } from '@/components/Admin/payroll/format';
import { dueDateLabel } from '@/components/Admin/tasks/format';
import type { ActivityRow } from '@/db/activityQueries';
import type { CostMonthRollup } from '@/db/costQueries';
import type {
  ContactSubmission,
  MonitoringCheck,
  MonitoringIncident,
} from '@/db/schema';
import type { MonthRollup, OwnPaymentRow } from '@/db/payrollQueries';
import type { DoneSlice, TasksPage } from '@/db/taskQueries';
import type { TicketStatusCounts } from '@/db/ticketQueries';
import {
  dayKeyIn,
  daysBetweenDayKeys,
  monthTokenIn,
  shiftDayKey,
  shiftMonthToken,
  zonedFormat,
} from '@/lib/calendar';
import { formatAmount, formatAmountCompact } from '@/lib/payrollAmounts';
import {
  foldOutflow,
  OUTFLOW_BUCKET_FILLS,
  OUTFLOW_BUCKET_LABELS,
} from '@/lib/spendFields';
import {
  CRON_JOBS,
  DEPENDENCY_CHECKS,
  OVERALL_STATUS_LABELS,
  OVERALL_STATUS_TONES,
  cronComponent,
  cronHealth,
  deriveOverallStatus,
  parseCronSchedule,
  relativeAge,
  type CheckStatus,
  type OverallStatus,
} from '@/lib/monitoringFields';
import type { TaskAssigneeRef } from '@/lib/taskAssigneeFields';
import { formatMinutes, INTERNAL_CLIENT_LABEL } from '@/lib/taskFields';
import { taskListQs } from '@/lib/taskFilters';
import type { PayrollPaymentStatus } from '@/lib/payrollStatus';

/**
 * The overview's data folds: every module's serializable props, derived here
 * from already-fetched rows so page.tsx stays a gates-and-batch shell and
 * OverviewSections.tsx stays purely presentational (the assembleBoard /
 * reportData idiom). Pure synchronous functions — the queries stay visible in
 * the page's one Promise.all, which is where the access gating lives.
 *
 * Every date, duration and figure leaves here as a pre-formatted string
 * (the payrollData rule); the only numbers that cross are counts and 0–100
 * percentages.
 */

// ── Your day (hero) ─────────────────────────────────────────────────────────

/** listTasks perPage for the hero read. `sort: 'due'` is due-asc-nulls-last,
 *  so a cap this size can only truncate the far/undated tail — see
 *  `countsExact` below for the one case where it can't be trusted. */
export const HERO_FETCH = 100;
/** Task rows the hero actually renders. */
export const HERO_ROWS = 6;

export type HeroDueState = 'overdue' | 'today' | 'week' | 'later' | 'none';

export type HeroTask = {
  id: string;
  title: string;
  /** "Client · Category", client falling back to the internal label. */
  secondary: string;
  dueState: HeroDueState;
  /** '3d late' · 'Today' · 'Fri' · 'Sep 4' · '' (undated). */
  dueLabel: string;
  estimateLabel: string;
  /**
   * 'with Aryan Ghasemi' · 'with Aryan Ghasemi +2' · '' when nobody else is on
   * it. A worklist row that looks identical whether one person or three are
   * doing the job is the one thing multi-assignee could quietly cost this
   * card.
   */
  sharedLabel: string;
  /** The board's ?task= deep link — opens the edit dialog (the ⌘K contract). */
  href: string;
};

export type DayHeroData = {
  /** 'Thursday, August 21' in the viewer's zone. */
  todayLabel: string;
  /**
   * `open` is the exact window-count total, so the third figure and the
   * unfiltered board it links to always agree. overdue/today are bucket
   * tallies over the fetched rows — exact unless `countsExact` is false.
   */
  counts: { overdue: number; today: number; open: number };
  /**
   * False only when the HERO_FETCH cap fell INSIDE the week window (someone
   * holds 100+ open tasks all due within seven days) — the overdue/today
   * tallies are then floors, and the meter appends '+' to those two figures.
   */
  countsExact: boolean;
  openTotal: number;
  tasks: HeroTask[];
  /** '4 more due this week' / '12 more open' / '' — the footer's left side. */
  moreLabel: string;
  links: { board: string; overdue: string; dueToday: string };
};

/**
 * Deadline buckets, mirroring TaskBoard's `dueBucket()` verbatim (lexical
 * compares on the reader's day keys) so a hero count can never disagree with
 * the section the deep-linked board files the same task under. The done
 * branch is unreachable here — the hero reads the open view only.
 */
function bucketOf(
  dueDate: string | null,
  todayKey: string,
  weekEndKey: string,
): HeroDueState {
  if (!dueDate) return 'none';
  if (dueDate < todayKey) return 'overdue';
  if (dueDate === todayKey) return 'today';
  return dueDate < weekEndKey ? 'week' : 'later';
}

/** Chip text per bucket. Week rows get the weekday ('Fri') — the key is a
 *  calendar value, so it formats at UTC (the tasks/format.ts rule). */
function dueLabelOf(
  dueDate: string | null,
  state: HeroDueState,
  todayKey: string,
): string {
  if (!dueDate || state === 'none') return '';
  if (state === 'overdue') {
    const days = daysBetweenDayKeys(dueDate, todayKey);
    return `${days}d late`;
  }
  if (state === 'today') return 'Today';
  if (state === 'week') {
    return zonedFormat('UTC', { weekday: 'short' }).format(
      new Date(`${dueDate}T00:00:00.000Z`),
    );
  }
  return dueDateLabel(dueDate, todayKey);
}

/**
 * Who else is on this task.
 *
 * `assignees` always contains the viewer, and always by id: the hero reads the
 * board filtered by `assigneeId`, whose predicate is an EXISTS on the join
 * table's `user_id` — the same column matched here. (That column is `set null`
 * only when an ACCOUNT IS DELETED, and a deleted account cannot be the viewer,
 * so the filter can never fail to drop them and name them as their own
 * collaborator.)
 *
 * The names stay whole rather than being cut to a first name: the board, the
 * dialog and the reports all say the display name, and the line this rides on
 * truncates anyway.
 */
function sharedLabelOf(assignees: TaskAssigneeRef[], userId: string): string {
  const others = assignees.filter((a) => a.id !== userId);
  if (others.length === 0) return '';
  const [first, ...rest] = others;
  return rest.length === 0
    ? `with ${first.name}`
    : `with ${first.name} +${rest.length}`;
}

export function buildDayHero(
  tz: string,
  userId: string,
  page: TasksPage,
  now: Date = new Date(),
): DayHeroData {
  const todayKey = dayKeyIn(tz, now);
  const weekEndKey = shiftDayKey(todayKey, 7);

  const tallies = { overdue: 0, today: 0, week: 0, later: 0, none: 0 };
  for (const row of page.rows) {
    tallies[bucketOf(row.dueDate, todayKey, weekEndKey)] += 1;
  }

  const last = page.rows[page.rows.length - 1];
  // Exact when nothing was truncated (rows cover the whole window count), or
  // when the cut tail is provably outside the week window (due-asc nulls-last
  // ordering — everything past the last fetched row is due later or undated).
  const countsExact =
    page.rows.length >= page.total ||
    !last ||
    last.dueDate === null ||
    last.dueDate >= weekEndKey;

  const tasks: HeroTask[] = page.rows.slice(0, HERO_ROWS).map((row) => {
    const state = bucketOf(row.dueDate, todayKey, weekEndKey);
    return {
      id: row.id,
      title: row.title,
      secondary: `${row.clientName ?? INTERNAL_CLIENT_LABEL} · ${row.categoryName}`,
      dueState: state,
      dueLabel: dueLabelOf(row.dueDate, state, todayKey),
      // The task's OWN estimate, never a share of it. splitMinutesAcross
      // governs per-member FOLDS (the leaderboard, the member bars, a client
      // sheet); this is a worklist, and quietly halving the figure here would
      // make the row disagree with the task it opens.
      estimateLabel: formatMinutes(row.estimatedMinutes),
      sharedLabel: sharedLabelOf(row.assignees, userId),
      href: `/admin/tasks?task=${row.id}`,
    };
  });

  const shownDueSoon = tasks.filter(
    (t) => t.dueState === 'overdue' || t.dueState === 'today' || t.dueState === 'week',
  ).length;
  const hiddenDueSoon =
    tallies.overdue + tallies.today + tallies.week - shownDueSoon;
  const hidden = page.total - tasks.length;
  const moreLabel = !countsExact
    ? hidden > 0
      ? `${hidden} more open`
      : ''
    : hiddenDueSoon > 0
      ? `${hiddenDueSoon} more due this week`
      : hidden > 0
        ? `${hidden} more open`
        : '';

  return {
    todayLabel: zonedFormat(tz, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }).format(now),
    counts: { overdue: tallies.overdue, today: tallies.today, open: page.total },
    countsExact,
    openTotal: page.total,
    tasks,
    moreLabel,
    links: {
      board: `/admin/tasks?${taskListQs('open', {
        assignee: userId,
        sort: 'due',
        group: 'due',
      })}`,
      overdue: `/admin/tasks?${taskListQs('open', {
        assignee: userId,
        drange: 'overdue',
        sort: 'due',
        group: 'due',
      })}`,
      dueToday: `/admin/tasks?${taskListQs('open', {
        assignee: userId,
        dfield: 'due',
        drange: 'today',
        sort: 'due',
      })}`,
    },
  };
}

// ── Inbox pulse ─────────────────────────────────────────────────────────────

/** Days the micro-trend spans, today inclusive. */
export const PULSE_DAYS = 14;

export type PulseDay = {
  key: string;
  count: number;
  /** Bar height 0–100; 0 renders the baseline dot, not a zero bar. */
  pct: number;
  /** Hover pill: 'Aug 8 · 3'. */
  hoverLabel: string;
  ariaLabel: string;
  isToday: boolean;
};

export type InboxPulseData = {
  inquiries: { value: number; href: string } | null;
  applications: { value: number; href: string } | null;
  days: PulseDay[];
  /** The strip's own aria-label: the totals, since height carries no number. */
  rangeAria: string;
};

export function foldInboxPulse(
  tz: string,
  counts: { project: number; career: number },
  times: { createdAt: Date }[],
  canInquiries: boolean,
  canApplications: boolean,
  now: Date = new Date(),
): InboxPulseData {
  const todayKey = dayKeyIn(tz, now);
  const perDay = new Map<string, number>();
  for (const t of times) {
    const key = dayKeyIn(tz, t.createdAt);
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }

  const dayName = zonedFormat('UTC', { month: 'short', day: 'numeric' });
  const keys = Array.from({ length: PULSE_DAYS }, (_, i) =>
    shiftDayKey(todayKey, -(PULSE_DAYS - 1 - i)),
  );
  const max = Math.max(0, ...keys.map((k) => perDay.get(k) ?? 0));
  const total = keys.reduce((sum, k) => sum + (perDay.get(k) ?? 0), 0);

  const days: PulseDay[] = keys.map((key) => {
    const count = perDay.get(key) ?? 0;
    const label = dayName.format(new Date(`${key}T00:00:00.000Z`));
    return {
      key,
      count,
      // 8% floor so a lone submission still reads as a bar, not a speck.
      pct: count === 0 ? 0 : Math.max(8, Math.round((count / max) * 100)),
      hoverLabel: `${label} · ${count}`,
      ariaLabel: `${label}: ${count} submission${count === 1 ? '' : 's'}`,
      isToday: key === todayKey,
    };
  });

  return {
    inquiries: canInquiries
      ? { value: counts.project, href: '/admin/inquiries' }
      : null,
    applications: canApplications
      ? { value: counts.career, href: '/admin/applications' }
      : null,
    days,
    rangeAria: `Submissions, last ${PULSE_DAYS} days: ${total} total`,
  };
}

// ── Studio month ────────────────────────────────────────────────────────────

export type StudioMonthColumn = {
  key: string;
  /** Single-letter axis label ('A'), the current month emphasised. */
  letter: string;
  /** 0 renders the dashed honest gap (PayColumns rule). */
  pct: number;
  current: boolean;
  /** Hover pill + aria: 'Mar 26 · 41h 30m' / 'Mar 26: nothing completed'. */
  valueLabel: string;
  ariaLabel: string;
};

export type StudioMonthData = {
  /** 'August' — the header says "Studio · August". */
  monthName: string;
  hoursLabel: string;
  tasksLabel: string;
  /**
   * '2 revisions', '' when there were none.
   *
   * `tasksLabel` counts DELIVERABLES while `hoursLabel` takes every row, and
   * without this clause that gap is completely silent — a month whose work
   * needed three rounds reads as fewer things shipped for the same hours with
   * nothing on screen to explain it. The digest, the client report and the
   * leaderboard all state it the same way, down to the wording. Empty at zero,
   * because an explicit "0 revisions" is noise on most months.
   */
  revisionsLabel: string;
  columns: StudioMonthColumn[];
};

/** '2 revisions' / '' — the house wording, shared with leaderboardData.ts. */
function revisionsLabel(revisions: number): string {
  return revisions === 0
    ? ''
    : `${revisions} revision${revisions === 1 ? '' : 's'}`;
}

export function foldStudioMonth(
  tz: string,
  slices: DoneSlice[],
  now: Date = new Date(),
): StudioMonthData {
  const current = monthTokenIn(tz, now);
  const tokens = Array.from({ length: 12 }, (_, i) =>
    shiftMonthToken(current, -(11 - i)),
  );

  const minutes = new Map<string, number>();
  const tasks = new Map<string, number>();
  const revisions = new Map<string, number>();
  for (const slice of slices) {
    if (!slice.completedAt) continue;
    const token = monthTokenIn(tz, slice.completedAt);
    minutes.set(
      token,
      (minutes.get(token) ?? 0) +
        (slice.actualMinutes ?? slice.estimatedMinutes),
    );
    // Deliverables. The bar's height is minutes (which take every row), so a
    // revision still registers as effort — it just isn't a second thing
    // shipped in the "N tasks" readout beside it. The rounds are tallied
    // alongside rather than dropped, so the difference can be SAID.
    if (slice.parentId === null) tasks.set(token, (tasks.get(token) ?? 0) + 1);
    else revisions.set(token, (revisions.get(token) ?? 0) + 1);
  }

  const max = Math.max(0, ...tokens.map((t) => minutes.get(t) ?? 0));
  const columns: StudioMonthColumn[] = tokens.map((token) => {
    const mins = minutes.get(token) ?? 0;
    const short = monthShortLabel(token);
    return {
      key: token,
      letter: monthShortLabel(token).charAt(0),
      pct: mins === 0 ? 0 : Math.max(2, Math.round((mins / max) * 100)),
      current: token === current,
      valueLabel:
        mins === 0 ? `${short} · —` : `${short} · ${formatMinutes(mins)}`,
      ariaLabel:
        mins === 0
          ? `${short}: nothing completed`
          : `${short}: ${formatMinutes(mins)} across ${tasks.get(token) ?? 0} task${
              tasks.get(token) === 1 ? '' : 's'
            }${
              revisions.get(token)
                ? `, plus ${revisionsLabel(revisions.get(token) ?? 0)}`
                : ''
            }`,
    };
  });

  const monthMinutes = minutes.get(current) ?? 0;
  const monthTasks = tasks.get(current) ?? 0;
  return {
    monthName: zonedFormat('UTC', { month: 'long' }).format(
      new Date(`${current}-01T00:00:00.000Z`),
    ),
    hoursLabel: monthMinutes === 0 ? '0h' : formatMinutes(monthMinutes),
    tasksLabel: String(monthTasks),
    revisionsLabel: revisionsLabel(revisions.get(current) ?? 0),
    columns,
  };
}

// ── Tickets gauge ───────────────────────────────────────────────────────────

export type TicketsGaugeData = {
  open: number;
  scopeLabel: string;
  /**
   * Superadmin only — members have no own-status-counts read, and their
   * universe is their own reports anyway, so they get the count alone.
   * Segments carry raw counts: the spine divides them with flex-grow, which
   * always sums exactly (independently rounded percentages can hit 99/101).
   */
  spine: {
    segments: { key: 'open' | 'pending' | 'closed'; count: number }[];
    legend: string;
  } | null;
};

export function foldTickets(
  superadmin: boolean,
  counts: TicketStatusCounts | null,
  ownOpen: number,
): TicketsGaugeData {
  if (!superadmin || !counts) {
    return { open: ownOpen, scopeLabel: 'Your open tickets', spine: null };
  }
  const total = counts.open + counts.pending + counts.closed;
  return {
    open: counts.open,
    scopeLabel: 'Open tickets',
    spine:
      total === 0
        ? null
        : {
            segments: (['open', 'pending', 'closed'] as const).map((key) => ({
              key,
              count: counts[key],
            })),
            legend: `${counts.open} open · ${counts.pending} pending · ${counts.closed} closed`,
          },
  };
}

// ── Money ───────────────────────────────────────────────────────────────────

/** The three segments the Overview draws. Not OutflowBucket: this card has no
 *  plan/no-plan split to show, so the cost ledger arrives as one 'bills'. */
export type MoneySegment = {
  key: 'people' | 'fee' | 'bills';
  label: string;
  /** RAW cents. The spine divides by flex-grow, which always sums exactly
   *  where independently-rounded widths hit 99/101% (the TicketsGauge rule). */
  cents: number;
  /** A literal class from the shared ink ramp — never a computed name. */
  fill: string;
  /** '$11,940.00' — compact, because three of these share one line. */
  valueLabel: string;
};

export type MoneyPulseData = {
  /** 'August' — the header says "Money · August". */
  monthName: string;
  /** 'CAD 14,382.10', the same formatter /admin/spend's tile uses. */
  totalLabel: string;
  segments: MoneySegment[];
  /** Whether anything left at all. Decided here so the card never has to add
   *  its own segments up — every figure reaches it pre-folded. */
  hasSpend: boolean;
  /** 'Salaries $11,940.00 · Wire fees $30.00 · Bills $2,412.00'. */
  legend: string;
  /** '1 draft not counted yet', '' when there are none. */
  draftNote: string;
  href: '/admin/spend';
};

/**
 * This month's outflow — salaries, wire fees and bills in one figure.
 *
 * Composed, never queried: both arguments are rows the page already fetched
 * through the EXISTING admin doors (adminMonthRollups / costMonthRollups),
 * which is the same discipline spendData.ts follows. Opening a payroll query
 * path here would be a third projection routing around the own-vs-admin split.
 *
 * The addition itself is foldOutflow's, in the client-safe money leaf, so this
 * card and /admin/spend's headline tile are structurally incapable of quoting
 * different totals for one month. Nothing here does arithmetic on money, and
 * every figure leaves as a pre-formatted string (the payrollData contract).
 *
 * The caller MUST have gated on holding BOTH money grants — see the module's
 * gate in page.tsx. Half the grants would render a partial total under a
 * complete label, which is worse than showing nothing.
 */
export function foldMoneyPulse(
  tz: string,
  pay: MonthRollup | undefined,
  cost: CostMonthRollup | undefined,
  now: Date = new Date(),
): MoneyPulseData {
  const fold = foldOutflow({
    peopleCents: pay?.costCadCents ?? 0,
    feeCents: pay?.feeCadCents ?? 0,
    // The month's whole cost ledger. `oneoffCents: null` says so honestly —
    // this card reads the rollup, not the entries, so it has no plan/no-plan
    // split and must never draw a "Recurring costs" bar over a figure that
    // also contains one-offs.
    toolsCents: cost?.totalCadCents ?? 0,
    oneoffCents: null,
  });

  const segments: MoneySegment[] = [
    {
      key: 'people',
      label: OUTFLOW_BUCKET_LABELS.people,
      cents: fold.cents.people,
      fill: OUTFLOW_BUCKET_FILLS.people,
      valueLabel: formatAmountCompact(fold.cents.people, 'CAD'),
    },
    {
      // Its own segment, never folded into Salaries: a wire fee is company
      // cost outside anybody's pay, and adding it in would make a salary
      // total no payslip agrees with.
      key: 'fee',
      label: OUTFLOW_BUCKET_LABELS.fee,
      cents: fold.cents.fee,
      fill: OUTFLOW_BUCKET_FILLS.fee,
      valueLabel: formatAmountCompact(fold.cents.fee, 'CAD'),
    },
    {
      // 'Bills' — what the rail row and /admin/costs' own heading call it.
      key: 'bills',
      label: 'Bills',
      cents: fold.billsCents,
      fill: OUTFLOW_BUCKET_FILLS.tools,
      valueLabel: formatAmountCompact(fold.billsCents, 'CAD'),
    },
  ];

  const drafts = pay?.counts.draft ?? 0;
  return {
    monthName: zonedFormat(tz, { month: 'long' }).format(now),
    totalLabel: formatAmount(fold.totalCents, 'CAD'),
    segments,
    hasSpend: fold.totalCents > 0,
    legend: segments.map((s) => `${s.label} ${s.valueLabel}`).join(' · '),
    // Payroll excludes drafts from spend (countsAsSpend) while a cost entry has
    // no status at all. Say so, or the figure quietly fails to reconcile with
    // /admin/payroll and reads as a bug.
    draftNote:
      drafts === 0
        ? ''
        : `${drafts} draft${drafts === 1 ? '' : 's'} not counted yet`,
    href: '/admin/spend',
  };
}

// ── Pay chip ────────────────────────────────────────────────────────────────

export type PayChipData = {
  state: 'sent' | 'flagged' | 'received';
  /** For PayrollStatusBadge (member audience). */
  status: PayrollPaymentStatus;
  /** The whole sentence — composed here so no figure can reach the render. */
  line: string;
  href: '/admin/my-pay';
};

/**
 * The latest month's status, figure-free by construction: only `status` and
 * `month` are ever read off the row (buildOwnPayView's latest-payment rule —
 * rows arrive desc(month) with drafts already filtered in SQL). No non-void
 * history → null → no chip; /admin/my-pay owns the "nothing yet" narrative.
 */
export function foldPayChip(rows: OwnPaymentRow[]): PayChipData | null {
  const latest = rows.find((r) => r.status !== 'void');
  if (!latest) return null;
  const month = monthLabel(latest.month);
  if (latest.status === 'sent') {
    return {
      state: 'sent',
      status: latest.status,
      line: `${month} payment sent: confirm receipt`,
      href: '/admin/my-pay',
    };
  }
  if (latest.status === 'flagged') {
    return {
      state: 'flagged',
      status: latest.status,
      line: `${month} payment flagged for review`,
      href: '/admin/my-pay',
    };
  }
  return {
    state: 'received',
    status: latest.status,
    line: `${month} pay confirmed`,
    href: '/admin/my-pay',
  };
}

// ── Activity peek ───────────────────────────────────────────────────────────

export type ActivityPeekRow = {
  id: string;
  actorName: string;
  summary: string;
  action: string;
  /** formatRelative — the peek has no day groups, so '2h' beats '14:02'. */
  timeLabel: string;
};

export function mapActivityPeek(
  tz: string,
  rows: ActivityRow[],
): ActivityPeekRow[] {
  const now = new Date();
  return rows.map((row) => ({
    id: row.id,
    actorName: row.actorName,
    summary: row.summary,
    action: row.action,
    timeLabel: formatRelative(tz, row.createdAt, now),
  }));
}

// ── Recent submissions ──────────────────────────────────────────────────────

export type RecentSubmissionRow = {
  id: string;
  name: string;
  secondary: string | null;
  relative: string;
  href: string;
  kind: 'project' | 'career';
  kindLabel: string;
};

export function mapRecentSubmissions(
  tz: string,
  rows: ContactSubmission[],
): RecentSubmissionRow[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    secondary: secondaryLine(row),
    relative: formatRelative(tz, row.createdAt),
    href:
      row.kind === 'project'
        ? `/admin/inquiries/${row.id}`
        : `/admin/applications/${row.id}`,
    kind: row.kind,
    kindLabel: row.kind === 'project' ? 'Inquiry' : 'Application',
  }));
}

// ── System status ───────────────────────────────────────────────────────────

export type SystemStatusData = {
  status: OverallStatus;
  label: string;
  tone: string;
  reason: string;
  openLabel: string;
  checkedLabel: string;
  href: string;
};

/**
 * The Monitoring module's headline, folded from the SAME reads and the SAME
 * derivation the page uses (deriveOverallStatus over the check rows and the
 * open incidents), so the card and the page cannot disagree about whether the
 * system is healthy. Gated by omission on the page: the reads never fire for
 * a viewer without the `monitoring` grant.
 */
export function foldSystemStatus(
  pulse: { checks: MonitoringCheck[]; open: Pick<MonitoringIncident, 'severity'>[] },
  now: Date = new Date(),
): SystemStatusData {
  const dependencyStatuses = DEPENDENCY_CHECKS.map((spec) => ({
    component: spec.component,
    status:
      pulse.checks.find((c) => c.component === spec.component)?.status ??
      ('unknown' as const),
  }));
  const cronStatuses: { component: string; status: CheckStatus }[] = [];
  for (const job of CRON_JOBS) {
    const row = pulse.checks.find((c) => c.component === cronComponent(job.name));
    const health = cronHealth({
      schedule: parseCronSchedule(job.schedule),
      lastRunAt: row && row.status !== 'unknown' ? row.checkedAt : null,
      lastStatus: row?.status ?? null,
      consecutiveFailures: row?.consecutiveFailures ?? 0,
      firstSeenAt: row?.firstSeenAt ?? null,
      now,
    });
    if (health.state === 'ok') cronStatuses.push({ component: job.name, status: 'ok' });
    else if (health.state !== 'pending')
      cronStatuses.push({ component: job.name, status: 'failed' });
  }
  const lastCheckedAt = pulse.checks
    .filter((c) => c.kind === 'dependency')
    .reduce<Date | null>(
      (latest, c) => (latest && latest > c.checkedAt ? latest : c.checkedAt),
      null,
    );
  const overall = deriveOverallStatus({
    checks: [...dependencyStatuses, ...cronStatuses],
    openIncidents: pulse.open,
    lastCheckedAt,
    now,
  });
  const open = pulse.open.length;
  return {
    status: overall.status,
    label: OVERALL_STATUS_LABELS[overall.status],
    tone: OVERALL_STATUS_TONES[overall.status],
    reason: overall.reason,
    openLabel: open === 0 ? 'No open incidents' : `${open} open ${open === 1 ? 'incident' : 'incidents'}`,
    checkedLabel: lastCheckedAt
      ? `Checked ${relativeAge(now.getTime() - lastCheckedAt.getTime())}`
      : 'Never checked',
    href: '/admin/monitoring',
  };
}
