import {
  getReportClientById,
  getReportClientBySlug,
  getReportNote,
  listAssigneeOptions,
  listClientActivityDates,
  listClientMonthTasks,
  listClientOpenSnapshot,
  listDoneSlices,
  parentTitlesFor,
  type ClientOpenSnapshot,
  type DoneSlice,
  type ReportClient,
  type TaskListRow,
} from '@/db/taskQueries';
import { resolveAdminAvatar } from '@/lib/adminIdentity';
import {
  foldMonthTotals,
  foldRevisionChains,
  formatDayspan,
  formatMinutes,
  formatWorkDays,
  linkLabelFor,
  SHIPPED_STATUSES,
  TASK_STATUS_LABELS,
} from '@/lib/taskFields';
import { assigneeNames } from '@/lib/taskAssigneeFields';
import {
  dayKeyIn,
  daysBetweenDayKeys,
  monthTokenIn,
  monthWindowIn,
  parseMonthToken,
  shiftDayKey,
  shiftMonthToken,
} from '@/lib/calendar';
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
import type { MonthOption } from '@/components/Admin/MonthSwitcher';

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
    /** DELIVERABLES completed in the month — never the raw row count. */
    tasksCompleted: number;
    /** '2 revisions included', '' when there were none. Client-safe for the
     *  same reason `hoursWorkdays` is: it interprets the number above it
     *  rather than judging anyone, and without it "1 video · 6h 45m" reads
     *  as an arithmetic error. Travels to print and /share. */
    revisionsLabel: string;
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
  /** Whether the month holds any delivered work at all. NOT the deliverable
   *  count: a month whose only work was a revision round on an earlier
   *  delivery has real hours and real bars, and gating on deliveries printed
   *  "Nothing delivered" over all of it. */
  hasWork: boolean;
  categoryGroups: CategoryBarGroup[];
  categoryTotalLabel: string;
  memberRows: MemberBarRow[];
  /** Hours per 7-day block of the month — the delivery-rhythm strip. */
  weeks: WeekBarRow[];
  /** How many of the month's tasks shipped with a deliverable link. */
  deliverables: number;
  /** "12 posted · 4 delivered · 2 done", ladder order, zero stages omitted.
   *  '' when the month has no work, so a caller can render it unconditionally
   *  and get nothing rather than an empty sentence. */
  stageSummary: string;
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
  hasWork: ClientMonthReport['hasWork'];
  categoryGroups: CategoryBarGroup[];
  categoryTotalLabel: string;
  memberRows: MemberBarRow[];
  weeks: WeekBarRow[];
  tasks: ReportTaskItem[];
  trend: TrendBarRow[];
  open: ClientOpenSnapshot | null;
  internalKpis: InternalKpis;
  stageSummary: string;
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

/**
 * A DELIVERABLE — the thing a client actually received. A revision round is a
 * linked row with its own hours and its own completion day, so its minutes
 * belong in every total, but counting it as a second delivered thing is what
 * made a one-video month read as three.
 *
 * Declared once and used by every fold below, so "delivered" cannot come to
 * mean two different things on two tiles of the same report.
 */
const isDeliverable = (row: { parentId: string | null }) => row.parentId === null;

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
 * it was delivered. Both sides are day keys in the reader's zone, so this is honest
 * calendar time with no instant-vs-timezone trap — and day granularity is the
 * right resolution, since `start_date` is a calendar column with no clock.
 */
