import type { Metadata } from 'next';
import Link from 'next/link';
import { LuArrowLeft } from 'react-icons/lu';

import AdminPage from '@/components/Admin/AdminPage';
import { adminLink } from '@/components/Admin/Glass';
import PayrollRoster, {
  type RosterRow,
} from '@/components/Admin/payroll/PayrollRoster';
import { dayLabel, monthLabel } from '@/components/Admin/payroll/format';
import {
  adminListLinkableAccounts,
  adminListMembers,
  lastPaidByMember,
  listMemberTerms,
} from '@/db/payrollQueries';
import { requirePayrollAdmin } from '@/lib/adminAccess';
import { formatAmount } from '@/lib/payrollAmounts';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Payroll members',
  description: 'Who is on the payroll, and what they are on.',
};

/**
 * The roster. Slim server-derived props: every amount and date arrives as a
 * formatted string, so PayrollRoster does no money or date math (hydration-safe)
 * and never sees a payment row.
 */
export default async function PayrollMembersPage() {
  await requirePayrollAdmin();

  const [members, accounts, lastPaid] = await Promise.all([
    adminListMembers(),
    adminListLinkableAccounts(),
    lastPaidByMember(),
  ]);

  // Terms per member — one query each, but the roster is a handful of people and
  // this keeps the "current term" rule in exactly one place (listMemberTerms is
  // ordered newest-first).
  const termLists = await Promise.all(
    members.map((m) => listMemberTerms(m.id)),
  );

  const rows: RosterRow[] = members.map((m, i) => {
    const current = termLists[i][0] ?? null;
    return {
      id: m.id,
      displayName: m.displayName,
      userId: m.userId,
      status: m.status,
      joinedOn: m.joinedOn,
      endedOn: m.endedOn,
      selfViewEnabled: m.selfViewEnabled,
      payCurrency: m.payCurrency,
      notes: m.notes,
      sortIndex: m.sortIndex,
      accountEmail: m.accountEmail,
      termLabel: current
        ? formatAmount(current.anchorAmount, current.anchorCurrency)
        : null,
      termFromLabel: current ? dayLabel(current.effectiveFrom) : null,
      joinedLabel: m.joinedOn ? dayLabel(m.joinedOn) : null,
      endedLabel: m.endedOn ? dayLabel(m.endedOn) : null,
      lastPaidLabel: lastPaid.has(m.id)
        ? monthLabel(lastPaid.get(m.id)!)
        : null,
    };
  });

  return (
    <AdminPage>
      <Link
        href="/admin/payroll"
        className={cn(
          'mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground',
          adminLink,
        )}
      >
        <LuArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Payroll
      </Link>

      <header className="mb-6 flex flex-col gap-1.5">
        <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Private
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Payroll members
        </h1>
        <p className="text-sm text-muted-foreground">
          Who gets paid, what they’re on, and who can see their own history.
        </p>
      </header>

      <PayrollRoster rows={rows} accounts={accounts} />

      <p className="mt-4 px-1 text-xs text-muted-foreground">
        A salary can be set in CAD or in toman — that choice is what makes
        someone’s toman move with the exchange rate or stay fixed. Members with
        the eye switched on see only their own line, and only after a month is
        sent. Ending someone keeps their record; deleting is only possible before
        they’ve ever been paid.
      </p>
    </AdminPage>
  );
}
