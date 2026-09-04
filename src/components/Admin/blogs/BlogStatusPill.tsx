import { BLOG_POST_STATUS_LABELS, type BlogPostStatus } from '@/lib/blogFields';
import { cn } from '@/lib/utils';

/**
 * A post's state as a small pill (the careers `StatusPill` shape). Server-safe:
 * pure markup, no directive, so the list and its skeleton can both hold it.
 *
 * The admin theme carries no chroma, so four of the five states are INK at
 * different weights and read apart without colour at all: Published is solid
 * ink (the one state the public can see), Archived the muted wash, Draft a
 * dashed outline (not really there yet), Trash the same outline quietened
 * further with a line through it.
 *
 * Scheduled is the one exception and it borrows AMBER, which in this dashboard
 * means "waiting" everywhere else it appears: due today on the task board, an
 * expiring listing on the careers roster. ROSE IS DELIBERATELY ABSENT from
 * this palette. Rose means overdue or destructive here, and none of these five
 * states has missed anything: a draft nobody finished is not a failure, and a
 * binned post is recoverable until somebody purges it.
 */
export default function BlogStatusPill({ status }: { status: BlogPostStatus }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-medium',
        status === 'published' && 'border-transparent bg-foreground text-background',
        status === 'scheduled' &&
          'border-amber-600/25 bg-amber-500/10 text-amber-700 dark:text-amber-400',
        status === 'archived' &&
          'border-foreground/15 bg-foreground/[0.06] text-muted-foreground',
        status === 'draft' &&
          'border-dashed border-foreground/30 bg-transparent text-muted-foreground',
        status === 'trash' &&
          'border-dashed border-foreground/25 bg-transparent text-muted-foreground line-through',
      )}
    >
      {BLOG_POST_STATUS_LABELS[status]}
    </span>
  );
}
