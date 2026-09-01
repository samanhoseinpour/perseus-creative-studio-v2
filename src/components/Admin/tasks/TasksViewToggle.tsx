import Link from 'next/link';
import { LuList, LuNewspaper } from 'react-icons/lu';

import {
  TASK_MONTH_ALL,
  taskScopeQs,
  type TaskListParams,
  type TaskView,
} from '@/lib/taskFilters';
import { cn } from '@/lib/utils';

const pill = (active: boolean) =>
  cn(
    'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
    active
      ? 'bg-foreground text-background'
      : 'text-muted-foreground hover:text-foreground',
  );

/** The List ↔ Digest segmented control — two Links carrying the working
 *  filters across (page dropped by taskScopeQs). Server component. */
export default function TasksViewToggle({
  basePath,
  view,
  params,
  digest,
  scope,
}: {
  basePath: string;
  view: TaskView;
  params: TaskListParams;
  digest: boolean;
  scope: { month: string; currentMonth: string; digest?: boolean };
}) {
  // A month crosses only when somebody PICKED it. The two views have different
  // unscoped defaults on purpose (the list opens on this month, the digest on
  // its rolling week), so carrying an unpicked default across would quietly
  // redefine the other view: standing on September's board and tapping Digest
  // would clip its week to the calendar month, which on the 1st is empty.
  // Pick August, though, and both views should be about August.
  const sourceDefault = digest ? TASK_MONTH_ALL : scope.currentMonth;
  const picked = scope.month !== sourceDefault;
  const monthFor = (target: boolean) =>
    picked ? scope.month : target ? TASK_MONTH_ALL : scope.currentMonth;
  const listQs = taskScopeQs(view, params, {
    ...scope,
    month: monthFor(false),
    digest: false,
  });
  const digestQs = taskScopeQs(view, params, {
    ...scope,
    month: monthFor(true),
    digest: true,
  });
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-foreground/15 bg-foreground/[0.04] p-0.5 backdrop-blur-sm">
      <Link
        href={listQs ? `${basePath}?${listQs}` : basePath}
        aria-current={!digest ? 'page' : undefined}
        className={pill(!digest)}
      >
        <LuList aria-hidden="true" className="size-3.5" />
        List
      </Link>
      <Link
        href={`${basePath}?${digestQs}`}
        aria-current={digest ? 'page' : undefined}
        className={pill(digest)}
      >
        <LuNewspaper aria-hidden="true" className="size-3.5" />
        Digest
      </Link>
    </div>
  );
}
