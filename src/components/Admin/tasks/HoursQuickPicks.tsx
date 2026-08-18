import { chipClasses } from '@/components/Admin/portfolio/PortfolioChips';
import { cn } from '@/lib/utils';

/**
 * Quick-pick chips for the duration fields (estimate / actual): common
 * durations members tap instead of typing. Values are MINUTES, the vocabulary
 * DurationField and the schemas both speak — a pick just fills the field, which
 * stays editable. Hours only, by design (no day/week units).
 */
const PICKS = [
  { value: 30, label: '30m', spoken: '30 minutes' },
  { value: 60, label: '1h', spoken: '1 hour' },
  { value: 120, label: '2h', spoken: '2 hours' },
  { value: 240, label: '4h', spoken: '4 hours' },
  { value: 480, label: '8h', spoken: '8 hours' },
] as const;

export default function HoursQuickPicks({
  onPick,
  compact,
  disabled,
  className,
}: {
  onPick: (minutes: number) => void;
  /** Tighter chips for popovers and the quick-add band. */
  compact?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {PICKS.map((pick) => (
        <button
          key={pick.value}
          type="button"
          disabled={disabled}
          onClick={() => onPick(pick.value)}
          aria-label={`Set ${pick.spoken}`}
          className={cn(
            chipClasses(false, disabled),
            'outline-none focus-visible:ring-[1.5px] focus-visible:ring-ring',
            compact && 'px-2 py-1 text-[0.65rem]',
          )}
        >
          {pick.label}
        </button>
      ))}
    </div>
  );
}
