'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { LuArrowRight, LuChevronDown, LuSearch } from 'react-icons/lu';

import { glassRowHover } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';

export type ReportClientItem = {
  slug: string;
  name: string;
  /** Blob CDN URL or /images path; '' when no mark. */
  logoSrc: string;
  tasksLabel: string;
  hoursLabel: string;
  membersLabel: string;
  hasActivity: boolean;
};

/**
 * The /admin/reports roster: searchable list rows (hours scan better in
 * columns than tiles), month-scoped tallies, zero-activity clients folded
 * into a collapsed tail. Client-side filter over ~100 rows (ClientsGrid's
 * blessed pattern). Logos render as native <img> — blob URLs never go
 * through <Img> (custom loader is /images-only).
 */
export default function ReportClientPicker({
  items,
  month,
}: {
  items: ReportClientItem[];
  month: string;
}) {
  const [query, setQuery] = useState('');
  const [showQuiet, setShowQuiet] = useState(false);

  const { active, quiet } = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = needle
      ? items.filter((c) => c.name.toLowerCase().includes(needle))
      : items;
    return {
      active: matches.filter((c) => c.hasActivity),
      quiet: matches.filter((c) => !c.hasActivity),
    };
  }, [items, query]);

  return (
    <>
      <div className="flex items-center gap-3 border-b border-white/40 px-3 py-2.5 sm:px-4 dark:border-white/10">
        <span className="relative w-full sm:w-64">
          <LuSearch
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients"
            aria-label="Search clients"
            className="h-8 w-full rounded-lg border border-white/50 bg-white/40 pr-2.5 pl-8 text-sm text-foreground placeholder:text-muted-foreground focus:border-white/80 focus:outline-none dark:border-white/15 dark:bg-white/10 dark:focus:border-white/30"
          />
        </span>
        <span
          aria-live="polite"
          className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground"
        >
          {active.length} active
        </span>
      </div>

      {active.length === 0 && quiet.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          No clients match.
        </p>
      ) : (
        <ul className="divide-y divide-white/40 dark:divide-white/10">
          {active.map((client) => (
            <ClientRow key={client.slug} client={client} month={month} />
          ))}
        </ul>
      )}

      {quiet.length > 0 && (
        <div className="border-t border-white/40 dark:border-white/10">
          <button
            type="button"
            onClick={() => setShowQuiet((v) => !v)}
            aria-expanded={showQuiet}
            className="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground sm:px-5"
          >
            <LuChevronDown
              aria-hidden="true"
              className={cn(
                'size-3.5 transition-transform',
                showQuiet && 'rotate-180',
              )}
            />
            No activity this month ({quiet.length})
          </button>
          {showQuiet && (
            <ul className="divide-y divide-white/40 opacity-70 dark:divide-white/10">
              {quiet.map((client) => (
                <ClientRow key={client.slug} client={client} month={month} />
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}

function ClientRow({
  client,
  month,
}: {
  client: ReportClientItem;
  month: string;
}) {
  return (
    <li className={glassRowHover}>
      <Link
        href={`/admin/reports/${client.slug}?month=${month}`}
        className="flex items-center gap-3.5 px-4 py-3 sm:px-5"
      >
        {client.logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- blob-CDN logo; the custom loader is /images-only
          <img
            src={client.logoSrc}
            alt=""
            width={32}
            height={32}
            loading="lazy"
            className="size-8 shrink-0 rounded-full border border-white/50 bg-white/60 object-contain p-1 dark:border-white/15 dark:bg-white/10"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground/[0.06] text-[0.6rem] font-semibold text-muted-foreground ring-1 ring-foreground/10"
          >
            {client.name
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((w) => w[0])
              .join('')
              .toUpperCase()}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {client.name}
        </span>
        <span className="hidden shrink-0 text-xs tabular-nums text-muted-foreground sm:block">
          {client.tasksLabel}
        </span>
        <span className="w-16 shrink-0 text-right text-xs font-medium tabular-nums text-foreground">
          {client.hoursLabel}
        </span>
        <span className="hidden w-20 shrink-0 text-right text-xs tabular-nums text-muted-foreground sm:block">
          {client.membersLabel}
        </span>
        <LuArrowRight
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
      </Link>
    </li>
  );
}
