import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { requireArea } from '@/lib/adminAccess';
import { getSubmissionById, resolveInboxView } from '@/db/adminQueries';
import { firstParam } from '@/utils/pagination';
import SubmissionDetail from '@/components/Admin/inbox/SubmissionDetail';

export const metadata: Metadata = {
  title: 'Inquiry',
  description: 'A single project inquiry with contact details and triage actions.',
};

const BASE = '/admin/inquiries';

export default async function InquiryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireArea('inquiries');
  const { id } = await params;

  const submission = await getSubmissionById(id);
  if (!submission || submission.kind !== 'project') notFound();

  const from = resolveInboxView(firstParam((await searchParams).from));
  const listHref = from === 'inbox' ? BASE : `${BASE}?status=${from}`;

  return (
    <SubmissionDetail
      submission={submission}
      listHref={listHref}
      listLabel="inquiries"
    />
  );
}
