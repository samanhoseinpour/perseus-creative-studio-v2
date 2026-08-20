import type { Metadata } from 'next';

import ActivityListView from '@/components/Admin/logs/ActivityListView';
import { requireArea } from '@/lib/adminAccess';

export const metadata: Metadata = {
  title: 'Activity',
  description: 'Audit trail of every change made in the dashboard.',
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * The 'logs' grant — a SENSITIVE_AREA, so only the owner can hand it out and
 * it is never pre-ticked in the add-user dialog (DEFAULT_AREAS is an explicit
 * list). Safe to widen beyond superadmins because activity_log is payload-free
 * by construction: no payroll figure or secret can reach a row.
 *
 * The gate runs here as well as in the nav (canSeeNavItem is cosmetic) —
 * route handlers and pages each re-gate, per the house rule.
 */
export default async function LogsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireArea('logs', '/admin');
  return <ActivityListView sp={await searchParams} />;
}
