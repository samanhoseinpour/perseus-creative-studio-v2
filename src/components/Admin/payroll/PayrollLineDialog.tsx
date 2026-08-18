'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog } from 'radix-ui';
import { toast } from 'sonner';

import Button from '@/components/Button';
import GlassDialog from '@/components/Admin/GlassDialog';
import ConfirmDialog from '@/components/Admin/ConfirmDialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import AmountInput from '@/components/Admin/payroll/AmountInput';
import RateInput from '@/components/Admin/payroll/RateInput';
import {
  deletePayrollPayment,
  savePayrollPayment,
} from '@/app/(admin)/admin/(protected)/_actions/payroll';
import {
  CURRENCIES,
  formatAmount,
  formatAmountValue,
  formatRate,
  parseAmount,
  parseRate,
  RATE_SCALE,
  suggestPaid,
} from '@/lib/payrollAmounts';
import { PAYROLL_NOTE_MAX, PAYROLL_REF_MAX } from '@/lib/payrollSchema';
import type { AdminLineView } from '@/components/Admin/payroll/payrollData';
import { cn } from '@/lib/utils';

/**
 * The full editor for one member's line — the deliberate-friction door.
 *
 * Amounts on a DRAFT line are editable inline in the table; anything past draft
 * is a record of money that already moved, so correcting it happens here, behind
 * a dialog, on purpose.
 *
 * This dialog never touches status. Confirming, flagging, and voiding go through
 * the row menu's status actions, so saving a corrected figure can't silently
 * re-mark money as sent.
 */
const SERVER_ERROR = { ok: false as const, error: 'server' as const };

const textareaClasses =
  'min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50';

