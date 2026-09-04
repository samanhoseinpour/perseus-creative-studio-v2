import { and, desc, eq, isNotNull, sql, type SQL } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';

import type * as schema from '@/db/schema';
import { blogAuthors, blogCategories, blogPostRevisions, blogPosts } from '@/db/schema';

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

/**
 * The editor's preview read: one post in ANY status, with the working row
 * itself, so a draft can be rendered through the same component production
 * uses. Two differences from `base()`, both load-bearing:
 *
 *  1. NO `publicPostsWhere()`. A preview exists for the states the public
 *     predicate refuses.
 *  2. The category and author join on the WORKING ROW's `category_id` /
 *     `author_id`, never the revision's. The writer just picked them; joining
 *     the revision would show the category the post had at its last save.
 *
 * The revision is joined ONLY when one was asked for, and then it is
 * constrained by `post_id` as well as `id`: a revision belonging to a
 * DIFFERENT post must return NO ROW, so the caller can 404. Falling back to
 * the newest revision would silently render a different document than the URL
 * asked for, which is worse than a missing page. With no id the ON is `false`,
 * so the LEFT JOIN contributes nulls and the caller synthesises a virtual
 * revision from the working row — the DEFAULT, because `createPost` writes no
 * revision and autosave writes none either, so a freshly created draft has
 * zero rows in `blog_post_revisions`.
 */
export function selectPostForPreview(db: BlogDb, postId: string, revisionId?: string) {
  return db
    .select({
      post: blogPosts,
      revision: blogPostRevisions,
      category: blogCategories,
      author: blogAuthors,
    })
    .from(blogPosts)
    .leftJoin(
      blogPostRevisions,
      revisionId
        ? and(eq(blogPostRevisions.postId, blogPosts.id), eq(blogPostRevisions.id, revisionId))
        : sql`false`,
    )
    .innerJoin(blogCategories, eq(blogCategories.id, blogPosts.categoryId))
    .innerJoin(blogAuthors, eq(blogAuthors.id, blogPosts.authorId))
    .where(
      revisionId
        ? and(eq(blogPosts.id, postId), isNotNull(blogPostRevisions.id))
        : eq(blogPosts.id, postId),
    )
    .limit(1);
}

export type PostPreviewRow = Awaited<ReturnType<typeof selectPostForPreview>>[number];

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
