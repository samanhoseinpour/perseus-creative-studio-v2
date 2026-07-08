import 'server-only';
import Link from 'next/link';

import type { ContactSubmission } from '@/db/schema';
import type { InboxView } from '@/db/adminQueries';
import { roleTitle } from '@/constants/careers';
import { serviceTitle } from '@/constants/services';
import { getPageNumbers } from '@/utils/pagination';
import { glassRowHover } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';
import InboxRow from './InboxRow';
import { formatDate } from './format';

const EMPTY: Record<InboxView, string> = {
  inbox: 'Nothing in the inbox yet — new submissions will land here.',
  archived: 'Nothing archived.',
  spam: 'No spam caught. Bot-flagged submissions collect here.',
};

// The one-line preview under a row: the role for applications, the picked
// services (or company) for inquiries. Resolved server-side from the slug
// registries so the heavy `services.ts` never reaches a client chunk.
function secondaryLine(row: ContactSubmission): string | null {
  if (row.kind === 'career') return row.role ? roleTitle(row.role) : null;
  const services = row.services ?? [];
  if (services.length === 0) return row.company ?? null;
  const titles = services.map(serviceTitle);
  const head = titles.slice(0, 2).join(', ');
  return titles.length > 2 ? `${head} +${titles.length - 2}` : head;
}

export default function InboxList({
  rows,
  basePath,
  view,
  page,
  totalPages,
}: {
  rows: ContactSubmission[];
  basePath: string;
  view: InboxView;
  page: number;
  totalPages: number;
}) {
  // Renders bare — no card of its own. The inbox pages wrap the tabs + this list
  // in one GlassPanel, so the rows read as the body of that single frosted pane
  // (like the login card) instead of a card nested inside a card.
  if (rows.length === 0) {
    return (
      <p className="px-4 py-16 text-center text-sm text-muted-foreground">
        {EMPTY[view]}
      </p>
    );
  }

  const fromQuery = `from=${view}`;

  return (
    <>
      <ul className="divide-y divide-white/40 dark:divide-white/10">
        {rows.map((row) => (
          <InboxRow
            key={row.id}
            href={`${basePath}/${row.id}?${fromQuery}`}
            name={row.name}
            email={row.email}
            secondary={secondaryLine(row)}
            dateLabel={formatDate(row.createdAt)}
            status={row.status}
          />
        ))}
      </ul>
      {totalPages > 1 && (
        <Pager
          basePath={basePath}
          view={view}
          page={page}
          totalPages={totalPages}
        />
      )}
    </>
  );
}

function pageHref(basePath: string, view: InboxView, p: number): string {
  const params = new URLSearchParams();
  if (view !== 'inbox') params.set('status', view);
  if (p > 1) params.set('page', String(p));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

function Pager({
  basePath,
  view,
  page,
  totalPages,
}: {
  basePath: string;
  view: InboxView;
  page: number;
  totalPages: number;
}) {
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
