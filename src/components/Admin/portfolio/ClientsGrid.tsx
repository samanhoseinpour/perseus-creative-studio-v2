'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { LuBuilding2, LuClapperboard, LuSearch } from 'react-icons/lu';

import Button from '@/components/Button';
import EmptyState from '@/components/Admin/EmptyState';
import { glassChip } from '@/components/Admin/Glass';
import ClientDialog, { type AdminClientItem } from './ClientDialog';
import { cn } from '@/lib/utils';

/**
 * The /admin/clients roster as a searchable tile grid: every client (drafts of
 * the old world included — the roster now spans the whole logo wall), each
 * tile opening the edit dialog. Tiles are buttons, not links — there is no
 * client detail route; the dialog IS the editor. The search box filters
 * client-side over name + industry (the roster is ~100 rows, not thousands).
 */
export default function ClientsGrid({ items }: { items: AdminClientItem[] }) {
  // The id, not the item: logo uploads router.refresh() while the dialog is
  // open, and deriving from the fresh `items` keeps the dialog's logo section
  // live (a stored object reference would keep rendering pre-upload state).
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const selected =
    selectedId === null
      ? null
      : (items.find((i) => i.id === selectedId) ?? null);

  // `/` focuses the search box (the inbox list's idiom, same editable-target
  // guard).
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
  const visible = q
    ? items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.industry.toLowerCase().includes(q),
      )
    : items;

  return (
    <>
      {/* Toolbar — the InboxFilterBar strip, minus the URL round-trip. */}
      <div className="flex items-center gap-3 border-b border-white/40 px-3 py-2.5 sm:px-4 dark:border-white/10">
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
            placeholder="Search name or industry"
            aria-label="Search clients by name or industry"
            className="h-8 w-full rounded-lg border border-white/50 bg-white/40 pr-2.5 pl-8 text-sm text-foreground placeholder:text-muted-foreground focus:border-white/80 focus:outline-none dark:border-white/15 dark:bg-white/10 dark:focus:border-white/30"
          />
        </span>
        <span
          aria-live="polite"
          className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground"
        >
          {q ? `${visible.length} of ${items.length}` : `${items.length} clients`}
        </span>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={LuBuilding2}
          title="No clients yet"
          description="Add the first client to start attributing projects and filling the logo wall."
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={LuSearch}
          title="No clients match"
          description={`Nothing matches “${query.trim()}”. Try a different name or industry.`}
          action={
            <Button
              type="button"
              variant="secondary"
              size="small"
              showIcon={false}
              onClick={() => setQuery('')}
            >
              Clear search
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 sm:p-4 lg:grid-cols-4 xl:grid-cols-6">
          {visible.map((item) => (
            // `relative group` hosts the corner projects shortcut — a sibling
            // of the tile button (interactive content can't nest in <button>).
            <li key={item.id} className="group relative">
              {item.projectCount > 0 && (
                <Link
                  href={`/admin/projects?client=${item.slug}`}
                  aria-label={`View ${item.name}’s projects`}
                  title="View projects"
                  className="absolute top-2 right-2 z-10 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-white/70 hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 dark:hover:bg-white/10"
                >
                  <LuClapperboard className="size-3.5" aria-hidden="true" />
                </Link>
              )}
              <button
                type="button"
                onClick={() => setSelectedId(item.id)}
                // "Wash inside frosted panel": tinted fills only — no per-tile
                // backdrop-blur (~100 stacked backdrop-filters inside an
                // already-frosted GlassPanel is pure paint cost).
                className="group flex h-full w-full cursor-pointer flex-col items-center gap-2 rounded-xl border border-white/45 bg-white/35 p-4 text-center transition-colors hover:border-white/70 hover:bg-white/60 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/15"
              >
                <span
                  className={cn(
                    'flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full',
                    glassChip,
                  )}
                >
                  {item.logoUrl ? (
                    // The client's mark (blob CDN or static path) — decorative;
                    // the name below it is the accessible label.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.logoUrl}
                      alt=""
                      width={56}
                      height={56}
                      draggable={false}
                      className="h-full w-full object-contain p-1.5"
                    />
                  ) : (
                    <LuBuilding2
                      className="size-5 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                </span>

                <span className="w-full truncate text-sm font-medium text-foreground">
                  {item.name}
                </span>
                {/* Rendered even when empty so tile internals align across a
                    row; it's a search facet, so showing it explains hits. */}
                <span className="min-h-4 w-full truncate text-xs text-muted-foreground">
                  {item.industry}
                </span>
                <MarqueePill item={item} />
                <span className="w-full truncate text-xs text-muted-foreground">
                  {item.projectCount} project
                  {item.projectCount === 1 ? '' : 's'} · {item.updatedLabel}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <ClientDialog
        open={selected !== null}
        onOpenChange={(next) => !next && setSelectedId(null)}
        client={selected}
      />
    </>
  );
}

/** Where the client surfaces on the site, as the tile's status badge:
 *  featured members ride both the home rail and the About wall, plain
 *  members the About wall only, the rest are internal records. */
function MarqueePill({ item }: { item: AdminClientItem }) {
  const state = item.marquee
    ? item.marqueeFeatured
      ? 'featured'
      : 'wall'
    : 'hidden';
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-medium',
        state === 'featured' &&
          'border-emerald-600/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
        state === 'wall' &&
          'border-sky-600/25 bg-sky-500/10 text-sky-700 dark:text-sky-400',
        state === 'hidden' &&
          'border-foreground/15 bg-foreground/[0.06] text-muted-foreground',
      )}
    >
      {state === 'featured'
        ? 'Home + wall'
        : state === 'wall'
          ? 'Logo wall'
          : 'Off the wall'}
    </span>
  );
}
