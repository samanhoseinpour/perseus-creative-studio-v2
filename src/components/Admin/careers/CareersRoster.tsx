'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LuBriefcase, LuSearch } from 'react-icons/lu';

import Button from '@/components/Button';
import EmptyState from '@/components/Admin/EmptyState';
import { useSearchFocus } from '@/hooks/useSearchFocus';
import { adminLink, glassField, glassRowHover } from '@/components/Admin/Glass';
import { chipClasses } from '@/components/Admin/portfolio/PortfolioChips';
import { safeAction } from '@/components/Admin/inbox/safeAction';
import OpeningDialog from '@/components/Admin/careers/OpeningDialog';
import { StatusPill } from '@/components/Admin/careers/StatusPill';
import type {
  AdminCategoryItem,
  AdminOpeningItem,
} from '@/components/Admin/careers/types';
import { setJobOpeningStatus } from '@/app/(admin)/admin/(protected)/_actions/careers';
import {
  JOB_EMPLOYMENT_TYPE_LABELS,
  JOB_STATUS_LABELS,
  JOB_STATUSES,
  isRemoteLocation,
  type JobStatusField,
} from '@/lib/careerFields';
import { jobCategoryIcon } from '@/lib/jobCategoryIcons';
import { cn } from '@/lib/utils';
import { useCorrectedFilter } from '@/hooks/useCorrectedFilter';
import SearchCorrection from '@/components/Admin/SearchCorrection';

/**
 * The /admin/careers roster: every listing grouped under its category, each
 * row a button opening the edit dialog (there is no per-role route; the
 * dialog IS the editor — the ClientsGrid model). Search and the status
 * chips filter client-side over the whole set (~20 rows, not thousands).
 *
 * `openOpeningId` is the ⌘K palette's ?role= deep link — consumed by an
 * effect (TaskBoard's ?task= recipe): open the dialog once per arriving id,
 * strip the param, reset the guard when it's gone, so re-picking the same
 * role reopens it. `initialQuery` seeds the search box (?q= handoff) —
 * initial-state only; the page keys this component by it.
 */
