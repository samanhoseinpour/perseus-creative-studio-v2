import 'server-only';
import { cache } from 'react';
import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  getTableColumns,
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
import { pushSubscriptions } from '@/db/schema';
import type { ContactSubmission } from '@/db/schema';
import { passkey, session, user } from '@/db/auth-schema';
import { sanitizeAreas, type AdminArea } from '@/lib/adminAreas';
import type { SearchHit } from '@/lib/adminSearch';
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

/** Count of un-triaged (`status = 'new'`) submissions, split by kind.
 *  React cache(): the protected layout and the dashboard home both call this
 *  in the same request — one flight instead of two Neon round trips. */
export const getNewSubmissionCounts = cache(
  async (): Promise<{
    project: number;
    career: number;
  }> => {
    const rows = await db
      .select({ kind: contactSubmissions.kind, n: count() })
      .from(contactSubmissions)
      .where(eq(contactSubmissions.status, 'new'))
      .groupBy(contactSubmissions.kind);

    const counts = { project: 0, career: 0 };
    for (const row of rows) counts[row.kind] = row.n;
    return counts;
  },
);

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

/** LIKE metacharacters escaped so a stray % / _ can't become a wildcard —
 *  a client named "100% Chiropractic" must not turn into one. The definition
 *  moved to the guard-free taskPredicates.ts leaf (the filter DB self-check
 *  can't import this `server-only` module); re-exported here so every other
 *  query module keeps its import path. */
import { likePattern } from '@/db/taskPredicates';
export { likePattern };

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
      // The stored title snapshot too, so "video editor" finds an application
      // whose slug is `video-editor` even after the listing is renamed.
      fields.push(ilike(contactSubmissions.roleTitle, like));
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
  const order = (sort === 'oldest' ? asc : desc)(contactSubmissions.createdAt);

  // One round trip in the common case: the filtered total rides every row as
  // a window count instead of a separate COUNT query awaited first — on the
  // neon-http driver each query is its own HTTPS round trip, and this is the
  // deepest await chain on every inbox render (including each debounced
  // search keystroke). Only a stale out-of-range ?page= pays extra queries.
  const fetchPage = (p: number) =>
    db
      .select({
        ...getTableColumns(contactSubmissions),
        total: sql<number>`count(*) over ()::int`,
      })
      .from(contactSubmissions)
      .where(where)
      .orderBy(order)
      .limit(perPage)
      .offset((p - 1) * perPage);

  // Upper cap BEFORE the first fetch: the offset reaches Postgres pre-clamp
  // now, and an absurd ?page= would overflow int8 and 500 the render (the
  // old count-first code clamped before building any OFFSET).
  const requested = Math.min(Math.max(1, Math.trunc(page)), 1_000_000);
  let safePage = requested;
  let pageRows = await fetchPage(requested);
  let total = pageRows[0]?.total ?? 0;
  if (pageRows.length === 0 && requested > 1) {
    // Past the end (or the filtered set emptied): clamp to the real last page.
    const [{ n }] = await db
      .select({ n: count() })
      .from(contactSubmissions)
      .where(where);
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
  /**
   * Service slugs (project) or role slugs (career) present in stored rows.
   * `label` is the stored role-title snapshot for career rows (null when no
   * row under that slug carries one — pre-0026 rows, or an unknown slug) and
   * always null for project rows, whose labels resolve from the registry.
   */
  facets: { value: string; label: string | null }[];
  /** Referral-source slugs present in stored rows. */
  sources: string[];
};

/**
 * DISTINCT filter-dropdown values actually present for a kind — every status,
 * so a filter can find archived/spam rows too. Slugs only: label resolution
 * (serviceTitle/referralLabel) happens in the server page, keeping this
 * module registry-free (same rule as getFeedbackStats). Role labels are the
 * exception — there is no registry, so the career branch carries the stored
 * title snapshot along, one row per slug (max() collapses the two snapshots a
 * rename leaves behind, so a slug never appears twice in the dropdown).
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
          .select({
            v: contactSubmissions.role,
            label: max(contactSubmissions.roleTitle),
          })
          .from(contactSubmissions)
          .where(
            and(
              eq(contactSubmissions.kind, kind),
              isNotNull(contactSubmissions.role),
            ),
          )
          .groupBy(contactSubmissions.role);

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
    facets: facetRows.flatMap((r) =>
      r.v ? [{ value: r.v, label: 'label' in r ? (r.label ?? null) : null }] : [],
    ),
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

/**
 * Prunes session rows whose expiry has passed. Better Auth only deletes an
 * expired row when its cookie is presented late (and the browser drops the
 * cookie at Max-Age, so most never are); with 24-hour sessions that is a row
 * per person per day left behind forever. Run from the daily recurring-tasks
 * cron beside the activity-log sweep.
 *
 * A DIRECT delete, deliberately bypassing Better Auth's adapter: a lapse is
 * not an auth event, and the `session.delete.after` audit hook in auth.ts
 * would otherwise be the only thing it produced. Returning ids (the
 * deleteActivityBefore shape) so the cron can report the count.
 */
