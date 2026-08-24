'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  LuEye,
  LuEyeOff,
  LuPencil,
  LuPlus,
  LuRepeat,
  LuSearch,
} from 'react-icons/lu';

import Button from '@/components/Button';
import EmptyState from '@/components/Admin/EmptyState';
import { useSearchFocus } from '@/hooks/useSearchFocus';
import { adminLink, glassField, glassRowHover } from '@/components/Admin/Glass';
import { chipClasses } from '@/components/Admin/portfolio/PortfolioChips';
import { safeAction } from '@/components/Admin/inbox/safeAction';
import MemberDialog, {
  type LinkableAccount,
} from '@/components/Admin/payroll/MemberDialog';
import TermDialog from '@/components/Admin/payroll/TermDialog';
import PlanDialog from '@/components/Admin/costs/PlanDialog';
import type { CommitmentItem } from '@/components/Admin/spend/types';
import { setPayrollSelfView } from '@/app/(admin)/admin/(protected)/_actions/payroll';
import { setCostPlanStatus } from '@/app/(admin)/admin/(protected)/_actions/costs';
import {
  COMMITMENT_KINDS,
  COMMITMENT_STATUSES,
  COMMITMENT_STATUS_LABELS,
  COMMITMENT_STATUS_TONES,
  type CommitmentKind,
  type CommitmentStatus,
} from '@/lib/spendFields';
import {
  COST_PLAN_STATUSES,
  COST_PLAN_STATUS_LABELS,
  type CostPlanStatus,
} from '@/lib/costFields';
import { cn } from '@/lib/utils';

/**
 * The merged commitments roster — every person the studio pays and every
 * recurring cost it carries, in ONE list sorted by what each costs per month.
 *
 * That sort is the whole point: a salary and a subscription only compare once
 * they share a column, and until they did, "what are we actually committed to
 * every month" was a question no single screen could answer.
 *
 * IT MERGES THE LIST AND NOTHING ELSE. Every edit opens the dialog that domain
 * already owns — MemberDialog, TermDialog, PlanDialog — so each write keeps its
 * own server action, its own validation and its own audit row. This component
 * knows how to lay out two kinds of row; it does not know how to save either
 * one, and it must stay that way.
 *
 * The halves are gated upstream by requireCommitments(), which reads only what
 * the viewer holds. A costs-only viewer therefore receives no person rows at
 * all — they are absent from the payload, not hidden in CSS — and the heading
 * says "Recurring costs" rather than a whole-sounding label over half the data.
 */

const BASE = '/admin/spend/commitments';

const TRANSPORT = {
  ok: false as const,
  error: 'Something went wrong — try again.',
};