export default function PayrollLineDialog({
  open,
  onOpenChange,
  line,
  runRateMicro,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  line: AdminLineView | null;
  runRateMicro: number | null;
}) {
  const [anchor, setAnchor] = useState('');
  const [paid, setPaid] = useState('');
  const [rate, setRate] = useState('');
  const [fee, setFee] = useState('');
  const [days, setDays] = useState('');
  const [monthDays, setMonthDays] = useState('');
  const [prorationNote, setProrationNote] = useState('');
  const [wireRef, setWireRef] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Seed once per line. A revalidation swaps the prop object mid-edit, and
  // re-seeding on every render would stomp what's being typed (the ClientDialog
  // seededFor guard).
  const seededFor = useRef<string | null>(null);
  useEffect(() => {
    if (!open || !line) {
      if (!open) seededFor.current = null;
      return;
    }
    if (seededFor.current === line.paymentId) return;
    seededFor.current = line.paymentId;
    setAnchor(formatAmountValue(line.anchorAmount, line.anchorCurrency));
    setPaid(
      line.paidAmount > 0
        ? formatAmountValue(line.paidAmount, line.paidCurrency)
        : '',
    );
    setRate(line.lineRateMicro ? String(line.lineRateMicro / RATE_SCALE) : '');
    setFee(line.feeCadCents > 0 ? formatAmountValue(line.feeCadCents, 'CAD') : '');
    setDays(line.proratedDays ? String(line.proratedDays) : '');
    setMonthDays(line.monthDays ? String(line.monthDays) : '');
    setProrationNote(line.prorationNote ?? '');
    setWireRef(line.wireRef ?? '');
    setAdminNote(line.adminNote ?? '');
    setIssues({});
  }, [open, line]);

  function close(next: boolean) {
    if (pending || deleting) return;
    onOpenChange(next);
  }

  function clearIssue(key: string) {
    setIssues(({ [key]: _cleared, ...rest }) => rest);
  }

  if (!line) return null;

  const effectiveRate = parseRate(rate) ?? runRateMicro;
  const anchorMinor = parseAmount(anchor, line.anchorCurrency);
  const suggestion =
    anchorMinor !== null
      ? suggestPaid(
          anchorMinor,
          line.anchorCurrency,
          line.paidCurrency,
          effectiveRate,
        )
      : null;
  const paidMinor = parseAmount(paid, line.paidCurrency);
  const suggestionDiffers =
    suggestion !== null && (paidMinor === null || paidMinor !== suggestion);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    let res;
    try {
      res =
        (await savePayrollPayment(line!.paymentId, {
          anchorCurrency: line!.anchorCurrency,
          anchorAmount: anchor,
          paidCurrency: line!.paidCurrency,
          paidAmount: paid,
          rate,
          feeCad: fee,
          proratedDays: days === '' ? undefined : Number(days),
          monthDays: monthDays === '' ? undefined : Number(monthDays),
          prorationNote,
          wireRef,
          adminNote,
        })) ?? SERVER_ERROR;
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
    toast.success(`${line!.memberName}’s line saved.`);
    onOpenChange(false);
  }

  async function onDelete() {
    setDeleting(true);
    let res;
    try {
      res = (await deletePayrollPayment(line!.paymentId)) ?? {
        ok: false as const,
        error: 'Something went wrong — try again.',
      };
    } catch {
      res = { ok: false as const, error: 'Something went wrong — try again.' };
    }
    setDeleting(false);
    setConfirmingDelete(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success('Line removed.');
    onOpenChange(false);
  }

  return (
    <>
      <GlassDialog open={open} onOpenChange={close} maxWidth="34rem">
        <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
          {line.memberName} — {line.status === 'draft' ? 'draft line' : 'sent line'}
        </Dialog.Title>
        <Dialog.Description className="mt-1 text-sm text-muted-foreground">
          {line.status === 'draft'
            ? 'Set what they’re owed and what was sent. Nothing here changes the status.'
            : 'This money has already moved — corrections are recorded in the activity log.'}
        </Dialog.Description>

        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="line-anchor"
              label={`Salary figure (${CURRENCIES[line.anchorCurrency].label})`}
              error={issues.anchorAmount}
              hint="What they’re owed for this month, before conversion."
            >
              <AmountInput
                id="line-anchor"
                currency={line.anchorCurrency}
                value={anchor}
                onValueChange={(v) => {
                  setAnchor(v);
                  clearIssue('anchorAmount');
                }}
                disabled={pending}
                invalid={Boolean(issues.anchorAmount)}
                describedBy={
                  issues.anchorAmount ? 'line-anchor-error' : undefined
                }
              />
            </Field>

            <Field
              id="line-paid"
              label={`Amount sent (${CURRENCIES[line.paidCurrency].label})`}
              error={issues.paidAmount}
              hint={
                suggestion !== null
                  ? `Suggested ${formatAmount(suggestion, line.paidCurrency)}`
                  : 'Enter this month’s rate to get a suggestion.'
              }
            >
              <AmountInput
                id="line-paid"
                currency={line.paidCurrency}
                value={paid}
                onValueChange={(v) => {
                  setPaid(v);
                  clearIssue('paidAmount');
                }}
                disabled={pending}
                invalid={Boolean(issues.paidAmount)}
                describedBy={issues.paidAmount ? 'line-paid-error' : undefined}
              />
            </Field>
          </div>

          {suggestion !== null && suggestionDiffers && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                setPaid(formatAmountValue(suggestion, line.paidCurrency))
              }
              className="self-start text-xs font-medium text-foreground underline decoration-transparent underline-offset-4 transition-[text-decoration-color] hover:decoration-current"
            >
              Use the calculated {formatAmount(suggestion, line.paidCurrency)}
            </button>
          )}

          <fieldset
            disabled={pending}
            className="flex flex-col gap-4 border-t border-white/40 pt-4 dark:border-white/10"
          >
            <legend className="float-left mb-2 text-sm font-medium text-foreground">
              This wire
            </legend>

            <Field
              id="line-rate"
              label="Rate for this wire"
              error={issues.rate}
              hint={
                runRateMicro
                  ? `Leave blank to use the month’s ${formatRate(runRateMicro)}. The exchange quotes each wire separately.`
                  : 'The month has no rate yet — set one here or on the month.'
              }
            >
              <RateInput
                id="line-rate"
                value={rate}
                onValueChange={(v) => {
                  setRate(v);
                  clearIssue('rate');
                }}
                invalid={Boolean(issues.rate)}
                describedBy={issues.rate ? 'line-rate-error' : undefined}
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                id="line-fee"
                label="Wire fee (CAD)"
                error={issues.feeCad}
                hint="Company cost — never part of their salary."
              >
                <AmountInput
                  id="line-fee"
                  currency="CAD"
                  value={fee}
                  onValueChange={(v) => {
                    setFee(v);
                    clearIssue('feeCad');
                  }}
                  invalid={Boolean(issues.feeCad)}
                  describedBy={issues.feeCad ? 'line-fee-error' : undefined}
                />
              </Field>

              <Field id="line-wire" label="Wire reference" error={issues.wireRef}>
                <Input
                  id="line-wire"
                  value={wireRef}
                  onChange={(e) => {
                    setWireRef(e.target.value);
                    clearIssue('wireRef');
                  }}
                  maxLength={PAYROLL_REF_MAX}
                  autoComplete="off"
                  placeholder="DCEWI80398"
                />
              </Field>
            </div>
          </fieldset>

          <fieldset
            disabled={pending}
            className="flex flex-col gap-4 border-t border-white/40 pt-4 dark:border-white/10"
          >
            <legend className="float-left mb-2 text-sm font-medium text-foreground">
              Partial month
            </legend>
            <div className="grid grid-cols-2 gap-4">
              <Field
                id="line-days"
                label="Days paid"
                error={issues.proratedDays}
              >
                <Input
                  id="line-days"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  step={1}
                  value={days}
                  onChange={(e) => {
                    setDays(e.target.value);
                    clearIssue('proratedDays');
                  }}
                />
              </Field>
              <Field id="line-month-days" label="Days in month">
                <Input
                  id="line-month-days"
                  type="number"
                  inputMode="numeric"
                  min={28}
                  max={31}
                  step={1}
                  value={monthDays}
                  onChange={(e) => setMonthDays(e.target.value)}
                />
              </Field>
            </div>
            <Field
              id="line-proration-note"
              label="Why"
              error={issues.prorationNote}
              hint="Shown on their payslip, e.g. “joined 2026-07-19”."
            >
              <Input
                id="line-proration-note"
                value={prorationNote}
                onChange={(e) => setProrationNote(e.target.value)}
                maxLength={PAYROLL_NOTE_MAX}
                autoComplete="off"
              />
            </Field>
          </fieldset>

          <Field
            id="line-admin-note"
            label="Internal note"
            error={issues.adminNote}
            hint="Never shown to the member."
          >
            <textarea
              id="line-admin-note"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              maxLength={PAYROLL_NOTE_MAX}
              disabled={pending}
              rows={2}
              className={textareaClasses}
            />
          </Field>

          {issues._form && (
            <p role="alert" className="px-1 text-xs text-destructive">
              {issues._form}
            </p>
          )}

          <div className="mt-2 flex flex-col gap-2 sm:flex-row-reverse">
            <Button
              type="submit"
              size="small"
              showIcon={false}
              disabled={pending}
              className="w-full sm:w-auto"
            >
              {pending ? 'Saving…' : 'Save line'}
            </Button>
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="secondary"
                size="small"
                showIcon={false}
                disabled={pending}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
            </Dialog.Close>
            {line.status === 'draft' && (
              <div className="flex flex-1 items-center">
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  showIcon={false}
                  disabled={pending}
                  onClick={() => setConfirmingDelete(true)}
                  className="text-destructive"
                >
                  Remove
                </Button>
              </div>
            )}
          </div>
        </form>
      </GlassDialog>

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title="Remove this line?"
        description={`${line.memberName} will drop out of this month. Their standing salary and history are untouched.`}
        confirmLabel="Remove"
        onConfirm={onDelete}
        destructive
        pending={deleting}
      />
    </>
  );
}

/** Local Field wrapper — re-declared per form file, same shape everywhere. */
function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('flex flex-col gap-2')}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && (
        <p className="px-1 text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="px-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
