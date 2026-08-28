'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  LuCheck,
  LuCircleAlert,
  LuEllipsis,
  LuPencil,
  LuPrinter,
  LuBan,
  LuWandSparkles,
} from 'react-icons/lu';
import Link from 'next/link';

import { DropdownMenu } from '@/components/Admin/DropdownMenu';
import { GlassRim } from '@/components/Admin/Glass';
import {
  dropdownMenuContent,
  menuItem,
} from '@/components/Admin/tasks/menu';
import AmountInput from '@/components/Admin/payroll/AmountInput';
import PayrollLineDialog from '@/components/Admin/payroll/PayrollLineDialog';
import PayrollStatusBadge from '@/components/Admin/payroll/PayrollStatusBadge';
import {
  savePayrollPayment,
  setPaymentStatus,
} from '@/app/(admin)/admin/(protected)/_actions/payroll';
import {
  formatAmount,
  formatAmountValue,
  parseAmount,
  suggestPaid,
} from '@/lib/payrollAmounts';
import type { AdminLineView } from '@/components/Admin/payroll/payrollData';
import { cn } from '@/lib/utils';

/**
 * The month's working surface.
 *
 * Entry ergonomics are the whole point: a DRAFT row's two numbers — what they're
 * owed and what was sent — are inline inputs saved per row, because typing four
 * figures off an invoice shouldn't mean opening four dialogs. Anything past draft
 * is read-only here and edits through the dialog instead: deliberate friction on
 * money that already moved.
 *
 * Status lives in the row menu, never on the save path (the separate-doors rule),
 * so correcting a figure can't re-send a payment.
 *
 * Success paths do NOT call router.refresh() — the re-rendered route rides back
 * on the action's own POST response.
 */
const HEADER_CELL =
  'px-0 pb-2.5 pr-3 text-left text-[0.65rem] font-medium uppercase tracking-[0.15em] text-muted-foreground';

const TRANSPORT = { ok: false as const, error: 'Something went wrong. Try again.' };
const SERVER_ERROR = { ok: false as const, error: 'server' as const };

type Draft = { anchor: string; paid: string };

