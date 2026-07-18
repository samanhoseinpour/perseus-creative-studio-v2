import type { Metadata } from 'next';
import Link from 'next/link';
import { LuBug, LuPlus } from 'react-icons/lu';

import Button from '@/components/Button';
import { requireArea } from '@/lib/adminAccess';
import {
  getTicketStatusCounts,
  listOwnTickets,
  listTickets,
  resolveTicketView,
} from '@/db/ticketQueries';
import { ticketAreaLabel, TICKET_STATUS_LABELS } from '@/lib/ticketFields';
import { firstParam, parsePage } from '@/utils/pagination';
import { formatDate } from '@/components/Admin/inbox/format';
import { GlassPanel } from '@/components/Admin/Glass';
import AdminPage from '@/components/Admin/AdminPage';
import EmptyState from '@/components/Admin/EmptyState';
import TicketTabs from '@/components/Admin/tickets/TicketTabs';
import TicketRow from '@/components/Admin/tickets/TicketRow';
import TicketPager from '@/components/Admin/tickets/TicketPager';

export const metadata: Metadata = {
  title: 'Tickets',
  description: 'Bug reports and issues raised in the admin panel.',
};

const BASE = '/admin/tickets';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * Role-aware list behind the tickets area grant: superadmins see every ticket
 * behind open/pending/closed tabs; everyone else sees only the tickets they
 * raised (all statuses mixed, each row carrying its status pill).
 */
export default async function TicketsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await requireArea('tickets');
  const { user } = profile.session;
  const triager = profile.superadmin;
  const sp = await searchParams;
  const page = parsePage(firstParam(sp.page));
  const view = triager ? resolveTicketView(firstParam(sp.status)) : null;

  const [result, counts] = view
    ? await Promise.all([listTickets({ view, page }), getTicketStatusCounts()])
    : [await listOwnTickets({ reporterId: user.id, page }), null];

  return (
    <AdminPage>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Support
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Tickets
          </h1>
          <p className="text-sm text-muted-foreground">
            {triager
              ? 'Bug reports and issues raised in the admin panel.'
              : 'Issues you’ve reported, and where they stand.'}
          </p>
        </div>
        <Link href={`${BASE}/new`} className="inline-flex">
          <Button size="small" icon={LuPlus} iconPosition="left">
            New ticket
          </Button>
        </Link>
      </header>

      <GlassPanel className="mt-6">
        {view && counts && (
          <TicketTabs basePath={BASE} active={view} counts={counts} />
        )}
        {result.rows.length === 0 ? (
          <EmptyState
            icon={LuBug}
            title={
              view
                ? `No ${TICKET_STATUS_LABELS[view].toLowerCase()} tickets`
                : 'No tickets yet'
            }
            description={
              view
                ? view === 'open'
                  ? 'Nothing needs attention right now — new reports land here.'
                  : `Tickets you move to ${TICKET_STATUS_LABELS[view].toLowerCase()} will show up here.`
                : 'Spotted something broken or off in the admin panel? Open a ticket and the team will look into it.'
            }
          />
        ) : (
          <ul className="divide-y divide-white/40 dark:divide-white/10">
            {result.rows.map((t) => (
              <TicketRow
                key={t.id}
                href={`${BASE}/${t.id}${view ? `?from=${view}` : ''}`}
                title={t.title}
                severity={t.severity}
                status={t.status}
                showStatus={!triager}
                secondary={
                  triager
                    ? `${ticketAreaLabel(t.area)} · ${t.reporterName}`
                    : ticketAreaLabel(t.area)
                }
                dateLabel={formatDate(t.createdAt)}
              />
            ))}
          </ul>
        )}
        <TicketPager
          basePath={BASE}
          view={view}
          page={result.page}
          totalPages={result.totalPages}
        />
      </GlassPanel>
    </AdminPage>
  );
}
