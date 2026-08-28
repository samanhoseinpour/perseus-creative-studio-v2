'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog } from 'radix-ui';
import { toast } from 'sonner';

import Button from '@/components/Button';
import { Input } from '@/components/ui/input';
import GlassDialog from '@/components/Admin/GlassDialog';
import ConfirmDialog from '@/components/Admin/ConfirmDialog';
import { ChipGroup } from '@/components/Admin/portfolio/PortfolioChips';
import { safeAction } from '@/components/Admin/inbox/safeAction';
import {
  Field,
  selectClasses,
  textareaClasses,
} from '@/components/Admin/careers/FormField';
import type {
  CostEntryItem,
  CostEntryPrefill,
  CostPlanOption,
} from '@/components/Admin/costs/types';
import {
  createCostEntry,
  deleteCostEntry,
  updateCostEntry,
  type CostMutationResult,
} from '@/app/(admin)/admin/(protected)/_actions/costs';
import { flattenCostIssues, costEntrySchema } from '@/lib/costSchema';
import {
  COST_CATEGORIES,
  COST_CATEGORY_LABELS,
  COST_NOTE_MAX,
  type CostCategory,
} from '@/lib/costFields';

const SERVER_ERROR: CostMutationResult = { ok: false, error: 'server' };

const CATEGORY_OPTIONS = COST_CATEGORIES.map((slug) => ({
  slug,
  label: COST_CATEGORY_LABELS[slug],
}));

const dropIssues = (issues: Record<string, string>, ...keys: string[]) =>
  Object.fromEntries(Object.entries(issues).filter(([k]) => !keys.includes(k)));

/** The <form> the pinned footer's submit button points at. */
const FORM_ID = 'cost-entry-form';

const BLANK = {
  planId: '',
  chargedOn: '',
  name: '',
  vendor: '',
  amount: '',
  billedNote: '',
  invoiceRef: '',
  note: '',
};

type Values = typeof BLANK;

/**
 * Create/edit form for one charge — the ledger row that money actually left on.
 *
 * Picking a plan copies its name, vendor, kind and expected amount in: that is
 * the pre-fill, and it is deliberately a SUGGESTION, exactly as payroll's
 * computed amounts are. June's Claude bill pre-fills at 299.60 and gets typed
 * over with the 295.81 the invoice actually says. Nothing is ever recorded
 * that wasn't confirmed here.
 *
 * `month` is the bucket every total groups by; `chargedOn` is the invoice date.
 * The schema requires them to agree, because a charge filed under the wrong
 * month is the one mistake that silently moves money between two totals.
 */
