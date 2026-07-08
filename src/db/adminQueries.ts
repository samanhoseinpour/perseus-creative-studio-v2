import 'server-only';
import { and, count, desc, eq, inArray } from 'drizzle-orm';

import { db, contactSubmissions } from '@/db';
import type { ContactSubmission } from '@/db/schema';
import { passkey } from '@/db/auth-schema';

/**
 * Read helpers for the admin dashboard + submissions inbox. Kept in one
 * server-only module so the content/query surface never reaches a client
 * bundle (see CLAUDE.md chunk hygiene). Writes (status changes, delete) live in
 * the co-located `_actions/inbox.ts` server-action module, not here.
 */

/** Count of un-triaged (`status = 'new'`) submissions, split by kind. */
export async function getNewSubmissionCounts(): Promise<{
  project: number;
  career: number;
}> {
  const rows = await db
    .select({ kind: contactSubmissions.kind, n: count() })
    .from(contactSubmissions)
    .where(eq(contactSubmissions.status, 'new'))
    .groupBy(contactSubmissions.kind);

  const counts = { project: 0, career: 0 };
  for (const row of rows) counts[row.kind] = row.n;
  return counts;
}

// UUIDs are the PK; guard id-by-string reads so a malformed /admin/…/[id] URL
// returns "not found" instead of throwing a 500 at the Postgres type cast.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type InboxView = 'inbox' | 'archived' | 'spam';

/** Normalize a raw `?status=` value to a valid tab, defaulting to the inbox. */
export function resolveInboxView(value: string): InboxView {
  return value === 'archived' || value === 'spam' ? value : 'inbox';
}

// Which statuses each inbox tab surfaces. 'inbox' is the working set
// (untriaged + read); archived and spam are their own buckets.
const VIEW_STATUSES: Record<InboxView, ContactSubmission['status'][]> = {
  inbox: ['new', 'read'],
  archived: ['archived'],
  spam: ['spam'],
};

export const SUBMISSIONS_PER_PAGE = 25;

export type SubmissionsPage = {
  rows: ContactSubmission[];
  total: number;
  page: number;
  totalPages: number;
};

/**
 * One page of submissions for a kind + tab, newest first. `page` is clamped to
 * the available range, so an out-of-bounds `?page=` returns the last page
 * rather than an empty view (the shared `parsePage` helper has no upper clamp).
 */
export async function listSubmissions({
  kind,
  view,
  page,
  perPage = SUBMISSIONS_PER_PAGE,
}: {
  kind: 'project' | 'career';
  view: InboxView;
  page: number;
  perPage?: number;
}): Promise<SubmissionsPage> {
  const where = and(
    eq(contactSubmissions.kind, kind),
    inArray(contactSubmissions.status, VIEW_STATUSES[view]),
  );

  const [{ total }] = await db
    .select({ total: count() })
    .from(contactSubmissions)
    .where(where);

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const rows = await db
    .select()
    .from(contactSubmissions)
    .where(where)
    .orderBy(desc(contactSubmissions.createdAt))
    .limit(perPage)
    .offset((safePage - 1) * perPage);

  return { rows, total, page: safePage, totalPages };
}

/** A single submission by id, or null if the id is malformed / missing. */
export async function getSubmissionById(
  id: string,
): Promise<ContactSubmission | null> {
  if (!UUID_RE.test(id)) return null;
  const [row] = await db
    .select()
    .from(contactSubmissions)
    .where(eq(contactSubmissions.id, id))
    .limit(1);
  return row ?? null;
}

export type StatusCounts = {
  new: number;
  read: number;
  archived: number;
  spam: number;
};

/** Per-status counts for one kind — powers the inbox tab badges. */
export async function getStatusCounts(
  kind: 'project' | 'career',
): Promise<StatusCounts> {
  const rows = await db
    .select({ status: contactSubmissions.status, n: count() })
    .from(contactSubmissions)
    .where(eq(contactSubmissions.kind, kind))
    .groupBy(contactSubmissions.status);

  const counts: StatusCounts = { new: 0, read: 0, archived: 0, spam: 0 };
  for (const row of rows) counts[row.status] = row.n;
  return counts;
}

export type AdminPasskey = {
  id: string;
  name: string | null;
  deviceType: string;
  createdAt: Date | null;
};

/** Passkeys registered to one user, newest first — for the profile manager. */
export async function getUserPasskeys(userId: string): Promise<AdminPasskey[]> {
  return db
    .select({
      id: passkey.id,
      name: passkey.name,
      deviceType: passkey.deviceType,
      createdAt: passkey.createdAt,
    })
    .from(passkey)
    .where(eq(passkey.userId, userId))
    .orderBy(desc(passkey.createdAt));
}

/** Cheap existence check for the post-login "set up a passkey" prompt. */
export async function getUserPasskeyCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(passkey)
    .where(eq(passkey.userId, userId));
  return row?.n ?? 0;
}
