import Link from 'next/link';
import {
  LuCalendarOff,
  LuCircleEllipsis,
  LuListChecks,
  LuSearchX,
  LuSquareCheckBig,
} from 'react-icons/lu';

import type { TaskView } from '@/lib/taskFilters';
import EmptyState from '@/components/Admin/EmptyState';
import { adminLink } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';

/** The per-tab empty state for the task list. Pure server component. */
export default function TasksEmpty({
  view,
  filtered,
  clearHref,
  monthLabel,
  allTimeHref,
}: {
  view: TaskView;
  /** True when search/filters (not the tab itself) emptied the list. */
  filtered?: boolean;
  clearHref?: string;
  /** The month in scope, when one is — "July 2026". Absent at All time. */
  monthLabel?: string;
  allTimeHref?: string;
}) {
  if (filtered) {
    return (
      <EmptyState
        icon={LuSearchX}
        title="No matches"
        description="No tasks match the current search and filters."
        action={
          clearHref ? (
            <Link
              href={clearHref}
              className={cn(
                'inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground',
                adminLink,
              )}
            >
              Clear filters
            </Link>
          ) : undefined
        }
      />
    );
  }
  // A scoped month that shipped nothing is not the same as a tab that has
  // never held anything, and the per-view copy ("Add the first one above")
  // would be wrong twice over on a past month: there is no add band there, and
  // the log is not empty, this month is.
  if (monthLabel) {
    return (
      <EmptyState
        icon={LuCalendarOff}
        title={`Nothing in ${monthLabel}`}
        description="No task in this board's month reached this stage."
        action={
          allTimeHref ? (
            <Link
              href={allTimeHref}
              className={cn(
                'inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground',
                adminLink,
              )}
            >
              Show all time
            </Link>
          ) : undefined
        }
      />
    );
  }
  if (view === 'needs_approval') {
    return (
      <EmptyState
        icon={LuCircleEllipsis}
        title="Nothing waiting on approval"
        description="Tasks sent for client sign-off sit here. Once the client approves, marking them done is one click."
      />
    );
  }
  if (view === 'done') {
    return (
      <EmptyState
        icon={LuSquareCheckBig}
        title="Nothing finished yet"
        description="Tasks marked done collect here and feed the monthly client reports. Hand one over and it moves along to Delivered."
      />
    );
  }
  if (view === 'delivered') {
    return (
      <EmptyState
        icon={LuSquareCheckBig}
        title="Nothing delivered yet"
        description="Work that has reached the client sits here. It still counts in that month's report, exactly as it did under Done."
      />
    );
  }
  if (view === 'posted') {
    return (
      <EmptyState
        icon={LuSquareCheckBig}
        title="Nothing posted yet"
        description="Work that is live on the client's channels sits here. It still counts in that month's report, exactly as it did under Done."
      />
    );
  }
  return (
    <EmptyState
      icon={LuListChecks}
      title="No open tasks"
      description="Add the first one above: title, client, category, estimated hours, Enter."
    />
  );
}
