'use client';

import { cn } from '@/lib/utils';

/**
 * The portfolio forms' chip controls — the ticket form's chip idiom
 * (radio/checkbox inputs visually rendered as pills) extracted for reuse
 * across ProjectForm, ClientDialog, and the embed editor. Single-select
 * (ChipGroup) is radio semantics; multi-select (MultiChipGroup) is checkbox
 * semantics. Both stay dependency-free and zod-free.
 */

export const chipClasses = (active: boolean, disabled?: boolean) =>
  cn(
    'cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
    'has-[:focus-visible]:ring-[1.5px] has-[:focus-visible]:ring-ring',
    active
      ? 'border-transparent bg-foreground text-background'
      : 'border-foreground/15 bg-white/40 text-muted-foreground hover:text-foreground dark:bg-white/10',
    disabled && 'cursor-not-allowed opacity-50',
  );

export function ChipGroup<T extends string>({
  legend,
  options,
  value,
  onChange,
  disabled,
  error,
  help,
}: {
  legend: string;
  options: readonly { slug: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
  disabled?: boolean;
  error?: string;
  /** Line under the chips — e.g. what the selected visibility means. */
  help?: string;
}) {
  const errorId = `${legend.replace(/\W+/g, '-').toLowerCase()}-error`;

  return (
    <fieldset disabled={disabled} aria-describedby={error ? errorId : undefined}>
      <legend className="mb-2 text-sm font-medium text-foreground">
        {legend}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map(({ slug, label }) => (
          <label key={slug} className={chipClasses(value === slug, disabled)}>
            <input
              type="radio"
              name={legend}
              value={slug}
              checked={value === slug}
              onChange={() => onChange(slug)}
              className="sr-only"
            />
            {label}
          </label>
        ))}
      </div>
      {help && !error && (
        <p className="mt-2 px-1 text-xs text-muted-foreground">{help}</p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-2 px-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}

export function MultiChipGroup<T extends string>({
  legend,
  options,
  values,
  onToggle,
  disabled,
  error,
  help,
}: {
  legend: string;
  options: readonly T[];
  values: readonly T[];
  onToggle: (option: T) => void;
  disabled?: boolean;
  error?: string;
  help?: string;
}) {
  const errorId = `${legend.replace(/\W+/g, '-').toLowerCase()}-error`;

  return (
    <fieldset disabled={disabled} aria-describedby={error ? errorId : undefined}>
      <legend className="mb-2 text-sm font-medium text-foreground">
        {legend}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = values.includes(option);
          return (
            <label key={option} className={chipClasses(active, disabled)}>
              <input
                type="checkbox"
                checked={active}
                onChange={() => onToggle(option)}
                className="sr-only"
              />
              {option}
            </label>
          );
        })}
      </div>
      {help && !error && (
        <p className="mt-2 px-1 text-xs text-muted-foreground">{help}</p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-2 px-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
