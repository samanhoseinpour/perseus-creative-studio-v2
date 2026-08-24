'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LuReceipt, LuSearch } from 'react-icons/lu';

import Button from '@/components/Button';
import EmptyState from '@/components/Admin/EmptyState';
import { useSearchFocus } from '@/hooks/useSearchFocus';
import { glassField, glassRowHover } from '@/components/Admin/Glass';
import { chipClasses } from '@/components/Admin/portfolio/PortfolioChips';
import { safeAction } from '@/components/Admin/inbox/safeAction';
import PlanDialog from '@/components/Admin/costs/PlanDialog';
import { PlanStatusPill } from '@/components/Admin/costs/StatusPill';
import type { CostPlanItem } from '@/components/Admin/costs/types';
import { setCostPlanStatus } from '@/app/(admin)/admin/(protected)/_actions/costs';
import {
  COST_CATEGORIES,
  COST_CATEGORY_LABELS,
  COST_PLAN_STATUS_LABELS,
  COST_PLAN_STATUSES,
  type CostPlanStatus,
} from '@/lib/costFields';
import { cn } from '@/lib/utils';

/**
 * The /admin/costs/plans roster: every recurring cost grouped under its kind,
 * each row a button opening the edit dialog (there is no per-plan route; the
 * dialog IS the editor — the CareersRoster / ClientsGrid model). Search and
 * the status chips filter client-side over the whole set (a studio has tens of
 * these, not thousands).
 *
 * `openPlanId` is the ?plan= deep link — consumed by an effect (the ?task= /
 * ?role= recipe): open the dialog once per arriving id, strip the param, reset
 * the guard when it's gone, so re-picking the same plan reopens it.
 */
