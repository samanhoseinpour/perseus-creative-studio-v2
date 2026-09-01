import type { Metadata } from 'next';

import { requireArea } from '@/lib/adminAccess';
import { resolveTaskViewMode } from '@/lib/taskFilters';
import { firstParam } from '@/utils/pagination';
import TasksCalendarView from '@/components/Admin/tasks/TasksCalendarView';
import TasksDigestView from '@/components/Admin/tasks/TasksDigestView';
import TasksListView from '@/components/Admin/tasks/TasksListView';

export const metadata: Metadata = {
  title: 'Tasks',
  description: 'The team work log behind the monthly client reports.',
};

/** Thin shell (inquiries/page.tsx model): gate, then pick a rendering — one
 *  URL, `?view=` URL state. Every mode reads the same rows through the same
 *  predicate; resolveTaskViewMode is the one place an unknown value falls back
 *  to the list. */
export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireArea('tasks');
  const sp = await searchParams;
  const viewer = {
    id: profile.session.user.id,
    name: profile.session.user.name,
  };

  const mode = resolveTaskViewMode(firstParam(sp.view));
  if (mode === 'digest') return <TasksDigestView sp={sp} viewer={viewer} />;
  if (mode === 'calendar') return <TasksCalendarView sp={sp} viewer={viewer} />;
  return <TasksListView sp={sp} viewer={viewer} />;
}
