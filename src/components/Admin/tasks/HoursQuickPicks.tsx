import { chipClasses } from '@/components/Admin/portfolio/PortfolioChips';
import { cn } from '@/lib/utils';

/**
 * Quick-pick chips for the hours inputs (estimate / actual): common durations
 * members tap instead of guessing what to type. Values are unit-explicit
 * strings ('30m', '1h', …) so they round-trip parseHoursToMinutes /
 * timeInputValue — a pick just fills the input, which stays editable. Hours
 * only, by design (no day/week units).
 */
const PICKS = [
  { value: '30m', label: '30m', spoken: '30 minutes' },
  { value: '1h', label: '1h', spoken: '1 hour' },
  { value: '2h', label: '2h', spoken: '2 hours' },
  { value: '4h', label: '4h', spoken: '4 hours' },
  { value: '8h', label: '8h', spoken: '8 hours' },
] as const;

export default function HoursQuickPicks({
  onPick,
  compact,
  disabled,
  className,
}: {
  onPick: (value: string) => void;
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
