import type { Metadata } from 'next';
import Link from 'next/link';

import AdminPage from '@/components/Admin/AdminPage';
import HelpButton from '@/components/Admin/HelpButton';
import { ADMIN_HELP } from '@/lib/adminHelp';
import { adminLink, GlassPanel } from '@/components/Admin/Glass';
import CostPlansRoster from '@/components/Admin/costs/CostPlansRoster';
import { AddPlanButton } from '@/components/Admin/costs/PlanDialog';
import { buildCostPlansView } from '@/components/Admin/costs/costData';
import { requireArea } from '@/lib/adminAccess';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Recurring costs',
  description: 'The subscriptions and recurring bills the studio pays.',
};

/** '' for an absent param, first value for a repeated one (the careers rule). */
const firstParam = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? '') : (v ?? '');

/**
 * The recurring-cost roster — what the studio is signed up for, grouped by
 * kind. The dialog IS the editor; there is no per-plan route.
 *
 * `wide`, not `table`: this is a single-column list, and stretching a row would
 * drag its right-hand status control away from the content it belongs to.
 */
export default async function CostPlansPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; q?: string }>;
}) {
  await requireArea('costs', '/admin');
  const params = await searchParams;
  const view = await buildCostPlansView();

  // Validate the deep-link id against the already-gated roster; a foreign or
  // malformed one is a silent no-op rather than an error.
  const openId = firstParam(params.plan);
  const openPlanId = view.items.some((i) => i.id === openId) ? openId : null;
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
              Recurring costs
            </h1>
            <HelpButton topic={ADMIN_HELP.costs} />
          </div>
          <p className="text-sm text-muted-foreground">
            {view.runRateLabel} a month {view.runRateReading}
          </p>
        </div>
        <AddPlanButton />
      </header>

      <GlassPanel>
        <CostPlansRoster
          key={initialQuery}
          items={view.items}
          openPlanId={openPlanId}
          initialQuery={initialQuery}
        />
      </GlassPanel>

      <p className="mt-4 px-1 text-xs text-muted-foreground">
        This is what each cost is <em>meant</em> to be. What actually got charged
        lives on the{' '}
        <Link href="/admin/costs" className={cn('text-foreground', adminLink)}>
          month screen
        </Link>
        {view.trackedSinceLabel
          ? `, tracked since ${view.trackedSinceLabel}.`
          : '.'}
      </p>
    </AdminPage>
  );
}
