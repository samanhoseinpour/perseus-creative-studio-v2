import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { requireArea, viewerZone } from '@/lib/adminAccess';
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
  const { id } = await params;
  // The fetch keys only on the URL, so it starts alongside the auth gate —
  // one neon-http round trip of wall time instead of two stacked ones on the
  // hottest triage click. Promise.all pairs them, so a gate redirect can't
  // leave the fetch as an unhandled rejection; nothing renders unless the
  // gate passes.
  const [, submission] = await Promise.all([
    requireArea('inquiries'),
    getSubmissionById(id),
  ]);
  if (!submission || submission.kind !== 'project') notFound();

  const tz = await viewerZone();
  const from = resolveInboxView(firstParam((await searchParams).from));
  const listHref = from === 'inbox' ? BASE : `${BASE}?status=${from}`;

  return (
    <SubmissionDetail
      submission={submission}
      listHref={listHref}
      listLabel="inquiries"
      tz={tz}
    />
  );
}
