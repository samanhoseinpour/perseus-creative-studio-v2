import Link from 'next/link';

import { glassRowHover } from '@/components/Admin/Glass';
import type { TicketStatusSlug } from '@/lib/ticketFields';
import { getPageNumbers } from '@/utils/pagination';
import { cn } from '@/lib/utils';

function pageHref(
  basePath: string,
  view: TicketStatusSlug | null,
  p: number,
): string {
  const params = new URLSearchParams();
  if (view && view !== 'open') params.set('status', view);
  if (p > 1) params.set('page', String(p));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/**
 * Page-number row for the ticket lists — the inbox Pager's markup, extracted
 * as a server component (the ticket list has no client-side keyboard layer).
 * `view` is null on the reporter's own-tickets view, which has no status tabs.
 */
export default function TicketPager({
  basePath,
  view,
  page,
  totalPages,
}: {
  basePath: string;
  view: TicketStatusSlug | null;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav
      className="flex items-center justify-center gap-1 border-t border-white/40 p-3 dark:border-white/10"
      aria-label="Pagination"
    >
      {getPageNumbers(page, totalPages).map((n, i) =>
        n === 'ellipsis' ? (
          <span
            key={`ellipsis-${i}`}
            className="px-2 text-xs text-muted-foreground"
          >
            …
          </span>
        ) : (
          <Link
            key={n}
            href={pageHref(basePath, view, n)}
            aria-current={n === page ? 'page' : undefined}
            className={cn(
              'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-medium transition-colors',
              n === page
                ? 'bg-foreground text-background'
                : cn('text-muted-foreground hover:text-foreground', glassRowHover),
            )}
          >
            {n}
          </Link>
        ),
      )}
    </nav>
  );
}
