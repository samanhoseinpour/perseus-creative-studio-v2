import Link from 'next/link';
import { LuScrollText } from 'react-icons/lu';

import { viewerZone } from '@/lib/adminAccess';
import AdminPage from '@/components/Admin/AdminPage';
import EmptyState from '@/components/Admin/EmptyState';
import { GlassPanel, glassRowHover } from '@/components/Admin/Glass';
import ActivityFeed from '@/components/Admin/logs/ActivityFeed';
import ActivityFilterBar from '@/components/Admin/logs/ActivityFilterBar';
import { getActivityFacets, listActivity } from '@/db/activityQueries';
import {
  activityListQs,
  hasActiveActivityFilters,
  parseActivityListParams,
  toActivityFilters,
} from '@/lib/activityFilters';
import { getPageNumbers } from '@/utils/pagination';
import { cn } from '@/lib/utils';

const BASE_PATH = '/admin/logs';
const RETENTION_DAYS = 365;

/**
 * /admin/logs — the site-wide audit trail.
 *
 * Reads and facets fire in ONE Promise.all: on neon-http every query is its
 * own HTTPS round trip, so the two must not be awaited in sequence (the
 * protected layout's rule).
 */
export default async function ActivityListView({
  sp,
}: {
  sp: { [key: string]: string | string[] | undefined };
}) {
  const params = parseActivityListParams(sp);

  // Resolved before the fan-out because the filter window depends on it —
  // cache()'d and already materialised by the protected layout, so no query.
  const tz = await viewerZone();

  const [page, facets] = await Promise.all([
    // toActivityFilters, not a hand-rolled object: it is the only place that
    // resolves ?range= into a `since` Date, and rebuilding the filter map here
    // silently dropped the date filter.
    listActivity({ page: params.page, filters: toActivityFilters(tz, params) }),
    getActivityFacets(),
  ]);

  const filtered = hasActiveActivityFilters(params);

  return (
    <AdminPage width="wide">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every change made in the dashboard — who did it, and when.{' '}
          <span className="text-muted-foreground/70">
            Kept for {RETENTION_DAYS} days.
          </span>
        </p>
      </header>

      <GlassPanel>
        <ActivityFilterBar
          params={params}
          areas={facets.areas}
          actors={facets.actors}
          basePath={BASE_PATH}
        />

        {page.rows.length === 0 ? (
          <EmptyState
            icon={LuScrollText}
            title={filtered ? 'Nothing matches those filters' : 'No activity yet'}
            description={
              filtered
                ? 'Try a wider date range, or clear the filters to see everything.'
                : 'Actions taken in the dashboard will appear here as they happen.'
            }
            action={
              filtered ? (
                <Link
                  href={BASE_PATH}
                  className="text-sm font-medium underline underline-offset-4"
                >
                  Clear filters
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            <ActivityFeed rows={page.rows} tz={tz} />

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/40 p-3 dark:border-white/10">
              <p className="text-xs text-muted-foreground">
                {page.total.toLocaleString()}{' '}
                {page.total === 1 ? 'entry' : 'entries'}
                {page.totalPages > 1 &&
                  ` · page ${page.page} of ${page.totalPages}`}
              </p>

              {page.totalPages > 1 && (
                <nav
                  className="flex items-center gap-1"
                  aria-label="Pagination"
                >
                  {getPageNumbers(page.page, page.totalPages).map((n, i) =>
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
                        // The whole filter state rides every page link, so
                        // paging never silently drops the filters that
                        // produced the list.
                        href={`${BASE_PATH}${activityListQs(params, { page: n })}`}
                        aria-current={n === page.page ? 'page' : undefined}
                        className={cn(
                          'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-medium transition-colors',
                          n === page.page
                            ? 'bg-foreground text-background'
                            : cn(
                                'text-muted-foreground hover:text-foreground',
                                glassRowHover,
                              ),
                        )}
                      >
                        {n}
                      </Link>
                    ),
                  )}
                </nav>
              )}
            </div>
          </>
        )}
      </GlassPanel>
    </AdminPage>
  );
}