export async function deleteExpiredSessions(): Promise<number> {
  const deleted = await db
    .delete(session)
    .where(lt(session.expiresAt, new Date()))
    .returning({ id: session.id });
  return deleted.length;
}

/**
 * Submission creation instants since a cutoff, scoped to the viewer's kinds —
 * the overview's 14-day inbox trend. Spam excluded so the strip counts real
 * inbound, matching getRecentSubmissions. Day bucketing happens in JS via
 * dayKeyIn in the reader's zone (the calendar-door rule: SQL never turns an
 * instant into a calendar day).
 */
export async function listRecentSubmissionTimes(
  since: Date,
  kinds: SubmissionKind[],
): Promise<{ createdAt: Date }[]> {
  if (kinds.length === 0) return [];
  return db
    .select({ createdAt: contactSubmissions.createdAt })
    .from(contactSubmissions)
    .where(
      and(
        ne(contactSubmissions.status, 'spam'),
        inArray(contactSubmissions.kind, kinds),
        gte(contactSubmissions.createdAt, since),
      ),
    );
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

/**
 * Team-account search for the ⌘K palette — role-gated (superadmin/owner) by
 * the action, matching /admin/users. Selects name/email ONLY: never `image`
 * (a private-blob pathname) and never a `session` join (ip/userAgent are
 * device PII). No per-account route exists, so every hit lands on the roster.
 */
export async function searchAdminUsers(
  query: string,
  limit: number,
): Promise<SearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const like = likePattern(q);
  const rows = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(or(ilike(user.name, like), ilike(user.email, like)))
    .orderBy(asc(user.name))
    .limit(limit);

  return rows.map((r) => ({
    entity: 'user' as const,
    id: r.id,
    label: r.name,
    sublabel: r.email,
    href: '/admin/users',
  }));
}

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  /** role === 'owner' — exactly one row; untouchable from the UI. */
  owner: boolean;
  /** role === 'superadmin' EXACTLY (owner excluded) — the UI needs the three
   *  target kinds distinct, unlike AccessProfile.superadmin which folds the
   *  owner in for role-privilege checks. */
  superadmin: boolean;
  areas: AdminArea[];
  createdAt: Date;
  passkeys: number;
  /**
   * When this person was last actually in the admin, or null if never seen.
   * The newer of the presence heartbeat (`user.last_seen_at`) and Better
   * Auth's session refresh — see the note on the query below.
   */
  lastSeenAt: Date | null;
  /**
   * How many browsers this person has subscribed to push. The COUNT only —
   * never the endpoint or the keys, which are capability-shaped and must not
   * reach an RSC payload (see the block comment on the table).
   *
   * Zero is honestly ambiguous and the UI must not resolve it: it covers
   * "turned it off", "never asked", and "an iPhone not yet on the Home
   * Screen" alike. The database knows about subscriptions, not intent.
   */
  pushDevices: number;
  /** Newest delivery across those devices — the readout that shows push is
   *  actually landing, not merely switched on. Null when never notified. */
  lastNotifiedAt: Date | null;
};

