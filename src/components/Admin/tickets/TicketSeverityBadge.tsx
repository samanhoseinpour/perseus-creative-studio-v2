import {
  TICKET_SEVERITY_LABELS,
  type TicketSeveritySlug,
} from '@/lib/ticketFields';
import { cn } from '@/lib/utils';

// Severity pill — same shape family as TicketStatusBadge. High borrows the
// spam badge's destructive treatment; medium is amber; low stays quiet frost.
const STYLES: Record<TicketSeveritySlug, string> = {
  low: 'border-white/50 bg-white/40 text-muted-foreground backdrop-blur-sm dark:border-white/12 dark:bg-white/10',
  medium:
    'border-amber-500/40 bg-amber-500/10 text-amber-700 backdrop-blur-sm dark:text-amber-400',
  high: 'border-destructive/40 bg-destructive/10 text-destructive backdrop-blur-sm',
};

export default function TicketSeverityBadge({
  severity,
  className,
}: {
  severity: TicketSeveritySlug;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide',
        STYLES[severity],
        className,
      )}
    >
      {TICKET_SEVERITY_LABELS[severity]}
    </span>
  );
}
