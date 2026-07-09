import Link from 'next/link';

import { cn } from '@/lib/utils';

export type TablePickerItem = {
  slug: string;
  label: string;
  count: number;
};

/**
 * Table tabs along the panel top — the InboxTabs idiom, with a row-count badge
 * per table. The first table is the browser's default view, so its tab links to
 * the bare `/admin/database` (matches `resolveBrowserTable`'s fallback); the
 * `?page=` param is deliberately dropped when switching tables.
 */
export default function TablePicker({
  tables,
  active,
}: {
  tables: TablePickerItem[];
  active: string;
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-white/40 px-2 sm:px-3 dark:border-white/10">
      {tables.map(({ slug, label, count }, i) => {
        const isActive = slug === active;
        return (
          <Link
            key={slug}
            href={i === 0 ? '/admin/database' : `/admin/database?table=${slug}`}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
            <span
              className={cn(
                'inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.6rem] font-semibold tabular-nums',
                isActive
                  ? 'bg-foreground text-background'
                  : 'bg-foreground/[0.08] text-muted-foreground',
              )}
            >
              {count}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
