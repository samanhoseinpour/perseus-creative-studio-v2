import type { Metadata } from 'next';

import { requireArea } from '@/lib/adminAccess';
import {
  listSubmissions,
  getStatusCounts,
  resolveInboxView,
} from '@/db/adminQueries';
import { firstParam, parsePage } from '@/utils/pagination';
import InboxTabs from '@/components/Admin/inbox/InboxTabs';
import InboxEmpty from '@/components/Admin/inbox/InboxEmpty';
import { formatDate } from '@/components/Admin/inbox/format';
import { secondaryLine } from '@/components/Admin/inbox/secondary';
import InboxKeyboardList, {
  type InboxRowData,
} from '@/components/Admin/inbox/InboxKeyboardList';
import { GlassPanel } from '@/components/Admin/Glass';

export const metadata: Metadata = {
  title: 'Inquiries',
  description: 'Project inquiries submitted through the contact form.',
};

const BASE = '/admin/inquiries';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireArea('inquiries');
  const sp = await searchParams;
  const view = resolveInboxView(firstParam(sp.status));
  const page = parsePage(firstParam(sp.page));

  const [result, counts] = await Promise.all([
    listSubmissions({ kind: 'project', view, page }),
    getStatusCounts('project'),
  ]);

  const rows: InboxRowData[] = result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    secondary: secondaryLine(row),
    dateLabel: formatDate(row.createdAt),
    status: row.status,
    href: `${BASE}/${row.id}?from=${view}`,
  }));

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8 lg:py-12">
      <header className="mb-6 flex flex-col gap-1.5">
        <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Inbox
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Inquiries
        </h1>
        <p className="text-sm text-muted-foreground">
          Project leads from the contact form.
        </p>
      </header>

      <GlassPanel className="mt-6">
        <InboxTabs basePath={BASE} active={view} counts={counts} />
        {rows.length === 0 ? (
          <InboxEmpty view={view} />
        ) : (
          <InboxKeyboardList
            rows={rows}
            view={view}
            basePath={BASE}
            page={result.page}
            totalPages={result.totalPages}
          />
        )}
      </GlassPanel>
    </div>
  );
}
