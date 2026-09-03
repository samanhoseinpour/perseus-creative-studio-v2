import Link from 'next/link';

import {
  OPEN_STATUSES,
  TASK_STATUS_SLUGS,
  type TaskStatusSlug,
} from '@/lib/taskFields';
import {
  taskScopeQs,
  type TaskListParams,
  type TaskView,
  type TaskViewMode,
} from '@/lib/taskFilters';
import { panelDivider, tabItem, tabStrip } from './menu';
import { cn } from '@/lib/utils';

/** Fallback order when no scope narrows it — taskTabsFor derives the real
 *  list, and a past month drops the working tabs it could only show empty. */
const TAB_ORDER: TaskView[] = [
  'open',
  'todo',
  'in_progress',
  'needs_approval',
  'done',
  'delivered',
  'posted',
  'all',
];

const TAB_LABELS: Record<TaskView, string> = {
  open: 'Open',
  todo: 'To do',
  in_progress: 'In progress',
  needs_approval: 'Needs approval',
  done: 'Done',
  delivered: 'Delivered',
  posted: 'Posted',
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
  tabs = TAB_ORDER,
  scope,
}: {
  basePath: string;
  active: TaskView;
  counts: Record<TaskStatusSlug, number>;
  params: TaskListParams;
  /** Which tabs this scope can honestly offer (taskTabsFor). */
  tabs?: TaskView[];
  /** The month scope, carried onto every tab href — a tab that dropped it
   *  would move the reader to a different month than the one on screen. */
  scope: { month: string; currentMonth: string; mode?: TaskViewMode };
}) {
  // Both composites SUM the vocabulary rather than naming statuses. Written out
  // as literals, the two of them are how a status added later silently drops
  // out of a badge — the tab still renders, it just reads low, which nothing
  // on screen contradicts.
  const sum = (slugs: readonly TaskStatusSlug[]) =>
    slugs.reduce((n, slug) => n + counts[slug], 0);
  const tabCount: Record<TaskView, number> = {
    open: sum(OPEN_STATUSES),
    todo: counts.todo,
    in_progress: counts.in_progress,
    needs_approval: counts.needs_approval,
    done: counts.done,
    delivered: counts.delivered,
    posted: counts.posted,
    all: sum(TASK_STATUS_SLUGS),
  };

  return (
    // TWO elements on purpose: the divider sits on a plain wrapper and only the
    // inner strip scrolls. THE STRIP MUST NEVER BE SCROLLABLE ON Y. `overflow-x-auto`
    // computes overflow-y to `auto` as well, so any child hanging past the box —
    // this was a `-mb-px` on each tab — makes the strip a y-scroller with about a
    // pixel of range, and iOS then rubber-bands that pixel far enough to drag the
    // whole row out of sight and leave the tabs blank (reported on a phone,
    // 2026-08-25). Hiding the bar with `no-scrollbar`, which is what this used to
    // do, hid the symptom and not the scroll. Clipping y is not the fix either: it
    // would eat half the active tab's border-b-2 underline.
    // So the 1px overlap moved OFF the tabs and ONTO the strip: the strip's own
    // -mb-px lifts it into the wrapper's border, the tabs sit fully inside the
    // strip's content box (scrollHeight === clientHeight, y is not scrollable at
    // all), and the active underline still lands on the hairline exactly as before.
    // Keep it that way — a `-mb-px` put back on a tab brings the whole thing back
    // silently, since nothing about it fails on a desktop pointer.
    <div className={panelDivider}>
      {/* no-scrollbar: the global 10px ink thumb (globals.css) is far too heavy
          for a 40px strip. The right-edge fade is then the only cue that the
          later tabs exist — eight tabs are ~800px in a phone's ~334px track. One-sided on
          purpose: a left ramp would fade the active tab's underline whenever
          "Open", the default, is active. 0.75rem, not wider: a tab's border-b-2
          spans its whole box, so a longer ramp eats the glyphs and the underline
          with them. max-sm only, because at desktop widths the tabs fit and there
          is nothing to hint at. The divider is outside the mask, so it now runs
          solid to the edge instead of dimming under the ramp. */}
      <div className={tabStrip}>
        {tabs.map((view) => {
          const isActive = view === active;
          const qs = taskScopeQs(view, params, scope);
          const n = tabCount[view];
          return (
            <Link
              key={view}
              href={qs ? `${basePath}?${qs}` : basePath}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                tabItem,
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
    </div>
  );
}
