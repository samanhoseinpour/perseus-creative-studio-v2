'use client';

import { useState } from 'react';
import { LuPlus, LuReceipt } from 'react-icons/lu';

import Button from '@/components/Button';
import EmptyState from '@/components/Admin/EmptyState';
import { GlassPanel, glassRowHover } from '@/components/Admin/Glass';
import EntryDialog from '@/components/Admin/costs/EntryDialog';
import type {
  CostEntryItem,
  CostEntryPrefill,
  CostExpectedItem,
  CostPlanOption,
} from '@/components/Admin/costs/types';
import { cn } from '@/lib/utils';

const HEADER_CELL =
  'px-0 pb-2.5 pr-3 text-left text-[0.65rem] font-medium uppercase tracking-[0.15em] text-muted-foreground';

/** A category chip. Tone comes from the category, never a per-row choice. */
function CategoryChip({ label, tone }: { label: string; tone: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[0.65rem] font-medium',
        tone,
      )}
    >
      {label}
    </span>
  );
}

/**
 * One month's ledger, plus the plans that bill this month with nothing
 * recorded against them yet.
 *
 * The "expected" half is the pre-fill affordance, and it is the reason this
 * screen is quick to keep up to date: it mirrors payroll's `missing` list, so
 * the question is never "what have I forgotten" but "here is what is missing,
 * one click each". Its Add button seeds the dialog with the plan's expected
 * figure, which is then typed over with what the invoice actually says.
 */
export default function CostMonthBoard({
  entries,
  expected,
  plans,
  month,
  totalLabel,
}: {
  entries: CostEntryItem[];
  expected: CostExpectedItem[];
  plans: CostPlanOption[];
  month: string;
  totalLabel: string;
}) {
  // The id, not the item: a save re-renders the route (the action's
  // layout-scope revalidation) while the dialog may still be open, and
  // deriving from the fresh `entries` keeps what it shows live.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<CostEntryPrefill | null>(null);
  const [creating, setCreating] = useState(false);

  const selected =
    selectedId === null
      ? null
      : (entries.find((e) => e.id === selectedId) ?? null);

  function addFor(item: CostExpectedItem) {
    setPrefill({
      planId: item.planId,
      name: item.name,
      vendor: item.vendor,
      category: item.category,
      amount: item.expectedValue,
    });
    setCreating(true);
  }

  return (
    <>
      {expected.length > 0 && (
        <section className="mt-6">
          <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Expected, not recorded
            </h2>
            <span className="text-xs tabular-nums text-muted-foreground">
              {expected.length} {expected.length === 1 ? 'plan' : 'plans'}
            </span>
          </div>
          <GlassPanel>
            <ul className="divide-y divide-white/40 dark:divide-white/10">
              {expected.map((item) => (
                <li
                  key={item.planId}
                  className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="truncate text-sm font-medium text-foreground">
                        {item.name}
                      </span>
                      <CategoryChip
                        label={item.categoryLabel}
                        tone={item.categoryTone}
                      />
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.vendor} · {item.expectedLabel}
                      {item.billingHint ? ` · ${item.billingHint}` : ''}
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    showIcon={false}
                    onClick={() => addFor(item)}
                  >
                    Record
                  </Button>
                </li>
              ))}
            </ul>
          </GlassPanel>
        </section>
      )}

      <section className="mt-6">
        <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Charges
          </h2>
          <span className="text-xs tabular-nums text-muted-foreground">
            {totalLabel}
          </span>
        </div>
        <GlassPanel>
          {entries.length === 0 ? (
            <EmptyState
              icon={LuReceipt}
              title="Nothing recorded this month"
              description={
                expected.length > 0
                  ? 'Use “Record” above to add what each plan was billed.'
                  : 'Add a charge, or set up a recurring cost so it shows up here each month.'
              }
            />
          ) : (
            <div data-lenis-prevent-horizontal className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/40 dark:border-white/10">
                    <th scope="col" className={cn(HEADER_CELL, 'pt-2.5 pl-4 sm:pl-5')}>
                      What
                    </th>
                    <th scope="col" className={cn(HEADER_CELL, 'pt-2.5')}>
                      Vendor
                    </th>
                    <th scope="col" className={cn(HEADER_CELL, 'pt-2.5')}>
                      Kind
                    </th>
                    <th scope="col" className={cn(HEADER_CELL, 'pt-2.5')}>
                      Charged
                    </th>
                    <th scope="col" className={cn(HEADER_CELL, 'pt-2.5 text-right')}>
                      Amount
                    </th>
                    <th
                      scope="col"
                      className={cn(HEADER_CELL, 'pt-2.5 pr-4 text-right sm:pr-5')}
                    >
                      Share
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/40 dark:divide-white/10">
                  {entries.map((entry) => (
                    <tr
                      key={entry.id}
                      onClick={() => setSelectedId(entry.id)}
                      tabIndex={0}
                      role="button"
                      aria-label={`Edit the charge for ${entry.name}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedId(entry.id);
                        }
                      }}
                      className={cn('cursor-pointer', glassRowHover)}
                    >
                      <td className="py-3 pr-3 pl-4 sm:pl-5">
                        <span className="font-medium text-foreground">
                          {entry.name}
                        </span>
                        {entry.note && (
                          <span className="block max-w-xs truncate text-xs text-muted-foreground">
                            {entry.note}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-3 text-muted-foreground">
                        {entry.vendor}
                      </td>
                      <td className="py-3 pr-3">
                        <CategoryChip
                          label={entry.categoryLabel}
                          tone={entry.categoryTone}
                        />
                      </td>
                      <td className="py-3 pr-3 text-xs text-muted-foreground">
                        {entry.chargedLabel ?? '—'}
                        {entry.invoiceRef && (
                          <span className="block truncate">
                            {entry.invoiceRef}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums text-foreground">
                        {entry.amountLabel}
                        {entry.billedNote && (
                          <span className="block text-xs text-muted-foreground">
                            {entry.billedNote}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-right text-xs tabular-nums text-muted-foreground sm:pr-5">
                        {entry.shareLabel ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassPanel>
      </section>

      {/* Edit — one instance, driven by the selected row. */}
      <EntryDialog
        open={selected !== null}
        onOpenChange={(next) => !next && setSelectedId(null)}
        entry={selected}
        plans={plans}
        month={month}
      />

      {/* Create from an expected plan. Separate instance so the seed guard
          keys on the plan and re-picking the same one seeds again. */}
      <EntryDialog
        open={creating}
        onOpenChange={(next) => {
          setCreating(next);
          if (!next) setPrefill(null);
        }}
        entry={null}
        plans={plans}
        month={month}
        prefill={prefill}
      />
    </>
  );
}

/** The header affordance — owns its own dialog state (AddOpeningButton). */
export function AddEntryButton({
  plans,
  month,
}: {
  plans: CostPlanOption[];
  month: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        size="small"
        icon={LuPlus}
        iconPosition="left"
        onClick={() => setOpen(true)}
      >
        Record charge
      </Button>
      <EntryDialog
        open={open}
        onOpenChange={setOpen}
        entry={null}
        plans={plans}
        month={month}
      />
    </>
  );
}
