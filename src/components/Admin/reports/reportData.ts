import {
  getReportClientById,
  getReportClientBySlug,
  getReportNote,
  listAssigneeOptions,
  listClientActivityDates,
  listClientMonthTasks,
  listClientOpenSnapshot,
  listDoneSlices,
  type ClientOpenSnapshot,
  type DoneSlice,
  type ReportClient,
  type TaskListRow,
} from '@/db/taskQueries';
import { resolveAdminAvatar } from '@/lib/adminIdentity';
import {
  foldMonthTotals,
  formatDayspan,
  formatMinutes,
  formatWorkDays,
} from '@/lib/taskFields';
import {
  daysBetweenDayKeys,
  monthToken,
  parseMonthToken,
  shiftDayKey,
  shiftMonthToken,
  vancouverDayKey,
  vancouverMonthWindow,
} from '@/lib/taskFilters';
import { PROJECT_CATEGORY_LABELS } from '@/lib/portfolioFields';
import {
  dueDateLabel,
  monthLabel,
  shortDayLabel,
} from '@/components/Admin/tasks/format';
import type {
  CategoryBarGroup,
  MemberBarRow,
  ReportTaskItem,
  TrendBarRow,
  WeekBarRow,
} from './ReportSections';
import type { MonthOption } from './MonthSwitcher';

/**
 * Server-side assembly for one client's month report — shared verbatim by
 * the dashboard and the /print page so the PDF a client receives shows the
 * exact strings the dashboard showed. (Transitively server-only through
 * taskQueries.) The internal (null-client) report and the roster's studio
 * trend assemble through the same folds, so all report surfaces agree.
 */

export type ClientMonthReport = {
  client: ReportClient;
  month: string;
  monthLabelText: string;
  currentMonth: string;
  monthOptions: MonthOption[];
  tiles: {
    tasksCompleted: number;
    totalHoursLabel: string;
    membersInvolved: number;
    /** '≈ 3.3 work days (8h each)', '' under one workday. Client-safe (it
     *  interprets the hours rather than judging them), so unlike the deltas
     *  below this one DOES travel to print and share. */
    hoursWorkdays: string;
    /** Median start→delivered calendar span ('2 days', 'same day'), '—' when
     *  the month has no completed work. Client-safe. */
    turnaroundLabel: string;
    turnaroundHint: string;
    /** Dashboard-only vs-previous-month hints ('+3 vs July'); print stays
     *  clean — a client PDF states the month, it doesn't compare. */
    tasksDelta: string;
    hoursDelta: string;
  };
  categoryGroups: CategoryBarGroup[];
  categoryTotalLabel: string;
  memberRows: MemberBarRow[];
  /** Hours per 7-day block of the month — the delivery-rhythm strip. */
  weeks: WeekBarRow[];
  /** How many of the month's tasks shipped with a deliverable link. */
  deliverables: number;
  retainer: {
    usedLabel: string;
    targetLabel: string;
    pct: number;
    overLabel: string;
  } | null;
  tasks: ReportTaskItem[];
  /** Trailing 12 months of delivered hours, oldest first — dashboard and
   *  share page only (print stays the tight single-month document). */
  trend: TrendBarRow[];
  /** The month's saved highlights note; '' when none. */
  note: string;
  /** Live open-work state, or null when viewing a past month (a closed month's
   *  report must not mix in present-tense state). The `needs_approval` slice is
   *  the only part that reaches print and share. */
  open: ClientOpenSnapshot | null;
  /** Diagnostics — the DASHBOARD renders these, print and share never do. */
  internalKpis: InternalKpis;
  /** What to fix before sending — dashboard only, same reason. */
  readiness: ReadinessCheck[];
};

/** The internal (null-client) studio-work report — the client report minus
 *  the client row, retainer, and highlights note (report_notes requires a
 *  client). */
