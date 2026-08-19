import type { Metadata } from 'next';

import ActivityListView from '@/components/Admin/logs/ActivityListView';
import { requireSuperadmin } from '@/lib/adminAccess';

export const metadata: Metadata = {
  title: 'Activity',
  description: 'Audit trail of every change made in the dashboard.',
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * Superadmin-only, and deliberately NOT a grantable AdminArea: ADMIN_AREAS
 * feeds DEFAULT_AREAS, so adding it there would pre-tick the audit trail for
 * every new account. The same reasoning payroll already uses.
 *
 * The gate runs here as well as in the nav (canSeeNavItem is cosmetic) —
 * route handlers and pages each re-gate, per the house rule.
 */
export default async function LogsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireSuperadmin('/admin');
  return <ActivityListView sp={await searchParams} />;
}