/**
 * Every admin account for /admin/users, oldest first (the seed roster leads).
 * `countDistinct` is load-bearing: the triple left join row-multiplies
 * (passkeys × sessions × push devices), so a plain count() would inflate every
 * tally. `max()` is immune to the multiplication, which is why the two
 * timestamps ride along for free.
 * Grouping by the PK lets the other user columns ride along un-aggregated —
 * which is also what makes `user.lastSeenAt` legal beside the aggregate.
 *
 * Presence reads BOTH sources and takes the newer. `user.last_seen_at` is the
 * real signal (the heartbeat), but the session max is not redundant: it is the
 * floor for a device that signed in and never ran the heartbeat, and it is how
 * an account that has signed in at least once stays distinguishable from one
 * that never has. The max is deliberately NOT filtered to live sessions — an
 * expired row's timestamp is still a true past sighting, and GREATEST would
 * pass over it anyway.
 *
 * The comparison happens in JS, not as sql`greatest(...)`: Drizzle's max()
 * carries the column's mapper and hands back a Date, while a raw sql fragment
 * comes off neon-http as a string (see how profile/page.tsx has to re-wrap
 * getUserActiveSessions' updatedAt).
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
      lastSeenAt: user.lastSeenAt,
      lastSessionAt: max(session.updatedAt),
      pushDevices: countDistinct(pushSubscriptions.id),
      lastNotifiedAt: max(pushSubscriptions.lastNotifiedAt),
    })
    .from(user)
    .leftJoin(passkey, eq(passkey.userId, user.id))
    .leftJoin(session, eq(session.userId, user.id))
    .leftJoin(pushSubscriptions, eq(pushSubscriptions.userId, user.id))
    .groupBy(user.id)
    .orderBy(asc(user.createdAt));

  return rows.map(({ role, areas, lastSeenAt, lastSessionAt, ...rest }) => ({
    ...rest,
    owner: role === 'owner',
    superadmin: role === 'superadmin',
    areas: sanitizeAreas(areas),
    lastSeenAt: newerOf(lastSeenAt, lastSessionAt),
  }));
}

/** The later of two nullable instants; null only when both are null. */
function newerOf(a: Date | null, b: Date | null): Date | null {
  if (!a) return b;
  if (!b) return a;
  return a.getTime() >= b.getTime() ? a : b;
}

/**
 * Stamps presence for one account — the single write behind the "Online" dot
 * on /admin/users.
 *
 * Unthrottled by design: both callers (the heartbeat route and the protected
 * layout's floor write) already hold the stored value on their access profile,
 * so they gate with shouldTouchPresence() for free rather than paying a read
 * here. `now()` is the DATABASE's clock, which keeps every row on one timeline
 * regardless of what a client's machine believes.
 *
 * Writes nothing to activity_log, deliberately: a row per 90 seconds per
 * person would bury every other domain in the global feed, and sign-in and
 * sign-out are already audited.
 */
export async function touchUserLastSeen(userId: string): Promise<void> {
  await db
    .update(user)
    .set({ lastSeenAt: sql`now()` })
    .where(eq(user.id, userId));
}

/**
 * Catch an account's "what's new" watermark up to the current release, from the
 * protected layout's after() — used only when there is nothing left to show
 * that viewer, so it can never skip an unread note.
 *
 * ONE rule, three holes closed:
 *  - a never-stamped NULL (a brand-new account),
 *  - a junk value that resolveWatermark degrades (which would otherwise sit
 *    there for ever, silently muting the feature for that person),
 *  - and a release this viewer's AREAS hid entirely. That last one is the
 *    subtle one: without it the release stays above their stored watermark for
 *    ever, so granting them the area months later would retro-announce it —
 *    exactly what the no-retro-announce rule promises will not happen.
 *
 * `expected` makes it race-safe without a transaction (neon-http has none):
 * the row is only moved if it still holds the value this render read, so a
 * concurrent dismissal or a second render is a no-op rather than a write that
 * could drag the watermark backwards. IS NOT DISTINCT FROM, not `=`, because
 * the expected value is usually NULL and `= NULL` matches nothing.
 *
 * Takes the version as an argument rather than importing the registry: this is
 * a query layer and has no business knowing what shipped.
 */
export async function catchUpReleaseWatermark(
  userId: string,
  expected: string | null,
  version: string,
): Promise<void> {
  await db
    .update(user)
    .set({ releaseSeenVersion: version })
    .where(
      and(
        eq(user.id, userId),
        sql`${user.releaseSeenVersion} IS NOT DISTINCT FROM ${expected}`,
      ),
    );
}

/**
 * Ticket-notification recipients — the DB-backed successor to the retired
 * PRIVILEGED_ADMINS constant (roles live on the user row now). Owner included:
 * triage is a role privilege, so recipients follow the role, not an area.
 */
export async function superadminEmails(): Promise<string[]> {
  const rows = await db
    .select({ email: user.email })
    .from(user)
    .where(inArray(user.role, ['superadmin', 'owner']));
  return rows.map((r) => r.email);
}

