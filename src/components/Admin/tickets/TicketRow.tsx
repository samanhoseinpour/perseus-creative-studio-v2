import Link from 'next/link';

import { glassRowHover } from '@/components/Admin/Glass';
import {
  TICKET_SEVERITY_LABELS,
  type TicketSeveritySlug,
  type TicketStatusSlug,
} from '@/lib/ticketFields';
import { cn } from '@/lib/utils';
import TicketStatusBadge from './TicketStatusBadge';

// Severity as a scannable dot (the label is repeated in the secondary line for
// anyone who can't lean on colour).
const SEVERITY_DOT: Record<TicketSeveritySlug, string> = {
  low: 'bg-foreground/25',
  medium: 'bg-amber-500',
  high: 'bg-destructive',
};

/**
 * One ticket as a list row, mirroring InboxRow's anatomy (dot · text · meta).
 * Server component — rows are plain links; `showStatus` adds the status pill
 * on the reporter's own-tickets view, where no tab implies it.
 */
export default function TicketRow({
  href,
  title,
  severity,
  status,
  showStatus,
  secondary,
  dateLabel,
}: {
  href: string;
  title: string;
  severity: TicketSeveritySlug;
  status: TicketStatusSlug;
  showStatus?: boolean;
  secondary: string;
  dateLabel: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className={cn(
          'flex items-center gap-3.5 px-4 py-3.5 sm:px-5',
          glassRowHover,
        )}
      >
        <span
          className={cn(
            'h-2 w-2 shrink-0 rounded-full',
            SEVERITY_DOT[severity],
          )}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'block truncate text-sm text-foreground',
              status === 'open' ? 'font-semibold' : 'font-medium',
            )}
          >
            {title}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {TICKET_SEVERITY_LABELS[severity]} · {secondary}
          </span>
        </span>
        {showStatus && <TicketStatusBadge status={status} className="shrink-0" />}
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {dateLabel}
        </span>
      </Link>
    </li>
  );
}
