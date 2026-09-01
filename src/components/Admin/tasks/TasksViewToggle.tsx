import Link from 'next/link';
import { LuCalendarDays, LuList, LuNewspaper } from 'react-icons/lu';

import {
  TASK_MONTH_ALL,
  taskScopeQs,
  type TaskListParams,
  type TaskView,
  type TaskViewMode,
} from '@/lib/taskFilters';
import { cn } from '@/lib/utils';

const pill = (active: boolean) =>
  cn(
    'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
    active
      ? 'bg-foreground text-background'
      : 'text-muted-foreground hover:text-foreground',
  );

const TABS = [
  { mode: 'list', label: 'List', Icon: LuList },
  { mode: 'calendar', label: 'Calendar', Icon: LuCalendarDays },
  { mode: 'digest', label: 'Digest', Icon: LuNewspaper },
] as const satisfies readonly {
  mode: TaskViewMode;
  label: string;
  Icon: typeof LuList;
}[];

/** The View segmented control — one Link per rendering, each carrying the
 *  working filters across (page dropped by taskScopeQs). Server component. */
export default function TasksViewToggle({
  basePath,
  view,
  params,
  mode,
  scope,
}: {
  basePath: string;
  view: TaskView;
  params: TaskListParams;
  mode: TaskViewMode;
  scope: { month: string; currentMonth: string; mode?: TaskViewMode };
}) {
  // A month crosses only when somebody PICKED it. The views have different
  // unscoped defaults on purpose (the list and the calendar open on this month,
  // the digest on its rolling week), so carrying an unpicked default across
  // would quietly redefine the destination: standing on September's board and
  // tapping Digest would clip its week to the calendar month, which on the 1st
  // is empty. Pick August, though, and every view should be about August.
  const defaultFor = (target: TaskViewMode) =>
    target === 'digest' ? TASK_MONTH_ALL : scope.currentMonth;
  const picked = scope.month !== defaultFor(mode);
  const monthFor = (target: TaskViewMode) => {
    const carried = picked ? scope.month : defaultFor(target);
    // A grid draws ONE month, so "All time" cannot cross onto the calendar. It
    // lands on the current month rather than on a page with no cells.
    return target === 'calendar' && carried === TASK_MONTH_ALL
      ? scope.currentMonth
      : carried;
  };
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-foreground/15 bg-foreground/[0.04] p-0.5 backdrop-blur-sm">
      {TABS.map(({ mode: target, label, Icon }) => {
        const qs = taskScopeQs(view, params, {
          ...scope,
          month: monthFor(target),
          mode: target,
        });
        const active = mode === target;
        return (
          <Link
            key={target}
            href={qs ? `${basePath}?${qs}` : basePath}
            aria-current={active ? 'page' : undefined}
            className={pill(active)}
          >
            <Icon aria-hidden="true" className="size-3.5" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