function Chip({ label, tone }: { label: string; tone: string }) {
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

export default function CommitmentsRoster({
  items,
  people,
  plans,
  accounts,
  openMemberId = null,
  openPlanId = null,
  initialQuery = '',
}: {
  items: CommitmentItem[];
  /** Whether the viewer holds payroll — gates the person rows and dialogs. */
  people: boolean;
  /** Whether the viewer holds costs. */
  plans: boolean;
  accounts: LinkableAccount[];
  openMemberId?: string | null;
  openPlanId?: string | null;
  initialQuery?: string;
}) {
  const router = useRouter();
  // The id, not the item: a save re-renders the route (the action's
  // layout-scope revalidation) while a dialog may still be open, and deriving
  // from the fresh `items` keeps what it shows live.
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [termForId, setTermForId] = useState<string | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [kind, setKind] = useState<CommitmentKind | null>(null);
  const [status, setStatus] = useState<CommitmentStatus | null>(null);
  const [selfView, setSelfView] = useState<Record<string, boolean>>({});
  // The row whose quick status flip is in flight, with the value it is moving
  // to — the select shows it until the fresh tree lands (or the action refuses
  // and the stored value reasserts itself).
  const [flip, setFlip] = useState<{ id: string; status: CostPlanStatus } | null>(
    null,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const persons = items.filter((i) => i.kind === 'person');
  const planItems = items.filter((i) => i.kind === 'plan');

  const findPerson = (id: string | null) =>
    persons.find((p) => p.id === id) ?? null;
  const findPlan = (id: string | null) =>
    planItems.find((p) => p.id === id) ?? null;

  // ?member= / ?plan= deep links, on the ?task= / ?role= recipe: open the
  // dialog once per arriving id, strip the param, and reset the guard when it
  // is gone so re-picking the same row opens it again.
  const consumedMember = useRef<string | null>(null);
  const consumedPlan = useRef<string | null>(null);
  const backTo = `${BASE}${initialQuery ? `?q=${encodeURIComponent(initialQuery)}` : ''}`;

  useEffect(() => {
    if (!openMemberId) {
      consumedMember.current = null;
      return;
    }
    if (consumedMember.current === openMemberId) return;
    consumedMember.current = openMemberId;
    setEditingMemberId(openMemberId);
    router.replace(backTo, { scroll: false });
  }, [openMemberId, backTo, router]);

  useEffect(() => {
    if (!openPlanId) {
      consumedPlan.current = null;
      return;
    }
    if (consumedPlan.current === openPlanId) return;
    consumedPlan.current = openPlanId;
    setEditingPlanId(openPlanId);
    router.replace(backTo, { scroll: false });
  }, [openPlanId, backTo, router]);

  // Focus on arrival, `/` from anywhere, Escape to clear then let go — but
  // never when a deep link is opening a dialog in the same commit.
  useSearchFocus(inputRef, {
    autoFocus: !openMemberId && !openPlanId,
    onClear: () => setQuery(''),
  });

  const q = query.trim().toLowerCase();
  const matches = (i: CommitmentItem) =>
    !q ||
    i.name.toLowerCase().includes(q) ||
    i.termLabel.toLowerCase().includes(q) ||
    i.metaLabel.toLowerCase().includes(q) ||
    i.kindLabel.toLowerCase().includes(q);

  const visible = items.filter(
    (i) =>
      (!kind || i.kind === kind) &&
      (!status || i.status === status) &&
      matches(i),
  );
  const filtered = q !== '' || kind !== null || status !== null;

  const statusCounts = COMMITMENT_STATUSES.reduce<
    Record<CommitmentStatus, number>
  >(
    (acc, s) => ({ ...acc, [s]: items.filter((i) => i.status === s).length }),
    { active: 0, paused: 0, ended: 0 },
  );

  const isVisible = (item: Extract<CommitmentItem, { kind: 'person' }>) =>
    selfView[item.id] ?? item.member.selfViewEnabled;

  async function toggleSelfView(
    item: Extract<CommitmentItem, { kind: 'person' }>,
  ) {
    const next = !isVisible(item);
    // Optimistic with rollback (the AreaToggles pattern): this is the switch
    // that gets flipped most, and a round trip before the icon moves feels
    // broken.
    setSelfView((prev) => ({ ...prev, [item.id]: next }));
    let res;
    try {
      res = (await setPayrollSelfView(item.id, next)) ?? TRANSPORT;
    } catch {
      res = TRANSPORT;
    }
    if (!res.ok) {
      setSelfView((prev) => ({ ...prev, [item.id]: !next }));
      toast.error(res.error);
      return;
    }
    toast.success(
      next
        ? `${item.name} can now see their own pay.`
        : `${item.name}’s pay is hidden from them.`,
    );
  }

  async function quickStatus(
    item: Extract<CommitmentItem, { kind: 'plan' }>,
    next: CostPlanStatus,
  ) {
    if (next === item.plan.status || flip) return;
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

  const editingMember = findPerson(editingMemberId);
  const editingPlan = findPlan(editingPlanId);
  const termFor = findPerson(termForId);

  return (
    <>
      {/* Toolbar — search, kind and status chips, live count. */}
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
            placeholder="Search name, amount, or vendor"
            aria-label="Search commitments by name, amount, vendor, or dates"
            className={cn(glassField, 'h-8 w-full pr-2.5 pl-8 text-sm')}
          />
        </span>

        {/* Only offered when there are genuinely two kinds to choose between —
            a single-grant viewer gets no chip that filters to nothing. */}
        {people && plans && (
          <div
            role="group"
            aria-label="Filter by kind"
            className="flex flex-wrap items-center gap-1.5"
          >
            <button
              type="button"
              onClick={() => setKind(null)}
              aria-pressed={kind === null}
              className={chipClasses(kind === null)}
            >
              All ({items.length})
            </button>
            {COMMITMENT_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                aria-pressed={kind === k}
                className={chipClasses(kind === k)}
              >
                {k === 'person' ? 'People' : 'Costs'} (
                {k === 'person' ? persons.length : planItems.length})
              </button>
            ))}
          </div>
        )}

        <div
          role="group"
          aria-label="Filter by status"
          className="flex flex-wrap items-center gap-1.5"
        >
          {COMMITMENT_STATUSES.filter((s) => statusCounts[s] > 0).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(status === s ? null : s)}
              aria-pressed={status === s}
              className={chipClasses(status === s)}
            >
              {COMMITMENT_STATUS_LABELS[s]} ({statusCounts[s]})
            </button>
          ))}
        </div>

        <span
          aria-live="polite"
          className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground"
        >
          {filtered
            ? `${visible.length} of ${items.length}`
            : `${items.length} ${items.length === 1 ? 'commitment' : 'commitments'}`}
        </span>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={LuRepeat}
          title="Nothing recurring yet"
          description={
            people && plans
              ? 'Add the people on the payroll and the subscriptions the studio pays for, and they will line up here by what each costs a month.'
              : people
                ? 'Add a member, set their standing salary, then start a month.'
                : 'Add the subscriptions and tools the studio pays for each month.'
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={LuSearch}
          title="Nothing matches"
          description={
            q
              ? `Nothing matches “${query.trim()}” with the filters you have on.`
              : 'No commitments match the filters you have on.'
          }
          action={
            <Button
              type="button"
              variant="secondary"
              size="small"
              showIcon={false}
              onClick={() => {
                setQuery('');
                setKind(null);
                setStatus(null);
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-white/40 dark:divide-white/10">
          {visible.map((item) => (
            <li
              key={item.key}
              className={cn(
                'flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-5',
                glassRowHover,
              )}
            >
              {/* Identity */}
              <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                <div className="flex flex-wrap items-center gap-2">
                  {item.href ? (
                    <Link
                      href={item.href}
                      className={cn('font-medium text-foreground', adminLink)}
                    >
                      {item.name}
                    </Link>
                  ) : (
                    <span className="font-medium text-foreground">
                      {item.name}
                    </span>
                  )}
                  <Chip label={item.kindLabel} tone={item.kindTone} />
                  <Chip
                    label={item.statusLabel}
                    tone={COMMITMENT_STATUS_TONES[item.status]}
                  />
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {item.termLabel}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {item.metaLabel}
                </p>
              </div>

              {/* The comparable figure — the column the merge exists for. */}
              <div className="shrink-0 text-right">
                <p className="text-base font-semibold tabular-nums text-foreground">
                  {item.monthlyLabel}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    /mo
                  </span>
                </p>
                {item.monthlyNote && (
                  <p className="text-[0.7rem] text-muted-foreground">
                    {item.monthlyNote}
                  </p>
                )}
              </div>

              {/* Actions — each opens the dialog its own domain owns. */}
              <div className="flex shrink-0 items-center gap-1.5">
                {item.kind === 'person' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void toggleSelfView(item)}
                      disabled={!item.member.userId}
                      aria-pressed={isVisible(item)}
                      title={
                        !item.member.userId
                          ? 'No linked account to show it to'
                          : isVisible(item)
                            ? 'They can see their own pay'
                            : 'Hidden from them'
                      }
                      className={cn(
                        'inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                        isVisible(item) && item.member.userId
                          ? 'border-transparent bg-foreground text-background'
                          : 'border-white/50 bg-white/40 text-muted-foreground hover:text-foreground dark:border-white/15 dark:bg-white/10',
                      )}
                    >
                      {isVisible(item) ? (
                        <LuEye className="size-4" aria-hidden="true" />
                      ) : (
                        <LuEyeOff className="size-4" aria-hidden="true" />
                      )}
                      <span className="sr-only">
                        {isVisible(item)
                          ? `Hide ${item.name}’s pay from them`
                          : `Show ${item.name} their pay`}
                      </span>
                    </button>
                    <Button
                      variant="secondary"
                      size="small"
                      showIcon={false}
                      onClick={() => setTermForId(item.id)}
                    >
                      Salary
                    </Button>
                    <Button
                      variant="secondary"
                      size="small"
                      icon={LuPencil}
                      iconPosition="left"
                      onClick={() => setEditingMemberId(item.id)}
                    >
                      Edit
                    </Button>
                  </>
                ) : (
                  <>
                    {/* Never natively disable the control being changed (it
                        would drop focus mid-flight); the guard in quickStatus
                        already serialises writes, so only the OTHER rows wait. */}
                    <select
                      value={
                        flip?.id === item.id ? flip.status : item.plan.status
                      }
                      onChange={(e) =>
                        void quickStatus(item, e.target.value as CostPlanStatus)
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
                    <Button
                      variant="secondary"
                      size="small"
                      icon={LuPencil}
                      iconPosition="left"
                      onClick={() => setEditingPlanId(item.id)}
                    >
                      Edit
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* One instance of each dialog, driven by the selected row. */}
      {people && (
        <>
          <MemberDialog
            open={editingMember !== null}
            onOpenChange={(next) => {
              if (!next) setEditingMemberId(null);
            }}
            member={editingMember?.member ?? null}
            accounts={accounts}
          />
          {termFor && (
            <TermDialog
              open
              onOpenChange={(next) => {
                if (!next) setTermForId(null);
              }}
              memberId={termFor.id}
              memberName={termFor.name}
              defaultCurrency={termFor.member.payCurrency}
            />
          )}
        </>
      )}
      {plans && (
        <PlanDialog
          open={editingPlan !== null}
          onOpenChange={(next) => {
            if (!next) setEditingPlanId(null);
          }}
          plan={editingPlan?.plan ?? null}
        />
      )}
    </>
  );
}

/**
 * The header's create affordances — one per kind the viewer actually holds,
 * each owning its own dialog instance (the AddPlanButton / AddEntryButton
 * precedent, so a create dialog's seed guard is never entangled with the edit
 * dialog's selected row).
 */
export function AddCommitmentButtons({
  people,
  plans,
  accounts,
}: {
  people: boolean;
  plans: boolean;
  accounts: LinkableAccount[];
}) {
  const [addingMember, setAddingMember] = useState(false);
  const [addingPlan, setAddingPlan] = useState(false);

  return (
    <>
      {people && (
        <Button
          type="button"
          variant="secondary"
          size="small"
          icon={LuPlus}
          iconPosition="left"
          onClick={() => setAddingMember(true)}
        >
          Add member
        </Button>
      )}
      {plans && (
        <Button
          type="button"
          size="small"
          icon={LuPlus}
          iconPosition="left"
          onClick={() => setAddingPlan(true)}
        >
          Add cost
        </Button>
      )}

      {people && (
        <MemberDialog
          open={addingMember}
          onOpenChange={setAddingMember}
          member={null}
          accounts={accounts}
        />
      )}
      {plans && (
        <PlanDialog
          open={addingPlan}
          onOpenChange={setAddingPlan}
          plan={null}
        />
      )}
    </>
  );
}
