import Link from 'next/link';

import type { TaskStatusSlug } from '@/lib/taskFields';
import {
  taskListQs,
  type TaskListParams,
  type TaskView,
} from '@/lib/taskFilters';
import { cn } from '@/lib/utils';

const TAB_ORDER: TaskView[] = [
  'open',
  'todo',
  'in_progress',
  'needs_approval',
  'done',
  'all',
];

const TAB_LABELS: Record<TaskView, string> = {
  open: 'Open',
  todo: 'To do',
  in_progress: 'In progress',
  needs_approval: 'Needs approval',
  done: 'Done',
  all: 'All',
};

/**
 * Status tabs for /admin/tasks — `?status=` URL state (TicketTabs recipe),
 * carrying the active filters across via taskListQs (which drops `page`).
 * Counts arrive per base status; the composite tabs derive.
 */
export default function TaskTabs({
  basePath,
  active,
  counts,
  params,
}: {
  basePath: string;
  active: TaskView;
  counts: Record<TaskStatusSlug, number>;
  params: TaskListParams;
}) {
  const open = counts.todo + counts.in_progress + counts.needs_approval;
  const tabCount: Record<TaskView, number> = {
    open,
    todo: counts.todo,
    in_progress: counts.in_progress,
    needs_approval: counts.needs_approval,
    done: counts.done,
    all: open + counts.done,
  };

  return (
    // no-scrollbar: `overflow-x-auto` also computes overflow-y to `auto`, and
    // the tabs' -mb-px overhangs the box by a pixel — enough to summon the
    // global 10px ink thumb (globals.css) as a stray VERTICAL bar at the right
    // edge. Hide the bar rather than clipping y, which would eat the active
    // tab's underline.
    // The right-edge fade is the only cue that Done and All exist: six tabs are
    // ~600px in a phone's ~334px track, and no-scrollbar removes the one hint
    // the browser would have given. One-sided on purpose — a left ramp would
    // fade the active tab's underline whenever "Open", the default, is active.
    // 0.75rem, not wider: a tab's border-b-2 spans its whole box, so a longer
    // ramp eats the glyphs and the underline with them. Applied via max-sm
    // rather than masked-then-unmasked: a mask fades the element's own
    // border-b too, so leaving it on at desktop widths — where the tabs fit
    // and there is nothing to hint at — would just dim the last 12px of the
    // rule under them.
    <div className="no-scrollbar flex items-center gap-1 overflow-x-auto overscroll-x-contain border-b border-white/40 px-2 max-sm:[mask-image:linear-gradient(to_right,black_calc(100%-0.75rem),transparent)] sm:px-3 dark:border-white/10">
      {TAB_ORDER.map((view) => {
        const isActive = view === active;
        const qs = taskListQs(view, params);
        const n = tabCount[view];
        return (
          <Link
            key={view}
            href={qs ? `${basePath}?${qs}` : basePath}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {TAB_LABELS[view]}
            {n > 0 && (
              <span
                className={cn(
                  'inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.6rem] font-semibold tabular-nums',
                  isActive
                    ? 'bg-foreground text-background'
                    : 'bg-foreground/[0.08] text-muted-foreground',
                )}
              >
                {n}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
