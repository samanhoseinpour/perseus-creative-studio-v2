import type { Metadata } from 'next';

import { requireAdmin } from '@/lib/adminSession';
import {
  listSubmissions,
  getStatusCounts,
  resolveInboxView,
} from '@/db/adminQueries';
import { firstParam, parsePage } from '@/utils/pagination';
import InboxTabs from '@/components/Admin/inbox/InboxTabs';
import InboxList from '@/components/Admin/inbox/InboxList';
import { GlassPanel } from '@/components/Admin/Glass';

export const metadata: Metadata = { title: 'Inquiries' };

const BASE = '/admin/inquiries';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const view = resolveInboxView(firstParam(sp.status));
  const page = parsePage(firstParam(sp.page));

  const [result, counts] = await Promise.all([
    listSubmissions({ kind: 'project', view, page }),
    getStatusCounts('project'),
  ]);

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
        <InboxList
          rows={result.rows}
          basePath={BASE}
          view={view}
          page={result.page}
          totalPages={result.totalPages}
        />
      </GlassPanel>
    </div>
  );
}