export type InternalMonthReport = {
  month: string;
  monthLabelText: string;
  currentMonth: string;
  monthOptions: MonthOption[];
  tiles: ClientMonthReport['tiles'];
  categoryGroups: CategoryBarGroup[];
  categoryTotalLabel: string;
  memberRows: MemberBarRow[];
  weeks: WeekBarRow[];
  tasks: ReportTaskItem[];
  trend: TrendBarRow[];
  open: ClientOpenSnapshot | null;
  internalKpis: InternalKpis;
};

/** Slivers stay visible; zero stays zero. */
const pctOf = (minutes: number, total: number): number =>
  minutes === 0 || total === 0
    ? 0
    : Math.max(2, Math.round((minutes / total) * 100));

/** True share of the total, unclamped — the text label beside a bar, where
 *  `pctOf`'s 2% floor would be a lie rather than a visibility aid. */
const sharePct = (minutes: number, total: number): number =>
  total === 0 ? 0 : Math.round((minutes / total) * 100);

/** Median, not mean: one 10-hour outlier in a 7-task month would drag an
 *  average turnaround into fiction. Empty → null. */
function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Typical turnaround: the median calendar span from when a task was started
 * (its planned `startDate`, falling back to the day it was logged) to the day
 * it was delivered. Both sides are Vancouver day keys, so this is honest
 * calendar time with no instant-vs-timezone trap — and day granularity is the
 * right resolution, since `start_date` is a calendar column with no clock.
 */
function foldTurnaround(rows: TaskListRow[]): {
  label: string;
  sample: number;
} {
  const spans: number[] = [];
  for (const row of rows) {
    if (!row.completedAt) continue;
    const from = row.startDate ?? vancouverDayKey(row.createdAt);
    const days = daysBetweenDayKeys(from, vancouverDayKey(row.completedAt));
    // A start date set after delivery is a data-entry artifact, not a negative
    // turnaround — clamp rather than let it pull the median below zero.
    spans.push(Math.max(0, days));
  }
  const mid = median(spans);
  return {
    label: mid === null ? '—' : formatDayspan(mid),
    sample: spans.length,
  };
}

/**
 * Hours per week of the month — the delivery-rhythm strip.
 *
 * Weekly rather than daily: at the studio's volume a 31-bar daily strip is 30
 * empty bars, and an empty chart says nothing.
 *
 * "Week" here means a fixed 7-day block from the 1st (1–7, 8–14, …, 29–end),
 * NOT a Monday-anchored calendar week. Monday anchoring puts July dates on an
 * August report and can produce six buckets with a two-day stub at each end;
 * day blocks give every month exactly five, all inside the month, which is
 * what a reader of a monthly report expects.
 */
const WEEK_BLOCK_DAYS = 7;

function foldWeeks(rows: TaskListRow[], month: string): WeekBarRow[] {
  const window = vancouverMonthWindow(month);
  if (!window) return [];
  // The month's last day number: one day back from the exclusive bound.
  const lastDay = Number(
    shiftDayKey(vancouverDayKey(window.until), -1).slice(8),
  );
  const blocks = Math.ceil(lastDay / WEEK_BLOCK_DAYS);

  const buckets = Array.from({ length: blocks }, (_, i) => {
    const startDay = i * WEEK_BLOCK_DAYS + 1;
    return {
      startDay,
      endDay: Math.min(startDay + WEEK_BLOCK_DAYS - 1, lastDay),
      minutes: 0,
      tasks: 0,
    };
  });

  for (const row of rows) {
    if (!row.completedAt) continue;
    const day = Number(vancouverDayKey(row.completedAt).slice(8));
    const bucket = buckets[Math.floor((day - 1) / WEEK_BLOCK_DAYS)];
    if (!bucket) continue;
    bucket.minutes += row.actualMinutes ?? row.estimatedMinutes;
    bucket.tasks += 1;
  }

  const max = Math.max(0, ...buckets.map((b) => b.minutes));
  const pad = (day: number) => `${month}-${String(day).padStart(2, '0')}`;
  return buckets.map((bucket, index) => ({
    key: pad(bucket.startDay),
    label: `Week ${index + 1}`,
    rangeLabel:
      bucket.startDay === bucket.endDay
        ? shortDayLabel(pad(bucket.startDay))
        : // 'Aug 8 – 14' — the month is already established by the first half,
          // so repeating it in the second is noise on a five-column strip.
          `${shortDayLabel(pad(bucket.startDay))} – ${bucket.endDay}`,
    hoursLabel: bucket.minutes > 0 ? formatMinutes(bucket.minutes) : '—',
    tasks: bucket.tasks,
    pct: pctOf(bucket.minutes, max),
    busiest: bucket.minutes > 0 && bucket.minutes === max,
  }));
}