export default function CostPlansRoster({
  items,
  openPlanId = null,
  initialQuery = '',
}: {
  items: CostPlanItem[];
  openPlanId?: string | null;
  initialQuery?: string;
}) {
  const router = useRouter();
  // The id, not the item: a save re-renders the route while the dialog may
  // still be open, and deriving from fresh `items` keeps what it shows live.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState<CostPlanStatus | null>(null);
  // The row whose quick status flip is in flight, with the value it is moving
  // to — the select shows it until the fresh tree lands (or the action refuses
  // and the stored value reasserts itself).
  const [flip, setFlip] = useState<{ id: string; status: CostPlanStatus } | null>(
    null,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const consumedOpenId = useRef<string | null>(null);
  useEffect(() => {
    if (!openPlanId) {
      consumedOpenId.current = null;
      return;
    }
    if (consumedOpenId.current === openPlanId) return;
    consumedOpenId.current = openPlanId;
    setSelectedId(openPlanId);
    router.replace(
      `/admin/costs/plans${initialQuery ? `?q=${encodeURIComponent(initialQuery)}` : ''}`,
      { scroll: false },
    );
  }, [openPlanId, initialQuery, router]);

  const selected =
    selectedId === null
      ? null
      : (items.find((i) => i.id === selectedId) ?? null);

  // Focus on arrival, `/` from anywhere, Escape to clear then let go — but
  // never when a ?plan= deep link is opening the dialog in the same commit.
  useSearchFocus(inputRef, {
    autoFocus: !openPlanId,
    onClear: () => setQuery(''),
  });

  const q = query.trim().toLowerCase();
  const matchesQuery = (i: CostPlanItem) =>
    !q ||
    i.name.toLowerCase().includes(q) ||
    i.vendor.toLowerCase().includes(q) ||
    i.categoryLabel.toLowerCase().includes(q) ||
    i.note.toLowerCase().includes(q);
  const visible = items.filter(
    (i) => (!status || i.status === status) && matchesQuery(i),
  );
  const filtered = q !== '' || status !== null;

  const counts = COST_PLAN_STATUSES.reduce<Record<CostPlanStatus, number>>(
    (acc, s) => ({ ...acc, [s]: items.filter((i) => i.status === s).length }),
    { active: 0, paused: 0, cancelled: 0 },
  );

  // Group in the fixed category order; a kind with nothing under it is simply
  // absent (unlike careers, a category here is a vocabulary value, not a row
  // someone just created and wants to see).
  const groups = COST_CATEGORIES.map((slug) => ({
    slug,
    label: COST_CATEGORY_LABELS[slug],
    rows: visible.filter((i) => i.category === slug),
  })).filter((g) => g.rows.length > 0);

  async function quickStatus(item: CostPlanItem, next: CostPlanStatus) {
    if (next === item.status || flip) return;
    setFlip({ id: item.id, status: next });
    const res = await safeAction(setCostPlanStatus(item.id, next));
    setFlip(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(
      `${item.name} is now ${COST_PLAN_STATUS_LABELS[next].toLowerCase()}.`,
    );
  }

  return (
    <>
      {/* Toolbar — search, status chips, live count (the careers strip). */}
      <div className="flex flex-wrap items-center gap-3 border-b border-white/40 px-3 py-2.5 sm:px-4 dark:border-white/10">
        <span className="relative w-full sm:w-64">
          <LuSearch
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, vendor, or kind"
            aria-label="Search recurring costs by name, vendor, kind, or note"
            className={cn(glassField, 'h-8 w-full pr-2.5 pl-8 text-sm')}
          />
        </span>
        <div
          role="group"
          aria-label="Filter by status"
          className="flex flex-wrap items-center gap-1.5"
        >
          <button
            type="button"
            onClick={() => setStatus(null)}
            aria-pressed={status === null}
            className={chipClasses(status === null)}
          >
            All ({items.length})
          </button>
          {COST_PLAN_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              aria-pressed={status === s}
              className={chipClasses(status === s)}
            >
              {COST_PLAN_STATUS_LABELS[s]} ({counts[s]})
            </button>
          ))}
        </div>
        <span
          aria-live="polite"
          className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground"
        >
          {filtered
            ? `${visible.length} of ${items.length}`
            : `${items.length} cost${items.length === 1 ? '' : 's'}`}
        </span>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={LuReceipt}
          title="No recurring costs yet"
          description="Add the subscriptions and tools the studio pays for each month."
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={LuSearch}
          title="Nothing matches"
          description={
            q
              ? `Nothing matches “${query.trim()}”${status ? ` among ${COST_PLAN_STATUS_LABELS[status].toLowerCase()} costs` : ''}.`
              : `No ${status ? COST_PLAN_STATUS_LABELS[status].toLowerCase() : ''} costs right now.`
          }
          action={
            <Button
              type="button"
              variant="secondary"
              size="small"
              showIcon={false}
              onClick={() => {
                setQuery('');
                setStatus(null);
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        groups.map(({ slug, label, rows }) => {
          const activeCount = rows.filter((r) => r.status === 'active').length;
          return (
            <section key={slug} aria-labelledby={`costs-kind-${slug}`}>
              <div className="flex items-center gap-2.5 border-b border-white/40 bg-foreground/[0.03] px-4 py-2 sm:px-5 dark:border-white/10">
                <h2
                  id={`costs-kind-${slug}`}
                  className="truncate text-sm font-medium text-foreground"
                >
                  {label}
                </h2>
                {activeCount > 0 && (
                  <span className="inline-flex shrink-0 items-center rounded-full border border-transparent bg-foreground px-2 py-0.5 text-[0.65rem] font-medium text-background">
                    {activeCount} active
                  </span>
                )}
                <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
                  {rows.length} {rows.length === 1 ? 'cost' : 'costs'}
                </span>
              </div>
              <ul className="divide-y divide-white/40 dark:divide-white/10">
                {rows.map((item) => {
                  const shownStatus =
                    flip?.id === item.id ? flip.status : item.status;
                  return (
                    <li
                      key={item.id}
                      className={cn(
                        // Phones: the body takes the full width and the status
                        // control drops to its own line; sm+: one row.
                        'flex flex-wrap items-center sm:flex-nowrap sm:gap-3 sm:pr-5',
                        glassRowHover,
                      )}
                    >
                      {/* The row body. The status select is a SIBLING —
                          interactive content can't nest in <button>. */}
                      <button
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        className="flex min-w-0 flex-1 basis-full flex-col gap-1 px-4 pt-3 pb-2 text-left sm:basis-auto sm:px-5 sm:py-3"
                      >
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="truncate text-sm font-medium text-foreground">
                            {item.name}
                          </span>
                          <PlanStatusPill status={item.status} />
                        </span>
                        <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                          <span className="tabular-nums text-foreground/80">
                            {item.expectedLabel}
                          </span>
                          {item.runRateLabel && (
                            <span className="tabular-nums">
                              · {item.runRateLabel}
                            </span>
                          )}
                          <span>· {item.vendor}</span>
                          {item.billingHint && <span>· {item.billingHint}</span>}
                        </span>
                        <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                          <span>
                            {item.charges === 0
                              ? 'No charges recorded yet'
                              : `${item.charges} ${item.charges === 1 ? 'charge' : 'charges'} recorded`}
                          </span>
                          {item.lastChargeLabel && (
                            <span>· last {item.lastChargeLabel}</span>
                          )}
                        </span>
                      </button>

                      <div className="flex basis-full items-center justify-end gap-3 px-4 pb-3 sm:basis-auto sm:px-0 sm:pb-0">
                        {/* Never natively disable the control being changed
                            (it would drop focus mid-flight); the guard in
                            quickStatus already serialises writes, so only the
                            OTHER rows wait. */}
                        <select
                          value={shownStatus}
                          onChange={(e) =>
                            void quickStatus(
                              item,
                              e.target.value as CostPlanStatus,
                            )
                          }
                          disabled={flip !== null && flip.id !== item.id}
                          aria-busy={flip?.id === item.id || undefined}
                          aria-label={`Status of ${item.name}`}
                          className={cn(
                            glassField,
                            'h-8 shrink-0 px-2 text-xs disabled:cursor-not-allowed disabled:opacity-60',
                          )}
                        >
                          {COST_PLAN_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {COST_PLAN_STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}

      <PlanDialog
        open={selected !== null}
        onOpenChange={(next) => !next && setSelectedId(null)}
        plan={selected}
      />
    </>
  );
}
