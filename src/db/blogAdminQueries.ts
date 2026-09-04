import 'server-only';
import { and, asc, count, desc, eq, ilike, inArray, ne, sql, type SQL } from 'drizzle-orm';

import { db } from '@/db';
import { searchAllTokens } from '@/db/adminQueries';
import { fetchPostEntities, fetchPostRelatedSlugs } from '@/db/blogQueries';
import {
  blogAuthors,
  blogCategories,
  blogPostRelated,
  blogPostRevisions,
  blogPosts,
  type BlogAuthor,
  type BlogCategory,
  type BlogEntity,
  type BlogPostRevision,
  type BlogPostRow,
} from '@/db/schema';
import type { BlogPostStatus } from '@/lib/blogFields';
import { blogStatusFilter, type BlogListParams } from '@/lib/blogFilters';

/**
 * Every read /admin/blogs needs: the list, the tab badges, the editor's post,
 * its revision history, the two pickers, the delete-refusal counts, the
 * internal-link search and the slug check.
 *
 * ONE AUDIENCE — anyone holding the `blogs` grant — so unlike payroll there is
 * no own-vs-admin projection split here and no second door to route around.
 * `server-only` for the reason blogQueries.ts carries it: none of this may
 * reach a client bundle. The SELECT shapes the check script proves against a
 * real Postgres live in the guard-free src/db/blogPredicates.ts; what is here
 * is admin-side and holds its own `db`.
 *
 * The public path is untouched: nothing in this file is read by a marketing
 * route, and nothing here calls `unstable_cache`.
 */

// Guard id-by-string reads so a malformed /admin/blogs/[id] URL returns "not
// found" instead of throwing a 500 at the Postgres uuid cast.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const BLOG_POSTS_PER_PAGE = 25;

// ── The list ────────────────────────────────────────────────────────────────

export type AdminPostRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  status: BlogPostStatus;
  wordCount: number;
  robotsIndex: boolean;
  legacyId: number | null;
  publishAt: Date | null;
  publishedAt: Date | null;
  contentModifiedAt: Date | null;
  trashedAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
  hasPublishedRevision: boolean;
  hasPendingRevision: boolean;
  category: { slug: string; title: string };
  author: { slug: string; name: string };
};

export type AdminPostsPage = {
  rows: AdminPostRow[];
  total: number;
  page: number;
  totalPages: number;
};

/**
 * The ONE WHERE clause for the posts list. The status half goes through
 * `blogStatusFilter` and is never spelled inline: "all excludes trash" is a
 * rule that has to exist in exactly one place, or the default tab quietly
 * starts listing the bin.
 *
 * Search is TOKENIZED (`searchAllTokens`, an AND of ORs), never one `%q%`
 * wrap: a contiguous substring cannot skip a word, so "vancouver realtors
 * video" would fail to find "Vancouver Realtors: Video and Social Content",
 * and a term belonging to a different field from its neighbour could never
 * match at all. Neither is a typo.
 *
 * The reach is title, slug and description on the post row plus the author's
 * name and the category's title — and those last two need no EXISTS subquery
 * here, unlike the task board's, because this query already makes both joins
 * one-to-one, so no row can be multiplied and `count(*) over ()` stays honest.
 */
function adminPostsWhere(params: Pick<BlogListParams, 'status' | 'q' | 'author' | 'category'>) {
  const clauses: SQL[] = [];
  const statuses = blogStatusFilter(params.status);
  if (statuses) clauses.push(inArray(blogPosts.status, statuses));
  if (params.q) {
    const q = searchAllTokens(params.q, (like) => [
      ilike(blogPosts.title, like),
      ilike(blogPosts.slug, like),
      ilike(blogPosts.description, like),
      ilike(blogAuthors.name, like),
      ilike(blogCategories.title, like),
    ]);
    if (q) clauses.push(q);
  }
  if (params.author) clauses.push(eq(blogAuthors.slug, params.author));
  if (params.category) clauses.push(eq(blogCategories.slug, params.category));
  return clauses.length ? and(...clauses) : undefined;
}