export default function PayrollMonthTable({
  lines,
  runRateMicro,
  month,
}: {
  lines: AdminLineView[];
  runRateMicro: number | null;
  month: string;
}) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminLineView | null>(null);

  // Re-seed a row's inputs from the server only while it isn't being edited, so
  // a revalidation can't stomp half-typed digits.
  const dirty = useRef<Set<string>>(new Set());
  useEffect(() => {
    setDrafts((prev) => {
      const next: Record<string, Draft> = {};
      for (const line of lines) {
        next[line.paymentId] = dirty.current.has(line.paymentId)
          ? (prev[line.paymentId] ?? blankDraft(line))
          : blankDraft(line);
      }
      return next;
    });
  }, [lines]);

  function set(line: AdminLineView, patch: Partial<Draft>) {
    dirty.current.add(line.paymentId);
    setDrafts((prev) => ({
      ...prev,
      [line.paymentId]: { ...blankDraft(line), ...prev[line.paymentId], ...patch },
    }));
  }

  async function saveRow(line: AdminLineView) {
    const draft = drafts[line.paymentId];
    if (!draft) return;
    setSavingId(line.paymentId);
    let res;
    try {
      res =
        (await savePayrollPayment(line.paymentId, {
          anchorCurrency: line.anchorCurrency,
          anchorAmount: draft.anchor,
          paidCurrency: line.paidCurrency,
          paidAmount: draft.paid,
          rate: line.lineRateMicro ? String(line.lineRateMicro / 1_000_000) : '',
          feeCad:
            line.feeCadCents > 0
              ? formatAmountValue(line.feeCadCents, 'CAD')
              : '',
          proratedDays: line.proratedDays ?? undefined,
          monthDays: line.monthDays ?? undefined,
          prorationNote: line.prorationNote ?? '',
          wireRef: line.wireRef ?? '',
          adminNote: line.adminNote ?? '',
        })) ?? SERVER_ERROR;
    } catch {
      res = SERVER_ERROR;
    }
    setSavingId(null);
    if (!res.ok) {
      toast.error(
        res.error === 'validation'
          ? (Object.values(res.issues)[0] ?? 'Check the amounts.')
          : 'Something went wrong. Try again.',
      );
      return;
    }
    dirty.current.delete(line.paymentId);
    toast.success(`${line.memberName}’s line saved.`);
  }

  async function changeStatus(
    line: AdminLineView,
    status: 'received' | 'void' | 'sent',
  ) {
    let res;
    try {
      res = (await setPaymentStatus(line.paymentId, { status })) ?? TRANSPORT;
    } catch {
      res = TRANSPORT;
    }
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(
      status === 'received'
        ? `Marked received for ${line.memberName}.`
        : status === 'void'
          ? 'Line voided.'
          : 'Line re-sent.',
    );
  }

  return (
    <>
      <div className="relative">
        <div data-lenis-prevent-horizontal className="overflow-x-auto overscroll-x-contain">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/40 dark:border-white/10">
                <th scope="col" className={cn(HEADER_CELL, 'pt-2.5 pl-4 sm:pl-5')}>
                  Member
                </th>
                <th scope="col" className={cn(HEADER_CELL, 'pt-2.5 text-right')}>
                  Salary figure
                </th>
                <th scope="col" className={cn(HEADER_CELL, 'pt-2.5 text-right')}>
                  Amount sent
                </th>
                <th scope="col" className={cn(HEADER_CELL, 'pt-2.5 text-right')}>
                  Company cost
                </th>
                <th scope="col" className={cn(HEADER_CELL, 'pt-2.5')}>
                  Status
                </th>
                <th scope="col" className={cn(HEADER_CELL, 'w-10 pr-4 sm:pr-5')}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const draft = drafts[line.paymentId] ?? blankDraft(line);
                const isDraft = line.status === 'draft';
                const saving = savingId === line.paymentId;
                const anchorMinor = parseAmount(draft.anchor, line.anchorCurrency);
                const rate = line.lineRateMicro ?? runRateMicro;
                const suggestion =
                  anchorMinor !== null
                    ? suggestPaid(
                        anchorMinor,
                        line.anchorCurrency,
                        line.paidCurrency,
                        rate,
                      )
                    : null;
                const paidMinor = parseAmount(draft.paid, line.paidCurrency);
                const changed =
                  anchorMinor !== line.anchorAmount ||
                  (paidMinor ?? 0) !== line.paidAmount;

                return (
                  <tr
                    key={line.paymentId}
                    className="group/row border-b border-white/40 last:border-b-0 dark:border-white/10"
                  >
                    <td className="py-3 pl-4 pr-3 align-top sm:pl-5">
                      <span className="block font-medium text-foreground">
                        {line.memberName}
                      </span>
                      {line.prorationLabel && (
                        <span className="block text-xs text-muted-foreground">
                          {line.prorationLabel}
                        </span>
                      )}
                      {line.memberNote && (
                        <span className="mt-0.5 flex items-start gap-1 text-xs text-destructive">
                          <LuCircleAlert
                            className="mt-0.5 size-3 shrink-0"
                            aria-hidden="true"
                          />
                          {line.memberNote}
                        </span>
                      )}
                    </td>

                    <td className="py-3 pr-3 align-top text-right">
                      {isDraft ? (
                        <AmountInput
                          id={`anchor-${line.paymentId}`}
                          currency={line.anchorCurrency}
                          value={draft.anchor}
                          onValueChange={(v) => set(line, { anchor: v })}
                          disabled={saving}
                          size="cell"
                          className="w-36"
                        />
                      ) : (
                        <span className="tabular-nums text-foreground">
                          {line.anchorLabel}
                        </span>
                      )}
                    </td>

                    <td className="py-3 pr-3 align-top text-right">
                      {isDraft ? (
                        <div className="flex flex-col items-end gap-1">
                          <AmountInput
                            id={`paid-${line.paymentId}`}
                            currency={line.paidCurrency}
                            value={draft.paid}
                            onValueChange={(v) => set(line, { paid: v })}
                            disabled={saving}
                            size="cell"
                            className="w-44"
                          />
                          {suggestion !== null &&
                            (paidMinor === null || paidMinor !== suggestion) && (
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() =>
                                  set(line, {
                                    paid: formatAmountValue(
                                      suggestion,
                                      line.paidCurrency,
                                    ),
                                  })
                                }
                                className="inline-flex items-center gap-1 text-[0.65rem] font-medium text-muted-foreground transition-colors hover:text-foreground"
                              >
                                <LuWandSparkles
                                  className="size-3"
                                  aria-hidden="true"
                                />
                                {formatAmount(suggestion, line.paidCurrency)}
                              </button>
                            )}
                        </div>
                      ) : (
                        <span className="tabular-nums text-foreground">
                          {line.paidLabel}
                        </span>
                      )}
                    </td>

                    <td className="py-3 pr-3 align-top text-right">
                      <span className="tabular-nums text-muted-foreground">
                        {line.costLabel}
                      </span>
                      {line.feeLabel !== '—' && (
                        <span className="block text-xs tabular-nums text-muted-foreground">
                          +{line.feeLabel} fee
                        </span>
                      )}
                    </td>

                    <td className="py-3 pr-3 align-top">
                      <PayrollStatusBadge status={line.status} />
                      {line.sentLabel && (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {line.receivedLabel
                            ? `confirmed ${line.receivedLabel}`
                            : `sent ${line.sentLabel}`}
                        </span>
                      )}
                    </td>

                    <td className="py-3 pr-4 align-top text-right sm:pr-5">
                      <div className="flex items-center justify-end gap-1">
                        {isDraft && changed && (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void saveRow(line)}
                            className="inline-flex h-8 items-center gap-1 rounded-lg bg-foreground px-2.5 text-xs font-medium text-background transition-opacity disabled:opacity-50"
                          >
                            <LuCheck className="size-3.5" aria-hidden="true" />
                            {saving ? 'Saving…' : 'Save'}
                          </button>
                        )}
                        <RowMenu
                          line={line}
                          month={month}
                          onEdit={() => setEditing(line)}
                          onStatus={(s) => void changeStatus(line, s)}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <PayrollLineDialog
        open={editing !== null}
        onOpenChange={(next) => {
          if (!next) setEditing(null);
        }}
        line={editing}
        runRateMicro={runRateMicro}
      />
    </>
  );
}

