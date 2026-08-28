'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { LuPlus, LuSend, LuSettings2, LuUserPlus } from 'react-icons/lu';

import Button from '@/components/Button';
import ConfirmDialog from '@/components/Admin/ConfirmDialog';
import RunDetailsDialog from '@/components/Admin/payroll/RunDetailsDialog';
import {
  sendPayrollRun,
  startPayrollRun,
} from '@/app/(admin)/admin/(protected)/_actions/payroll';

/**
 * Start a month, edit its header, or submit it.
 *
 * "Send month" is the irreversible one — it means the money left — so it goes
 * through ConfirmDialog with the count and total spelled out, and the server
 * refuses the run anyway if any line is missing its amount or rate.
 *
 * startPayrollRun() is idempotent and only inserts lines for members who don't
 * have one yet, so the same action backs both "Start" and "Add N missing" — the
 * latter is what you reach for after setting a standing salary someone was
 * missing, or after adding a member mid-month. Without it an already-started
 * month would be permanently closed to anyone added later.
 */
const TRANSPORT = { ok: false as const, error: 'Something went wrong. Try again.' };

export default function PayrollRunActions({
  month,
  monthLabel,
  runExists,
  rateMicro,
  invoiceRef,
  note,
  draftCount,
  totalLabel,
  missingCount,
}: {
  month: string;
  monthLabel: string;
  runExists: boolean;
  rateMicro: number | null;
  invoiceRef: string | null;
  note: string | null;
  draftCount: number;
  totalLabel: string;
  /** Members eligible for this month who have a standing salary but no line. */
  missingCount: number;
}) {
  const [pending, setPending] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);

  async function onStart() {
    setPending(true);
    let res;
    try {
      res = (await startPayrollRun(month)) ?? TRANSPORT;
    } catch {
      res = TRANSPORT;
    }
    setPending(false);
    if (!res.ok) {
      toast.error('Couldn’t start the month. Try again.');
      return;
    }
    toast.success(
      runExists ? 'Missing members added.' : `${monthLabel} started.`,
    );
  }

  async function onSend() {
    setPending(true);
    let res;
    try {
      res = (await sendPayrollRun(month)) ?? TRANSPORT;
    } catch {
      res = TRANSPORT;
    }
    setPending(false);
    setConfirmSend(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(
      `${monthLabel} sent. ${res.updated} ${res.updated === 1 ? 'person' : 'people'} notified.`,
    );
  }

  if (!runExists) {
    return (
      <Button
        size="small"
        icon={LuPlus}
        iconPosition="left"
        disabled={pending}
        onClick={() => void onStart()}
      >
        {pending ? 'Starting…' : `Start ${monthLabel}`}
      </Button>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="small"
          icon={LuSettings2}
          iconPosition="left"
          disabled={pending}
          onClick={() => setDetailsOpen(true)}
        >
          Month details
        </Button>
        {missingCount > 0 && (
          <Button
            variant="secondary"
            size="small"
            icon={LuUserPlus}
            iconPosition="left"
            disabled={pending}
            onClick={() => void onStart()}
          >
            {pending
              ? 'Adding…'
              : `Add ${missingCount} missing`}
          </Button>
        )}
        {draftCount > 0 && (
          <Button
            size="small"
            icon={LuSend}
            iconPosition="left"
            disabled={pending}
            onClick={() => setConfirmSend(true)}
          >
            Send {draftCount === 1 ? '1 payment' : `${draftCount} payments`}
          </Button>
        )}
      </div>

      <RunDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        month={month}
        monthLabel={monthLabel}
        rateMicro={rateMicro}
        invoiceRef={invoiceRef}
        note={note}
        hasDrafts={draftCount > 0}
      />

      <ConfirmDialog
        open={confirmSend}
        onOpenChange={setConfirmSend}
        title={`Send ${monthLabel}?`}
        description={`This marks ${draftCount} ${draftCount === 1 ? 'payment' : 'payments'} as sent (${totalLabel} in salary) and emails everyone with self-view to confirm receipt. The email contains no figures. Only do this once the money has actually gone out.`}
        confirmLabel={pending ? 'Sending…' : 'Yes, it’s sent'}
        onConfirm={onSend}
        pending={pending}
      />
    </>
  );
}