/**
 * Admin-only diagnostics — never read by print or share. These are the
 * numbers that tell the studio how it is doing, which is exactly why they
 * don't travel: on-time delivery reads 0% while backfilled rows are in the
 * window, and estimate drift is a statement about internal discipline.
 */
export type ReadinessCheck = {
  id: string;
  label: string;
  /** What to do about it — the check is useless without the next step. */
  hint: string;
};

/**
 * The pre-send checklist: what would make this month read badly if it went out
 * right now. Every input is already in hand, so this costs no query.
 *
 * Admin-only by construction, like InternalKpiPanel — its renderer takes no
 * `tone`, so it cannot reach the print page or a share link. That matters:
 * "3 tasks have no deliverable link" is a note to ourselves, not something a
 * client should read on their own report.
 *
 * Deliberately NOT checked: missing hours. The →done door coalesces
 * `provided ?? actual ?? estimate`, so a delivered row always has a number —
 * a check that can never fire is worse than no check, because its silence
 * reads as a pass. `internalKpis.driftHint` already flags the real version of
 * that worry (hours waved through at the estimate).
 */
export function foldReadiness({
  rows,
  note,
  retainerMinutes,
  open,
}: {
  rows: TaskListRow[];
  note: string;
  retainerMinutes: number | null;
  /** Null when viewing a past month — live state can't be checked there. */
  open: ClientOpenSnapshot | null;
}): ReadinessCheck[] {
  const checks: ReadinessCheck[] = [];

  if (open && open.awaitingApproval > 0) {
    const n = open.awaitingApproval;
    checks.push({
      id: 'awaiting',
      label: `${n} task${n === 1 ? '' : 's'} still awaiting sign-off`,
      hint: 'Delivered work only counts once it is marked done — these are missing from the totals below.',
    });
  }

  const linkless = rows.filter((row) => !row.deliverableUrl).length;
  if (rows.length > 0 && linkless > 0) {
    checks.push({
      id: 'links',
      label: `${linkless} of ${rows.length} delivered without a link`,
      hint: 'The delivered-work table can point at the actual file — worth adding before this goes out.',
    });
  }

  if (rows.length > 0 && !note) {
    checks.push({
      id: 'note',
      label: 'No highlights written',
      hint: 'A line or two of context is the difference between a report and a spreadsheet.',
    });
  }

  if (retainerMinutes === null) {
    checks.push({
      id: 'retainer',
      label: 'No retainer target set',
      hint: 'Without one there is nothing to measure the month against, so the burn bar stays blank.',
    });
  }

  return checks;
}

