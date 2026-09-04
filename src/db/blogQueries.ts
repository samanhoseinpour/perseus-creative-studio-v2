import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { db } from '@/db';
import {
  publishedSlugExists as existsWith,
  selectPostForPreview,
  selectPublishedPost,
  selectPublishedPosts,
  type PostPreviewRow,
  type PublishedPostRow,
} from '@/db/blogPredicates';
import {
  blogAuthors,
  blogCategories,
  blogEntities,
  blogPostEntities,
  blogPostRelated,
  blogPosts,
  type BlogEntity,
} from '@/db/schema';

/**
 * Raw Drizzle reads for the blog tables, uncached on purpose. Public pages go
 * through the tagged unstable_cache accessors in src/lib/blogStore.ts. The
 * one direct public caller is the vote action's existence check, which must
 * stay uncached so a post published later is never refused for a TTL.
 *
 * fetchPublishedPostRows() carries the revision's actorId/actorName (the whole
 * blog_post_revisions row rides in `revision`); only the store's shaping keeps
 * them off a public page, so a direct consumer must drop them itself.
 */
export type { PostPreviewRow, PublishedPostRow };

export function fetchPublishedPostRows(): Promise<PublishedPostRow[]> {
  return selectPublishedPosts(db);
}

export async function fetchPublishedPostRow(slug: string): Promise<PublishedPostRow | null> {
  const rows = await selectPublishedPost(db, slug);
  return rows[0] ?? null;
}

export function fetchCategories() {
  return db.select().from(blogCategories).orderBy(asc(blogCategories.sortIndex), asc(blogCategories.slug));
}

export function fetchAuthors() {
  return db.select().from(blogAuthors).orderBy(asc(blogAuthors.sortIndex), asc(blogAuthors.slug));
}

export function publishedSlugExists(slug: string): Promise<boolean> {
  return existsWith(db, slug);
}

/** The editor's preview read, in any status. Uncached like everything else
 *  here, and `getDraftPost` in blogStore.ts deliberately keeps it that way. */
export async function fetchPostForPreview(
  postId: string,
  revisionId?: string,
): Promise<PostPreviewRow | null> {
  const rows = await selectPostForPreview(db, postId, revisionId);
  return rows[0] ?? null;
}

// The related list is a self-join, so the target post needs its own alias.
const relatedPost = alias(blogPosts, 'related_post');

/**
 * The WORKING related list as a snapshot stores it: slugs, in `position`
 * order. Read by both the editor and the preview, so the order is defined
 * once.
 *
 * The slug tie-break is load-bearing rather than tidy: `position` defaults to
 * 0 on every row, so without it Postgres may hand back two different orders
 * for one post, and `relatedSlugs` is inside `contentFingerprint` — an
 * unstable order would move `content_modified_at` on saves that changed
 * nothing, republishing a freshness signal the post has not earned.
 */
export async function fetchPostRelatedSlugs(postId: string): Promise<string[]> {
  const rows = await db
    .select({ slug: relatedPost.slug })
    .from(blogPostRelated)
    .innerJoin(relatedPost, eq(relatedPost.id, blogPostRelated.relatedPostId))
    .where(eq(blogPostRelated.postId, postId))
    .orderBy(asc(blogPostRelated.position), asc(relatedPost.slug));
  return rows.map((r) => r.slug);
}

/** The working entity list in `position` order, shaped as the snapshot (and
 *  buildSnapshot) wants it. Same total-order rule as the related list. */
export function fetchPostEntities(postId: string): Promise<BlogEntity[]> {
  return db
    .select({
      name: blogEntities.name,
      sameAs: blogEntities.sameAs,
      primary: blogPostEntities.isPrimary,
    })
    .from(blogPostEntities)
    .innerJoin(blogEntities, eq(blogEntities.id, blogPostEntities.entityId))
    .where(eq(blogPostEntities.postId, postId))
    .orderBy(asc(blogPostEntities.position), asc(blogEntities.name));
}

/** /admin/feedback: every post, any status. */
export function fetchFeedbackPosts() {
  return db
    .select({
      slug: blogPosts.slug,
      title: blogPosts.title,
      status: blogPosts.status,
      publishedAt: blogPosts.publishedAt,
      createdAt: blogPosts.createdAt,
    })
    .from(blogPosts);
}
