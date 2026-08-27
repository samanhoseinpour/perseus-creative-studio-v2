import 'server-only';
import { cache } from 'react';
import {
  and,
  count,
  desc,
  eq,
  getTableColumns,
  ilike,
  sql,
} from 'drizzle-orm';

import { db } from '@/db';
import { searchAllTokens } from '@/db/adminQueries';
import { tickets } from '@/db/schema';
import type { Ticket } from '@/db/schema';
import type { SearchHit } from '@/lib/adminSearch';
import {
  TICKET_STATUS_LABELS,
  type TicketStatusSlug,
} from '@/lib/ticketFields';

/**
 * Read helpers for the admin tickets section, mirroring adminQueries.ts: one
 * server-only module so the query surface never reaches a client bundle.
 * Writes (create, status changes) live in `_actions/tickets.ts`, not here.
 *
 * NOTE: these helpers don't authorize — callers decide between listTickets
 * (superadmins, everything) and listOwnTickets (everyone with the tickets
 * area, own rows only) via src/lib/adminAccess.ts.
 */

// Guard id-by-string reads so a malformed /admin/tickets/[id] URL returns
// "not found" instead of throwing a 500 at the Postgres uuid cast.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Normalize a raw `?status=` value to a valid tab, defaulting to open. */
export function resolveTicketView(value: string): TicketStatusSlug {
  return value === 'pending' || value === 'closed' ? value : 'open';
}

export const TICKETS_PER_PAGE = 25;

export type TicketsPage = {
  rows: Ticket[];
  total: number;
  page: number;
  totalPages: number;
};

async function pagedTickets(
  where: ReturnType<typeof eq>,
  page: number,
  perPage: number,
): Promise<TicketsPage> {
  // One round trip in the common case (listSubmissions pattern): the total
  // rides every row as a window count instead of a COUNT query awaited first.
  // Only a stale out-of-range ?page= pays the rare clamp re-fetch below.
  const fetchPage = (p: number) =>
    db
      .select({
        ...getTableColumns(tickets),
        total: sql<number>`count(*) over ()::int`,
      })
      .from(tickets)
      .where(where)
      .orderBy(desc(tickets.createdAt))
      .limit(perPage)
      .offset((p - 1) * perPage);

  // Upper cap BEFORE the first fetch — an absurd ?page= would otherwise
  // overflow the int8 OFFSET and 500 the render (listSubmissions rule).
  const requested = Math.min(Math.max(1, Math.trunc(page)), 1_000_000);
  let safePage = requested;
  let pageRows = await fetchPage(requested);
  let total = pageRows[0]?.total ?? 0;
  if (pageRows.length === 0 && requested > 1) {
    // Past the end: clamp to the real last page.
    const [{ n }] = await db.select({ n: count() }).from(tickets).where(where);
    total = n;
    safePage = Math.min(requested, Math.max(1, Math.ceil(n / perPage)));
    if (safePage !== requested) pageRows = await fetchPage(safePage);
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const rows = pageRows.map(({ total, ...row }) => {
    void total; // the window count is not a row field
    return row;
  });
  return { rows, total, page: safePage, totalPages };
}

/**
 * One page of ALL tickets in a status tab, newest first — superadmin view
 * only. `page` is clamped to the available range (see listSubmissions).
 */
export async function listTickets({
  view,
  page,
  perPage = TICKETS_PER_PAGE,
}: {
  view: TicketStatusSlug;
  page: number;
  perPage?: number;
}): Promise<TicketsPage> {
  return pagedTickets(eq(tickets.status, view), page, perPage);
}

/**
 * One page of the acting user's own tickets, every status mixed, newest
 * first — the member view of /admin/tickets.
 */
export async function listOwnTickets({
  reporterId,
  page,
  perPage = TICKETS_PER_PAGE,
}: {
  reporterId: string;
  page: number;
  perPage?: number;
}): Promise<TicketsPage> {
  return pagedTickets(eq(tickets.reporterId, reporterId), page, perPage);
}

/**
 * Title/description search for the ⌘K palette. `reporterId` is the row scope:
 * pass null ONLY for superadmins (who see every ticket); everyone else's id
 * must be threaded in, mirroring the listTickets/listOwnTickets split above —
 * without it the palette becomes an ILIKE oracle over the deliberately
 * non-enumerable ticket set (the detail page 404s foreign ids on purpose).
 * Never selects `screenshotPath` (a private-blob capability).
 */
export async function searchTickets(
  query: string,
  limit: number,
  reporterId: string | null,
): Promise<SearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const text = searchAllTokens(q, (like) => [
    ilike(tickets.title, like),
    ilike(tickets.description, like),
  ]);
  if (!text) return [];
  const rows = await db
    .select({
      id: tickets.id,
      title: tickets.title,
      status: tickets.status,
      reporterName: tickets.reporterName,
    })
    .from(tickets)
    .where(
      reporterId !== null ? and(text, eq(tickets.reporterId, reporterId)) : text,
    )
    .orderBy(desc(tickets.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    entity: 'ticket' as const,
    id: r.id,
    label: r.title,
    sublabel: `${r.reporterName} · ${TICKET_STATUS_LABELS[r.status]}`,
    href: `/admin/tickets/${r.id}`,
  }));
}

/** A single ticket by id, or null if the id is malformed / missing. */
export async function getTicketById(id: string): Promise<Ticket | null> {
  if (!UUID_RE.test(id)) return null;
  const [row] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.id, id))
    .limit(1);
  return row ?? null;
}

/**
 * The acting user's own open-ticket count — the sidebar badge AND the overview
 * stat tile for members with the tickets area (superadmins get the all-tickets
 * open count). React cache(): both callers run in one request, so this is one
 * flight, not two — same rule as getTicketStatusCounts below.
 */
export const countOwnOpenTickets = cache(
  async (reporterId: string): Promise<number> => {
    const [row] = await db
      .select({ n: count() })
      .from(tickets)
      .where(and(eq(tickets.reporterId, reporterId), eq(tickets.status, 'open')));
    return row?.n ?? 0;
  },
);

export type TicketStatusCounts = Record<TicketStatusSlug, number>;

/** Per-status counts — powers the tab badges and the sidebar open count.
 *  React cache(): the protected layout, dashboard home, and tickets page all
 *  call this in one request — one flight instead of two or three. */
export const getTicketStatusCounts = cache(
  async (): Promise<TicketStatusCounts> => {
    const rows = await db
      .select({ status: tickets.status, n: count() })
      .from(tickets)
      .groupBy(tickets.status);

    const counts: TicketStatusCounts = { open: 0, pending: 0, closed: 0 };
    for (const row of rows) counts[row.status] = row.n;
    return counts;
  },
);
