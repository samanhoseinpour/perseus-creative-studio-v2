'use client';

import { useSearchParams } from 'next/navigation';

import { resolveTaskViewMode, type TaskViewMode } from '@/lib/taskFilters';

/**
 * Picks which /admin/tasks skeleton the loading state shows.
 *
 * `loading.tsx` is a Suspense fallback and gets no `searchParams`, so nothing
 * on the server can tell the list from the calendar from the digest. The three
 * views differ from the tabs down, so one skeleton for all of them meant the
 * calendar and the digest painted an add band and a table neither has, and the
 * digest a tab strip it does not have either. A client leaf is the only thing
 * that can read `?view=` on BOTH the first server render and a client-side
 * navigation, where the router commits the new URL before the fallback shows.
 *
 * The trees are rendered on the server and handed down as props, so
 * AdminSkeletons.tsx stays a Server Component and none of its 2,400 lines
 * reach a client chunk.
 *
 * `views` is keyed by TaskViewMode rather than being three named props: a
 * fourth `?view=` is then a type error at the call site instead of a silently
 * missing skeleton. `resolveTaskViewMode` is the same door page.tsx uses, so
 * an unknown value falls back to the list in one place.
 */
export default function TasksSkeletonSwitch({
  views,
}: {
  views: Record<TaskViewMode, React.ReactNode>;
}) {
  const view = useSearchParams().get('view') ?? '';
  return <>{views[resolveTaskViewMode(view)]}</>;
}
