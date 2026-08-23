import 'server-only';
import { and, asc, count, eq, inArray, max, ne, sql } from 'drizzle-orm';

import { db } from '@/db';
import {
  contactSubmissions,
  jobCategories,
  jobOpenings,
  type JobCategory,
  type JobOpening,
} from '@/db/schema';

/**
 * Raw Drizzle reads for the careers tables (job_categories / job_openings) —
 * uncached on purpose. Public pages never call these directly: they go
 * through the tagged `unstable_cache` accessors in src/lib/careersStore.ts,
 * which shape rows into JSON-safe snapshots and make edits from /admin
 * propagate via updateTag. The /admin/careers page DOES read here directly,
 * so the roster always shows fresh rows including drafts. Writes live in the
 * co-located `_actions/careers.ts` module.
 */

// ── Admin reads ─────────────────────────────────────────────────────────────

export type AdminJobCategoryRow = JobCategory & {
  /** Listings under it (any status) — the delete guard's number. */
  openingCount: number;
};

export async function listAdminCategories(): Promise<AdminJobCategoryRow[]> {
  const rows = await db
    .select({ category: jobCategories, openingCount: count(jobOpenings.id) })
    .from(jobCategories)
    .leftJoin(jobOpenings, eq(jobOpenings.categoryId, jobCategories.id))
    .groupBy(jobCategories.id)
    .orderBy(asc(jobCategories.sortIndex), asc(jobCategories.name));
  return rows.map((r) => ({ ...r.category, openingCount: r.openingCount }));
}

export type AdminJobOpeningRow = JobOpening & {
  categoryName: string;
  /** Applications stored against this slug, ANY status — what a delete orphans. */
  applicationCount: number;
  /** Only the ones the Applications inbox tab shows (new + read) — the
   *  number the roster's link must agree with. */
  inboxApplicationCount: number;
};

/**
 * Every listing with its category and how many applications point at its
 * slug. Two queries rather than a three-way join: the application tally is
 * a GROUP BY over contact_submissions that would otherwise multiply the
 * opening rows, and neon-http round trips are cheap next to a wrong count.
 */
export async function listAdminOpenings(): Promise<AdminJobOpeningRow[]> {
  const [rows, tallies] = await Promise.all([
    db
      .select({
        opening: jobOpenings,
        categoryName: jobCategories.name,
      })
      .from(jobOpenings)
      .innerJoin(jobCategories, eq(jobCategories.id, jobOpenings.categoryId))
      .orderBy(
        asc(jobCategories.sortIndex),
        asc(jobCategories.name),
        asc(jobOpenings.sortIndex),
        asc(jobOpenings.title),
      ),
    applicationTallies(),
  ]);
  return rows.map((r) => ({
    ...r.opening,
    categoryName: r.categoryName,
    applicationCount: tallies.get(r.opening.slug)?.total ?? 0,
    inboxApplicationCount: tallies.get(r.opening.slug)?.inbox ?? 0,
  }));
}

/** The statuses the Applications "Inbox" tab lists (adminQueries' VIEW_STATUSES
 *  for 'inbox') — duplicated here as a literal so this module stays free of
 *  the inbox module; the two must agree. */
const INBOX_STATUSES = ['new', 'read'] as const;

/** role slug → { every status (spam included — a delete orphans those rows
 *  too), inbox-tab only }. One GROUP BY, two counts. */
async function applicationTallies(): Promise<
  Map<string, { total: number; inbox: number }>
> {
  const rows = await db
    .select({
      role: contactSubmissions.role,
      total: count(),
      inbox: count(
        sql`case when ${inArray(contactSubmissions.status, [...INBOX_STATUSES])} then 1 end`,
      ),
    })
    .from(contactSubmissions)
    .where(eq(contactSubmissions.kind, 'career'))
    .groupBy(contactSubmissions.role);
  return new Map(
    rows.flatMap((r) =>
      r.role ? [[r.role, { total: r.total, inbox: r.inbox }] as const] : [],
    ),
  );
}

