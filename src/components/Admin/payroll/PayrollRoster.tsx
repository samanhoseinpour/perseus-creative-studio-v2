'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { LuEye, LuEyeOff, LuPencil, LuPlus, LuWallet } from 'react-icons/lu';

import Button from '@/components/Button';
import EmptyState from '@/components/Admin/EmptyState';
import {
  adminLink,
  glassChip,
  glassRowHover,
  GlassPanel,
} from '@/components/Admin/Glass';
import MemberDialog, {
  type LinkableAccount,
  type MemberDialogMember,
} from '@/components/Admin/payroll/MemberDialog';
import TermDialog from '@/components/Admin/payroll/TermDialog';
import { setPayrollSelfView } from '@/app/(admin)/admin/(protected)/_actions/payroll';
import { cn } from '@/lib/utils';

/**
 * The payroll roster. One row per payee: who they are, what they're on, and
 * whether they can see it.
 *
 * The self-view eye is optimistic with rollback (the AreaToggles pattern) —
 * it's the switch that gets flipped most, and a round trip before the icon moves
 * feels broken.
 */
export type RosterRow = MemberDialogMember & {
  accountEmail: string | null;
  termLabel: string | null;
  termFromLabel: string | null;
  joinedLabel: string | null;
  endedLabel: string | null;
  lastPaidLabel: string | null;
};

const TRANSPORT = { ok: false as const, error: 'Something went wrong — try again.' };

export default function PayrollRoster({
  rows,
  accounts,
}: {
  rows: RosterRow[];
  accounts: LinkableAccount[];
}) {
  const [editing, setEditing] = useState<MemberDialogMember | null>(null);
  const [creating, setCreating] = useState(false);
  const [termFor, setTermFor] = useState<RosterRow | null>(null);
  const [selfView, setSelfView] = useState<Record<string, boolean>>({});

  const isVisible = (row: RosterRow) =>
    selfView[row.id] ?? row.selfViewEnabled;

  async function toggleSelfView(row: RosterRow) {
    const next = !isVisible(row);
    setSelfView((prev) => ({ ...prev, [row.id]: next }));
    let res;
    try {
      res = (await setPayrollSelfView(row.id, next)) ?? TRANSPORT;
    } catch {
      res = TRANSPORT;
    }
    if (!res.ok) {
      setSelfView((prev) => ({ ...prev, [row.id]: !next }));
      toast.error(res.error);
      return;
    }
    toast.success(
      next
        ? `${row.displayName} can now see their own pay.`
        : `${row.displayName}’s pay is hidden from them.`,
    );
  }

  return (
    <>
      <div className="mb-6 flex justify-end">
        <Button
          size="small"
          icon={LuPlus}
          iconPosition="left"
          onClick={() => setCreating(true)}
        >
          Add member
        </Button>
      </div>

      <GlassPanel>
        {rows.length === 0 ? (
          <EmptyState
            icon={LuWallet}
            title="Nobody on the payroll yet"
            description="Add a member, set their standing salary, then start a month."
          />
        ) : (
          <ul className="divide-y divide-white/40 dark:divide-white/10">
            {rows.map((row) => {
              const visible = isVisible(row);
              return (
                <li
                  key={row.id}
                  className={cn(
                    'flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4 sm:px-5',
                    glassRowHover,
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/payroll/${row.id}`}
                        className={cn(
                          'font-medium text-foreground',
                          adminLink,
                        )}
                      >
                        {row.displayName}
                      </Link>
                      {row.status === 'ended' && (
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide',
                            glassChip,
                          )}
                        >
                          Ended
                        </span>
                      )}
                      {!row.userId && (
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide',
                            glassChip,
                          )}
                        >
                          No account
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {row.termLabel
                        ? `${row.termLabel}${row.termFromLabel ? ` from ${row.termFromLabel}` : ''}`
                        : 'No standing salary set'}
                      {row.accountEmail ? ` · ${row.accountEmail}` : ''}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {row.joinedLabel ? `Joined ${row.joinedLabel}` : 'No join date'}
                      {row.endedLabel ? ` · ended ${row.endedLabel}` : ''}
                      {row.lastPaidLabel ? ` · last paid ${row.lastPaidLabel}` : ''}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => void toggleSelfView(row)}
                      disabled={!row.userId}
                      aria-pressed={visible}
                      title={
                        !row.userId
                          ? 'No linked account to show it to'
                          : visible
                            ? 'They can see their own pay'
                            : 'Hidden from them'
                      }
                      className={cn(
                        'inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                        visible && row.userId
                          ? 'border-transparent bg-foreground text-background'
                          : 'border-white/50 bg-white/40 text-muted-foreground hover:text-foreground dark:border-white/15 dark:bg-white/10',
                      )}
                    >
                      {visible ? (
                        <LuEye className="size-4" aria-hidden="true" />
                      ) : (
                        <LuEyeOff className="size-4" aria-hidden="true" />
                      )}
                      <span className="sr-only">
                        {visible ? 'Hide their pay' : 'Show them their pay'}
                      </span>
                    </button>

                    <Button
                      variant="secondary"
                      size="small"
                      showIcon={false}
                      onClick={() => setTermFor(row)}
                    >
                      Salary
                    </Button>
                    <Button
                      variant="secondary"
                      size="small"
                      icon={LuPencil}
                      iconPosition="left"
                      onClick={() => setEditing(row)}
                    >
                      Edit
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </GlassPanel>

      <MemberDialog
        open={creating}
        onOpenChange={setCreating}
        member={null}
        accounts={accounts}
      />
      <MemberDialog
        open={editing !== null}
        onOpenChange={(next) => {
          if (!next) setEditing(null);
        }}
        member={editing}
        accounts={accounts}
      />
      {termFor && (
        <TermDialog
          open
          onOpenChange={(next) => {
            if (!next) setTermFor(null);
          }}
          memberId={termFor.id}
          memberName={termFor.displayName}
          defaultCurrency={termFor.payCurrency}
        />
      )}
    </>
  );
}
