'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog } from 'radix-ui';
import { toast } from 'sonner';

import Button from '@/components/Button';
import GlassDialog from '@/components/Admin/GlassDialog';
import ConfirmDialog from '@/components/Admin/ConfirmDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createPayrollMember,
  deletePayrollMember,
  updatePayrollMember,
} from '@/app/(admin)/admin/(protected)/_actions/payroll';
import { PAYROLL_NAME_MAX, PAYROLL_NOTE_MAX } from '@/lib/payrollSchema';
import { CURRENCIES, PAYROLL_CURRENCIES } from '@/lib/payrollAmounts';
import type { PayrollCurrency } from '@/lib/payrollAmounts';
import { cn } from '@/lib/utils';

/**
 * Create or edit a payee. `member === null` is create mode (the ClientDialog
 * contract).
 *
 * Linking a dashboard account is OPTIONAL: pay history has to outlive a deleted
 * account, and a contractor can be paid without ever having a login. Leaving it
 * unlinked means there is nobody to show a self-view to, which the form says out
 * loud rather than leaving the self-view toggle looking broken.
 */
const SERVER_ERROR = { ok: false as const, error: 'server' as const };

export type MemberDialogMember = {
  id: string;
  displayName: string;
  userId: string | null;
  status: 'active' | 'ended';
  joinedOn: string | null;
  endedOn: string | null;
  selfViewEnabled: boolean;
  payCurrency: PayrollCurrency;
  notes: string | null;
  sortIndex: number;
};

export type LinkableAccount = { id: string; name: string; email: string };

const BLANK = {
  displayName: '',
  userId: '',
  status: 'active' as 'active' | 'ended',
  joinedOn: '',
  endedOn: '',
  selfViewEnabled: true,
  payCurrency: 'IRT' as PayrollCurrency,
  notes: '',
  sortIndex: '',
};

const dateInput =
  'h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50';

/** The <form> the pinned footer's submit button points at. */
const FORM_ID = 'payroll-member-form';

