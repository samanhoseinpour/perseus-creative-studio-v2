import type { Metadata } from 'next';

import { requireArea } from '@/lib/adminAccess';
import InboxListView from '@/components/Admin/inbox/InboxListView';

export const metadata: Metadata = {
  title: 'Applications',
  description: 'Career applications submitted through the careers form.',
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireArea('applications');
  return (
    <InboxListView
      kind="career"
      basePath="/admin/applications"
      title="Applications"
      subtitle="Job applications from the careers page."
      sp={await searchParams}
    />
  );
}