function foldInternalKpis(rows: TaskListRow[], totalMinutes: number) {
  const withDue = rows.filter((row) => row.dueDate && row.completedAt);
  const onTime = withDue.filter(
    // Lexical compare on YYYY-MM-DD via the Vancouver key, matching dueState
    // and the completedLabel rule — a bare Intl format would call a 9pm PT
    // completion "tomorrow" on the UTC production server.
    (row) => vancouverDayKey(row.completedAt!) <= row.dueDate!,
  ).length;

  // Only rows whose hours were actually confirmed say anything about drift;
  // a row still carrying its estimate as `actual` would report a perfect 0%.
  const confirmed = rows.filter((row) => row.actualMinutes !== null);
  const estimated = confirmed.reduce((sum, r) => sum + r.estimatedMinutes, 0);
  const actual = confirmed.reduce((sum, r) => sum + (r.actualMinutes ?? 0), 0);
  const driftPct =
    estimated === 0 ? 0 : Math.round(((actual - estimated) / estimated) * 100);
  const matching = confirmed.filter(
    (r) => r.actualMinutes === r.estimatedMinutes,
  ).length;

  return {
    onTimeLabel: withDue.length
      ? `${onTime} of ${withDue.length} on time`
      : '',
    onTimePct: withDue.length ? Math.round((onTime / withDue.length) * 100) : 0,
    noDueDates: rows.length - withDue.length,
    driftLabel: confirmed.length
      ? driftPct === 0
        ? 'on estimate'
        : `${driftPct > 0 ? '+' : '−'}${Math.abs(driftPct)}% vs estimate`
      : '',
    // Every confirmed row matching its estimate exactly means hours are being
    // waved through, not tracked — worth saying out loud rather than dressing
    // up as perfect accuracy.
    driftHint: confirmed.length
      ? matching === confirmed.length
        ? `${matching} of ${confirmed.length} logged exactly their estimate`
        : `${confirmed.length} task${confirmed.length === 1 ? '' : 's'} with confirmed hours`
      : '',
    totalMinutes,
  };
}

export type InternalKpis = ReturnType<typeof foldInternalKpis>;

/** '+3 vs July' / '−2 vs July' / 'same as July' — the tile hints. */
function countDelta(diff: number, prevLabel: string): string {
  if (diff === 0) return `same as ${prevLabel}`;
  return `${diff > 0 ? '+' : '−'}${Math.abs(diff)} vs ${prevLabel}`;
}

function minutesDelta(diff: number, prevLabel: string): string {
  if (diff === 0) return `same as ${prevLabel}`;
  // Through formatMinutes like every other hours string on the page — this
  // line used to bypass it and render a 20-minute delta as "+0.33 h".
  return `${diff > 0 ? '+' : '−'}${formatMinutes(Math.abs(diff))} vs ${prevLabel}`;
}

/** Recent `count` months (newest first) as picker options. */
export function recentMonths(count: number, now: Date): MonthOption[] {
  const current = monthToken(now);
  return Array.from({ length: count }, (_, i) => {
    const token = shiftMonthToken(current, -i);
    return { value: token, label: monthLabel(token) };
  });
}

/** The trailing 12 calendar months ending at `month`, oldest first. */
function trendMonths(month: string): string[] {
  return Array.from({ length: 12 }, (_, i) => shiftMonthToken(month, i - 11));
}

/** Bucket done slices into the given months (Vancouver calendar, folded in
 *  JS — the calendar-door rule). Bars scale to the busiest month. */
function foldTrend(
  slices: DoneSlice[],
  months: string[],
  selected: string,
): TrendBarRow[] {
  const byMonth = new Map(months.map((m) => [m, 0]));
  for (const slice of slices) {
    if (!slice.completedAt) continue;
    const token = vancouverDayKey(slice.completedAt).slice(0, 7);
    const prev = byMonth.get(token);
    if (prev !== undefined) {
      byMonth.set(
        token,
        prev + (slice.actualMinutes ?? slice.estimatedMinutes),
      );
    }
  }
  const max = Math.max(0, ...byMonth.values());
  return months.map((token) => {
    const minutes = byMonth.get(token) ?? 0;
    return {
      month: token,
      label: monthLabel(token),
      hoursLabel: minutes > 0 ? formatMinutes(minutes) : '—',
      pct: pctOf(minutes, max),
      current: token === selected,
    };
  });
}

