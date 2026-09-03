import { and, desc, eq, sql, type SQL } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';

import type * as schema from './schema';
import { blogAuthors, blogCategories, blogPostRevisions, blogPosts } from './schema';

/**
 * The public blog predicate, comparator and SELECT shape, split out of
 * blogQueries.ts for one reason: this is the module
 * scripts/check-blog-body.mts --db imports to prove them against a real
 * Postgres, and blogQueries is `server-only`. Like schema.ts it carries no
 * guard because it holds no connection: it takes `db` as a parameter. Nothing
 * client-side may import it.
 */
export type BlogDb = PgDatabase<PgQueryResultHKT, typeof schema>;

/** TIME-INDEPENDENT on purpose: unstable_cache freezes `now` at fill time, so
 *  a past-due arm would never fire on the public path anyway. The step-2 cron
 *  is what flips scheduled → published. */
export const publicPostsWhere = (): SQL => eq(blogPosts.status, 'published');

/**
 * The ONE comparator. `nulls last` is load-bearing: Postgres DESC defaults to
 * NULLS FIRST, which would put every editor-created post ahead of the legacy
 * posts of its day. Ending on `id` gives a total order, so ?page=N can never
 * show a row twice or drop one.
 */
export const publicOrder = (): SQL[] => [
  desc(blogPosts.publishedAt),
  sql`${blogPosts.legacyId} desc nulls last`,
  desc(blogPosts.createdAt),
  desc(blogPosts.id),
];

/** Every rendered field comes from the REVISION; the post row contributes
 *  identity, status and the ordering keys only. */
const selection = {
  id: blogPosts.id,
  slug: blogPosts.slug,
  legacyId: blogPosts.legacyId,
  createdAt: blogPosts.createdAt,
  revision: blogPostRevisions,
  category: blogCategories,
  author: blogAuthors,
};

function base(db: BlogDb) {
  return db
    .select(selection)
    .from(blogPosts)
    .innerJoin(blogPostRevisions, eq(blogPostRevisions.id, blogPosts.publishedRevisionId))
    .innerJoin(blogCategories, eq(blogCategories.id, blogPostRevisions.categoryId))
    .innerJoin(blogAuthors, eq(blogAuthors.id, blogPostRevisions.authorId));
}

export function selectPublishedPosts(db: BlogDb) {
  return base(db).where(publicPostsWhere()).orderBy(...publicOrder());
}

export function selectPublishedPost(db: BlogDb, slug: string) {
  return base(db)
    .where(and(publicPostsWhere(), eq(blogPosts.slug, slug)))
    .limit(1);
}

export type PublishedPostRow = Awaited<ReturnType<typeof selectPublishedPosts>>[number];

/** The vote action's uncached existence check: same cost for a published, a
 *  draft and an unknown slug. */
export async function publishedSlugExists(db: BlogDb, slug: string): Promise<boolean> {
  const rows = await db
    .select({ one: sql<number>`1` })
    .from(blogPosts)
    .where(and(publicPostsWhere(), eq(blogPosts.slug, slug)))
    .limit(1);
  return rows.length > 0;
}
