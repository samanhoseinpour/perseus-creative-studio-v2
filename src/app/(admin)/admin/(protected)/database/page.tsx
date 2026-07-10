import type { Metadata } from 'next';
import { LuDatabase } from 'react-icons/lu';

import { requirePrivilegedAdmin } from '@/lib/adminAccess';
import {
  DB_BROWSER_TABLES,
  getBrowserTableCounts,
  getBrowserTablePage,
  resolveBrowserTable,
} from '@/db/dbBrowser';
import { firstParam, parsePage } from '@/utils/pagination';
import { toCells } from '@/components/Admin/database/cells';
import TablePicker from '@/components/Admin/database/TablePicker';
import DataTable from '@/components/Admin/database/DataTable';
import DbPager from '@/components/Admin/database/DbPager';
import EmptyState from '@/components/Admin/EmptyState';
import { GlassPanel } from '@/components/Admin/Glass';

export const metadata: Metadata = {
  title: 'Database',
  description: 'Read-only browser over the Postgres tables behind the site.',
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function DatabasePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Fully private: only the allow-list may browse raw rows. Non-privileged
  // admins bounce to the overview (the nav hides this route for them anyway).
  await requirePrivilegedAdmin('/admin');
  const sp = await searchParams;
  const entry = resolveBrowserTable(firstParam(sp.table));
  const page = parsePage(firstParam(sp.page));

  const [result, counts] = await Promise.all([
    getBrowserTablePage(entry, page),
    getBrowserTableCounts(),
  ]);

  const rows = result.rows.map((row) => toCells(entry.columns, row));
  const pickerTables = DB_BROWSER_TABLES.map((t) => ({
    slug: t.slug,
    label: t.label,
    count: counts[t.slug] ?? 0,
  }));

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8 lg:py-12">
      <header className="mb-6 flex flex-col gap-1.5">
        <span className="text-[0.6rem] font-medium tracking-[0.2em] text-muted-foreground uppercase">
          Data
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Database
        </h1>
        <p className="text-sm text-muted-foreground">
          Read-only view of every table. Sensitive values are redacted.
        </p>
      </header>

      <GlassPanel className="mt-6">
        <TablePicker tables={pickerTables} active={entry.slug} />

        <p className="border-b border-white/40 px-4 py-2 text-xs text-muted-foreground sm:px-5 dark:border-white/10">
          {result.total} {result.total === 1 ? 'row' : 'rows'} · page{' '}
          {result.page} of {result.totalPages}
        </p>

        {rows.length === 0 ? (
          <EmptyState
            icon={LuDatabase}
            title="No rows"
            description={`${entry.label} is empty.`}
          />
        ) : (
          <DataTable
            label={entry.label}
            columns={entry.columns.map(({ name, sqlType, primary, notNull }) => ({
              name,
              sqlType,
              primary,
              notNull,
            }))}
            rows={rows}
          />
        )}

        <DbPager
          slug={entry.slug}
          isDefault={entry.slug === DB_BROWSER_TABLES[0].slug}
          page={result.page}
          totalPages={result.totalPages}
        />
      </GlassPanel>
    </div>
  );
}
