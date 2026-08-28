/**
 * The payroll payment lifecycle, in one place — so no action, page, or dialog
 * re-implements it. Zero-dependency client-safe leaf (the adminAreas.ts split):
 * the admin table, the member's confirm buttons, and every server action all
 * read the same matrix.
 *
 * Shape of the flow: the payroll admin prepares a month as `draft` (invisible to
 * members), submitting the run flips every line to `sent` — which literally means
 * "the money left". The member then either confirms it landed (`received`) or
 * says something is wrong (`flagged`, with a required note). `void` is for lines
 * recorded in error.
 *
 * Two rules inherited from the task system, both load-bearing:
 *  - Edit doors NEVER touch status. Changing an amount and changing a state are
 *    separate actions with separate audit entries.
 *  - Members act only on their own line, admins on anyone's. `own` and
 *    `payrollAdmin` are therefore separate inputs, not one "permission" flag.
 */

export const PAYROLL_PAYMENT_STATUSES = [
  'draft',
  'sent',
  'received',
  'flagged',
  'void',
] as const;

export type PayrollPaymentStatus = (typeof PAYROLL_PAYMENT_STATUSES)[number];

export function isPayrollPaymentStatus(
  value: unknown,
): value is PayrollPaymentStatus {
  return (
    typeof value === 'string' &&
    (PAYROLL_PAYMENT_STATUSES as readonly string[]).includes(value)
  );
}

export const PAYROLL_STATUS_LABELS: Record<PayrollPaymentStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  received: 'Received',
  flagged: 'Flagged',
  void: 'Void',
};

/** Member-facing wording — "draft" and "void" are never shown to a member, but
 *  a value is defined for every key so the map can't be indexed into a hole. */
export const PAYROLL_STATUS_MEMBER_LABELS: Record<
  PayrollPaymentStatus,
  string
> = {
  draft: 'Not yet sent',
  sent: 'Sent, awaiting your confirmation',
  received: 'Received',
  flagged: 'Problem reported',
  void: 'Cancelled',
};

/** Statuses a member is allowed to see at all. A `draft` line must never leak
 *  a half-typed figure, so member reads filter on this. */
export const MEMBER_VISIBLE_STATUSES = [
  'sent',
  'received',
  'flagged',
  'void',
] as const satisfies readonly PayrollPaymentStatus[];

export function isMemberVisible(status: PayrollPaymentStatus): boolean {
  return (MEMBER_VISIBLE_STATUSES as readonly string[]).includes(status);
}

/** Statuses that count as money-out for cost rollups (a draft hasn't moved, a
 *  void didn't). */
export function countsAsSpend(status: PayrollPaymentStatus): boolean {
  return status === 'sent' || status === 'received' || status === 'flagged';
}

export type PayrollActor = {
  /** Viewer may manage everyone's payroll. */
  payrollAdmin: boolean;
  /** The payment belongs to the viewer. */
  own: boolean;
};

type Transition = {
  to: PayrollPaymentStatus;
  admin: boolean;
  member: boolean;
  /** A note is mandatory for this transition. */
  requiresNote?: true;
};

/**
 * from -> allowed transitions. Deliberately explicit rather than derived: a
 * table you can read next to the invoice is worth more than a clever rule.
 */
const TRANSITIONS: Record<PayrollPaymentStatus, Transition[]> = {
  draft: [
    // Reached in bulk by submitting the run, never by a member.
    { to: 'sent', admin: true, member: false },
    { to: 'void', admin: true, member: false },
  ],
  sent: [
    // The member confirms; an admin may confirm on their behalf when someone
    // never logs in (recorded as onBehalf in the event payload).
    { to: 'received', admin: true, member: true },
    { to: 'flagged', admin: true, member: true, requiresNote: true },
    { to: 'void', admin: true, member: false },
  ],
  flagged: [
    { to: 'received', admin: true, member: true },
    // Re-sent after fixing the problem.
    { to: 'sent', admin: true, member: false },
    { to: 'void', admin: true, member: false },
  ],
  received: [
    // Terminal for the member. An admin can still void a line recorded in
    // error, which leaves an audit row behind.
    { to: 'void', admin: true, member: false },
  ],
  void: [{ to: 'sent', admin: true, member: false }],
};

export type TransitionCheck =
  | { ok: true; requiresNote: boolean }
  | { ok: false; error: string };

/**
 * May `actor` move a payment from `from` to `to`? Returns the note requirement
 * alongside, so a caller can't allow the transition while forgetting the note.
 */
export function checkTransition(
  from: PayrollPaymentStatus,
  to: PayrollPaymentStatus,
  actor: PayrollActor,
): TransitionCheck {
  if (from === to) return { ok: false, error: 'That is already the status.' };

  const rule = TRANSITIONS[from]?.find((t) => t.to === to);
  if (!rule) {
    return {
      ok: false,
      error: `A ${PAYROLL_STATUS_LABELS[from].toLowerCase()} payment can’t become ${PAYROLL_STATUS_LABELS[to].toLowerCase()}.`,
    };
  }

  const allowed =
    (actor.payrollAdmin && rule.admin) || (actor.own && rule.member);
  if (!allowed) {
    return { ok: false, error: 'You can’t make that change.' };
  }

  return { ok: true, requiresNote: rule.requiresNote === true };
}

/** Convenience for rendering buttons: what can this viewer do right now? */
export function availableTransitions(
  from: PayrollPaymentStatus,
  actor: PayrollActor,
): PayrollPaymentStatus[] {
  return (TRANSITIONS[from] ?? [])
    .filter((t) => (actor.payrollAdmin && t.admin) || (actor.own && t.member))
    .map((t) => t.to);
}