/**
 * The 12-month delivery trend ending at `month`. `clientId`: uuid → that
 * client, `'internal'` → null-client studio work, omitted → studio-wide
 * (the roster page). Returns [] only on a malformed month.
 */
export async function buildTrend(
  month: string,
  clientId?: string,
): Promise<TrendBarRow[]> {
  const months = trendMonths(month);
  const window = vancouverMonthWindow(months[0]);
  if (!window) return [];
  const slices = await listDoneSlices({ clientId, since: window.since });
  return foldTrend(slices, months, month);
}

/** Everything a month's rows fold into — shared by the client and internal
 *  builders so their sections can't drift. */
function assembleMonthSections({
  rows,
  prevRows,
  activityDates,
  avatars,
  month,
  currentMonth,
  todayKey,
}: {
  rows: TaskListRow[];
  prevRows: TaskListRow[];
  activityDates: Date[];
  avatars: Map<string, ReturnType<typeof resolveAdminAvatar>>;
  month: string;
  currentMonth: string;
  todayKey: string;
}) {
  const totals = foldMonthTotals(
    rows.map((row) => ({
      minutes: row.actualMinutes ?? row.estimatedMinutes,
      categorySlug: row.categorySlug,
      categoryName: row.categoryName,
      siteCategory: row.siteCategory,
      assigneeId: row.assigneeId,
      assigneeName: row.assigneeName,
    })),
  );

  // Site categories with hours, largest first; fine categories nest beneath.
  const categoryGroups: CategoryBarGroup[] = (
    Object.entries(totals.bySiteCategory) as [
      keyof typeof totals.bySiteCategory,
      number,
    ][]
  )
    .filter(([, minutes]) => minutes > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([siteCategory, minutes]) => ({
      label: PROJECT_CATEGORY_LABELS[siteCategory],
      hoursLabel: formatMinutes(minutes),
      pct: pctOf(minutes, totals.totalMinutes),
      // The true share, unclamped — `pct` above drives the bar (with its 2%
      // visibility floor), this drives the text beside it.
      sharePct: sharePct(minutes, totals.totalMinutes),
      fine: totals.byCategory
        .filter((c) => c.siteCategory === siteCategory)
        .map((c) => ({
          label: c.name,
          hoursLabel: formatMinutes(c.minutes),
          pct: pctOf(c.minutes, totals.totalMinutes),
          sharePct: sharePct(c.minutes, totals.totalMinutes),
        })),
    }));

  const topMemberMinutes = totals.byMember[0]?.minutes ?? 0;
  const memberRows: MemberBarRow[] = totals.byMember.map((member) => ({
    // Same identity key the fold used — names alone can collide (a departed
    // member's snapshot line + a same-named live account).
    key: member.assigneeId ?? `name:${member.assigneeName}`,
    name: member.assigneeName,
    avatar:
      (member.assigneeId ? avatars.get(member.assigneeId) : null) ?? null,
    tasksLabel: `${member.tasks} task${member.tasks === 1 ? '' : 's'}`,
    hoursLabel: formatMinutes(member.minutes),
    // Bar stays scaled to the top contributor (a full bar reads as "most of
    // the work"); the share is the honest fraction of the month.
    pct: pctOf(member.minutes, topMemberMinutes),
    sharePct: sharePct(member.minutes, totals.totalMinutes),
  }));

  const tasks: ReportTaskItem[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    deliverableUrl: row.deliverableUrl ?? '',
    categoryLabel: row.categoryName,
    assigneeName: row.assigneeName,
    hoursLabel: formatMinutes(row.actualMinutes ?? row.estimatedMinutes),
    // Vancouver day key, not a bare Intl format — a UTC server would label
    // evening completions as the next day, contradicting the month window
    // that selected the row (client-facing on the print PDF).
    completedLabel: row.completedAt
      ? dueDateLabel(vancouverDayKey(row.completedAt), todayKey)
      : '',
  }));

  // Months with any completed work, plus the current and selected months so
  // navigation never strands; newest first.
  const monthSet = new Set<string>([currentMonth, month]);
  for (const date of activityDates) monthSet.add(monthToken(date));
  const monthOptions = [...monthSet]
    .sort()
    .reverse()
    .map((token) => ({ value: token, label: monthLabel(token) }));

  const prevMinutes = prevRows.reduce(
    (sum, row) => sum + (row.actualMinutes ?? row.estimatedMinutes),
    0,
  );
  // 'July', year implied — a delta always compares adjacent months.
  const prevLabel = monthLabel(shiftMonthToken(month, -1)).split(' ')[0];

  const turnaround = foldTurnaround(rows);
  const deliverables = rows.filter((row) => row.deliverableUrl).length;

  return {
    totals,
    categoryGroups,
    categoryTotalLabel: formatMinutes(totals.totalMinutes),
    memberRows,
    tasks,
    monthOptions,
    weeks: foldWeeks(rows, month),
    // No tile — the field is barely used yet, so the delivered-work table
    // shows a count line only once it starts carrying links.
    deliverables,
    internalKpis: foldInternalKpis(rows, totals.totalMinutes),
    tiles: {
      tasksCompleted: totals.taskCount,
      totalHoursLabel: formatMinutes(totals.totalMinutes),
      membersInvolved: totals.byMember.length,
      hoursWorkdays: formatWorkDays(totals.totalMinutes),
      turnaroundLabel: turnaround.label,
      turnaroundHint: turnaround.sample
        ? `across ${turnaround.sample} task${turnaround.sample === 1 ? '' : 's'}`
        : '',
      tasksDelta: countDelta(totals.taskCount - prevRows.length, prevLabel),
      hoursDelta: minutesDelta(totals.totalMinutes - prevMinutes, prevLabel),
    },
  };
}