function foldTurnaround(tz: string, rows: TaskListRow[]): {
  label: string;
  sample: number;
} {
  const spans: number[] = [];
  for (const row of rows) {
    if (!row.completedAt) continue;
    // Deliverables only. A revision is a short follow-up on work that already
    // shipped, so its own start→done span is near zero and says nothing about
    // how long the studio takes — a month with three 15-minute fixes would
    // report a turnaround of "same day" for a video that took a fortnight.
    if (!isDeliverable(row)) continue;
    const from = row.startDate ?? dayKeyIn(tz, row.createdAt);
    const days = daysBetweenDayKeys(from, dayKeyIn(tz, row.completedAt));
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

function foldWeeks(tz: string, rows: TaskListRow[], month: string): WeekBarRow[] {
  const window = monthWindowIn(tz, month);
  if (!window) return [];
  // The month's last day number: one day back from the exclusive bound.
  const lastDay = Number(
    shiftDayKey(dayKeyIn(tz, window.until), -1).slice(8),
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
    const day = Number(dayKeyIn(tz, row.completedAt).slice(8));
    const bucket = buckets[Math.floor((day - 1) / WEEK_BLOCK_DAYS)];
    if (!bucket) continue;
    // Hours take every row, the count deliverables only — the strip's bar
    // height is minutes, so a revision still shows up as effort in its week.
    bucket.minutes += row.actualMinutes ?? row.estimatedMinutes;
    if (isDeliverable(row)) bucket.tasks += 1;
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
      hint: 'Work counts from the moment it is marked done, and keeps counting through Delivered and Posted. These have not reached done yet, so they are missing from the totals below.',
    });
  }

  // Deliverables, not rows: a revision is a change to something already
  // linked, so counting it here would ask for a second URL to the same file.
  const delivered = rows.filter(isDeliverable);
  const linkless = delivered.filter(
    (row) => row.deliverableLinks.length === 0,
  ).length;
  if (delivered.length > 0 && linkless > 0) {
    checks.push({
      id: 'links',
      label: `${linkless} of ${delivered.length} delivered without a link`,
      hint: 'The delivered-work table can point at the actual file, worth adding before this goes out.',
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

function foldInternalKpis(tz: string, rows: TaskListRow[], totalMinutes: number) {
  // Both KPIs read DELIVERABLES. A revision inherits no deadline of its own
  // and is typically finished the day it is asked for, so counting revisions
  // would inflate the on-time rate with rows that were never at risk — the
  // opposite of what an internal honesty check is for.
  const delivered = rows.filter(isDeliverable);
  const withDue = delivered.filter((row) => row.dueDate && row.completedAt);
  const onTime = withDue.filter(
    // Lexical compare on YYYY-MM-DD via the reader's day key, matching
    // dueState and the completedLabel rule — a bare Intl format would call a
    // 9pm completion "tomorrow" on the UTC production server.
    (row) => dayKeyIn(tz, row.completedAt!) <= row.dueDate!,
  ).length;

  // Only rows whose hours were actually confirmed say anything about drift;
  // a row still carrying its estimate as `actual` would report a perfect 0%.
  const confirmed = delivered.filter((row) => row.actualMinutes !== null);
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
    noDueDates: delivered.length - withDue.length,
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
export function recentMonths(tz: string, count: number, now: Date): MonthOption[] {
  const current = monthTokenIn(tz, now);
  return Array.from({ length: count }, (_, i) => {
    const token = shiftMonthToken(current, -i);
    return { value: token, label: monthLabel(token) };
  });
}

/** The trailing 12 calendar months ending at `month`, oldest first. */
function trendMonths(month: string): string[] {
  return Array.from({ length: 12 }, (_, i) => shiftMonthToken(month, i - 11));
}

/** Bucket done slices into the given months (the reader's calendar, folded in
 *  JS — the calendar-door rule). Bars scale to the busiest month. */
function foldTrend(
  tz: string,
  slices: DoneSlice[],
  months: string[],
  selected: string,
): TrendBarRow[] {
  const byMonth = new Map(months.map((m) => [m, 0]));
  for (const slice of slices) {
    if (!slice.completedAt) continue;
    const token = dayKeyIn(tz, slice.completedAt).slice(0, 7);
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
  tz: string,
  month: string,
  clientId?: string,
): Promise<TrendBarRow[]> {
  const months = trendMonths(month);
  const window = monthWindowIn(tz, months[0]);
  if (!window) return [];
  const slices = await listDoneSlices({ clientId, since: window.since });
  return foldTrend(tz, slices, months, month);
}

/** Everything a month's rows fold into — shared by the client and internal
 *  builders so their sections can't drift. */
async function assembleMonthSections({
  tz,
  clientId,
  rows,
  prevRows,
  activityDates,
  avatars,
  month,
  currentMonth,
  todayKey,
}: {
  /** The reader's zone — every day/month boundary below resolves in it. */
  tz: string;
  /** Whose report this is, or the 'internal' sentinel. Used only to scope the
   *  parent-title lookup for a round whose original is outside the month. */
  clientId: string;
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
      assignees: row.assignees,
      parentId: row.parentId,
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
    // Deliverables, with the rounds behind them named rather than folded in —
    // "8 tasks · 2 revisions" beats both "10 tasks" (wrong) and "8 tasks"
    // (silently short of the hours beside it).
    tasksLabel:
      `${member.tasks} task${member.tasks === 1 ? '' : 's'}` +
      (member.revisions > 0 ? ` · ${member.revisions} revision${member.revisions === 1 ? '' : 's'}` : ''),
    hoursLabel: formatMinutes(member.minutes),
    // Bar stays scaled to the top contributor (a full bar reads as "most of
    // the work"); the share is the honest fraction of the month.
    pct: pctOf(member.minutes, topMemberMinutes),
    sharePct: sharePct(member.minutes, totals.totalMinutes),
  }));

  // ONE line per deliverable, carrying the hours of every round folded into
  // it. A client who received one video and asked for two changes was shown
  // three near-identical rows directly under a tile reading "1 task
  // completed"; this is the fold that makes the table agree with its headline.
  //
  // Deliberately the LAST thing this function does with `rows`. Every fold
  // above (the tiles, turnaround, the week strip, readiness, the internal
  // KPIs) still reads the raw rows through `isDeliverable`, so not one figure
  // on the page moves — `foldRevisionChains` conserves minutes, so the Hours
  // column still sums to the tile above it.
  const groups = foldRevisionChains(
    rows.map((row) => ({
      row,
      id: row.id,
      parentId: row.parentId,
      minutes: row.actualMinutes ?? row.estimatedMinutes,
      completedAt: row.completedAt,
    })),
  );

  // A round whose original shipped in an earlier month heads its own line, so
  // it has to say what it revises rather than pass for a delivery. Only those
  // ids are looked up, so an ordinary month pays no extra round trip at all.
  const orphanParentIds = groups.flatMap((group) =>
    group.root.parentId ? [group.root.parentId] : [],
  );
  const parentTitles = await parentTitlesFor(orphanParentIds, clientId);

  const tasks: ReportTaskItem[] = groups.map((group) => {
    const rowsInChain = [group.root, ...group.rounds].map((e) => e.row);
    const root = group.root.row;
    // Deduped by URL: a round that re-delivered the same file would otherwise
    // list it twice. Every link is kept and none is capped, because the client
    // cannot expand a fold to reach a file they were sent.
    const links = new Map(
      rowsInChain.flatMap((row) =>
        row.deliverableLinks.map(
          (link) => [link.url, { url: link.url, label: linkLabelFor(link) }] as const,
        ),
      ),
    );
    // Everyone who touched the chain, on the same identity key the member fold
    // uses — names alone collide (a departed member's snapshot line beside a
    // same-named live account). A member who only did the round is still on
    // the line; being left off work you did reads as a mistake.
    const people = new Map(
      rowsInChain.flatMap((row) =>
        row.assignees.map((who) => [who.id ?? `name:${who.name}`, who] as const),
      ),
    );
    return {
      id: root.id,
      title: root.title,
      // Names resolved HERE, not at the render site: ReportSections draws the
      // dashboard, the print sheet and the /share page from this one builder,
      // so a label computed downstream could differ between them.
      links: [...links.values()],
      categoryLabel: root.categoryName,
      // The cell is width-capped where it renders, so a long crew truncates
      // rather than reflowing the sheet.
      assigneeName: assigneeNames([...people.values()]),
      hoursLabel: formatMinutes(group.minutes),
      // A day key, not a bare Intl format — a UTC server would label evening
      // completions as the next day, contradicting the month window that
      // selected the row (client-facing on the print PDF).
      completedLabel: group.completedAt
        ? dueDateLabel(dayKeyIn(tz, group.completedAt), todayKey)
        : '',
      revisionCount: group.rounds.length,
      // '' unless this line IS a round with no original in the month. The
      // parent title comes back empty when it belongs to another account or
      // has since been deleted, which renders as an ordinary line rather than
      // a half-finished sentence.
      revisionOf: root.parentId
        ? (parentTitles.get(root.parentId) ?? '')
        : '',
      // The ROOT's stage, not the chain's furthest: a line is one deliverable,
      // and the rounds folded into it are corrections to that same thing.
      stageLabel: TASK_STATUS_LABELS[root.status],
    };
  });

  // "18 posted · 6 delivered · 4 done", ladder order, and a stage with nothing
  // in it is OMITTED rather than printed as a zero — the deliverables caption's
  // rule, and on a sheet a client reads "0 posted" is a worse thing to say
  // than nothing at all. Folded over the same rows already in hand, so it
  // costs no query (the TagMixStrip discipline).
  const stageCounts = new Map<string, number>();
  for (const task of tasks) {
    stageCounts.set(task.stageLabel, (stageCounts.get(task.stageLabel) ?? 0) + 1);
  }
  const stageSummary = SHIPPED_STATUSES.map((slug) => {
    const label = TASK_STATUS_LABELS[slug];
    const n = stageCounts.get(label) ?? 0;
    return n > 0 ? `${n} ${label.toLowerCase()}` : null;
  })
    .filter((part): part is string => part !== null)
    .reverse()
    .join(' · ');

  // Months with any completed work, plus the current and selected months so
  // navigation never strands; newest first.
  const monthSet = new Set<string>([currentMonth, month]);
  for (const date of activityDates) monthSet.add(monthTokenIn(tz, date));
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

  const turnaround = foldTurnaround(tz, rows);
  // Counted over the FOLDED lines, so the caption's two halves finally count
  // the same thing: it reads "N of M" against the rows actually on screen.
  // Against the raw rows the numerator excluded revisions while the
  // denominator (`tasks.length`) included them.
  const deliverables = tasks.filter((task) => task.links.length > 0).length;
  // The previous month's DELIVERABLE count — `prevRows.length` would compare
  // this month's deliverables against last month's raw rows and report a fall
  // that never happened.
  const prevDelivered = prevRows.filter(isDeliverable).length;

  return {
    totals,
    // Whether the month holds any delivered WORK, which is not the same
    // question as whether it holds a delivery. Every surface used to gate its
    // whole body on the deliverable count, so a month whose only work was a
    // round on an earlier delivery rendered "Nothing delivered" over real
    // hours, real member bars and real category bars. Derived once here so the
    // four surfaces cannot drift.
    hasWork: totals.totalMinutes > 0,
    categoryGroups,
    categoryTotalLabel: formatMinutes(totals.totalMinutes),
    memberRows,
    tasks,
    monthOptions,
    weeks: foldWeeks(tz, rows, month),
    // No tile — the field is barely used yet, so the delivered-work table
    // shows a count line only once it starts carrying links.
    deliverables,
    stageSummary,
    internalKpis: foldInternalKpis(tz, rows, totals.totalMinutes),
    tiles: {
      tasksCompleted: totals.taskCount,
      // '' at zero, so the tile stays a single number on the overwhelming
      // majority of months and only grows a second line when it has something
      // to say. Client-safe: a client knowing they asked for two rounds is
      // their own fact, and it is the sentence that makes "1 video · 6h 45m"
      // add up on the page.
      revisionsLabel:
        totals.revisionCount > 0
          ? `${totals.revisionCount} revision${totals.revisionCount === 1 ? '' : 's'} included`
          : '',
      totalHoursLabel: formatMinutes(totals.totalMinutes),
      membersInvolved: totals.byMember.length,
      hoursWorkdays: formatWorkDays(totals.totalMinutes),
      turnaroundLabel: turnaround.label,
      turnaroundHint: turnaround.sample
        ? `across ${turnaround.sample} task${turnaround.sample === 1 ? '' : 's'}`
        : '',
      tasksDelta: countDelta(totals.taskCount - prevDelivered, prevLabel),
      hoursDelta: minutesDelta(totals.totalMinutes - prevMinutes, prevLabel),
    },
  };
}

export async function buildClientMonthReport(
  tz: string,
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
  return buildReportForClient(tz, client, rawMonth, assigneesPromise);
}

/** The share page's entry point — a token row holds client_id, not a slug.
 *  Same assembly, so the shared page shows exactly what the dashboard
 *  showed. */
export async function buildClientMonthReportById(
  tz: string,
  clientId: string,
  rawMonth: string,
): Promise<ClientMonthReport | null> {
  const assigneesPromise = listAssigneeOptions();
  assigneesPromise.catch(() => {});
  const client = await getReportClientById(clientId);
  if (!client) return null;
  return buildReportForClient(tz, client, rawMonth, assigneesPromise);
}

async function buildReportForClient(
  tz: string,
  client: ReportClient,
  rawMonth: string,
  assigneesPromise: ReturnType<typeof listAssigneeOptions>,
): Promise<ClientMonthReport | null> {
  const now = new Date();
  const currentMonth = monthTokenIn(tz, now);
  const todayKey = dayKeyIn(tz, now);
  const month = parseMonthToken(rawMonth) || currentMonth;
  const window = monthWindowIn(tz, month);
  if (!window) return null;

  // Previous month — one extra query buys the tiles' deltas.
  const prevMonth = shiftMonthToken(month, -1);
  const prevWindow = monthWindowIn(tz, prevMonth);

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
      buildTrend(tz, month, client.id),
      isCurrent
        ? listClientOpenSnapshot(client.id, tz)
        : Promise.resolve(null),
    ]);
  // Faces for the member bars (deleted accounts miss the map → initials).
  const avatars = new Map(assignees.map((a) => [a.id, resolveAdminAvatar(a)]));

  const sections = await assembleMonthSections({
    tz,
    clientId: client.id,
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
    hasWork: sections.hasWork,
    categoryGroups: sections.categoryGroups,
    categoryTotalLabel: sections.categoryTotalLabel,
    memberRows: sections.memberRows,
    weeks: sections.weeks,
    deliverables: sections.deliverables,
    stageSummary: sections.stageSummary,
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
  tz: string,
  rawMonth: string,
): Promise<InternalMonthReport | null> {
  const now = new Date();
  const currentMonth = monthTokenIn(tz, now);
  const todayKey = dayKeyIn(tz, now);
  const month = parseMonthToken(rawMonth) || currentMonth;
  const window = monthWindowIn(tz, month);
  if (!window) return null;

  const prevWindow = monthWindowIn(tz, shiftMonthToken(month, -1));

  const isCurrent = month === currentMonth;

  const [rows, activityDates, assignees, prevRows, trend, open] =
    await Promise.all([
      listClientMonthTasks('internal', window),
      listClientActivityDates('internal'),
      listAssigneeOptions(),
      prevWindow
        ? listClientMonthTasks('internal', prevWindow)
        : Promise.resolve([]),
      buildTrend(tz, month, 'internal'),
      isCurrent
        ? listClientOpenSnapshot('internal', tz)
        : Promise.resolve(null),
    ]);
  const avatars = new Map(assignees.map((a) => [a.id, resolveAdminAvatar(a)]));

  const sections = await assembleMonthSections({
    tz,
    clientId: 'internal',
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
    hasWork: sections.hasWork,
    categoryGroups: sections.categoryGroups,
    categoryTotalLabel: sections.categoryTotalLabel,
    memberRows: sections.memberRows,
    weeks: sections.weeks,
    tasks: sections.tasks,
    trend,
    open,
    internalKpis: sections.internalKpis,
    stageSummary: sections.stageSummary,
  };
}
