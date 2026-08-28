import Link from 'next/link';
import { LuScrollText } from 'react-icons/lu';

import { canAccessArea, getAccessProfile, viewerZone } from '@/lib/adminAccess';
import AdminPage from '@/components/Admin/AdminPage';
import HelpButton from '@/components/Admin/HelpButton';
import { ADMIN_HELP } from '@/lib/adminHelp';
import EmptyState from '@/components/Admin/EmptyState';
import { GlassPanel, adminLink, glassRowHover } from '@/components/Admin/Glass';
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
import SearchCorrection from '@/components/Admin/SearchCorrection';
import {
  activitySearchVocabulary,
  correctIfEmpty,
} from '@/db/searchVocabulary';

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
  // Same cache()'d read: the Monitoring cross-link renders only for a viewer
  // who can open it (a link to a page that bounces is a dead end).
  const canMonitoring = canAccessArea(await getAccessProfile(), 'monitoring');

  const [page, facets] = await Promise.all([
    // toActivityFilters, not a hand-rolled object: it is the only place that
    // resolves ?range= into a `since` Date, and rebuilding the filter map here
    // silently dropped the date filter.
    listActivity({ page: params.page, filters: toActivityFilters(tz, params) }),
    getActivityFacets(),
  ]);

  // "Did you mean" — second tier, only ever on a miss (searchVocabulary.ts).
  // `?nocorrect=1` is the one-shot escape hatch the "Search instead for…" link
  // carries; deliberately not part of the activityFilters URL contract.
  const correction = sp.nocorrect
    ? null
    : await correctIfEmpty(params.q, page.total, activitySearchVocabulary);
  const corrected = correction
    ? await listActivity({
        page: 1,
        // The SAME predicate, re-run — never a fuzzy neighbourhood.
        filters: toActivityFilters(tz, { ...params, q: correction.corrected }),
      })
    : null;
  const shown = corrected ?? page;

  const filtered = hasActiveActivityFilters(params);
  // One thing's history: the newest row's snapshot is the current name (a
  // deleted row is still describable — the entity_name snapshot rule), and the
  // feed drops its per-row "history" link for rows already in this view.
  const activeEntity =
    params.entity && params.entityId
      ? { entity: params.entity, entityId: params.entityId }
      : null;
  const historyName = activeEntity
    ? (shown.rows[0]?.entityName ?? `${params.entity} ${params.entityId}`)
    : null;

  return (
    <AdminPage width="wide">
      <header className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
          <HelpButton topic={ADMIN_HELP.logs} />
        </div>
        {activeEntity && (
          <p className="mt-1 text-sm text-foreground">
            The history of{' '}
            <span className="font-medium">{historyName}</span>
            <span className="text-muted-foreground"> · {activeEntity.entity}</span>
            <span className="text-muted-foreground"> · </span>
            <Link
              href={`${BASE_PATH}${activityListQs({ ...params, entity: '', entityId: '', page: 1 })}`}
              className={cn('text-muted-foreground', adminLink)}
            >
              back to everything
            </Link>
          </p>
        )}
        <p className="mt-1 text-sm text-muted-foreground">
          Who changed what, and when.{' '}
          <span className="text-muted-foreground/70">
            Kept for {RETENTION_DAYS} days.
          </span>
          {/* Activity is the audit trail; system health is a different
              product on a different page, and this is the one place someone
              looking for "did the digest go out" will land first. */}
          {canMonitoring && (
            <>
              {' '}
              <span className="text-muted-foreground/70">
                Whether the dashboard itself is healthy is on{' '}
                <Link
                  href="/admin/monitoring"
                  className={cn('text-foreground', adminLink)}
                >
                  Monitoring
                </Link>
                .
              </span>
            </>
          )}
        </p>
      </header>

      <GlassPanel>
        <ActivityFilterBar
          params={params}
          areas={facets.areas}
          actors={facets.actors}
          basePath={BASE_PATH}
        />

        {correction && (
          <SearchCorrection
            className="px-4 pb-3 sm:px-5"
            corrected={correction.corrected}
            original={params.q}
            searchInstead={`/admin/logs?${activityListQs(params)}&nocorrect=1`}
          />
        )}
        {shown.rows.length === 0 ? (
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
            <ActivityFeed rows={shown.rows} tz={tz} activeEntity={activeEntity} />

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/40 p-3 dark:border-white/10">
              <p className="text-xs text-muted-foreground">
                {shown.total.toLocaleString()}{' '}
                {shown.total === 1 ? 'entry' : 'entries'}
                {shown.totalPages > 1 &&
                  ` · page ${shown.page} of ${shown.totalPages}`}
              </p>

              {shown.totalPages > 1 && (
                <nav
                  className="flex items-center gap-1"
                  aria-label="Pagination"
                >
                  {getPageNumbers(shown.page, shown.totalPages).map((n, i) =>
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
                        aria-current={n === shown.page ? 'page' : undefined}
                        className={cn(
                          'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-medium transition-colors',
                          // `shown`, like aria-current two lines up — the
                          // uncorrected `page` highlighted the wrong pill on
                          // a "did you mean" result set.
                          n === shown.page
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
