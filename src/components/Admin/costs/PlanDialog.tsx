'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog } from 'radix-ui';
import { toast } from 'sonner';
import { LuPlus } from 'react-icons/lu';

import Button from '@/components/Button';
import { Input } from '@/components/ui/input';
import GlassDialog from '@/components/Admin/GlassDialog';
import ConfirmDialog from '@/components/Admin/ConfirmDialog';
import { ChipGroup } from '@/components/Admin/portfolio/PortfolioChips';
import { safeAction } from '@/components/Admin/inbox/safeAction';
import { Field, textareaClasses } from '@/components/Admin/careers/FormField';
import type { CostPlanItem } from '@/components/Admin/costs/types';
import {
  createCostPlan,
  deleteCostPlan,
  updateCostPlan,
  type CostMutationResult,
} from '@/app/(admin)/admin/(protected)/_actions/costs';
import { flattenCostIssues, costPlanSchema } from '@/lib/costSchema';
import {
  BILLING_DAY_MAX,
  COST_CADENCE_LABELS,
  COST_CADENCES,
  COST_CATEGORIES,
  COST_CATEGORY_LABELS,
  COST_NOTE_MAX,
  COST_PLAN_STATUS_LABELS,
  COST_PLAN_STATUSES,
  type CostCadence,
  type CostCategory,
  type CostPlanStatus,
} from '@/lib/costFields';

const SERVER_ERROR: CostMutationResult = { ok: false, error: 'server' };

const CATEGORY_OPTIONS = COST_CATEGORIES.map((slug) => ({
  slug,
  label: COST_CATEGORY_LABELS[slug],
}));

const CADENCE_OPTIONS = COST_CADENCES.map((slug) => ({
  slug,
  label: COST_CADENCE_LABELS[slug],
}));

const STATUS_OPTIONS = COST_PLAN_STATUSES.map((slug) => ({
  slug,
  label: COST_PLAN_STATUS_LABELS[slug],
}));

const BLANK = {
  name: '',
  vendor: '',
  expectedAmount: '',
  billingDay: '',
  startedOn: '',
  endedOn: '',
  note: '',
};

type Values = typeof BLANK;

/** The issues map minus the given keys — clearing a field's error as it is
 *  edited (the OpeningDialog helper). */
const dropIssues = (issues: Record<string, string>, ...keys: string[]) =>
  Object.fromEntries(Object.entries(issues).filter(([k]) => !keys.includes(k)));

/** '' → undefined, anything else → Number (the schema judges the result). */
const numberOrUndefined = (s: string): number | undefined =>
  s.trim() === '' ? undefined : Number(s);

/** The <form> the pinned footer's submit button points at. */
const FORM_ID = 'cost-plan-form';

/**
 * Create/edit form for one recurring cost, in the admin's glass dialog shell
 * (the OpeningDialog pattern).
 *
 * The schema — run here first for instant field errors, then authoritatively
 * in the action — refuses a quarterly or yearly plan without a start date,
 * because that date is the anchor the "expected this month" list beats from.
 * The expected amount is optional on purpose: a usage-billed plan has no fixed
 * figure, and it contributes nothing to the run-rate rather than a guess.
 */
