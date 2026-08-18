import { CURRENCIES, type PayrollCurrency } from '@/lib/payrollAmounts';
import { cn } from '@/lib/utils';

/**
 * A money field. Deliberately `type="text"` with `inputMode="decimal"`, not
 * `type="number"` — the DurationField precedent: a number input rejects the
 * grouped forms people actually paste ("184,800,000", "۳۵٬۰۰۰٬۰۰۰") and its
 * scroll-wheel stepping is a hazard on a salary.
 *
 * The value stays a STRING here and is parsed exactly once, by parseAmount() via
 * the zod schema at submit. This component does no arithmetic, which is why it
 * carries no `'use client'` of its own: it is a leaf of client entries (the
 * DurationField / TaskRow convention) and never owns state.
 */
export default function AmountInput({
  id,
  currency,
  value,
  onValueChange,
  invalid,
  disabled,
  placeholder,
  describedBy,
  size = 'field',
  className,
}: {
  id: string;
  currency: PayrollCurrency;
  value: string;
  onValueChange: (next: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  placeholder?: string;
  describedBy?: string;
  /** 'field' matches Input's h-10; 'cell' is the compact in-row variant. */
  size?: 'field' | 'cell';
  className?: string;
}) {
  const meta = CURRENCIES[currency];
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
        placeholder={placeholder}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn(
          'w-full rounded-md border border-input bg-transparent text-right tabular-nums shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
          size === 'field' ? 'h-10 px-3 text-sm' : 'h-8 px-2 text-xs',
          // Room for the unit suffix.
          currency === 'CAD'
            ? size === 'field'
              ? 'pr-12'
              : 'pr-10'
            : size === 'field'
              ? 'pr-16'
              : 'pr-14',
          invalid && 'border-destructive ring-destructive/20',
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-y-0 right-0 flex items-center text-muted-foreground',
          size === 'field' ? 'pr-3 text-xs' : 'pr-2 text-[0.65rem]',
        )}
      >
        {meta.label}
      </span>
    </div>
  );
}