export default function EntryDialog({
  open,
  onOpenChange,
  entry,
  plans,
  month,
  prefill = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create mode. */
  entry: CostEntryItem | null;
  plans: CostPlanOption[];
  /** The month a newly created charge lands in. */
  month: string;
  /** Seeds create mode from an expected-but-not-recorded plan. */
  prefill?: CostEntryPrefill | null;
}) {
  const [values, setValues] = useState<Values>(BLANK);
  const [category, setCategory] = useState<CostCategory>('subscription');
  const [monthValue, setMonthValue] = useState(month);
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const editing = entry !== null;

  const seededFor = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      seededFor.current = null;
      return;
    }
    const seedKey = entry ? entry.id : `__create__${prefill?.planId ?? ''}`;
    if (seededFor.current === seedKey) return;
    seededFor.current = seedKey;
    if (entry) {
      setValues({
        planId: entry.planId ?? '',
        chargedOn: entry.chargedOn,
        name: entry.name,
        vendor: entry.vendor,
        amount: entry.amountValue,
        billedNote: entry.billedNote,
        invoiceRef: entry.invoiceRef,
        note: entry.note,
      });
      setCategory(entry.category as CostCategory);
      setMonthValue(entry.month);
    } else {
      setValues({
        ...BLANK,
        planId: prefill?.planId ?? '',
        name: prefill?.name ?? '',
        vendor: prefill?.vendor ?? '',
        amount: prefill?.amount ?? '',
      });
      setCategory((prefill?.category as CostCategory) ?? 'subscription');
      setMonthValue(month);
    }
    setIssues({});
  }, [open, entry, prefill, month]);

  function close(next: boolean) {
    if (pending || deleting) return;
    onOpenChange(next);
  }

  function setValue(key: keyof Values, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    setIssues((prev) => dropIssues(prev, key));
  }

  /**
   * Picking a plan carries its details across. It overwrites what is in the
   * fields, and that is intended: choosing a plan is an explicit act, and the
   * whole point of the picker is to stop retyping "Anthropic / Claude Max /
   * 299.60" twelve times a year.
   */
  function pickPlan(planId: string) {
    const plan = plans.find((p) => p.id === planId);
    setValues((v) => ({
      ...v,
      planId,
      ...(plan
        ? { name: plan.name, vendor: plan.vendor, amount: plan.expectedValue || v.amount }
        : {}),
    }));
    if (plan) setCategory(plan.category as CostCategory);
    setIssues((prev) => dropIssues(prev, 'planId', 'name', 'vendor', 'amount'));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = costEntrySchema.safeParse({
      planId: values.planId,
      month: monthValue,
      chargedOn: values.chargedOn,
      name: values.name,
      vendor: values.vendor,
      category,
      amount: values.amount,
      billedNote: values.billedNote,
      invoiceRef: values.invoiceRef,
      note: values.note,
    });
    if (!parsed.success) {
      setIssues(flattenCostIssues(parsed.error));
      return;
    }
    setPending(true);
    let res: CostMutationResult;
    try {
      res =
        (editing
          ? await updateCostEntry(entry.id, parsed.data)
          : await createCostEntry(parsed.data)) ?? SERVER_ERROR;
    } catch {
      res = SERVER_ERROR;
    }
    setPending(false);
    if (!res.ok) {
      if (res.error === 'validation') {
        setIssues(res.issues);
        return;
      }
      toast.error('Something went wrong. Try again.');
      return;
    }
    toast.success(editing ? 'Charge saved.' : `Recorded ${parsed.data.name}.`);
    onOpenChange(false);
  }

  async function onDelete() {
    if (!entry) return;
    setDeleting(true);
    const res = await safeAction(deleteCostEntry(entry.id));
    setDeleting(false);
    setConfirmingDelete(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success('Charge deleted.');
    onOpenChange(false);
  }

  return (
    <>
      <GlassDialog
        open={open}
        onOpenChange={close}
        maxWidth="34rem"
        header={
          <>
            <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
              {editing ? entry.name : 'Record a charge'}
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-muted-foreground">
              What actually left the bank, in CAD. Correct the amount to match
              the invoice, because the plan’s figure is only a starting point.
            </Dialog.Description>
          </>
        }
        footer={
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button
              type="submit"
              form={FORM_ID}
              size="small"
              shimmer={false}
              showIcon={false}
              disabled={pending || deleting}
              className="w-full sm:w-auto"
            >
              {pending ? 'Saving…' : editing ? 'Save changes' : 'Record charge'}
            </Button>
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="secondary"
                size="small"
                showIcon={false}
                disabled={pending || deleting}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
            </Dialog.Close>
            {editing && (
              <div className="flex flex-1 items-center">
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  showIcon={false}
                  disabled={pending || deleting}
                  onClick={() => setConfirmingDelete(true)}
                  className="text-destructive"
                >
                  Delete
                </Button>
              </div>
            )}
          </div>
        }
      >
        <form id={FORM_ID} onSubmit={onSubmit} className="flex flex-col gap-4">
          {issues._form && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/[0.06] px-3 py-2 text-xs text-destructive"
            >
              {issues._form}
            </p>
          )}

          <Field
            id="entry-plan"
            label="Recurring cost"
            error={issues.planId}
            hint="Leave as “One-off” for something that isn’t on a plan."
          >
            <select
              id="entry-plan"
              value={values.planId}
              onChange={(e) => pickPlan(e.target.value)}
              className={selectClasses}
              aria-invalid={Boolean(issues.planId)}
            >
              <option value="">One-off (no plan)</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.vendor}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="entry-name" label="What it was for" error={issues.name}>
              <Input
                id="entry-name"
                value={values.name}
                onChange={(e) => setValue('name', e.target.value)}
                placeholder="Claude Max"
                aria-invalid={Boolean(issues.name)}
              />
            </Field>

            <Field id="entry-vendor" label="Who billed us" error={issues.vendor}>
              <Input
                id="entry-vendor"
                value={values.vendor}
                onChange={(e) => setValue('vendor', e.target.value)}
                placeholder="Anthropic"
                aria-invalid={Boolean(issues.vendor)}
              />
            </Field>
          </div>

          <ChipGroup
            legend="Kind of cost"
            options={CATEGORY_OPTIONS}
            value={category}
            onChange={setCategory}
            error={issues.category}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="entry-amount"
              label="Amount charged (CAD)"
              error={issues.amount}
            >
              <Input
                id="entry-amount"
                inputMode="decimal"
                value={values.amount}
                onChange={(e) => setValue('amount', e.target.value)}
                placeholder="295.81"
                aria-invalid={Boolean(issues.amount)}
              />
            </Field>

            <Field
              id="entry-billed"
              label="Billed as"
              error={issues.billedNote}
              hint="Optional, e.g. US$20.00 if they quote another currency."
            >
              <Input
                id="entry-billed"
                value={values.billedNote}
                onChange={(e) => setValue('billedNote', e.target.value)}
                placeholder="US$20.00"
                aria-invalid={Boolean(issues.billedNote)}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="entry-month"
              label="Counts toward"
              error={issues.month}
              hint="The month this charge is totalled in."
            >
              <Input
                id="entry-month"
                type="month"
                value={monthValue}
                onChange={(e) => {
                  setMonthValue(e.target.value);
                  setIssues((prev) => dropIssues(prev, 'month', 'chargedOn'));
                }}
                aria-invalid={Boolean(issues.month)}
              />
            </Field>

            <Field
              id="entry-charged"
              label="Charge date"
              error={issues.chargedOn}
              hint="Optional: the date on the invoice."
            >
              <Input
                id="entry-charged"
                type="date"
                value={values.chargedOn}
                onChange={(e) => setValue('chargedOn', e.target.value)}
                aria-invalid={Boolean(issues.chargedOn)}
              />
            </Field>
          </div>

          <Field
            id="entry-invoice"
            label="Invoice reference"
            error={issues.invoiceRef}
            hint="Optional: the vendor’s invoice number, if you have it."
          >
            <Input
              id="entry-invoice"
              value={values.invoiceRef}
              onChange={(e) => setValue('invoiceRef', e.target.value)}
              aria-invalid={Boolean(issues.invoiceRef)}
            />
          </Field>

          <Field id="entry-note" label="Note" error={issues.note}>
            <textarea
              id="entry-note"
              rows={2}
              maxLength={COST_NOTE_MAX}
              value={values.note}
              onChange={(e) => setValue('note', e.target.value)}
              className={textareaClasses}
              aria-invalid={Boolean(issues.note)}
            />
          </Field>
        </form>
      </GlassDialog>

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={(next) => !deleting && setConfirmingDelete(next)}
        title="Delete this charge?"
        description="It comes straight out of the month's total. The activity log keeps a record that it was deleted."
        confirmLabel="Delete charge"
        onConfirm={onDelete}
        destructive
        pending={deleting}
      />
    </>
  );
}