export default function PlanDialog({
  open,
  onOpenChange,
  plan,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create mode. */
  plan: CostPlanItem | null;
}) {
  const [values, setValues] = useState<Values>(BLANK);
  const [category, setCategory] = useState<CostCategory>('subscription');
  const [cadence, setCadence] = useState<CostCadence>('monthly');
  const [status, setStatus] = useState<CostPlanStatus>('active');
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const editing = plan !== null;

  // Which plan the form was last seeded from (a sentinel for create mode). The
  // roster derives `plan` from fresh server data, so a revalidation re-render
  // swaps the object identity mid-edit — this ref is what stops that from
  // clobbering typed-but-unsaved values. Reset on close so reopening seeds fresh.
  const seededFor = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      seededFor.current = null;
      return;
    }
    const seedKey = plan ? plan.id : '__create__';
    if (seededFor.current === seedKey) return;
    seededFor.current = seedKey;
    if (plan) {
      setValues({
        name: plan.name,
        vendor: plan.vendor,
        expectedAmount: plan.expectedValue,
        billingDay: plan.billingDay,
        startedOn: plan.startedOn,
        endedOn: plan.endedOn,
        note: plan.note,
      });
      setCategory(plan.category as CostCategory);
      setCadence(plan.cadence as CostCadence);
      setStatus(plan.status);
    } else {
      setValues(BLANK);
      setCategory('subscription');
      setCadence('monthly');
      setStatus('active');
    }
    setIssues({});
  }, [open, plan]);

  function close(next: boolean) {
    if (pending || deleting) return;
    onOpenChange(next);
  }

  function setValue(key: keyof Values, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    setIssues((prev) => dropIssues(prev, key));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = costPlanSchema.safeParse({
      name: values.name,
      vendor: values.vendor,
      category,
      cadence,
      status,
      expectedAmount: values.expectedAmount,
      billingDay: numberOrUndefined(values.billingDay),
      startedOn: values.startedOn,
      endedOn: values.endedOn,
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
          ? await updateCostPlan(plan.id, parsed.data)
          : await createCostPlan(parsed.data)) ?? SERVER_ERROR;
    } catch {
      res = SERVER_ERROR;
    }
    setPending(false);
    if (!res.ok) {
      if (res.error === 'validation') {
        setIssues(res.issues);
        return;
      }
      toast.error('Something went wrong — try again.');
      return;
    }
    toast.success(editing ? 'Cost saved.' : `Added ${parsed.data.name}.`);
    onOpenChange(false);
  }

  async function onDelete() {
    if (!plan) return;
    setDeleting(true);
    const res = await safeAction(deleteCostPlan(plan.id));
    setDeleting(false);
    setConfirmingDelete(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success('Cost deleted.');
    onOpenChange(false);
  }

  const charges = plan?.charges ?? 0;

  return (
    <>
      <GlassDialog
        open={open}
        onOpenChange={close}
        maxWidth="44rem"
        header={
          <>
            <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
              {editing ? plan.name : 'Add a recurring cost'}
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-muted-foreground">
              {editing
                ? 'What this is meant to cost. Each month’s real charge is recorded separately.'
                : 'What we pay for and what it should cost. Charges get recorded month by month.'}
            </Dialog.Description>
          </>
        }
        footer={
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button
              type="submit"
              // The actions live in the pinned footer, outside the <form>.
              form={FORM_ID}
              size="small"
              shimmer={false}
              showIcon={false}
              disabled={pending || deleting}
              className="w-full sm:w-auto"
            >
              {pending ? 'Saving…' : editing ? 'Save changes' : 'Add cost'}
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
        <form
          id={FORM_ID}
          onSubmit={onSubmit}
          className="grid gap-4 md:grid-cols-2 md:items-start md:gap-x-6"
        >
          {issues._form && (
            <p
              role="alert"
              className="md:col-span-2 rounded-lg border border-destructive/30 bg-destructive/[0.06] px-3 py-2 text-xs text-destructive"
            >
              {issues._form}
            </p>
          )}

          <Field id="cost-name" label="What it is" error={issues.name}>
            <Input
              id="cost-name"
              value={values.name}
              onChange={(e) => setValue('name', e.target.value)}
              placeholder="Claude Max"
              aria-invalid={Boolean(issues.name)}
            />
          </Field>

          <Field id="cost-vendor" label="Who bills us" error={issues.vendor}>
            <Input
              id="cost-vendor"
              value={values.vendor}
              onChange={(e) => setValue('vendor', e.target.value)}
              placeholder="Anthropic"
              aria-invalid={Boolean(issues.vendor)}
            />
          </Field>

          <ChipGroup
            className="md:col-span-2"
            legend="Kind of cost"
            options={CATEGORY_OPTIONS}
            value={category}
            onChange={setCategory}
            error={issues.category}
          />

          <ChipGroup
            legend="How often"
            options={CADENCE_OPTIONS}
            value={cadence}
            onChange={setCadence}
            error={issues.cadence}
          />

          <ChipGroup
            legend="Status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={setStatus}
            error={issues.status}
            help={
              status === 'cancelled'
                ? 'Keeps every charge it ever made — this is how a cost is retired.'
                : status === 'paused'
                  ? 'Stays on the list, drops out of the monthly run-rate.'
                  : undefined
            }
          />

          <Field
            id="cost-expected"
            label="Expected amount (CAD)"
            error={issues.expectedAmount}
            hint="Leave blank if it varies — it will be left out of the run-rate rather than guessed at."
          >
            <Input
              id="cost-expected"
              inputMode="decimal"
              value={values.expectedAmount}
              onChange={(e) => setValue('expectedAmount', e.target.value)}
              placeholder="299.60"
              aria-invalid={Boolean(issues.expectedAmount)}
            />
          </Field>

          <Field
            id="cost-billing-day"
            label="Billing day"
            error={issues.billingDay}
            hint={`Day of the month, 1–${BILLING_DAY_MAX}. Optional.`}
          >
            <Input
              id="cost-billing-day"
              type="number"
              min={1}
              max={BILLING_DAY_MAX}
              value={values.billingDay}
              onChange={(e) => setValue('billingDay', e.target.value)}
              placeholder="23"
              aria-invalid={Boolean(issues.billingDay)}
            />
          </Field>

          <Field
            id="cost-started"
            label="Started"
            error={issues.startedOn}
            hint={
              cadence === 'monthly'
                ? 'Optional — the first month we paid for it.'
                : 'Required: it says which month this bills in.'
            }
          >
            <Input
              id="cost-started"
              type="date"
              value={values.startedOn}
              onChange={(e) => setValue('startedOn', e.target.value)}
              aria-invalid={Boolean(issues.startedOn)}
            />
          </Field>

          <Field
            id="cost-ended"
            label="Ended"
            error={issues.endedOn}
            hint="Optional — the last month it billed."
          >
            <Input
              id="cost-ended"
              type="date"
              value={values.endedOn}
              onChange={(e) => setValue('endedOn', e.target.value)}
              aria-invalid={Boolean(issues.endedOn)}
            />
          </Field>

          <Field
            id="cost-note"
            label="Note"
            className="md:col-span-2"
            error={issues.note}
            hint="Who uses it, why we have it — anything the next person would want to know."
          >
            <textarea
              id="cost-note"
              rows={3}
              maxLength={COST_NOTE_MAX}
              value={values.note}
              onChange={(e) => setValue('note', e.target.value)}
              className={textareaClasses}
              aria-invalid={Boolean(issues.note)}
            />
          </Field>

          {editing && charges > 0 && (
            <p className="md:col-span-2 px-1 text-xs text-muted-foreground">
              {charges} {charges === 1 ? 'charge' : 'charges'} recorded
              {plan.lastChargeLabel ? `, most recently ${plan.lastChargeLabel}` : ''}.
            </p>
          )}
        </form>
      </GlassDialog>

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={(next) => !deleting && setConfirmingDelete(next)}
        title="Delete this cost?"
        description={
          charges > 0
            ? `${charges} recorded ${charges === 1 ? 'charge' : 'charges'} still point at it, so this will be refused — set it to cancelled instead, which keeps the history.`
            : 'No charges point at it. It is gone for good.'
        }
        confirmLabel="Delete cost"
        onConfirm={onDelete}
        destructive
        pending={deleting}
      />
    </>
  );
}

/** The header affordance — owns its own dialog state (AddOpeningButton). */
export function AddPlanButton() {
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
        Add cost
      </Button>
      <PlanDialog open={open} onOpenChange={setOpen} plan={null} />
    </>
  );
}
