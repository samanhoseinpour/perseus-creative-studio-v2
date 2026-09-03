import { ReportDashboardSkeleton } from '@/components/Admin/skeletons/AdminSkeletons';

/**
 * `variant="internal"`: the studio's own month is a different page from a
 * client's, not a narrower one. It has one tile, no highlights, no retainer, no
 * readiness, and a header holding only the month switcher.
 */
export default function Loading() {
  return <ReportDashboardSkeleton variant="internal" />;
}
