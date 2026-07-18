import {
  PROJECT_VISIBILITY_LABELS,
  type ProjectVisibilityField,
} from '@/lib/portfolioFields';
import { cn } from '@/lib/utils';

/** Project visibility state as a small pill — the projects list and editor
 *  share it. (Clients dropped their visibility with the public profile pages;
 *  their tiles show MarqueePill from ClientsGrid instead.) Server-safe: pure
 *  markup, usable from both worlds. */
export function VisibilityPill({
  visibility,
}: {
  visibility: ProjectVisibilityField;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-medium',
        visibility === 'public' &&
          'border-emerald-600/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
        visibility === 'unlisted' &&
          'border-amber-600/25 bg-amber-500/10 text-amber-700 dark:text-amber-400',
        visibility === 'draft' &&
          'border-foreground/15 bg-foreground/[0.06] text-muted-foreground',
      )}
    >
      {PROJECT_VISIBILITY_LABELS[visibility]}
    </span>
  );
}
