'use client';

import { useState } from 'react';
import { Dialog } from 'radix-ui';
import { toast } from 'sonner';
import { LuCheck, LuCircleAlert } from 'react-icons/lu';

import Button from '@/components/Button';
import GlassDialog from '@/components/Admin/GlassDialog';
import { setOwnPaymentStatus } from '@/app/(admin)/admin/(protected)/_actions/payroll';
import { PAYROLL_FLAG_NOTE_MIN, PAYROLL_NOTE_MAX } from '@/lib/payrollSchema';
import type { OwnMonthDetail } from '@/components/Admin/payroll/payrollData';
import { cn } from '@/lib/utils';

/**
 * The member's action strip for their newest month: confirm receipt, or report a
 * problem with a note. Renders BARE — the month label and status badge belong to
 * the hero panel that places this, so they aren't repeated here.
 *
 * Takes only the pre-formatted OwnMonthDetail — no Date objects, no money math,
 * and nothing about anybody else. Success paths do NOT call router.refresh(): the
 * re-rendered route already rides back on the action's own POST response, and
 * refreshing would render the identical tree a second time.
 */
const TRANSPORT_ERROR = { ok: false as const, error: 'Something went wrong — try again.' };

export default function MyPayMonth({ month }: { month: OwnMonthDetail }) {
  const [pending, setPending] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);

  async function run(
    status: 'received' | 'flagged',
    body?: string,
  ): Promise<boolean> {
    setPending(true);
    let res;
    try {
      res =
        (await setOwnPaymentStatus(month.paymentId, { status, note: body })) ??
        TRANSPORT_ERROR;
    } catch {
      res = TRANSPORT_ERROR;
    }
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return false;
    }
    toast.success(
      status === 'received'
        ? 'Thanks — marked as received.'
        : 'Reported. Payroll has been notified.',
    );
    return true;
  }

  async function onFlag(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = note.trim();
    if (trimmed.length < PAYROLL_FLAG_NOTE_MIN) {
      setNoteError('Tell us what’s wrong so it can be fixed.');
      return;
    }
    if (await run('flagged', trimmed)) {
      setFlagOpen(false);
      setNote('');
      setNoteError(null);
    }
  }

  const nothingToDo = !month.canConfirm && !month.canFlag;

  return (
    <>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          {month.status === 'received'
            ? `You confirmed this on ${month.receivedLabel}.`
            : month.status === 'flagged'
              ? 'Payroll has been notified and will follow up.'
              : month.status === 'void'
                ? 'This payment was cancelled.'
                : month.sentLabel
                  ? `Sent ${month.sentLabel}. Let us know when it lands.`
                  : 'Let us know when it lands.'}
        </p>

        {month.flagNote && (
          <p className="flex gap-1.5 text-xs text-muted-foreground">
            <LuCircleAlert
              className="mt-0.5 size-3.5 shrink-0"
              aria-hidden="true"
            />
            <span>You reported: {month.flagNote}</span>
          </p>
        )}

        {!nothingToDo && (
          <div className="flex flex-wrap gap-2 pt-1">
            {month.canConfirm && (
              <Button
                size="small"
                icon={LuCheck}
                iconPosition="left"
                disabled={pending}
                onClick={() => void run('received')}
              >
                {pending ? 'Saving…' : 'I received this'}
              </Button>
            )}
            {month.canFlag && (
              <Button
                variant="secondary"
                size="small"
                showIcon={false}
                disabled={pending}
                onClick={() => setFlagOpen(true)}
              >
                Something’s wrong
              </Button>
            )}
          </div>
        )}
      </div>

      <GlassDialog
        open={flagOpen}
        onOpenChange={(next) => {
          if (pending) return;
          setFlagOpen(next);
        }}
        maxWidth="28rem"
      >
        <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
          Report a problem
        </Dialog.Title>
        <Dialog.Description className="mt-1 text-sm text-muted-foreground">
          {month.monthLabel} — tell payroll what’s wrong. They’ll see this note
          and your name, nothing else changes.
        </Dialog.Description>

        <form onSubmit={onFlag} className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="payroll-flag-note"
              className="text-sm font-medium text-foreground"
            >
              What happened?
            </label>
            <textarea
              id="payroll-flag-note"
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setNoteError(null);
              }}
              rows={4}
              maxLength={PAYROLL_NOTE_MAX}
              disabled={pending}
              autoComplete="off"
              aria-invalid={noteError ? true : undefined}
              aria-describedby={
                noteError ? 'payroll-flag-note-error' : undefined
              }
              placeholder="e.g. nothing has arrived yet, or the amount is short"
              className={cn(
                'min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
                noteError && 'border-destructive ring-destructive/20',
              )}
            />
            {noteError && (
              <p
                id="payroll-flag-note-error"
                role="alert"
                className="px-1 text-xs text-destructive"
              >
                {noteError}
              </p>
            )}
          </div>

          <div className="mt-2 flex flex-col gap-2 sm:flex-row-reverse">
            <Button
              type="submit"
              size="small"
              shimmer={false}
              showIcon={false}
              disabled={pending}
              className="w-full sm:w-auto"
            >
              {pending ? 'Sending…' : 'Report it'}
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
    </>
  );
}
