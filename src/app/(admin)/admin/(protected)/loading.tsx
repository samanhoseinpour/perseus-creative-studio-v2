import { OverviewSkeleton } from '@/components/Admin/skeletons/AdminSkeletons';

// Fallback for the Overview home and any protected segment without its own
// loading.tsx. The sidebar shell (the layout above this boundary) stays put;
// only <main> shows this while the page's data resolves.
export default function Loading() {
  return <OverviewSkeleton />;
}
