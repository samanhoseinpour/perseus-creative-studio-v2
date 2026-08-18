import {
  PAYROLL_STATUS_LABELS,
  PAYROLL_STATUS_MEMBER_LABELS,
  type PayrollPaymentStatus,
} from '@/lib/payrollStatus';
import { cn } from '@/lib/utils';

/**
 * Status chip. Same base string as TaskStatusBadge / TicketStatusBadge with a
 * payroll-specific style map — the house pattern (one shape, per-domain palette).
 *
 * `audience` swaps the wording, not the styling: a member reads "Sent — awaiting
 * your confirmation" where the admin reads "Sent". A member never sees a draft at
 * all (the queries filter it out), but the label exists so the map has no hole.
 */
const STYLES: Record<PayrollPaymentStatus, string> = {
  draft:
    'border-white/50 bg-white/40 text-muted-foreground backdrop-blur-sm dark:border-white/12 dark:bg-white/10',
  sent: 'border-amber-500/40 bg-amber-500/10 text-amber-700 backdrop-blur-sm dark:text-amber-400',
  received: 'border-transparent bg-foreground text-background',
  flagged:
    'border-destructive/40 bg-destructive/10 text-destructive backdrop-blur-sm',
  void: 'border-white/50 bg-white/30 text-muted-foreground line-through backdrop-blur-sm dark:border-white/12 dark:bg-white/[0.06]',
};

export default function PayrollStatusBadge({
  status,
  audience = 'admin',
  className,
}: {
  status: PayrollPaymentStatus;
  audience?: 'admin' | 'member';
  className?: string;
}) {
  const label =
    audience === 'member'
      ? PAYROLL_STATUS_MEMBER_LABELS[status]
      : PAYROLL_STATUS_LABELS[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide',
        STYLES[status],
        className,
      )}
    >
      {label}
    </span>
  );
}
