'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  LuClapperboard,
  LuExternalLink,
  LuImage,
  LuSearch,
  LuStar,
  LuX,
} from 'react-icons/lu';

import Button from '@/components/Button';
import EmptyState from '@/components/Admin/EmptyState';
import { glassRowHover } from '@/components/Admin/Glass';
import { VisibilityPill } from './VisibilityPill';
import { chipClasses } from './PortfolioChips';
import {
  PROJECT_CATEGORY_LABELS,
  PROJECT_CATEGORY_SLUGS,
  PROJECT_VISIBILITY_LABELS,
  PROJECT_VISIBILITY_SLUGS,
  type ProjectCategoryField,
  type ProjectVisibilityField,
} from '@/lib/portfolioFields';
import { cn } from '@/lib/utils';

/** One project row, serialized by the index page (dates pre-formatted). */
export type AdminProjectItem = {
  id: string;
  title: string;
  category: ProjectCategoryField;
  clientDisplay: string | null;
  clientSlug: string | null;
  visibility: ProjectVisibilityField;
  featured: boolean;
  hasDetail: boolean;
  /** Public detail URL when the page is actually reachable (non-draft + detail). */
  liveHref: string | null;
  thumbUrl: string | null;
  updatedLabel: string;
};

/**
 * The /admin/projects index as one searchable, filterable list — the clients
 * grid's interaction set (client-side search over the full roster, `/` to
 * focus, live count) on top of the compact row layout. Category/visibility
 * chips are local state seeded from the URL so deep links (?client= from the
 * clients page) still land pre-filtered; there is no pagination — the whole
 * portfolio is ~70 rows.
 */
export default function ProjectsList({
  items,
  initialCategory = null,
  initialVisibility = null,
  initialClient = null,
}: {
  items: AdminProjectItem[];
  initialCategory?: ProjectCategoryField | null;
  initialVisibility?: ProjectVisibilityField | null;
  initialClient?: string | null;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ProjectCategoryField | null>(
    initialCategory,
  );
  const [visibility, setVisibility] = useState<ProjectVisibilityField | null>(
    initialVisibility,
  );
  const [clientSlug, setClientSlug] = useState<string | null>(initialClient);
  const inputRef = useRef<HTMLInputElement>(null);

  // `/` focuses the search box (the clients grid's idiom, same guard).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.isContentEditable ||
          t.closest('input, textarea, select, a, button, [role="button"]'))
      ) {
        return;
      }
      e.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const q = query.trim().toLowerCase();
  const visible = items.filter(
    (i) =>
      (!clientSlug || i.clientSlug === clientSlug) &&
      (!category || i.category === category) &&
      (!visibility || i.visibility === visibility) &&
      (!q ||
        i.title.toLowerCase().includes(q) ||
        (i.clientDisplay ?? '').toLowerCase().includes(q)),
  );
  const filtered =
    q !== '' || category !== null || visibility !== null || clientSlug !== null;
  const clientName = clientSlug
    ? (items.find((i) => i.clientSlug === clientSlug)?.clientDisplay ??
      clientSlug)
    : null;

  return (
    <>
      {/* Toolbar — the clients grid's strip: search left, live count right. */}
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
            placeholder="Search title or client"
            aria-label="Search projects by title or client"
            className="h-8 w-full rounded-lg border border-white/50 bg-white/40 pr-2.5 pl-8 text-sm text-foreground placeholder:text-muted-foreground focus:border-white/80 focus:outline-none dark:border-white/15 dark:bg-white/10 dark:focus:border-white/30"
          />
        </span>
        {clientName && (
          <button
            type="button"
            onClick={() => setClientSlug(null)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-foreground/15 bg-white/40 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-white/60 dark:bg-white/10 dark:hover:bg-white/15"
          >
            Client: {clientName}
            <LuX className="size-3" aria-hidden="true" />
            <span className="sr-only">(clear client filter)</span>
          </button>
        )}
        <span
          aria-live="polite"
          className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground"
        >
          {filtered
            ? `${visible.length} of ${items.length}`
            : `${items.length} projects`}
        </span>
      </div>

      <div className="flex flex-col gap-2 border-b border-white/40 px-3 py-2.5 sm:px-4 dark:border-white/10">
        <FilterRow
          label="Category"
          options={[
            { key: 'all', label: 'All', active: category === null },
            ...PROJECT_CATEGORY_SLUGS.map((slug) => ({
              key: slug,
              label: PROJECT_CATEGORY_LABELS[slug],
              active: category === slug,
            })),
          ]}
          onSelect={(key) =>
            setCategory(key === 'all' ? null : (key as ProjectCategoryField))
          }
        />
        <FilterRow
          label="Visibility"
          options={[
            { key: 'all', label: 'All', active: visibility === null },
            ...PROJECT_VISIBILITY_SLUGS.map((slug) => ({
              key: slug,
              label: PROJECT_VISIBILITY_LABELS[slug],
              active: visibility === slug,
            })),
          ]}
          onSelect={(key) =>
            setVisibility(
              key === 'all' ? null : (key as ProjectVisibilityField),
            )
          }
        />
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={LuClapperboard}
          title="No projects yet"
          description="Create the first project to start filling the public portfolio."
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={LuSearch}
          title="No projects match"
          description={
            q
              ? `Nothing matches “${query.trim()}” with these filters.`
              : 'Nothing matches these filters.'
          }
          action={
            <Button
              type="button"
              variant="secondary"
              size="small"
              showIcon={false}
              onClick={() => {
                setQuery('');
                setCategory(null);
                setVisibility(null);
                setClientSlug(null);
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-white/40 dark:divide-white/10">
          {visible.map((item) => (
            <li
              key={item.id}
              className={cn('flex items-center', glassRowHover)}
            >
              <Link
                href={`/admin/projects/${item.id}`}
                className="flex min-w-0 flex-1 items-center gap-3 px-4 py-2 sm:px-5"
              >
                <span className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-foreground/[0.06] ring-1 ring-foreground/10">
                  {item.thumbUrl ? (
                    // Cover thumb (uploaded rung or static site asset) —
                    // decorative; the title beside it is the label.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbUrl}
                      alt=""
                      width={56}
                      height={40}
                      loading="lazy"
                      draggable={false}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <LuImage
                      className="size-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="truncate text-sm font-medium text-foreground">
                      {item.title}
                    </span>
                    {item.featured && (
                      <LuStar
                        className="size-3.5 shrink-0 text-amber-500"
                        aria-label="Featured"
                      />
                    )}
                    <VisibilityPill visibility={item.visibility} />
                    {item.hasDetail && (
                      <span className="inline-flex shrink-0 items-center rounded-full border border-sky-600/25 bg-sky-500/10 px-2 py-0.5 text-[0.65rem] font-medium text-sky-700 dark:text-sky-400">
                        Detail live
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {[
                      item.clientDisplay,
                      PROJECT_CATEGORY_LABELS[item.category],
                      `updated ${item.updatedLabel}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
              </Link>
              {item.liveHref && (
                <a
                  href={item.liveHref}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open ${item.title} on the public site`}
                  className="flex shrink-0 items-center self-stretch px-4 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <LuExternalLink className="size-4" aria-hidden="true" />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function FilterRow({
  label,
  options,
  onSelect,
}: {
  label: string;
  options: { key: string; label: string; active: boolean }[];
  onSelect: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onSelect(option.key)}
          aria-pressed={option.active}
          className={chipClasses(option.active)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