export async function countApplicationsForRole(slug: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(contactSubmissions)
    .where(
      and(eq(contactSubmissions.kind, 'career'), eq(contactSubmissions.role, slug)),
    );
  return row?.n ?? 0;
}

export async function getOpeningById(id: string): Promise<JobOpening | null> {
  const [row] = await db
    .select()
    .from(jobOpenings)
    .where(eq(jobOpenings.id, id))
    .limit(1);
  return row ?? null;
}

export async function getCategoryById(id: string): Promise<JobCategory | null> {
  const [row] = await db
    .select()
    .from(jobCategories)
    .where(eq(jobCategories.id, id))
    .limit(1);
  return row ?? null;
}

export async function countOpeningsInCategory(categoryId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(jobOpenings)
    .where(eq(jobOpenings.categoryId, categoryId));
  return row?.n ?? 0;
}

/** Non-draft listings under a category — what a visitor could see, so the
 *  number a rename's IndexNow decision keys off (the delete guard above
 *  counts drafts too, on purpose). */
export async function countPublicOpeningsInCategory(
  categoryId: string,
): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(jobOpenings)
    .where(
      and(eq(jobOpenings.categoryId, categoryId), ne(jobOpenings.status, 'draft')),
    );
  return row?.n ?? 0;
}

/** The next free slot after the current last row (steps of 10). */
export async function nextCategorySort(): Promise<number> {
  const [row] = await db
    .select({ max: max(jobCategories.sortIndex) })
    .from(jobCategories);
  return Number(row?.max ?? 0) + 10;
}

export async function nextOpeningSort(categoryId: string): Promise<number> {
  const [row] = await db
    .select({ max: max(jobOpenings.sortIndex) })
    .from(jobOpenings)
    .where(eq(jobOpenings.categoryId, categoryId));
  return Number(row?.max ?? 0) + 10;
}

// ── Public reads (consumed by careersStore.ts only) ─────────────────────────

export type PublicCareersRow = {
  opening: JobOpening;
  categoryName: string;
  categorySlug: string;
  categoryIcon: string;
  categorySort: number;
};

/**
 * Every non-draft listing with its category, in page order: categories by
 * their sort, listings by theirs. The store hoists open listings first and
 * hiring categories above fully-staffed ones.
 */
export async function fetchPublicCareers(): Promise<PublicCareersRow[]> {
  return db
    .select({
      opening: jobOpenings,
      categoryName: jobCategories.name,
      categorySlug: jobCategories.slug,
      categoryIcon: jobCategories.icon,
      categorySort: jobCategories.sortIndex,
    })
    .from(jobOpenings)
    .innerJoin(jobCategories, eq(jobCategories.id, jobOpenings.categoryId))
    .where(ne(jobOpenings.status, 'draft'))
    .orderBy(
      asc(jobCategories.sortIndex),
      asc(jobCategories.name),
      asc(jobOpenings.sortIndex),
      asc(jobOpenings.title),
    );
}

/** slug → title for every listing the catalog has ever had a row for. */
export async function fetchRoleTitles(): Promise<{ slug: string; title: string }[]> {
  // EVERY row, any status: the contact action resolves the title snapshot
  // for whatever slug arrives, and a queued offline replay may carry a role
  // that was filled or drafted between queue time and flush time.
  return db
    .select({ slug: jobOpenings.slug, title: jobOpenings.title })
    .from(jobOpenings);
}

/** Newest public change — the sitemap <lastmod> for /contact/careers. */
export async function fetchLatestPublicCareersChange(): Promise<Date | null> {
  const [row] = await db
    .select({
      at: sql<string | null>`greatest(max(${jobOpenings.updatedAt}), max(${jobCategories.updatedAt}))`,
    })
    .from(jobOpenings)
    .innerJoin(jobCategories, eq(jobCategories.id, jobOpenings.categoryId))
    .where(ne(jobOpenings.status, 'draft'));
  return row?.at ? new Date(row.at) : null;
}
