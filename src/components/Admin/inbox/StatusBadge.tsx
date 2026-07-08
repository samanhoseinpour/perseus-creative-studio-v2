import type { ContactSubmission } from '@/db/schema';
import { cn } from '@/lib/utils';

type Status = ContactSubmission['status'];

// The badge can sit directly on the shader (detail header), so the non-inverted
// variants carry a frosted fill + rim so they read off the glass, not just a
// hairline border.
const STYLES: Record<Status, string> = {
  new: 'border-transparent bg-foreground text-background',
  read: 'border-white/50 bg-white/40 text-muted-foreground backdrop-blur-sm dark:border-white/12 dark:bg-white/10',
  archived:
    'border-white/50 bg-white/40 text-muted-foreground backdrop-blur-sm dark:border-white/12 dark:bg-white/10',
  spam: 'border-destructive/40 bg-destructive/10 text-destructive backdrop-blur-sm',
};

const LABELS: Record<Status, string> = {
  new: 'New',
  read: 'Read',
  archived: 'Archived',
  spam: 'Spam',
};

export default function StatusBadge({
  status,
  className,
}: {
  status: Status;
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
      {LABELS[status]}
    </span>
  );
}
