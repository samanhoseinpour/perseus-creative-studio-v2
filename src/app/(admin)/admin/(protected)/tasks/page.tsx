import type { Metadata } from 'next';

import { requireArea } from '@/lib/adminAccess';
import { firstParam } from '@/utils/pagination';
import TasksDigestView from '@/components/Admin/tasks/TasksDigestView';
import TasksListView from '@/components/Admin/tasks/TasksListView';

export const metadata: Metadata = {
  title: 'Tasks',
  description: 'The team work log behind the monthly client reports.',
};

/** Thin shell (inquiries/page.tsx model): gate, then branch list ↔ digest —
 *  one URL, `?view=digest` URL state. */
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

  return firstParam(sp.view) === 'digest' ? (
    <TasksDigestView sp={sp} viewer={viewer} />
  ) : (
    <TasksListView sp={sp} viewer={viewer} />
  );
}
