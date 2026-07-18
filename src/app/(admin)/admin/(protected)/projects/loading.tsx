import { InboxListSkeleton } from '@/components/Admin/skeletons/AdminSkeletons';

export default function Loading() {
  return (
    <InboxListSkeleton
      eyebrow="Portfolio"
      title="Projects"
      subtitle="The case files behind /projects — cards, detail pages, and where each one appears."
    />
  );
}
