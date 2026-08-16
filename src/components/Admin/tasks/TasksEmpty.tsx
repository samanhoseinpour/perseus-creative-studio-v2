import Link from 'next/link';
import {
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
}: {
  view: TaskView;
  /** True when search/filters (not the tab itself) emptied the list. */
  filtered?: boolean;
  clearHref?: string;
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
  if (view === 'needs_approval') {
    return (
      <EmptyState
        icon={LuCircleEllipsis}
        title="Nothing waiting on approval"
        description="Tasks sent for client sign-off sit here — once the client approves, marking them done is one click."
      />
    );
  }
  if (view === 'done') {
    return (
      <EmptyState
        icon={LuSquareCheckBig}
        title="Nothing shipped yet"
        description="Tasks marked done collect here — and feed the monthly client reports."
      />
    );
  }
  return (
    <EmptyState
      icon={LuListChecks}
      title="No open tasks"
      description="Add the first one above — title, client, category, estimated hours, Enter."
    />
  );
}
