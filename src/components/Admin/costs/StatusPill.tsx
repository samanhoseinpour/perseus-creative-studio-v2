import {
  COST_PLAN_STATUS_LABELS,
  type CostPlanStatus,
} from '@/lib/costFields';
import { cn } from '@/lib/utils';

/**
 * A plan's state as a small pill (the careers StatusPill shape). Three
 * treatments that read apart without colour: Active is solid ink (it is the
 * money still going out), Paused is the muted wash, Cancelled is a dashed
 * outline — "no longer running, but its history is". Server-safe: pure markup.
 */
export function PlanStatusPill({ status }: { status: CostPlanStatus }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-medium',
        status === 'active' && 'border-transparent bg-foreground text-background',
        status === 'paused' &&
          'border-foreground/15 bg-foreground/[0.06] text-muted-foreground',
        status === 'cancelled' &&
          'border-dashed border-foreground/30 bg-transparent text-muted-foreground',
      )}
    >
      {COST_PLAN_STATUS_LABELS[status]}
    </span>
  );
}
