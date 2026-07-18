import {
  getInboxFilterOptions,
  getStatusCounts,
  listSubmissions,
  resolveInboxView,
} from '@/db/adminQueries';
import { firstParam, parsePage } from '@/utils/pagination';
import {
  hasActiveInboxFilters,
  inboxListQs,
  parseInboxListParams,
  toInboxFilters,
} from '@/lib/inboxFilters';
import { serviceTitle } from '@/constants/services';
import { roleTitle } from '@/constants/careers';
import { referralLabel } from '@/lib/referralOptions';
import { GlassPanel } from '@/components/Admin/Glass';
import AdminPage from '@/components/Admin/AdminPage';
import InboxTabs from './InboxTabs';
import InboxEmpty from './InboxEmpty';
import InboxFilterBar, { type FilterOption } from './InboxFilterBar';
import ExportMenu from './ExportMenu';
import { formatDate } from './format';
import { secondaryLine } from './secondary';
import InboxKeyboardList, { type InboxRowData } from './InboxKeyboardList';

/**
 * The whole inbox list surface (header + tabs + filter bar + rows/empty +
 * export) shared by /admin/inquiries and /admin/applications — the two pages
 * stay thin route shells that keep their own `requireArea` gate. Server-only:
 * this is where the content registries (serviceTitle/roleTitle) resolve filter
 * labels, so they never reach a client chunk.
 */
export default async function InboxListView({
  kind,
  basePath,
  title,
  subtitle,
  sp,
}: {
  kind: 'project' | 'career';
  basePath: string;
  title: string;
  subtitle: string;
  /** Already-awaited searchParams from the page. */
  sp: { [key: string]: string | string[] | undefined };
}) {
  const view = resolveInboxView(firstParam(sp.status));
  const page = parsePage(firstParam(sp.page));
  const params = parseInboxListParams((k) => firstParam(sp[k]));
  const filters = toInboxFilters(params, kind);

  const [result, counts, options] = await Promise.all([
    listSubmissions({ kind, view, page, filters, sort: params.sort }),
    getStatusCounts(kind),
    getInboxFilterOptions(kind),
  ]);

  const byLabel = (a: FilterOption, b: FilterOption) =>
    a.label.localeCompare(b.label);
  const facetOptions: FilterOption[] = options.facets
    .map((value) => ({
      value,
      label: kind === 'project' ? serviceTitle(value) : roleTitle(value),
    }))
    .sort(byLabel);
  const sourceOptions: FilterOption[] = options.sources
    .map((value) => ({ value, label: referralLabel(value) }))
    .sort(byLabel);

  const rows: InboxRowData[] = result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    secondary: secondaryLine(row),
    dateLabel: formatDate(row.createdAt),
    status: row.status,
    href: `${basePath}/${row.id}?from=${view}`,
  }));

  // For the pager (current tab + filters, page appended client-side) and the
  // export menu (same filters but status-less — exports ignore the open tab).
  const filterQs = inboxListQs(view, params);
  const exportQs = inboxListQs('inbox', params);
  const filtered = hasActiveInboxFilters(params);

  return (
    <AdminPage>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Inbox
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <ExportMenu
          endpoint={`${basePath}/export`}
          filterQs={exportQs}
          hasDateFilter={Boolean(params.range || params.from || params.to)}
        />
      </header>

      <GlassPanel className="mt-6">
        <InboxTabs
          basePath={basePath}
          active={view}
          counts={counts}
          params={params}
        />
        <InboxFilterBar
          basePath={basePath}
          view={view}
          params={params}
          facetParam={kind === 'project' ? 'service' : 'role'}
          facetLabel={kind === 'project' ? 'Service' : 'Role'}
          facetOptions={facetOptions}
          sourceOptions={sourceOptions}
          searchPlaceholder={
            kind === 'project'
              ? 'Search name, email, or company'
              : 'Search name, email, or role'
          }
        />
        {rows.length === 0 ? (
          <InboxEmpty
            view={view}
            filtered={filtered}
            clearHref={
              view === 'inbox' ? basePath : `${basePath}?status=${view}`
            }
          />
        ) : (
          <InboxKeyboardList
            rows={rows}
            view={view}
            basePath={basePath}
            page={result.page}
            totalPages={result.totalPages}
            filterQs={filterQs}
          />
        )}
      </GlassPanel>
    </AdminPage>
  );
}
