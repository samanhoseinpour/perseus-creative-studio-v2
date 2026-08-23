import { JOB_STATUS_LABELS, type JobStatusField } from '@/lib/careerFields';
import { cn } from '@/lib/utils';

/**
 * A listing's publication state as a small pill (the VisibilityPill shape).
 * Three treatments that read apart without colour: Open is solid ink (it is
 * the one state the public can act on), Filled is the muted wash, Draft is
 * a dashed outline — "not really there yet". Server-safe: pure markup.
 */
export function StatusPill({ status }: { status: JobStatusField }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-medium',
        status === 'open' && 'border-transparent bg-foreground text-background',
        status === 'filled' &&
          'border-foreground/15 bg-foreground/[0.06] text-muted-foreground',
        status === 'draft' &&
          'border-dashed border-foreground/30 bg-transparent text-muted-foreground',
      )}
    >
      {JOB_STATUS_LABELS[status]}
    </span>
  );
}
