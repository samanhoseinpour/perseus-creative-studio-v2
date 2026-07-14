import 'server-only';
import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  lt,
  max,
  ne,
  or,
  sql,
} from 'drizzle-orm';

import { db, contactSubmissions, articleFeedback } from '@/db';
import type { ContactSubmission } from '@/db/schema';
import { passkey, session, user } from '@/db/auth-schema';
import { sanitizeAreas, type AdminArea } from '@/lib/adminAreas';
import type { InboxFilters, InboxSort } from '@/lib/inboxFilters';

/**
 * The submission kinds a viewer may see — derived from their granted areas
 * (inquiries → 'project', applications → 'career'). Queries taking a `kinds`
 * scope return nothing for an empty list (never `IN ()` SQL).
 */
export type SubmissionKind = ContactSubmission['kind'];

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

/** LIKE metacharacters escaped so a stray % / _ can't become a wildcard. */
const likePattern = (q: string) =>
  `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;

/**
 * The one WHERE clause for submissions reads — list page, list count, and CSV
 * export all compose through here so their filter semantics can't drift.
 * `q` matches who wrote in (name/email) plus where they're from: company for
 * inquiries, role for applications (role stores a slug, so a hyphenated
 * variant of the query is matched too — "video editor" hits 'video-editor').
 */
function submissionsWhere(
  kind: 'project' | 'career',
  statuses: ContactSubmission['status'][],
  filters: InboxFilters = {},
) {
  const clauses = [
    eq(contactSubmissions.kind, kind),
    inArray(contactSubmissions.status, statuses),
  ];
  if (filters.q) {
    const like = likePattern(filters.q);
    const fields = [
      ilike(contactSubmissions.name, like),
      ilike(contactSubmissions.email, like),
    ];
    if (kind === 'project') {
      fields.push(ilike(contactSubmissions.company, like));
    } else {
      fields.push(ilike(contactSubmissions.role, like));
      const hyphenated = filters.q.trim().replace(/\s+/g, '-');
      if (hyphenated !== filters.q) {
        fields.push(ilike(contactSubmissions.role, likePattern(hyphenated)));
      }
    }
    clauses.push(or(...fields)!);
  }
  if (filters.service) {
    clauses.push(
      sql`${contactSubmissions.services} @> ${JSON.stringify([filters.service])}::jsonb`,
    );
  }
  if (filters.role) clauses.push(eq(contactSubmissions.role, filters.role));
  if (filters.source) {
    clauses.push(eq(contactSubmissions.referralSource, filters.source));
  }
  if (filters.since) clauses.push(gte(contactSubmissions.createdAt, filters.since));
  if (filters.until) clauses.push(lt(contactSubmissions.createdAt, filters.until));
  return and(...clauses);
}

export type SubmissionsPage = {
  rows: ContactSubmission[];
  total: number;
  page: number;
  totalPages: number;
};

/**
 * One page of submissions for a kind + tab, filtered and sorted. `page` is
 * clamped to the available range, so an out-of-bounds `?page=` returns the
 * last page rather than an empty view (the shared `parsePage` helper has no
 * upper clamp; the count query carries the same filters, so the clamp is
 * against the filtered total).
 */
export async function listSubmissions({
  kind,
  view,
  page,
  perPage = SUBMISSIONS_PER_PAGE,
  filters,
  sort = 'newest',
}: {
  kind: 'project' | 'career';
  view: InboxView;
  page: number;
  perPage?: number;
  filters?: InboxFilters;
  sort?: InboxSort;
}): Promise<SubmissionsPage> {
  const where = submissionsWhere(kind, VIEW_STATUSES[view], filters);

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
    .orderBy(
      (sort === 'oldest' ? asc : desc)(contactSubmissions.createdAt),
    )
    .limit(perPage)
    .offset((safePage - 1) * perPage);

  return { rows, total, page: safePage, totalPages };
}

/**
 * Every submission of one kind for the CSV export — no pagination. `filters`
 * carries the list's search/facet/date window so a download matches what the
 * admin is looking at. Returns nothing for an empty `statuses` list (never
 * `IN ()` SQL).
 */
export async function listSubmissionsForExport({
  kind,
  statuses,
  filters,
  sort = 'newest',
}: {
  kind: 'project' | 'career';
  statuses: ContactSubmission['status'][];
  filters?: InboxFilters;
  sort?: InboxSort;
}): Promise<ContactSubmission[]> {
  if (statuses.length === 0) return [];
  return db
    .select()
    .from(contactSubmissions)
    .where(submissionsWhere(kind, statuses, filters))
    .orderBy(
      (sort === 'oldest' ? asc : desc)(contactSubmissions.createdAt),
    );
}

export type InboxFilterOptions = {
  /** Service slugs (project) or role slugs (career) present in stored rows. */
  facets: string[];
  /** Referral-source slugs present in stored rows. */
  sources: string[];
};

/**
 * DISTINCT filter-dropdown values actually present for a kind — every status,
 * so a filter can find archived/spam rows too. Slugs only: label resolution
 * (serviceTitle/roleTitle/referralLabel) happens in the server page, keeping
 * this module registry-free (same rule as getFeedbackStats).
 */
export async function getInboxFilterOptions(
  kind: 'project' | 'career',
): Promise<InboxFilterOptions> {
  const facetsQuery =
    kind === 'project'
      ? // services is a jsonb string[] — unnest before DISTINCT so each slug
        // counts once however submissions combined them.
        db
          .selectDistinct({
            v: sql<string>`jsonb_array_elements_text(${contactSubmissions.services})`,
          })
          .from(contactSubmissions)
          .where(
            and(
              eq(contactSubmissions.kind, kind),
              isNotNull(contactSubmissions.services),
            ),
          )
      : db
          .selectDistinct({ v: contactSubmissions.role })
          .from(contactSubmissions)
          .where(
            and(
              eq(contactSubmissions.kind, kind),
              isNotNull(contactSubmissions.role),
            ),
          );

  const sourcesQuery = db
    .selectDistinct({ v: contactSubmissions.referralSource })
    .from(contactSubmissions)
    .where(
      and(
        eq(contactSubmissions.kind, kind),
        isNotNull(contactSubmissions.referralSource),
      ),
    );

  const [facetRows, sourceRows] = await Promise.all([
    facetsQuery,
    sourcesQuery,
  ]);
  return {
    facets: facetRows.map((r) => r.v).filter((v): v is string => Boolean(v)),
    sources: sourceRows.map((r) => r.v).filter((v): v is string => Boolean(v)),
  };
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

export type FeedbackStatRow = {
  slug: string;
  up: number;
  down: number;
  /** Most recent vote touch (created or switched). */
  lastVoteAt: Date | null;
};

/**
 * Per-slug article-vote tallies for /admin/feedback — one grouped query,
 * folded in JS (getStatusCounts pattern). Deliberately no blogPosts import:
 * title resolution happens in the page so this module stays registry-free.
 */
export async function getFeedbackStats(): Promise<FeedbackStatRow[]> {
  const rows = await db
    .select({
      slug: articleFeedback.slug,
      vote: articleFeedback.vote,
      n: count(),
      last: max(articleFeedback.updatedAt),
    })
    .from(articleFeedback)
    .groupBy(articleFeedback.slug, articleFeedback.vote);

  const bySlug = new Map<string, FeedbackStatRow>();
  for (const row of rows) {
    const stat = bySlug.get(row.slug) ?? {
      slug: row.slug,
      up: 0,
      down: 0,
      lastVoteAt: null,
    };
    if (row.vote === 'up') stat.up = row.n;
    else stat.down = row.n;
    if (row.last && (!stat.lastVoteAt || row.last > stat.lastVoteAt))
      stat.lastVoteAt = row.last;
    bySlug.set(row.slug, stat);
  }
  return [...bySlug.values()];
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

/**
 * The stored avatar value (`user.image`) read FRESH by PK. The avatar action
 * swaps/deletes the blob the ROW references (not whatever the 5-minute
 * session cookie cache remembers), and the /admin/avatars/[userId] route
 * resolves its blob pathname through this — never from the URL.
 */
export async function getUserAvatarPath(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ image: user.image })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return row?.image ?? null;
}

export type AdminSession = {
  token: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Active (unexpired) sessions for one user, most recently active first — the
 * profile page's session list. Deliberately a direct read instead of
 * auth.api.listSessions: that endpoint runs freshSessionMiddleware, which
 * throws SESSION_NOT_FRESH (403) once the viewer's session is older than
 * freshAge (default 1 day) and was crashing the /admin/profile render for any
 * login older than a day. requireAdmin() has already authenticated the viewer,
 * and this returns only rows scoped to their own userId — the same trust model
 * as getUserPasskeys above. The expiry filter mirrors Better Auth's own
 * listSessions (expiresAt > now).
 */
export async function getUserActiveSessions(
  userId: string,
): Promise<AdminSession[]> {
  return db
    .select({
      token: session.token,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    })
    .from(session)
    .where(and(eq(session.userId, userId), gt(session.expiresAt, new Date())))
    .orderBy(desc(session.updatedAt));
}

export type OverviewStats = {
  newProject: number;
  newCareer: number;
  archived: number;
  spam: number;
};

/**
 * At-a-glance counts for the overview stat tiles, scoped to the viewer's
 * `kinds`. `archived`/`spam` are totals across the visible kinds; the two
 * `new*` counts are per-kind (they map cleanly to the two inbox routes — a
 * kind outside the scope stays 0). One grouped query, summed in JS.
 */
export async function getOverviewStats(
  kinds: SubmissionKind[],
): Promise<OverviewStats> {
  const zero: OverviewStats = {
    newProject: 0,
    newCareer: 0,
    archived: 0,
    spam: 0,
  };
  if (kinds.length === 0) return zero;

  const rows = await db
    .select({
      kind: contactSubmissions.kind,
      status: contactSubmissions.status,
      n: count(),
    })
    .from(contactSubmissions)
    .where(inArray(contactSubmissions.kind, kinds))
    .groupBy(contactSubmissions.kind, contactSubmissions.status);

  const stats: OverviewStats = {
    newProject: 0,
    newCareer: 0,
    archived: 0,
    spam: 0,
  };
  for (const row of rows) {
    if (row.status === 'new') {
      if (row.kind === 'project') stats.newProject = row.n;
      else stats.newCareer = row.n;
    } else if (row.status === 'archived') {
      stats.archived += row.n;
    } else if (row.status === 'spam') {
      stats.spam += row.n;
    }
  }
  return stats;
}

/**
 * The newest submissions across the viewer's visible kinds — powers the
 * overview activity feed. Excludes spam (bot noise) so the feed reads as real
 * inbound leads.
 */
export async function getRecentSubmissions(
  limit: number,
  kinds: SubmissionKind[],
): Promise<ContactSubmission[]> {
  if (kinds.length === 0) return [];
  return db
    .select()
    .from(contactSubmissions)
    .where(
      and(
        ne(contactSubmissions.status, 'spam'),
        inArray(contactSubmissions.kind, kinds),
      ),
    )
    .orderBy(desc(contactSubmissions.createdAt))
    .limit(limit);
}

export type SubmissionHit = {
  id: string;
  name: string;
  email: string;
  kind: ContactSubmission['kind'];
  status: ContactSubmission['status'];
  href: string;
};

/**
 * Name/email search across the viewer's visible kinds (every status) for the
 * ⌘K palette. Returns [] under 2 chars or with no visible kinds. LIKE
 * metacharacters in the query are escaped so a stray % / _ can't turn into an
 * accidental wildcard.
 */
export async function searchSubmissions(
  query: string,
  limit: number,
  kinds: SubmissionKind[],
): Promise<SubmissionHit[]> {
  const q = query.trim();
  if (q.length < 2 || kinds.length === 0) return [];
  const like = likePattern(q);

  const rows = await db
    .select({
      id: contactSubmissions.id,
      name: contactSubmissions.name,
      email: contactSubmissions.email,
      kind: contactSubmissions.kind,
      status: contactSubmissions.status,
    })
    .from(contactSubmissions)
    .where(
      and(
        inArray(contactSubmissions.kind, kinds),
        or(
          ilike(contactSubmissions.name, like),
          ilike(contactSubmissions.email, like),
        ),
      ),
    )
    .orderBy(desc(contactSubmissions.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    ...r,
    href:
      r.kind === 'project'
        ? `/admin/inquiries/${r.id}`
        : `/admin/applications/${r.id}`,
  }));
}

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  superadmin: boolean;
  areas: AdminArea[];
  createdAt: Date;
  passkeys: number;
  /** Last session touch across their devices, or null if never signed in. */
  lastActiveAt: Date | null;
};

/**
 * Every admin account for /admin/users, oldest first (the seed roster leads).
 * `countDistinct` is load-bearing: the double left join row-multiplies
 * (passkeys × sessions), so a plain count() would inflate both tallies.
 * Grouping by the PK lets the other user columns ride along un-aggregated.
 */
export async function listAdminUsers(): Promise<AdminUserRow[]> {
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      areas: user.areas,
      createdAt: user.createdAt,
      passkeys: countDistinct(passkey.id),
      lastActiveAt: max(session.updatedAt),
    })
    .from(user)
    .leftJoin(passkey, eq(passkey.userId, user.id))
    .leftJoin(session, eq(session.userId, user.id))
    .groupBy(user.id)
    .orderBy(asc(user.createdAt));

  return rows.map(({ role, areas, ...rest }) => ({
    ...rest,
    superadmin: role === 'superadmin',
    areas: sanitizeAreas(areas),
  }));
}

/**
 * Ticket-notification recipients — the DB-backed successor to the retired
 * PRIVILEGED_ADMINS constant (roles live on the user row now).
 */
export async function superadminEmails(): Promise<string[]> {
  const rows = await db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.role, 'superadmin'));
  return rows.map((r) => r.email);
}
