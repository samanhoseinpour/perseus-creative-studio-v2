import 'server-only';

import { formatRelative } from '@/components/Admin/inbox/format';
import { secondaryLine } from '@/components/Admin/inbox/secondary';
import { monthLabel, monthShortLabel } from '@/components/Admin/payroll/format';
import { dueDateLabel } from '@/components/Admin/tasks/format';
import type { ActivityRow } from '@/db/activityQueries';
import type { ContactSubmission } from '@/db/schema';
import type { OwnPaymentRow } from '@/db/payrollQueries';
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
      estimateLabel: formatMinutes(row.estimatedMinutes),
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
  columns: StudioMonthColumn[];
};

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
    // shipped in the "N tasks" readout beside it.
    if (slice.parentId === null) tasks.set(token, (tasks.get(token) ?? 0) + 1);
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
          : `${short}: ${formatMinutes(mins)} across ${tasks.get(token)} task${
              tasks.get(token) === 1 ? '' : 's'
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
      line: `${month} payment sent — confirm receipt`,
      href: '/admin/my-pay',
    };
  }
  if (latest.status === 'flagged') {
    return {
      state: 'flagged',
      status: latest.status,
      line: `${month} payment flagged — review`,
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
