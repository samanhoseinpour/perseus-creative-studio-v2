import { Suspense } from 'react';

import {
  TasksCalendarSkeleton,
  TasksDigestSkeleton,
  TasksListSkeleton,
} from '@/components/Admin/skeletons/AdminSkeletons';
import TasksSkeletonSwitch from '@/components/Admin/skeletons/TasksSkeletonSwitch';

/**
 * One route, three renderings, so three skeletons. The switch reads `?view=`
 * on the client because a loading.tsx cannot: see its own comment.
 *
 * The Suspense wrapper is a build guard rather than a runtime one. Every
 * /admin route is dynamic (the protected layout reads cookies), so the
 * fallback below should never paint; it is here so `useSearchParams` stays
 * legal if Next ever tries to prerender this shell. `null` and not a fourth
 * tree: a flash of the list on the way to the calendar is the bug, not the
 * fix.
 */
export default function Loading() {
  return (
    <Suspense fallback={null}>
      <TasksSkeletonSwitch
        views={{
          list: <TasksListSkeleton />,
          calendar: <TasksCalendarSkeleton />,
          digest: <TasksDigestSkeleton />,
        }}
      />
    </Suspense>
  );
}
