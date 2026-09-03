import 'server-only';
import { asc } from 'drizzle-orm';

import { db } from '@/db';
import {
  publishedSlugExists as existsWith,
  selectPublishedPost,
  selectPublishedPosts,
  type PublishedPostRow,
} from '@/db/blogPredicates';
import { blogAuthors, blogCategories, blogPosts } from '@/db/schema';

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
export type { PublishedPostRow };

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
