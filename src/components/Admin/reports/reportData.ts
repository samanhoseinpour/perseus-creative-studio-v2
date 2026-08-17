import {
  getReportClientById,
  getReportClientBySlug,
  getReportNote,
  listAssigneeOptions,
  listClientActivityDates,
  listClientMonthTasks,
  listDoneSlices,
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
  shiftMonthToken,
  vancouverDayKey,
  vancouverMonthWindow,
} from '@/lib/taskFilters';
import { PROJECT_CATEGORY_LABELS } from '@/lib/portfolioFields';
import { dueDateLabel, monthLabel } from '@/components/Admin/tasks/format';
import type {
  CategoryBarGroup,
  MemberBarRow,
  ReportTaskItem,
  TrendBarRow,
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
  tasks: ReportTaskItem[];
  trend: TrendBarRow[];
};

/** Slivers stay visible; zero stays zero. */
const pctOf = (minutes: number, total: number): number =>
  minutes === 0 || total === 0
    ? 0
    : Math.max(2, Math.round((minutes / total) * 100));

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
      fine: totals.byCategory
        .filter((c) => c.siteCategory === siteCategory)
        .map((c) => ({
          label: c.name,
          hoursLabel: formatMinutes(c.minutes),
          pct: pctOf(c.minutes, totals.totalMinutes),
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
    pct: pctOf(member.minutes, topMemberMinutes),
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
  return {
    totals,
    categoryGroups,
    categoryTotalLabel: formatMinutes(totals.totalMinutes),
    memberRows,
    tasks,
    monthOptions,
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

  const [rows, activityDates, assignees, prevRows, note, trend] =
    await Promise.all([
      listClientMonthTasks(client.id, window),
      listClientActivityDates(client.id),
      assigneesPromise,
      prevWindow
        ? listClientMonthTasks(client.id, prevWindow)
        : Promise.resolve([]),
      getReportNote(client.id, month),
      buildTrend(month, client.id),
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
    retainer,
    tasks: sections.tasks,
    trend,
    note,
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

  const [rows, activityDates, assignees, prevRows, trend] = await Promise.all([
    listClientMonthTasks('internal', window),
    listClientActivityDates('internal'),
    listAssigneeOptions(),
    prevWindow
      ? listClientMonthTasks('internal', prevWindow)
      : Promise.resolve([]),
    buildTrend(month, 'internal'),
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
    tasks: sections.tasks,
    trend,
  };
}
