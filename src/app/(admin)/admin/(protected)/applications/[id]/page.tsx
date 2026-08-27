import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { canAccessArea, requireArea, viewerZone } from '@/lib/adminAccess';
import { activityHistoryHref } from '@/lib/activityFilters';
import { getSubmissionById, resolveInboxView } from '@/db/adminQueries';
import { firstParam } from '@/utils/pagination';
import SubmissionDetail from '@/components/Admin/inbox/SubmissionDetail';

export const metadata: Metadata = {
  title: 'Application',
  description: 'A single career application with résumé and triage actions.',
};

const BASE = '/admin/applications';

export default async function ApplicationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  // Gate + fetch overlap — see inquiries/[id]/page.tsx for the rationale.
  const [profile, submission] = await Promise.all([
    requireArea('applications'),
    getSubmissionById(id),
  ]);
  if (!submission || submission.kind !== 'career') notFound();

  const tz = await viewerZone();
  const from = resolveInboxView(firstParam((await searchParams).from));
  const listHref = from === 'inbox' ? BASE : `${BASE}?status=${from}`;

  return (
    <SubmissionDetail
      submission={submission}
      listHref={listHref}
      listLabel="applications"
      tz={tz}
      historyHref={
        canAccessArea(profile, 'logs')
          ? activityHistoryHref('submission', submission.id)
          : null
      }
    />
  );
}
