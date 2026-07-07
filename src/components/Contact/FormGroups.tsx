import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Apple-checkout-style grouping primitives for the contact form: mono eyebrow
 * section labels over rounded panels whose rows are fused by hairline dividers
 * (no per-field boxes). Presentation only — no state, no zod. Imported by the
 * client form (ContactHub — so they ride its lazy async chunk) and by the server
 * rail (ContactAside); safe in both since there's no 'use client' or zod here.
 *
 * Controls passed into GroupRow are expected to be borderless/transparent: the
 * row supplies the surface and the focus tint (via focus-within), since the
 * site's global CSS strips the UA outline off inputs.
 */

/** Borderless control class shared by every plain input/select/textarea row. */
export const fieldControlClass =
  'block w-full bg-transparent text-sm text-black placeholder:text-black/30 focus:outline-none';

export const GroupSectionLabel = ({
  id,
  hint,
  required,
  children,
  className,
}: {
  id?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      'mt-8 mb-2.5 flex items-baseline justify-between gap-3 px-1',
      className,
    )}
  >
    <p id={id} className="eyebrow text-[10px] text-black/60">
      {children}
      {required && ' *'}
    </p>
    {hint && <span className="text-[11px] text-black/60">{hint}</span>}
  </div>
);

/** Rows fused into one rounded panel, separated by hairline dividers. */
export const InsetGroup = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      'divide-y divide-black/[0.06] overflow-hidden rounded-2xl border border-black/[0.06] bg-background-contrast',
      className,
    )}
  >
    {children}
  </div>
);

/**
 * A single labelled field row. The stacked `text-xs` label sits over a control
 * slot (children); the row tints on focus so borderless inputs still show a
 * clear focus state. `htmlFor` must match the control's `id` so the label
 * associates and `revealFirstError` can locate the field.
 */
export const GroupRow = ({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) => (
  <div className="relative px-4 py-3 transition-colors duration-200 focus-within:bg-black/[0.03] sm:px-5">
    <div className="flex items-baseline justify-between gap-3">
      <label htmlFor={htmlFor} className="block text-xs font-medium text-black/60">
        {label}
        {required && ' *'}
      </label>
      {hint && (
        <span id={`${htmlFor}-hint`} className="text-[11px] text-black/60">
          {hint}
        </span>
      )}
    </div>
    <div className="mt-1.5">{children}</div>
    {error && (
      <p
        id={`${htmlFor}-error`}
        role="alert"
        className="mt-1.5 text-xs text-destructive"
      >
        {error}
      </p>
    )}
  </div>
);
