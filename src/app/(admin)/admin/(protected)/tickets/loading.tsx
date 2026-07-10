import { InboxListSkeleton } from '@/components/Admin/skeletons/AdminSkeletons';

export default function Loading() {
  return (
    <InboxListSkeleton
      eyebrow="Support"
      title="Tickets"
      subtitle="Bug reports and issues raised in the admin panel."
    />
  );
}