function blankDraft(line: AdminLineView): Draft {
  return {
    anchor: formatAmountValue(line.anchorAmount, line.anchorCurrency),
    paid:
      line.paidAmount > 0
        ? formatAmountValue(line.paidAmount, line.paidCurrency)
        : '',
  };
}

function RowMenu({
  line,
  month,
  onEdit,
  onStatus,
}: {
  line: AdminLineView;
  month: string;
  onEdit: () => void;
  onStatus: (status: 'received' | 'void' | 'sent') => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Actions for ${line.memberName}`}
          className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/45 hover:text-foreground dark:hover:bg-white/10"
        >
          <LuEllipsis className="size-4" aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          data-lenis-prevent
          align="end"
          sideOffset={6}
          className={dropdownMenuContent}
        >
          <GlassRim />
          <DropdownMenu.Item className={menuItem} onSelect={onEdit}>
            <LuPencil className="size-3.5" aria-hidden="true" />
            Edit line
          </DropdownMenu.Item>

          <DropdownMenu.Item asChild className={menuItem}>
            <Link
              href={`/admin/payroll/payslip/${line.memberId}/${month}`}
              prefetch={false}
            >
              <LuPrinter className="size-3.5" aria-hidden="true" />
              Payslip
            </Link>
          </DropdownMenu.Item>

          {(line.status === 'sent' || line.status === 'flagged') && (
            <DropdownMenu.Item
              className={menuItem}
              onSelect={() => onStatus('received')}
            >
              <LuCheck className="size-3.5" aria-hidden="true" />
              Mark received
            </DropdownMenu.Item>
          )}

          {line.status === 'flagged' && (
            <DropdownMenu.Item
              className={menuItem}
              onSelect={() => onStatus('sent')}
            >
              <LuCheck className="size-3.5" aria-hidden="true" />
              Re-sent, clear the flag
            </DropdownMenu.Item>
          )}

          {line.status !== 'void' && line.status !== 'draft' && (
            <DropdownMenu.Item
              className={cn(menuItem, 'text-destructive')}
              onSelect={() => onStatus('void')}
            >
              <LuBan className="size-3.5" aria-hidden="true" />
              Void
            </DropdownMenu.Item>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
