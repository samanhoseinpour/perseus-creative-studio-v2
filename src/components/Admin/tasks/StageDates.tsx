// No 'use client' directive on purpose: a leaf rendered inside both the
// client TaskBoard tree and the server report (CompletedCellPopover
// precedent). It takes only strings, so it is safe in either.
import type { StageDateLabel } from './format';
import { cn } from '@/lib/utils';

/**
 * The date cell for a shipped task, from parts composed server-side by
 * `stageDateLabels`. One line on a done row or when the completion and
 * handover days match; two when they differ.
 *
 * A component and not a joined string so the two dates can wrap independently
 * in a narrow cell, and so the separator is never read out by a screen reader
 * as a word. The joined form exists for accessible names — see stageDatesText.
 */
export default function StageDates({
  parts,
  className,
}: {
  parts: StageDateLabel[];
  className?: string;
}) {
  if (parts.length === 0) return null;
  return (
    <span className={cn('flex flex-wrap items-baseline gap-x-1.5', className)}>
      {parts.map((part, i) => (
        <span key={part.label} className="whitespace-nowrap">
          {i > 0 && (
            <span aria-hidden="true" className="mr-1.5 opacity-50">
              ·
            </span>
          )}
          {part.label} {part.text}
        </span>
      ))}
    </span>
  );
}

/** The same content as one string, for an accessible name or a CSV cell. */
export function stageDatesText(parts: StageDateLabel[]): string {
  return parts.map((part) => `${part.label} ${part.text}`).join(' · ');
}
