import { InboxListSkeleton } from '@/components/Admin/skeletons/AdminSkeletons';

export default function Loading() {
  return (
    <InboxListSkeleton
      title="Applications"
      subtitle="Job applications from the careers page."
    />
  );
}
