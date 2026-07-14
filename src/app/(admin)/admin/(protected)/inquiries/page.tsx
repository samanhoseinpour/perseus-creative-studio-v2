import type { Metadata } from 'next';

import { requireArea } from '@/lib/adminAccess';
import InboxListView from '@/components/Admin/inbox/InboxListView';

export const metadata: Metadata = {
  title: 'Inquiries',
  description: 'Project inquiries submitted through the contact form.',
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireArea('inquiries');
  return (
    <InboxListView
      kind="project"
      basePath="/admin/inquiries"
      title="Inquiries"
      subtitle="Project leads from the contact form."
      sp={await searchParams}
    />
  );
}
