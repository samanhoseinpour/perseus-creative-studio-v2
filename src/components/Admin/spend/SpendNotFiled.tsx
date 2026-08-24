'use client';

import { useState } from 'react';
import Link from 'next/link';

import Button from '@/components/Button';
import { adminLink, GlassPanel } from '@/components/Admin/Glass';
import EntryDialog from '@/components/Admin/costs/EntryDialog';
import type {
  CostEntryPrefill,
  CostPlanOption,
} from '@/components/Admin/costs/types';
import type { NotFiledItem } from '@/components/Admin/spend/types';
import { cn } from '@/lib/utils';

/**
 * What this month is still waiting on — payroll's missing members and the cost
 * plans that bill this month with nothing filed against them, as ONE list.
 *
 * This is the ergonomic that makes the spend screen worth opening rather than
 * merely worth reading: the single place that says "August's Claude bill isn't
 * recorded and Mahdi has no line yet", instead of that question living half on
 * one screen and half on another.
 *
 * The two halves keep DIFFERENT affordances, because they are different acts.
 * A missing charge is filed right here — the dialog opens seeded with the
 * plan's expected figure, which is then typed over with what the invoice
 * actually says (the pre-fill is a suggestion, never the record). A missing
 * payroll line is not: creating one needs a run and a rate, so it links to the
 * payroll month screen rather than pretending a button here could do it.
 */
export default function SpendNotFiled({
  items,
  plans,
  month,
}: {
  items: NotFiledItem[];
  plans: CostPlanOption[];
  month: string;
}) {
  const [prefill, setPrefill] = useState<CostEntryPrefill | null>(null);
  const [creating, setCreating] = useState(false);

  if (items.length === 0) return null;

  function record(item: Extract<NotFiledItem, { kind: 'plan' }>) {
    setPrefill({
      planId: item.id,
      name: item.name,
      vendor: item.vendor,
      category: item.category,
      amount: item.expectedValue,
    });
    setCreating(true);
  }

  return (
    <>
      <section className="mt-6">
        <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Not filed yet
          </h2>
          <span className="text-xs tabular-nums text-muted-foreground">
            {items.length} {items.length === 1 ? 'thing' : 'things'}
          </span>
        </div>
        <GlassPanel>
          <ul className="divide-y divide-white/40 dark:divide-white/10">
            {items.map((item) => (
              <li
                key={`${item.kind}:${item.id}`}
                className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="truncate text-sm font-medium text-foreground">
                      {item.name}
                    </span>
                    {item.kind === 'plan' && (
                      <span
                        className={cn(
                          'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[0.65rem] font-medium',
                          item.categoryTone,
                        )}
                      >
                        {item.categoryLabel}
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {item.kind === 'plan'
                      ? `${item.vendor} · ${item.expectedLabel}${item.billingHint ? ` · ${item.billingHint}` : ''}`
                      : `No pay line this month — ${item.reason}`}
                  </span>
                </span>

                {item.kind === 'plan' ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    showIcon={false}
                    onClick={() => record(item)}
                  >
                    Record
                  </Button>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      'shrink-0 text-xs font-medium text-foreground',
                      adminLink,
                    )}
                  >
                    Open payroll
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </GlassPanel>
      </section>

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