export async function buildClientMonthReport(
  slug: string,
  rawMonth: string,
): Promise<ClientMonthReport | null> {
  // listAssigneeOptions needs nothing from the client row, so it starts
  // before the slug→id hop instead of behind it — the hop is otherwise a
  // serialized neon-http round trip ahead of the whole query batch. The
  // .catch marker keeps a failed read from surfacing as an unhandled
  // rejection when the slug misses and we return early.
  const assigneesPromise = listAssigneeOptions();
  assigneesPromise.catch(() => {});
  const client = await getReportClientBySlug(slug);
  if (!client) return null;
  return buildReportForClient(client, rawMonth, assigneesPromise);
}

/** The share page's entry point — a token row holds client_id, not a slug.
 *  Same assembly, so the shared page shows exactly what the dashboard
 *  showed. */
export async function buildClientMonthReportById(
  clientId: string,
  rawMonth: string,
): Promise<ClientMonthReport | null> {
  const assigneesPromise = listAssigneeOptions();
  assigneesPromise.catch(() => {});
  const client = await getReportClientById(clientId);
  if (!client) return null;
  return buildReportForClient(client, rawMonth, assigneesPromise);
}

async function buildReportForClient(
  client: ReportClient,
  rawMonth: string,
  assigneesPromise: ReturnType<typeof listAssigneeOptions>,
): Promise<ClientMonthReport | null> {
  const now = new Date();
  const currentMonth = monthToken(now);
  const todayKey = vancouverDayKey(now);
  const month = parseMonthToken(rawMonth) || currentMonth;
  const window = vancouverMonthWindow(month);
  if (!window) return null;

  // Previous Vancouver month — one extra query buys the tiles' deltas.
  const prevMonth = shiftMonthToken(month, -1);
  const prevWindow = vancouverMonthWindow(prevMonth);

  // Open work is present-tense, so it's only fetched (and only rendered) on
  // the current month — a March report showing today's backlog would be a
  // category error, and on a shared link an actively misleading one.
  const isCurrent = month === currentMonth;

  const [rows, activityDates, assignees, prevRows, note, trend, open] =
    await Promise.all([
      listClientMonthTasks(client.id, window),
      listClientActivityDates(client.id),
      assigneesPromise,
      prevWindow
        ? listClientMonthTasks(client.id, prevWindow)
        : Promise.resolve([]),
      getReportNote(client.id, month),
      buildTrend(month, client.id),
      isCurrent ? listClientOpenSnapshot(client.id) : Promise.resolve(null),
    ]);
  // Faces for the member bars (deleted accounts miss the map → initials).
  const avatars = new Map(assignees.map((a) => [a.id, resolveAdminAvatar(a)]));

  const sections = assembleMonthSections({
    rows,
    prevRows,
    activityDates,
    avatars,
    month,
    currentMonth,
    todayKey,
  });

  const retainer =
    client.retainerMinutes === null
      ? null
      : {
          usedLabel: formatMinutes(sections.totals.totalMinutes),
          targetLabel: formatMinutes(client.retainerMinutes),
          pct: Math.min(
            100,
            Math.round(
              (sections.totals.totalMinutes / client.retainerMinutes) * 100,
            ),
          ),
          overLabel:
            sections.totals.totalMinutes > client.retainerMinutes
              ? `+${formatMinutes(sections.totals.totalMinutes - client.retainerMinutes)} over`
              : '',
        };

  return {
    client,
    month,
    monthLabelText: monthLabel(month),
    currentMonth,
    monthOptions: sections.monthOptions,
    tiles: sections.tiles,
    categoryGroups: sections.categoryGroups,
    categoryTotalLabel: sections.categoryTotalLabel,
    memberRows: sections.memberRows,
    weeks: sections.weeks,
    deliverables: sections.deliverables,
    retainer,
    tasks: sections.tasks,
    trend,
    note,
    open,
    internalKpis: sections.internalKpis,
    readiness: foldReadiness({
      rows,
      note,
      retainerMinutes: client.retainerMinutes,
      open,
    }),
  };
}

