import {
  TICKET_STATUS_LABELS,
  type TicketStatusSlug,
} from '@/lib/ticketFields';
import { cn } from '@/lib/utils';

// Same pill shape as the inbox StatusBadge; open is the "needs attention"
// state (inverted, like `new`), pending reads as in-progress amber, closed as
// settled frost. The non-inverted variants carry a frosted fill + rim so they
// read off the glass in both themes.
const STYLES: Record<TicketStatusSlug, string> = {
  open: 'border-transparent bg-foreground text-background',
  pending:
    'border-amber-500/40 bg-amber-500/10 text-amber-700 backdrop-blur-sm dark:text-amber-400',
  closed:
    'border-white/50 bg-white/40 text-muted-foreground backdrop-blur-sm dark:border-white/12 dark:bg-white/10',
};

export default function TicketStatusBadge({
  status,
  className,
}: {
  status: TicketStatusSlug;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide',
        STYLES[status],
        className,
      )}
    >
      {TICKET_STATUS_LABELS[status]}
    </span>
  );
}
