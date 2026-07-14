import { InboxListSkeleton } from '@/components/Admin/skeletons/AdminSkeletons';

export default function Loading() {
  return (
    <InboxListSkeleton
      eyebrow="Journal"
      title="Feedback"
      subtitle="How readers rate each article."
    />
  );
}