/**
 * Every branch ends on `blog_posts.id`, so OFFSET paging can never show a row
 * on two pages or drop one. `nulls last` is redundant on an ASC arm (it is
 * Postgres's default) and load-bearing on the DESC one, where the default is
 * NULLS FIRST — without it every draft would sit ahead of every published post
 * on the `published` ordering.
 */
function adminPostsOrder(sort: BlogListParams['sort']) {
  if (sort === 'title') return [asc(blogPosts.title), desc(blogPosts.id)];
  if (sort === 'published') {
    return [
      sql`${blogPosts.publishedAt} desc nulls last`,
      desc(blogPosts.updatedAt),
      desc(blogPosts.id),
    ];
  }
  return [desc(blogPosts.updatedAt), desc(blogPosts.id)];
}

/** One page of the admin list. `page` is clamped to the available range (the
 *  `listSubmissions` pattern: the filtered total rides every row as a window
 *  count, so the common case is one round trip). */
export async function listAdminPosts(
  params: BlogListParams,
  perPage = BLOG_POSTS_PER_PAGE,
): Promise<AdminPostsPage> {
  const where = adminPostsWhere(params);
  const order = adminPostsOrder(params.sort);

  const fetchPage = (p: number) =>
    db
      .select({
        id: blogPosts.id,
        slug: blogPosts.slug,
        title: blogPosts.title,
        description: blogPosts.description,
        status: blogPosts.status,
        wordCount: blogPosts.wordCount,
        robotsIndex: blogPosts.robotsIndex,
        legacyId: blogPosts.legacyId,
        publishAt: blogPosts.publishAt,
        publishedAt: blogPosts.publishedAt,
        contentModifiedAt: blogPosts.contentModifiedAt,
        trashedAt: blogPosts.trashedAt,
        updatedAt: blogPosts.updatedAt,
        createdAt: blogPosts.createdAt,
        // The ids themselves are never useful on a list row; whether a post
        // has one is (a published pointer, a schedule waiting to fire).
        hasPublishedRevision: sql<boolean>`${blogPosts.publishedRevisionId} is not null`,
        hasPendingRevision: sql<boolean>`${blogPosts.pendingRevisionId} is not null`,
        categorySlug: blogCategories.slug,
        categoryTitle: blogCategories.title,
        authorSlug: blogAuthors.slug,
        authorName: blogAuthors.name,
        total: sql<number>`count(*) over ()::int`,
      })
      .from(blogPosts)
      .innerJoin(blogCategories, eq(blogCategories.id, blogPosts.categoryId))
      .innerJoin(blogAuthors, eq(blogAuthors.id, blogPosts.authorId))
      .where(where)
      .orderBy(...order)
      .limit(perPage)
      .offset((p - 1) * perPage);

  // Upper cap BEFORE the first fetch: the offset reaches Postgres pre-clamp,
  // and an absurd ?page= would overflow int8 and 500 the render.
  const requested = Math.min(Math.max(1, Math.trunc(params.page)), 1_000_000);
  let safePage = requested;
  let pageRows = await fetchPage(requested);
  let total = pageRows[0]?.total ?? 0;
  if (pageRows.length === 0 && requested > 1) {
    const [{ n }] = await db
      .select({ n: count() })
      .from(blogPosts)
      .innerJoin(blogCategories, eq(blogCategories.id, blogPosts.categoryId))
      .innerJoin(blogAuthors, eq(blogAuthors.id, blogPosts.authorId))
      .where(where);
    total = n;
    safePage = Math.min(requested, Math.max(1, Math.ceil(n / perPage)));
    if (safePage !== requested) pageRows = await fetchPage(safePage);
  }

  const rows: AdminPostRow[] = pageRows.map(
    ({ total, categorySlug, categoryTitle, authorSlug, authorName, ...row }) => {
      void total; // the window count is not a row field
      return {
        ...row,
        category: { slug: categorySlug, title: categoryTitle },
        author: { slug: authorSlug, name: authorName },
      };
    },
  );
  return { rows, total, page: safePage, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

/** One row per status for the tab badges, in ONE query rather than five: a
 *  status with no posts is simply absent from the answer and reads 0. */
export async function statusCounts(): Promise<Record<BlogPostStatus, number>> {
  const rows = await db
    .select({ status: blogPosts.status, n: count() })
    .from(blogPosts)
    .groupBy(blogPosts.status);
  const counts: Record<BlogPostStatus, number> = {
    draft: 0,
    scheduled: 0,
    published: 0,
    archived: 0,
    trash: 0,
  };
  for (const row of rows) counts[row.status] = row.n;
  return counts;
}

// ── The editor ──────────────────────────────────────────────────────────────

export type AdminPost = {
  post: BlogPostRow;
  category: BlogCategory;
  author: BlogAuthor;
  relatedSlugs: string[];
  entities: BlogEntity[];
};

/**
 * The WORKING row and everything the editor edits beside it. The related list
 * and the entities are the admin-side tables (`blog_post_related` /
 * `blog_post_entities`), read through the same two doors the preview uses, so
 * their `position` order is defined once.
 */
export async function getAdminPost(id: string): Promise<AdminPost | null> {
  if (!UUID_RE.test(id)) return null;
  const [rows, relatedSlugs, entities] = await Promise.all([
    db
      .select({ post: blogPosts, category: blogCategories, author: blogAuthors })
      .from(blogPosts)
      .innerJoin(blogCategories, eq(blogCategories.id, blogPosts.categoryId))
      .innerJoin(blogAuthors, eq(blogAuthors.id, blogPosts.authorId))
      .where(eq(blogPosts.id, id))
      .limit(1),
    fetchPostRelatedSlugs(id),
    fetchPostEntities(id),
  ]);
  const row = rows[0];
  return row ? { ...row, relatedSlugs, entities } : null;
}

export type AdminRevisionRow = {
  id: string;
  number: number;
  reason: BlogPostRevision['reason'];
  title: string;
  wordCount: number;
  actorName: string | null;
  createdAt: Date;
  isPublished: boolean;
  isPending: boolean;
};

/**
 * A post's revision history, newest first. The two flags come from the POST's
 * own pointers, joined here rather than fetched separately, and are coalesced
 * because `null = <id>` is NULL rather than false — an uncoalesced comparison
 * would hand every row on a never-published post a null where the UI expects a
 * boolean.
 *
 * The snapshot column is deliberately not selected: it is the whole document,
 * and a history list needs none of it.
 */
export async function listRevisions(postId: string): Promise<AdminRevisionRow[]> {
  if (!UUID_RE.test(postId)) return [];
  return db
    .select({
      id: blogPostRevisions.id,
      number: blogPostRevisions.number,
      reason: blogPostRevisions.reason,
      title: blogPostRevisions.title,
      wordCount: blogPostRevisions.wordCount,
      actorName: blogPostRevisions.actorName,
      createdAt: blogPostRevisions.createdAt,
      isPublished: sql<boolean>`coalesce(${blogPosts.publishedRevisionId} = ${blogPostRevisions.id}, false)`,
      isPending: sql<boolean>`coalesce(${blogPosts.pendingRevisionId} = ${blogPostRevisions.id}, false)`,
    })
    .from(blogPostRevisions)
    .innerJoin(blogPosts, eq(blogPosts.id, blogPostRevisions.postId))
    .where(eq(blogPostRevisions.postId, postId))
    .orderBy(desc(blogPostRevisions.number));
}

/**
 * The revision the PUBLIC is currently rendering, for each of these posts.
 *
 * The transition doors need it for two things a working row cannot answer:
 * whether the article itself changed (`contentChanged` compares against the
 * previously published snapshot, never against the working copy) and what the
 * previous public fingerprint was, which is what gates the IndexNow ping.
 *
 * Keyed by POST id rather than revision id, batched so the bulk doors cost one
 * round trip rather than one per row, and joined through
 * `published_revision_id` so a post that has never been published is simply
 * absent from the answer.
 */
export async function publishedRevisionsFor(
  ids: string[],
): Promise<Map<string, BlogPostRevision>> {
  const wanted = ids.filter((id) => UUID_RE.test(id));
  if (wanted.length === 0) return new Map();
  const rows = await db
    .select({ postId: blogPosts.id, revision: blogPostRevisions })
    .from(blogPosts)
    .innerJoin(blogPostRevisions, eq(blogPostRevisions.id, blogPosts.publishedRevisionId))
    .where(inArray(blogPosts.id, wanted));
  return new Map(rows.map((row) => [row.postId, row.revision]));
}

/** Just enough of a post to describe it, decide where a restore lands, and
 *  build an invalidation ref. What the two BULK doors read, in one round trip
 *  rather than one `getAdminPost` per selected row. */
export type PostIdentity = {
  id: string;
  slug: string;
  title: string;
  status: BlogPostStatus;
  /** History, for `restoreTarget`: was this ever live? */
  publishedAt: Date | null;
  categorySlug: string;
  authorSlug: string;
};

export async function postIdentitiesFor(ids: string[]): Promise<PostIdentity[]> {
  const wanted = ids.filter((id) => UUID_RE.test(id));
  if (wanted.length === 0) return [];
  return db
    .select({
      id: blogPosts.id,
      slug: blogPosts.slug,
      title: blogPosts.title,
      status: blogPosts.status,
      publishedAt: blogPosts.publishedAt,
      categorySlug: blogCategories.slug,
      authorSlug: blogAuthors.slug,
    })
    .from(blogPosts)
    .innerJoin(blogCategories, eq(blogCategories.id, blogPosts.categoryId))
    .innerJoin(blogAuthors, eq(blogAuthors.id, blogPosts.authorId))
    .where(inArray(blogPosts.id, wanted));
}

/**
 * One revision, scoped by BOTH ids.
 *
 * The `post_id` half is the security half rather than a convenience:
 * `restoreRevision` copies whatever comes back into the working columns, so a
 * revision id belonging to a DIFFERENT post must return nothing at all. It is
 * the same rule `selectPostForPreview` states for the preview join, and
 * falling back to the newest revision would quietly restore a different
 * article than the writer picked.
 */
export async function getRevisionForPost(
  postId: string,
  revisionId: string,
): Promise<BlogPostRevision | null> {
  if (!UUID_RE.test(postId) || !UUID_RE.test(revisionId)) return null;
  const rows = await db
    .select()
    .from(blogPostRevisions)
    .where(and(eq(blogPostRevisions.id, revisionId), eq(blogPostRevisions.postId, postId)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * The slugs of posts whose working related list names this one.
 *
 * Read BEFORE a purge, because the cascade cleans `blog_post_related` and
 * nothing else: another post's PUBLISHED snapshot carries its related slugs
 * inline, so this is the only way to know whose cache entry mentioned the post
 * that is about to stop existing.
 */
export async function relatedReferrerSlugs(postId: string): Promise<string[]> {
  if (!UUID_RE.test(postId)) return [];
  const rows = await db
    .select({ slug: blogPosts.slug })
    .from(blogPostRelated)
    .innerJoin(blogPosts, eq(blogPosts.id, blogPostRelated.postId))
    .where(eq(blogPostRelated.relatedPostId, postId));
  return rows.map((row) => row.slug);
}

// ── Pickers ─────────────────────────────────────────────────────────────────

/** Every author, in the order the public author pages use, so the picker and
 *  the site agree about which one comes first. */
export function listAuthorsAdmin(): Promise<BlogAuthor[]> {
  return db.select().from(blogAuthors).orderBy(asc(blogAuthors.sortIndex), asc(blogAuthors.slug));
}

/** Every category, same ordering rule as the authors. */
export function listCategoriesAdmin(): Promise<BlogCategory[]> {
  return db
    .select()
    .from(blogCategories)
    .orderBy(asc(blogCategories.sortIndex), asc(blogCategories.slug));
}

// ── Delete refusals ─────────────────────────────────────────────────────────

/** What still references an author or a category, counted per TABLE. */
export type BlogUsage = { posts: number; revisions: number };

/**
 * BOTH tables carry an `author_id` with `ON DELETE RESTRICT`, so counting only
 * the working rows would let a DELETE through to Postgres on an author whose
 * every post has been reassigned but whose REVISIONS still name them — where
 * it surfaces as a raw 23503 instead of the readable refusal the member is
 * owed. Same for categories below.
 *
 * The two numbers are returned SEPARATELY rather than added, because the sum
 * is not a sentence anybody can write: an author with one post and twelve
 * earlier versions of it would be refused with "13 posts", which is wrong and
 * reads as a bug. The refusal copy names the history for what it is, so it
 * needs the halves.
 *
 * No uuid guard: the callers read the row first, so the id is already known to
 * exist, and returning 0 for a malformed one would read as "safe to delete".
 */
export async function countPostsForAuthor(id: string): Promise<BlogUsage> {
  const [posts, revisions] = await Promise.all([
    db.select({ n: count() }).from(blogPosts).where(eq(blogPosts.authorId, id)),
    db.select({ n: count() }).from(blogPostRevisions).where(eq(blogPostRevisions.authorId, id)),
  ]);
  return { posts: posts[0]?.n ?? 0, revisions: revisions[0]?.n ?? 0 };
}

export async function countPostsForCategory(id: string): Promise<BlogUsage> {
  const [posts, revisions] = await Promise.all([
    db.select({ n: count() }).from(blogPosts).where(eq(blogPosts.categoryId, id)),
    db.select({ n: count() }).from(blogPostRevisions).where(eq(blogPostRevisions.categoryId, id)),
  ]);
  return { posts: posts[0]?.n ?? 0, revisions: revisions[0]?.n ?? 0 };
}

// ── Internal links and slugs ────────────────────────────────────────────────

export type LinkTarget = { slug: string; title: string; status: BlogPostStatus };

const LINK_TARGET_LIMIT = 20;

/**
 * The editor's internal-link picker. UNPUBLISHED posts are included on
 * purpose — a writer links to a post they are about to publish — and the
 * status rides back so the dialog can mark them and so the publish door can
 * warn about a link whose target is not live yet.
 *
 * Trash is the one state left out, and it goes through `blogStatusFilter`
 * rather than an inline `ne(status, 'trash')` so the rule stays in one place:
 * a binned post's URL 404s, and offering it would build a broken link that
 * nothing later would flag.
 */
export function searchLinkTargets(q: string, limit = LINK_TARGET_LIMIT): Promise<LinkTarget[]> {
  const statuses = blogStatusFilter('all');
  // An empty query WIDENS to the most recent posts rather than collapsing to
  // a pattern matching nothing (searchAllTokens returns undefined), which is
  // what makes the picker useful before anyone has typed.
  const match = searchAllTokens(q, (like) => [
    ilike(blogPosts.title, like),
    ilike(blogPosts.slug, like),
  ]);
  return db
    .select({ slug: blogPosts.slug, title: blogPosts.title, status: blogPosts.status })
    .from(blogPosts)
    .where(statuses ? and(inArray(blogPosts.status, statuses), match) : match)
    .orderBy(sql`${blogPosts.publishedAt} desc nulls last`, desc(blogPosts.updatedAt))
    .limit(limit);
}

/**
 * Whether the slug is already spoken for. `exceptId` is the post being saved,
 * so a post keeps its own slug; without it the check is for a brand-new post.
 * Reads `blog_posts.slug`, the UNIQUE indexed column that IS the public URL,
 * never a revision's typed copy.
 */
export async function slugTaken(slug: string, exceptId?: string): Promise<boolean> {
  const rows = await db
    .select({ one: sql<number>`1` })
    .from(blogPosts)
    .where(exceptId ? and(eq(blogPosts.slug, slug), ne(blogPosts.id, exceptId)) : eq(blogPosts.slug, slug))
    .limit(1);
  return rows.length > 0;
}