export default function CareersRoster({
  items,
  categories,
  openOpeningId = null,
  initialQuery = '',
}: {
  items: AdminOpeningItem[];
  categories: AdminCategoryItem[];
  openOpeningId?: string | null;
  initialQuery?: string;
}) {
  const router = useRouter();
  // The id, not the item: a save re-renders the route (the action's
  // layout-scope revalidation) while the dialog may still be open, and
  // deriving from the fresh `items` keeps what it shows live.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState<JobStatusField | null>(null);
  // The row whose quick status flip is in flight, with the value it is
  // moving to — the select shows it until the fresh tree lands (or the
  // action refuses and the stored value reasserts itself).
  const [flip, setFlip] = useState<{ id: string; status: JobStatusField } | null>(
    null,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const consumedOpenId = useRef<string | null>(null);
  useEffect(() => {
    if (!openOpeningId) {
      consumedOpenId.current = null;
      return;
    }
    if (consumedOpenId.current === openOpeningId) return;
    consumedOpenId.current = openOpeningId;
    setSelectedId(openOpeningId);
    router.replace(
      `/admin/careers${initialQuery ? `?q=${encodeURIComponent(initialQuery)}` : ''}`,
      { scroll: false },
    );
  }, [openOpeningId, initialQuery, router]);

  const selected =
    selectedId === null
      ? null
      : (items.find((i) => i.id === selectedId) ?? null);

  // Focus on arrival, `/` from anywhere, Escape to clear then let go — but
  // never when a ?role= deep link is opening the dialog in the same commit,
  // or we'd be racing its focus trap.
  useSearchFocus(inputRef, {
    autoFocus: !openOpeningId,
    onClear: () => setQuery(''),
  });

  const q = query.trim();
  // The status facet narrows FIRST; the search (and any correction) runs over
  // what it left, so a spelling fix can never widen a facet that was chosen.
  const faceted = items.filter((i) => !status || i.status === status);
  const { visible, correction } = useCorrectedFilter(q, faceted, (i) => [
    i.title,
    i.slug,
    i.categoryName,
    i.level,
    i.location,
    ...i.tags,
  ]);
  const filtered = q !== '' || status !== null;

  const counts = JOB_STATUSES.reduce<Record<JobStatusField, number>>(
    (acc, s) => ({ ...acc, [s]: items.filter((i) => i.status === s).length }),
    { open: 0, filled: 0, draft: 0 },
  );

  // Group in category order; a category with nothing visible under it is
  // skipped while filtering, but an empty category still shows on the bare
  // roster so a freshly added heading is visibly there.
  const groups = categories
    .map((c) => ({ category: c, rows: visible.filter((i) => i.categoryId === c.id) }))
    .filter((g) => g.rows.length > 0 || !filtered);

  async function quickStatus(item: AdminOpeningItem, next: JobStatusField) {
    if (next === item.status || flip) return;
    setFlip({ id: item.id, status: next });
    const res = await safeAction(setJobOpeningStatus(item.id, next));
    setFlip(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`${item.title} is now ${JOB_STATUS_LABELS[next].toLowerCase()}.`);
  }

  return (
    <>
      {/* Toolbar — the projects list's strip: search, status chips, live count. */}
      <div className="flex flex-wrap items-center gap-3 border-b border-white/40 px-3 py-2.5 sm:px-4 dark:border-white/10">
        <span className="relative w-full sm:w-64">
          <LuSearch
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, category, or tag"
            aria-label="Search roles by title, category, level, location, or tag"
            className={cn(glassField, 'h-8 w-full pr-2.5 pl-8 text-sm')}
          />
        </span>
        <div
          role="group"
          aria-label="Filter by status"
          className="flex flex-wrap items-center gap-1.5"
        >
          <button
            type="button"
            onClick={() => setStatus(null)}
            aria-pressed={status === null}
            className={chipClasses(status === null)}
          >
            All ({items.length})
          </button>
          {JOB_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              aria-pressed={status === s}
              className={chipClasses(status === s)}
            >
              {JOB_STATUS_LABELS[s]} ({counts[s]})
            </button>
          ))}
        </div>
        <span
          aria-live="polite"
          className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground"
        >
          {filtered
            ? `${visible.length} of ${items.length}`
            : `${items.length} role${items.length === 1 ? '' : 's'}`}
        </span>
      </div>

      {correction && (
        <SearchCorrection
          className="px-3 pt-3 sm:px-4"
          corrected={correction.corrected}
          original={q}
          onSearchInstead={
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
            >
              Clear search
            </button>
          }
        />
      )}
      {items.length === 0 ? (
        <EmptyState
          icon={LuBriefcase}
          title="No roles yet"
          description={
            categories.length === 0
              ? 'Add a category first, then the first role under it.'
              : 'Add the first role to start filling the careers page.'
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={LuSearch}
          title="No roles match"
          description={
            q
              ? `Nothing matches “${query.trim()}”${status ? ` among ${JOB_STATUS_LABELS[status].toLowerCase()} roles` : ''}.`
              : `No ${status ? JOB_STATUS_LABELS[status].toLowerCase() : ''} roles right now.`
          }
          action={
            <Button
              type="button"
              variant="secondary"
              size="small"
              showIcon={false}
              onClick={() => {
                setQuery('');
                setStatus(null);
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        groups.map(({ category, rows }) => {
          const Icon = jobCategoryIcon(category.icon);
          const openCount = rows.filter((r) => r.status === 'open').length;
          return (
            <section
              key={category.id}
              aria-labelledby={`careers-cat-${category.id}`}
            >
              <div className="flex items-center gap-2.5 border-b border-white/40 bg-foreground/[0.03] px-4 py-2 sm:px-5 dark:border-white/10">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground/[0.06] text-muted-foreground ring-1 ring-foreground/10">
                  <Icon className="size-3.5" aria-hidden="true" />
                </span>
                <h2
                  id={`careers-cat-${category.id}`}
                  className="truncate text-sm font-medium text-foreground"
                >
                  {category.name}
                </h2>
                {openCount > 0 && (
                  <span className="inline-flex shrink-0 items-center rounded-full border border-transparent bg-foreground px-2 py-0.5 text-[0.65rem] font-medium text-background">
                    {openCount} open
                  </span>
                )}
                <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
                  {rows.length === 0
                    ? 'No roles yet'
                    : `${rows.length} role${rows.length === 1 ? '' : 's'}`}
                </span>
              </div>
              {rows.length > 0 && (
                <ul className="divide-y divide-white/40 dark:divide-white/10">
                  {rows.map((item) => {
                    const shownStatus =
                      flip?.id === item.id ? flip.status : item.status;
                    const expired =
                      item.expiresState === 'expired' && item.status === 'open';
                    return (
                      <li
                        key={item.id}
                        className={cn(
                          // Phones: the body takes the full width and the two
                          // controls drop to their own line; sm+: one row.
                          'flex flex-wrap items-center sm:flex-nowrap sm:gap-3 sm:pr-5',
                          glassRowHover,
                        )}
                      >
                        {/* The row body. The applications link and the status
                            select are SIBLINGS — interactive content can't
                            nest in <button>. */}
                        <button
                          type="button"
                          onClick={() => setSelectedId(item.id)}
                          className="flex min-w-0 flex-1 basis-full flex-col gap-1 px-4 pt-3 pb-2 text-left sm:basis-auto sm:px-5 sm:py-3"
                        >
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="truncate text-sm font-medium text-foreground">
                              {item.title}
                            </span>
                            <StatusPill status={item.status} />
                          </span>
                          <span className="flex flex-wrap items-center gap-1.5">
                            <Chip>
                              {JOB_EMPLOYMENT_TYPE_LABELS[item.employmentType]}
                            </Chip>
                            <Chip>{item.level}</Chip>
                            {item.payLabel && <Chip>{item.payLabel}</Chip>}
                            {!isRemoteLocation(item.location) && (
                              <Chip>{item.location}</Chip>
                            )}
                          </span>
                          <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                            <span>
                              {item.postedLabel
                                ? `Posted ${item.postedLabel}`
                                : 'Not posted yet'}
                            </span>
                            {item.expiresLabel && (
                              <span
                                title={
                                  expired
                                    ? 'Past its expiry — dropped from Google’s job listings until extended'
                                    : undefined
                                }
                                className={cn(
                                  expired &&
                                    'font-medium text-amber-700 dark:text-amber-400',
                                  !expired &&
                                    item.expiresState === 'soon' &&
                                    item.status === 'open' &&
                                    'text-foreground',
                                )}
                              >
                                · {item.expiresState === 'expired' ? 'Expired' : 'Expires'}{' '}
                                {item.expiresLabel}
                              </span>
                            )}
                            <span>· updated {item.updatedLabel}</span>
                          </span>
                        </button>

                        <div className="flex basis-full items-center justify-end gap-3 px-4 pb-3 sm:basis-auto sm:px-0 sm:pb-0">
                          {/* The inbox-tab count, so the number matches the
                              list the link opens (archived/spam rows are
                              counted only in the delete confirm). */}
                          {item.inboxApplicationCount > 0 && (
                            <Link
                              href={`/admin/applications?role=${item.slug}`}
                              aria-label={`${item.inboxApplicationCount} application${item.inboxApplicationCount === 1 ? '' : 's'} for ${item.title}`}
                              className={cn(adminLink, 'shrink-0 text-xs tabular-nums text-muted-foreground hover:text-foreground')}
                            >
                              {item.inboxApplicationCount} application
                              {item.inboxApplicationCount === 1 ? '' : 's'}
                            </Link>
                          )}

                          {/* Never natively disable the control being
                              changed (it would drop focus mid-flight); the
                              guard in quickStatus already serialises writes,
                              so only the OTHER rows wait. */}
                          <select
                            value={shownStatus}
                            onChange={(e) =>
                              void quickStatus(item, e.target.value as JobStatusField)
                            }
                            disabled={flip !== null && flip.id !== item.id}
                            aria-busy={flip?.id === item.id || undefined}
                            aria-label={`Status of ${item.title}`}
                            className={cn(
                              glassField,
                              'h-8 shrink-0 px-2 text-xs disabled:cursor-not-allowed disabled:opacity-60',
                            )}
                          >
                            {JOB_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {JOB_STATUS_LABELS[s]}
                              </option>
                            ))}
                          </select>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })
      )}

      <OpeningDialog
        open={selected !== null}
        onOpenChange={(next) => !next && setSelectedId(null)}
        opening={selected}
        categories={categories}
      />
    </>
  );
}

/** One descriptive chip on a row (type · level · pay · location). */
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-foreground/10 bg-foreground/[0.04] px-2 py-0.5 text-[0.65rem] font-medium text-muted-foreground">
      {children}
    </span>
  );
}
