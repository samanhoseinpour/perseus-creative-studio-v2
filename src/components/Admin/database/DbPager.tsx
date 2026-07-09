import Link from 'next/link';

import { glassRowHover } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';
import { getPageNumbers } from '@/utils/pagination';

/**
 * Server-rendered pagination for /admin/database — the inbox Pager's exact
 * look, minus the client wrapper (that one lives inside the keyboard-triage
 * list and is typed to inbox views). Hrefs stay canonical: `table` is omitted
 * for the default table and `page` is omitted on page 1.
 */
export default function DbPager({
  slug,
  isDefault,
  page,
  totalPages,
}: {
  slug: string;
  isDefault: boolean;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const pageHref = (p: number): string => {
    const params = new URLSearchParams();
    if (!isDefault) params.set('table', slug);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return qs ? `/admin/database?${qs}` : '/admin/database';
  };

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
            href={pageHref(n)}
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
