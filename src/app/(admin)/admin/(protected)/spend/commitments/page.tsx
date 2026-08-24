import type { Metadata } from 'next';
import Link from 'next/link';

import AdminPage from '@/components/Admin/AdminPage';
import HelpButton from '@/components/Admin/HelpButton';
import { ADMIN_HELP } from '@/lib/adminHelp';
import { adminLink, GlassPanel } from '@/components/Admin/Glass';
import CommitmentsRoster, {
  AddCommitmentButtons,
} from '@/components/Admin/spend/CommitmentsRoster';
import { buildCommitmentsView } from '@/components/Admin/spend/spendData';
import { requireCommitments, viewerZone } from '@/lib/adminAccess';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Commitments',
  description: 'Everyone and everything the studio pays for each month.',
};

/** '' for an absent param, first value for a repeated one (the careers rule). */
const firstParam = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? '') : (v ?? '');

/**
 * The merged roster — every member of the payroll and every recurring cost as
 * one list, sorted by what each costs a month. It replaced
 * /admin/payroll/members and /admin/costs/plans, both of which now redirect
 * here; the deep editors behind each row are unchanged.
 *
 * requireCommitments() opens it for EITHER money grant and returns which halves
 * the viewer holds. The halves are then READ conditionally rather than fetched
 * and masked — so a costs-only viewer's payload contains no person rows at all,
 * and the heading says "Recurring costs" instead of a whole-sounding label over
 * half the data.
 *
 * `wide`, not `table`: this is a single-column list, and stretching a row would
 * drag its monthly figure away from the name it belongs to.
 */
export default async function CommitmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ member?: string; plan?: string; q?: string }>;
}) {
  const { people, plans } = await requireCommitments();
  const params = await searchParams;
  const tz = await viewerZone();
  const view = await buildCommitmentsView(tz, { people, plans });

  // Validate each deep-link id against the already-gated roster; a foreign or
  // malformed one is a silent no-op rather than an error — and one pointing at
  // a half this viewer cannot see simply finds nothing.
  const memberId = firstParam(params.member);
  const planId = firstParam(params.plan);
  const openMemberId = view.items.some(
    (i) => i.kind === 'person' && i.id === memberId,
  )
    ? memberId
    : null;
  const openPlanId = view.items.some((i) => i.kind === 'plan' && i.id === planId)
    ? planId
    : null;
  const initialQuery = firstParam(params.q).slice(0, 200);

  return (
    <AdminPage>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Private
          </span>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {view.title}
            </h1>
            <HelpButton topic={ADMIN_HELP.commitments} />
          </div>
          <p className="text-sm text-muted-foreground">
            {view.runRateLabel} a month {view.runRateReading}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AddCommitmentButtons
            people={people}
            plans={plans}
            accounts={view.accounts}
          />
        </div>
      </header>

      <GlassPanel>
        <CommitmentsRoster
          key={initialQuery}
          items={view.items}
          people={people}
          plans={plans}
          accounts={view.accounts}
          openMemberId={openMemberId}
          openPlanId={openPlanId}
          initialQuery={initialQuery}
        />
      </GlassPanel>

      {view.rateNote && (
        <p className="mt-4 px-1 text-xs text-muted-foreground">
          {view.rateNote}
        </p>
      )}

      <p className="mt-3 px-1 text-xs text-muted-foreground">
        This is what each commitment is <em>meant</em> to cost every month. What
        actually left the bank lives on{' '}
        {people && plans ? (
          <>
            <Link href="/admin/spend" className={cn('text-foreground', adminLink)}>
              Spend
            </Link>
            .
          </>
        ) : people ? (
          <>
            <Link
              href="/admin/payroll"
              className={cn('text-foreground', adminLink)}
            >
              Payroll
            </Link>
            .
          </>
        ) : (
          <>
            <Link href="/admin/costs" className={cn('text-foreground', adminLink)}>
              Bills
            </Link>
            .
          </>
        )}{' '}
        A commitment with no figure is left out of the run-rate rather than
        counted as nothing.
      </p>
    </AdminPage>
  );
}
