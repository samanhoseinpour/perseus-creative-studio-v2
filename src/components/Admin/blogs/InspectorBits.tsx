'use client';

import { LuPlus, LuX } from 'react-icons/lu';

import { Input } from '@/components/ui/input';
import {
  inspectorGroup,
  inspectorRow,
  inspectorRowRemove,
} from '@/components/Admin/blogs/postBox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * The three controls both inspector panes build their fields out of.
 *
 * They live apart from the panes because the alternative is two copies: the
 * Post pane has key takeaways and the SEO pane has focus keywords, and those
 * are the same control with a different label and a different cap. Two copies
 * is how one of them ends up without its remove button, or with a cap the
 * schema does not share.
 *
 * EVERY ROW IS ADDRESSED BY INDEX AND EVERY LIST IS CAPPED AT THE SCHEMA'S OWN
 * NUMBER, passed in by the pane. An empty row is an affordance rather than a
 * value: `compactPostLists` drops it on the way to the door, so a writer who
 * adds a row and walks away never has an autosave refused for a blank string.
 */

/** A labelled group with an optional hint under it. */
export function Group({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={inspectorGroup}>
      <span className="text-xs font-medium text-foreground">{label}</span>
      {children}
      {hint && !error && <p className="px-1 text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p role="alert" className="px-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** The "add another" button under a list. Disabled at the cap, and it says so
 *  rather than disappearing: a control that vanishes reads as a bug. */
export function AddRow({
  label,
  count,
  max,
  disabled,
  onAdd,
}: {
  label: string;
  count: number;
  max: number;
  disabled?: boolean;
  onAdd: () => void;
}) {
  const full = count >= max;
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={disabled || full}
        onClick={onAdd}
        className="inline-flex items-center gap-1.5 rounded-lg border border-foreground/15 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-foreground/[0.06] disabled:pointer-events-none disabled:opacity-40"
      >
        <LuPlus aria-hidden="true" className="size-3" />
        {label}
      </button>
      {full && (
        <span className="text-xs text-muted-foreground">
          {max} is the limit.
        </span>
      )}
    </div>
  );
}

/** Remove one row. */
export function RemoveRow({
  label,
  disabled,
  onRemove,
}: {
  label: string;
  disabled?: boolean;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onRemove}
      className={inspectorRowRemove}
    >
      <LuX aria-hidden="true" className="size-3.5" />
    </button>
  );
}

/** A list of single-line values: takeaways, keywords, an entity's links. */
export function TextRows({
  idPrefix,
  values,
  onChange,
  max,
  maxLength,
  placeholder,
  addLabel,
  removeLabel,
  disabled,
}: {
  idPrefix: string;
  values: string[];
  onChange: (next: string[]) => void;
  max: number;
  maxLength: number;
  placeholder: string;
  addLabel: string;
  /** Verb plus noun, e.g. "Remove this takeaway". Row number is appended. */
  removeLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      {values.map((value, index) => (
        <div key={index} className={inspectorRow}>
          <Input
            id={`${idPrefix}-${index}`}
            value={value}
            maxLength={maxLength}
            placeholder={placeholder}
            disabled={disabled}
            onChange={(e) =>
              onChange(values.map((v, i) => (i === index ? e.target.value : v)))
            }
          />
          <RemoveRow
            label={`${removeLabel} ${index + 1}`}
            disabled={disabled}
            onRemove={() => onChange(values.filter((_, i) => i !== index))}
          />
        </div>
      ))}
      <AddRow
        label={addLabel}
        count={values.length}
        max={max}
        disabled={disabled}
        onAdd={() => onChange([...values, ''])}
      />
    </div>
  );
}

/** A switch with its own explanation. A checkbox rather than a Radix switch:
 *  the dashboard has no switch primitive, and a native input carries its state
 *  to a screen reader without help. */
export function Toggle({
  id,
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className={cn(
          'mt-0.5 size-4 shrink-0 cursor-pointer rounded-[3px] border border-foreground/25 accent-foreground',
          'disabled:cursor-default disabled:opacity-50',
        )}
      />
      <div className="flex min-w-0 flex-col gap-0.5">
        <Label htmlFor={id} className="cursor-pointer text-xs font-medium">
          {label}
        </Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}