export default function MemberDialog({
  open,
  onOpenChange,
  member,
  accounts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: MemberDialogMember | null;
  accounts: LinkableAccount[];
}) {
  const [values, setValues] = useState(BLANK);
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const editing = member !== null;

  const seededFor = useRef<string | null>(null);
  useEffect(() => {
    if (!open) {
      seededFor.current = null;
      return;
    }
    const key = member?.id ?? '__new__';
    if (seededFor.current === key) return;
    seededFor.current = key;
    setValues(
      member
        ? {
            displayName: member.displayName,
            userId: member.userId ?? '',
            status: member.status,
            joinedOn: member.joinedOn ?? '',
            endedOn: member.endedOn ?? '',
            selfViewEnabled: member.selfViewEnabled,
            payCurrency: member.payCurrency,
            notes: member.notes ?? '',
            sortIndex: String(member.sortIndex),
          }
        : BLANK,
    );
    setIssues({});
  }, [open, member]);

  function setValue<K extends keyof typeof BLANK>(
    key: K,
    value: (typeof BLANK)[K],
  ) {
    setValues((v) => ({ ...v, [key]: value }));
    setIssues(({ [key as string]: _cleared, ...rest }) => rest);
  }

  function close(next: boolean) {
    if (pending || deleting) return;
    onOpenChange(next);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const payload = {
      displayName: values.displayName,
      userId: values.userId,
      status: values.status,
      joinedOn: values.joinedOn,
      endedOn: values.endedOn,
      selfViewEnabled: values.selfViewEnabled,
      payCurrency: values.payCurrency,
      notes: values.notes,
      sortIndex:
        values.sortIndex.trim() === '' ? undefined : Number(values.sortIndex),
    };
    let res;
    try {
      res =
        (editing
          ? await updatePayrollMember(member.id, payload)
          : await createPayrollMember(payload)) ?? SERVER_ERROR;
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
    toast.success(
      editing ? 'Member saved.' : `${values.displayName} added to payroll.`,
    );
    onOpenChange(false);
  }

  async function onDelete() {
    if (!member) return;
    setDeleting(true);
    let res;
    try {
      res = (await deletePayrollMember(member.id)) ?? {
        ok: false as const,
        error: 'Something went wrong. Try again.',
      };
    } catch {
      res = { ok: false as const, error: 'Something went wrong. Try again.' };
    }
    setDeleting(false);
    setConfirmingDelete(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success('Member removed.');
    onOpenChange(false);
  }

  // An account already linked to this member stays in the list; the query only
  // returns unlinked ones.
  const accountOptions = accounts.slice();
  if (member?.userId && !accountOptions.some((a) => a.id === member.userId)) {
    accountOptions.unshift({
      id: member.userId,
      name: `${member.displayName} (linked)`,
      email: '',
    });
  }

  return (
    <>
      <GlassDialog
        open={open}
        onOpenChange={close}
        maxWidth="44rem"
        header={
          <>
            <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
              {editing ? member.displayName : 'Add a payroll member'}
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-muted-foreground">
              Who gets paid, in what currency, and whether they can see their own
              history.
            </Dialog.Description>
          </>
        }
        footer={
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button
              type="submit"
              // The actions live in the dialog's pinned footer, outside the
              // <form> element — `form` is what still submits it.
              form={FORM_ID}
              size="small"
              showIcon={false}
              disabled={pending}
              className="w-full sm:w-auto"
            >
              {pending ? 'Saving…' : editing ? 'Save changes' : 'Add member'}
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
            {editing && (
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
                  Delete
                </Button>
              </div>
            )}
          </div>
        }
      >
        {/* Flat grid: each top-level block is a cell, and the blocks that already
            pair internally (or carry a fieldset) span both columns. */}
        <form
          id={FORM_ID}
          onSubmit={onSubmit}
          className="grid gap-4 md:grid-cols-2 md:items-start md:gap-x-6"
        >
          <Field
            id="member-name"
            label="Name"
            error={issues.displayName}
            hint="Match the beneficiary name on the exchange invoice."
          >
            <Input
              id="member-name"
              value={values.displayName}
              onChange={(e) => setValue('displayName', e.target.value)}
              maxLength={PAYROLL_NAME_MAX}
              autoComplete="off"
              disabled={pending}
              aria-invalid={issues.displayName ? true : undefined}
              aria-describedby={
                issues.displayName ? 'member-name-error' : undefined
              }
            />
          </Field>

          <Field
            id="member-account"
            label="Dashboard account"
            error={issues.userId}
            hint="Optional. Without one there’s nobody to show a self-view to, but the pay record still works."
          >
            <select
              id="member-account"
              value={values.userId}
              onChange={(e) => setValue('userId', e.target.value)}
              disabled={pending}
              className={dateInput}
            >
              <option value="">Not linked</option>
              {accountOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.email ? `${a.name} (${a.email})` : a.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:col-span-2">
            <Field
              id="member-currency"
              label="Paid in"
              hint="The currency the money actually lands in."
            >
              <select
                id="member-currency"
                value={values.payCurrency}
                onChange={(e) =>
                  setValue('payCurrency', e.target.value as PayrollCurrency)
                }
                disabled={pending}
                className={dateInput}
              >
                {PAYROLL_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {CURRENCIES[c].label}
                  </option>
                ))}
              </select>
            </Field>

            <Field id="member-status" label="Status">
              <select
                id="member-status"
                value={values.status}
                onChange={(e) =>
                  setValue('status', e.target.value as 'active' | 'ended')
                }
                disabled={pending}
                className={dateInput}
              >
                <option value="active">Active</option>
                <option value="ended">Ended</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:col-span-2">
            <Field
              id="member-joined"
              label="Joined"
              error={issues.joinedOn}
              hint="Drives the first month’s proration."
            >
              <input
                id="member-joined"
                type="date"
                value={values.joinedOn}
                onChange={(e) => setValue('joinedOn', e.target.value)}
                disabled={pending}
                className={dateInput}
              />
            </Field>
            <Field
              id="member-ended"
              label="Ended"
              error={issues.endedOn}
              hint="Prorates their final month."
            >
              <input
                id="member-ended"
                type="date"
                value={values.endedOn}
                onChange={(e) => setValue('endedOn', e.target.value)}
                disabled={pending}
                className={dateInput}
              />
            </Field>
          </div>

          <fieldset
            disabled={pending}
            className="flex flex-col gap-3 border-t border-white/40 pt-4 md:col-span-2 dark:border-white/10"
          >
            <legend className="float-left mb-2 text-sm font-medium text-foreground">
              Privacy
            </legend>
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={values.selfViewEnabled}
                onChange={(e) => setValue('selfViewEnabled', e.target.checked)}
                className="mt-0.5 size-4 accent-foreground"
              />
              <span className="text-sm text-foreground">
                Let them see their own pay
                <span className="block text-xs text-muted-foreground">
                  Adds “My pay” to their sidebar: their own history only, never
                  anyone else’s. Turn it off to track someone without exposing it
                  yet.
                </span>
              </span>
            </label>
          </fieldset>

          <Field
            id="member-notes"
            label="Internal notes"
            className="md:col-span-2"
            error={issues.notes}
            hint="Never shown to the member."
          >
            <textarea
              id="member-notes"
              value={values.notes}
              onChange={(e) => setValue('notes', e.target.value)}
              maxLength={PAYROLL_NOTE_MAX}
              rows={2}
              disabled={pending}
              className={cn(
                'w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
              )}
            />
          </Field>

          {issues._form && (
            <p role="alert" className="px-1 text-xs text-destructive md:col-span-2">
              {issues._form}
            </p>
          )}
        </form>
      </GlassDialog>

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title="Delete this member?"
        description="Only possible while they have no pay history. If they've been paid, set an end date and mark them ended instead. That keeps the record."
        confirmLabel="Delete"
        onConfirm={onDelete}
        destructive
        pending={deleting}
      />
    </>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  /** Grid placement from the caller (`md:col-span-2` for the wide blocks). */
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
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
