import { InboxListSkeleton } from '@/components/Admin/skeletons/AdminSkeletons';

export default function Loading() {
  return (
    <InboxListSkeleton
      title="Inquiries"
      subtitle="Project leads from the contact form."
    />
  );
}
