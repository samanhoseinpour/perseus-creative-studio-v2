import Link from 'next/link';
import { LuList, LuNewspaper } from 'react-icons/lu';

import {
  taskListQs,
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
 *  filters across (page dropped by taskListQs). Server component. */
export default function TasksViewToggle({
  basePath,
  view,
  params,
  digest,
}: {
  basePath: string;
  view: TaskView;
  params: TaskListParams;
  digest: boolean;
}) {
  const listQs = taskListQs(view, params);
  const digestQs = taskListQs(view, params, undefined, true);
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-white/50 bg-white/40 p-0.5 backdrop-blur-sm dark:border-white/12 dark:bg-white/10">
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
