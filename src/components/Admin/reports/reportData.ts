import {
  getReportClientBySlug,
  listAssigneeOptions,
  listClientActivityDates,
  listClientMonthTasks,
  type ReportClient,
} from '@/db/taskQueries';
import { resolveAdminAvatar } from '@/lib/adminIdentity';
import {
  foldMonthTotals,
  formatMinutes,
  minutesToHoursString,
} from '@/lib/taskFields';
import {
  monthToken,
  parseMonthToken,
  shiftMonthToken,
  vancouverMonthWindow,
} from '@/lib/taskFilters';
import { PROJECT_CATEGORY_LABELS } from '@/lib/portfolioFields';
import { formatDate } from '@/components/Admin/inbox/format';
import { monthLabel } from '@/components/Admin/tasks/format';
import type {
  CategoryBarGroup,
  MemberBarRow,
  ReportTaskItem,
} from './ReportSections';
import type { MonthOption } from './MonthSwitcher';

/**
 * Server-side assembly for one client's month report — shared verbatim by
 * the dashboard and the /print page so the PDF a client receives shows the
 * exact strings the dashboard showed. (Transitively server-only through
 * taskQueries.)
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
};

/** Slivers stay visible; zero stays zero. */
const pctOf = (minutes: number, total: number): number =>
  minutes === 0 || total === 0
    ? 0
    : Math.max(2, Math.round((minutes / total) * 100));

/** Recent `count` months (newest first) as picker options. */
export function recentMonths(count: number, now: Date): MonthOption[] {
  const current = monthToken(now);
  return Array.from({ length: count }, (_, i) => {
    const token = shiftMonthToken(current, -i);
    return { value: token, label: monthLabel(token) };
  });
}

export async function buildClientMonthReport(
  slug: string,
  rawMonth: string,
): Promise<ClientMonthReport | null> {
  const client = await getReportClientBySlug(slug);
  if (!client) return null;

  const now = new Date();
  const currentMonth = monthToken(now);
  const month = parseMonthToken(rawMonth) || currentMonth;
  const window = vancouverMonthWindow(month);
  if (!window) return null;

  const [rows, activityDates, assignees] = await Promise.all([
    listClientMonthTasks(client.id, window),
    listClientActivityDates(client.id),
    listAssigneeOptions(),
  ]);
  // Faces for the member bars (deleted accounts miss the map → initials).
  const avatars = new Map(assignees.map((a) => [a.id, resolveAdminAvatar(a)]));

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
    name: member.assigneeName,
    avatar:
      (member.assigneeId ? avatars.get(member.assigneeId) : null) ?? null,
    tasksLabel: `${member.tasks} task${member.tasks === 1 ? '' : 's'}`,
    hoursLabel: formatMinutes(member.minutes),
    pct: pctOf(member.minutes, topMemberMinutes),
  }));

  const retainer =
    client.retainerMinutes === null
      ? null
      : {
          usedLabel: formatMinutes(totals.totalMinutes),
          targetLabel: formatMinutes(client.retainerMinutes),
          pct: Math.min(
            100,
            Math.round((totals.totalMinutes / client.retainerMinutes) * 100),
          ),
          overLabel:
            totals.totalMinutes > client.retainerMinutes
              ? `+${minutesToHoursString(totals.totalMinutes - client.retainerMinutes)} h over`
              : '',
        };

  const tasks: ReportTaskItem[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    deliverableUrl: row.deliverableUrl ?? '',
    categoryLabel: row.categoryName,
    assigneeName: row.assigneeName,
    hoursLabel: formatMinutes(row.actualMinutes ?? row.estimatedMinutes),
    completedLabel: row.completedAt ? formatDate(row.completedAt) : '',
  }));

  // Months with any completed work, plus the current and selected months so
  // navigation never strands; newest first.
  const monthSet = new Set<string>([currentMonth, month]);
  for (const date of activityDates) monthSet.add(monthToken(date));
  const monthOptions = [...monthSet]
    .sort()
    .reverse()
    .map((token) => ({ value: token, label: monthLabel(token) }));

  return {
    client,
    month,
    monthLabelText: monthLabel(month),
    currentMonth,
    monthOptions,
    tiles: {
      tasksCompleted: totals.taskCount,
      totalHoursLabel: formatMinutes(totals.totalMinutes),
      membersInvolved: totals.byMember.length,
    },
    categoryGroups,
    categoryTotalLabel: formatMinutes(totals.totalMinutes),
    memberRows,
    retainer,
    tasks,
  };
}