/** The internal (null-client) month report for /admin/reports/internal —
 *  same folds as the client report over tasksWhere's 'internal' sentinel. */
export async function buildInternalMonthReport(
  rawMonth: string,
): Promise<InternalMonthReport | null> {
  const now = new Date();
  const currentMonth = monthToken(now);
  const todayKey = vancouverDayKey(now);
  const month = parseMonthToken(rawMonth) || currentMonth;
  const window = vancouverMonthWindow(month);
  if (!window) return null;

  const prevWindow = vancouverMonthWindow(shiftMonthToken(month, -1));

  const isCurrent = month === currentMonth;

  const [rows, activityDates, assignees, prevRows, trend, open] =
    await Promise.all([
      listClientMonthTasks('internal', window),
      listClientActivityDates('internal'),
      listAssigneeOptions(),
      prevWindow
        ? listClientMonthTasks('internal', prevWindow)
        : Promise.resolve([]),
      buildTrend(month, 'internal'),
      isCurrent ? listClientOpenSnapshot('internal') : Promise.resolve(null),
    ]);
  const avatars = new Map(assignees.map((a) => [a.id, resolveAdminAvatar(a)]));

  const sections = assembleMonthSections({
    rows,
    prevRows,
    activityDates,
    avatars,
    month,
    currentMonth,
    todayKey,
  });

  return {
    month,
    monthLabelText: monthLabel(month),
    currentMonth,
    monthOptions: sections.monthOptions,
    tiles: sections.tiles,
    categoryGroups: sections.categoryGroups,
    categoryTotalLabel: sections.categoryTotalLabel,
    memberRows: sections.memberRows,
    weeks: sections.weeks,
    tasks: sections.tasks,
    trend,
    open,
    internalKpis: sections.internalKpis,
  };
}
