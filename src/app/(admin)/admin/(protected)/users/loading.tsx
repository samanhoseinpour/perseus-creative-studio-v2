import { InboxListSkeleton } from '@/components/Admin/skeletons/AdminSkeletons';

export default function Loading() {
  return (
    <InboxListSkeleton
      eyebrow="Team"
      title="Users"
      subtitle="Who can sign in to the admin, and what each account can open."
    />
  );
}
