import { cn } from '@/lib/utils';

/**
 * The exchange rate, in toman per CAD. Same string-in / parse-once contract as
 * AmountInput (parseRate() at the schema boundary), and the same reason for
 * `type="text"`: the invoice quotes rates like "131,999.260804" and a number
 * input fights the grouping.
 */
export default function RateInput({
  id,
  value,
  onValueChange,
  invalid,
  disabled,
  describedBy,
  className,
}: {
  id: string;
  value: string;
  onValueChange: (next: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  describedBy?: string;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        value={value}
        disabled={disabled}
        placeholder="131,999.26"
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn(
          'h-10 w-full rounded-md border border-input bg-transparent px-3 pr-24 text-right text-sm tabular-nums shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
          invalid && 'border-destructive ring-destructive/20',
        )}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-muted-foreground"
      >
        toman / CAD
      </span>
    </div>
  );
}