/**
 * A person a notification can reach. The ID is what makes a PUSH possible —
 * an email address alone can only ever feed one of the two channels, which is
 * exactly the divergence src/lib/notify.ts exists to prevent.
 */
export type NotifyRecipient = { id: string; email: string };

/** Everyone who can open the task board — the owner plus any account granted
 *  the 'tasks' area. Filtered in JS because the roster is seven people; a
 *  jsonb-containment query would be more SQL for no measurable gain. */
export async function taskAreaRecipients(): Promise<NotifyRecipient[]> {
  const rows = await db
    .select({ id: user.id, email: user.email, role: user.role, areas: user.areas })
    .from(user);
  return rows
    .filter((r) => r.role === 'owner' || sanitizeAreas(r.areas).includes('tasks'))
    .map((r) => ({ id: r.id, email: r.email }));
}

/** Everyone who can open payroll — the owner plus the 'payroll' grant. */
export async function payrollAdminRecipients(): Promise<NotifyRecipient[]> {
  const rows = await db
    .select({ id: user.id, email: user.email, role: user.role, areas: user.areas })
    .from(user);
  return rows
    .filter((r) => r.role === 'owner' || sanitizeAreas(r.areas).includes('payroll'))
    .map((r) => ({ id: r.id, email: r.email }));
}

/** Everyone who can open a submissions inbox — the owner plus the matching
 *  area grant. Used to notify about an arrival, so it is gated on the area the
 *  notification would send them to: telling somebody about an inbox they
 *  cannot open is a dead end, and the deep link would bounce them. */
export async function inboxRecipients(
  kind: 'project' | 'career',
): Promise<NotifyRecipient[]> {
  const area = kind === 'project' ? 'inquiries' : 'applications';
  const rows = await db
    .select({ id: user.id, email: user.email, role: user.role, areas: user.areas })
    .from(user);
  return rows
    .filter((r) => r.role === 'owner' || sanitizeAreas(r.areas).includes(area))
    .map((r) => ({ id: r.id, email: r.email }));
}

/**
 * Who to alert about a NEW ticket — and it needs BOTH halves, because acting on
 * a ticket needs both.
 *
 * Changing a ticket's status is `requireSuperadmin()`, but /admin/tickets is
 * `requireArea('tickets')`. So a superadmin whose tickets chip is unticked can
 * triage in principle and cannot open the page in practice: alerting them
 * sends both an email and a notification to a screen that redirects to
 * Overview. Role AND area is the only combination that can actually act.
 *
 * The owner holds every area implicitly, hence the short-circuit.
 */
export async function ticketTriageRecipients(): Promise<NotifyRecipient[]> {
  const rows = await db
    .select({ id: user.id, email: user.email, role: user.role, areas: user.areas })
    .from(user);
  return rows
    .filter(
      (r) =>
        r.role === 'owner' ||
        (r.role === 'superadmin' && sanitizeAreas(r.areas).includes('tickets')),
    )
    .map((r) => ({ id: r.id, email: r.email }));
}

/** Emails for every account holding the tasks area (only the OWNER holds every
 *  area implicitly — superadmins qualify via their stored grant, so unticking
 *  'tasks' genuinely unsubscribes them) — the weekly digest's recipient list.
 *  Filtered in JS over the whole (tiny) roster via sanitizeAreas, the
 *  listAdminUsers pattern — no jsonb predicate. */
export async function taskAreaEmails(): Promise<string[]> {
  const rows = await db
    .select({ email: user.email, role: user.role, areas: user.areas })
    .from(user);
  return rows
    .filter(
      (r) => r.role === 'owner' || sanitizeAreas(r.areas).includes('tasks'),
    )
    .map((r) => r.email);
}

/** Emails for everyone who can open the payroll admin — the owner plus any
 *  account granted the 'payroll' area (the flagged-payment alert's recipient
 *  list). Same JS-filtered tiny-roster pattern as taskAreaEmails. */
export async function payrollAdminEmails(): Promise<string[]> {
  const rows = await db
    .select({ email: user.email, role: user.role, areas: user.areas })
    .from(user);
  return rows
    .filter(
      (r) => r.role === 'owner' || sanitizeAreas(r.areas).includes('payroll'),
    )
    .map((r) => r.email);
}
