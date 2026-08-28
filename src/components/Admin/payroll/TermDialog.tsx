'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog } from 'radix-ui';
import { toast } from 'sonner';

import Button from '@/components/Button';
import GlassDialog from '@/components/Admin/GlassDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AmountInput from '@/components/Admin/payroll/AmountInput';
import { addPayrollTerm } from '@/app/(admin)/admin/(protected)/_actions/payroll';
import { CURRENCIES, PAYROLL_CURRENCIES } from '@/lib/payrollAmounts';
import type { PayrollCurrency } from '@/lib/payrollAmounts';
import { PAYROLL_NOTE_MAX } from '@/lib/payrollSchema';

/**
 * Set a standing monthly salary from a date. A raise is a NEW term, not an edit —
 * the previous one stays as history, which is what lets a member see "35,000,000
 * toman from Jul 19, 2026" and what makes a past month reproducible.
 *
 * The currency chosen here is the ANCHOR — what the agreement fixes. It is
 * independent of what the money is delivered in: a CAD anchor paid in toman is
 * the normal case, and it's why the same member's toman moves when the rate does.
 */
const SERVER_ERROR = { ok: false as const, error: 'server' as const };

const selectClasses =
  'h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50';

export default function TermDialog({
  open,
  onOpenChange,
  memberId,
  memberName,
  defaultCurrency,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName: string;
  defaultCurrency: PayrollCurrency;
}) {
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [currency, setCurrency] = useState<PayrollCurrency>(defaultCurrency);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  const seeded = useRef(false);
  useEffect(() => {
    if (!open) {
      seeded.current = false;
      return;
    }
    if (seeded.current) return;
    seeded.current = true;
    setEffectiveFrom('');
    setCurrency(defaultCurrency);
    setAmount('');
    setNote('');
    setIssues({});
  }, [open, defaultCurrency]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    let res;
    try {
      res =
        (await addPayrollTerm(memberId, {
          effectiveFrom,
          anchorCurrency: currency,
          anchorAmount: amount,
          note,
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
      toast.error('Something went wrong. Try again.');
      return;
    }
    toast.success(`Salary set for ${memberName}.`);
    onOpenChange(false);
  }

  return (
    <GlassDialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        onOpenChange(next);
      }}
      maxWidth="28rem"
    >
      <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
        Set salary for {memberName}
      </Dialog.Title>
      <Dialog.Description className="mt-1 text-sm text-muted-foreground">
        Their standing monthly figure from a date. Earlier terms stay as history.
      </Dialog.Description>

      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="term-from">Effective from</Label>
          <input
            id="term-from"
            type="date"
            value={effectiveFrom}
            onChange={(e) => {
              setEffectiveFrom(e.target.value);
              setIssues(({ effectiveFrom: _c, ...rest }) => rest);
            }}
            disabled={pending}
            aria-invalid={issues.effectiveFrom ? true : undefined}
            className={selectClasses}
          />
          {issues.effectiveFrom ? (
            <p role="alert" className="px-1 text-xs text-destructive">
              {issues.effectiveFrom}
            </p>
          ) : (
            <p className="px-1 text-xs text-muted-foreground">
              A month uses the newest term starting on or before its last day,
              so a mid-month start governs that whole month, and proration handles
              the days they weren’t here.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="term-currency">Set in</Label>
            <select
              id="term-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as PayrollCurrency)}
              disabled={pending}
              className={selectClasses}
            >
              {PAYROLL_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {CURRENCIES[c].label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="term-amount">Monthly amount</Label>
            <AmountInput
              id="term-amount"
              currency={currency}
              value={amount}
              onValueChange={(v) => {
                setAmount(v);
                setIssues(({ anchorAmount: _c, ...rest }) => rest);
              }}
              disabled={pending}
              invalid={Boolean(issues.anchorAmount)}
              describedBy={issues.anchorAmount ? 'term-amount-error' : undefined}
            />
            {issues.anchorAmount && (
              <p
                id="term-amount-error"
                role="alert"
                className="px-1 text-xs text-destructive"
              >
                {issues.anchorAmount}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="term-note">Note</Label>
          <Input
            id="term-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={PAYROLL_NOTE_MAX}
            autoComplete="off"
            placeholder="e.g. annual review"
            disabled={pending}
          />
        </div>

        <div className="mt-2 flex flex-col gap-2 sm:flex-row-reverse">
          <Button
            type="submit"
            size="small"
            showIcon={false}
            disabled={pending}
            className="w-full sm:w-auto"
          >
            {pending ? 'Saving…' : 'Set salary'}
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
        </div>
      </form>
    </GlassDialog>
  );
}
