'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog } from 'radix-ui';
import { toast } from 'sonner';

import Button from '@/components/Button';
import GlassDialog from '@/components/Admin/GlassDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RateInput from '@/components/Admin/payroll/RateInput';
import { savePayrollRun } from '@/app/(admin)/admin/(protected)/_actions/payroll';
import { RATE_SCALE } from '@/lib/payrollAmounts';
import { PAYROLL_NOTE_MAX, PAYROLL_REF_MAX } from '@/lib/payrollSchema';
import { cn } from '@/lib/utils';

/**
 * The month's header: its canonical exchange rate and the exchange's invoice
 * number.
 *
 * The rate here PRE-FILLS every line and drives the rate trend. Saving a changed
 * rate reprices lines still in draft and deliberately leaves sent lines alone —
 * a sent line records money that moved and must not shift under a later
 * correction. The dialog says so, because that asymmetry is surprising otherwise.
 */
const SERVER_ERROR = { ok: false as const, error: 'server' as const };

export default function RunDetailsDialog({
  open,
  onOpenChange,
  month,
  monthLabel,
  rateMicro,
  invoiceRef,
  note,
  hasDrafts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string;
  monthLabel: string;
  rateMicro: number | null;
  invoiceRef: string | null;
  note: string | null;
  hasDrafts: boolean;
}) {
  const [rate, setRate] = useState('');
  const [ref, setRef] = useState('');
  const [text, setText] = useState('');
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  const seededFor = useRef<string | null>(null);
  useEffect(() => {
    if (!open) {
      seededFor.current = null;
      return;
    }
    if (seededFor.current === month) return;
    seededFor.current = month;
    setRate(rateMicro ? String(rateMicro / RATE_SCALE) : '');
    setRef(invoiceRef ?? '');
    setText(note ?? '');
    setIssues({});
  }, [open, month, rateMicro, invoiceRef, note]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    let res;
    try {
      res =
        (await savePayrollRun({
          month,
          rate,
          invoiceRef: ref,
          note: text,
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
    toast.success(`${monthLabel} saved.`);
    onOpenChange(false);
  }

  const rateChanged =
    rate.trim() !== (rateMicro ? String(rateMicro / RATE_SCALE) : '');

  return (
    <GlassDialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        onOpenChange(next);
      }}
      maxWidth="30rem"
    >
      <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
        {monthLabel}
      </Dialog.Title>
      <Dialog.Description className="mt-1 text-sm text-muted-foreground">
        The month’s rate and the exchange invoice it came from.
      </Dialog.Description>

      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="run-rate">Exchange rate</Label>
          <RateInput
            id="run-rate"
            value={rate}
            onValueChange={(v) => {
              setRate(v);
              setIssues(({ rate: _cleared, ...rest }) => rest);
            }}
            disabled={pending}
            invalid={Boolean(issues.rate)}
            describedBy={issues.rate ? 'run-rate-error' : undefined}
          />
          {issues.rate ? (
            <p id="run-rate-error" role="alert" className="px-1 text-xs text-destructive">
              {issues.rate}
            </p>
          ) : (
            <p className="px-1 text-xs text-muted-foreground">
              Off the exchange invoice. Pre-fills every line, though a wire quoted
              differently can override it on its own row.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="run-invoice">Invoice reference</Label>
          <Input
            id="run-invoice"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            maxLength={PAYROLL_REF_MAX}
            autoComplete="off"
            placeholder="DCINV234648"
            disabled={pending}
          />
          <p className="px-1 text-xs text-muted-foreground">
            The number only. The invoice itself is never uploaded, because one page
            lists everyone’s pay.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="run-note">Note</Label>
          <textarea
            id="run-note"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={PAYROLL_NOTE_MAX}
            rows={2}
            disabled={pending}
            className={cn(
              'w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
            )}
          />
        </div>

        {rateChanged && rate.trim() !== '' && (
          <p className="rounded-xl bg-foreground/[0.04] px-3 py-2 text-xs text-muted-foreground dark:bg-white/[0.06]">
            {hasDrafts
              ? 'Draft lines will be recalculated at the new rate. Lines already sent stay exactly as they were.'
              : 'Nothing is in draft, so no line will be recalculated.'}
          </p>
        )}

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
            {pending ? 'Saving…' : 'Save month'}
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
