import { ReportPrintSkeleton } from '@/components/Admin/skeletons/AdminSkeletons';

/**
 * The one client-facing page in the app that was served cold with nothing to
 * look at: `force-dynamic` (revocation has to bite immediately) over the same
 * multi-query report build as the admin print page, and no loading boundary.
 * Same sheet, same skeleton.
 */
export default function Loading() {
  return <ReportPrintSkeleton />;
}
