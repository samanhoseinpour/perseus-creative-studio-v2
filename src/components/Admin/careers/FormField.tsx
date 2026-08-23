'use client';

import { Label } from '@/components/ui/label';

/**
 * The label → control → hint/error slot the two careers dialogs share
 * (ClientDialog's private `Field`, lifted so OpeningDialog and
 * CategoriesDialog can't drift). Plus the Input primitive's skin on the two
 * native controls it doesn't cover — textarea and select — the NewTicketForm
 * / ProjectForm idiom.
 */
export function Field({
  id,
  label,
  error,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className ? `flex flex-col gap-2 ${className}` : 'flex flex-col gap-2'}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && (
        <p className="px-1 text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="px-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export const textareaClasses =
  'placeholder:text-muted-foreground border-input flex w-full min-w-0 resize-y rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[1px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive';

export const selectClasses =
  'border-input flex h-10 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[1px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive';
