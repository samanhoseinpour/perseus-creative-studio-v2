import 'server-only';
import { and, asc, count, desc, eq, ilike, inArray, max, ne, sql } from 'drizzle-orm';

import { db } from '@/db';
import { searchAllTokens } from '@/db/adminQueries';
import { user } from '@/db/auth-schema';
import { adminPostsOrder, adminPostsWhere, selectStatusCounts } from '@/db/blogAdminPredicates';
import { publicPostsWhere } from '@/db/blogPredicates';
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
 * reach a client bundle. Anything scripts/check-blogs.mts --db has to RUN lives
 * in a guard-free neighbour instead: the public SELECT shapes in
 * src/db/blogPredicates.ts, this list's WHERE and ORDER BY in
 * src/db/blogAdminPredicates.ts. What is left here holds its own `db`.
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
  /** The concurrency token the single-post transition doors take. A row menu
   *  is a per-post decision like the editor's, so Trash and Restore go through
   *  `trashPost`/`restorePost` and get the version guard, rather than through
   *  the bulk doors, whose `status <> …` predicate replaces it for a selection
   *  nobody is looking at row by row. */
  version: number;
  /** The whole array, so the list can state how many there are while showing
   *  the primary one. Never re-ordered here: position 0 IS the primary keyword
   *  everywhere else in the editor. */
  focusKeywords: string[];
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
        version: blogPosts.version,
        focusKeywords: blogPosts.focusKeywords,
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

/**
 * The tab badges.
 *
 * It takes the LIST'S FILTERS, minus the status, and that is the whole point:
 * a badge counted over the corpus reads "Published 38" above three rows as
 * soon as anybody searches, and the tab links carry `q`, `author` and
 * `category` across, so that is the ordinary case rather than an edge one. It
 * is `countTasksByStatus`'s rule: badges answer for the same window as the
 * list, or they contradict the rows directly underneath them.
 *
 * The statement itself lives in the guard-free `blogAdminPredicates.ts`, so
 * `scripts/check-blogs.mts --db` runs the real one.
 */
export async function statusCounts(
  params: Pick<BlogListParams, 'q' | 'author' | 'category'>,
): Promise<Record<BlogPostStatus, number>> {
  const rows = await selectStatusCounts(db, params);
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

// ── One taxonomy row, and where a new one goes ──────────────────────────────

/** One author row for the edit door: it needs the STORED slug to refuse a
 *  rename, and the stored public fields to decide whether anything a visitor
 *  reads actually moved. Guarded like `getAdminPost`, so a malformed id is
 *  "not found" rather than a 500 at the uuid cast. */
export async function getBlogAuthor(id: string): Promise<BlogAuthor | null> {
  if (!UUID_RE.test(id)) return null;
  const [row] = await db.select().from(blogAuthors).where(eq(blogAuthors.id, id)).limit(1);
  return row ?? null;
}

/** One category row, same reasons. */
export async function getBlogCategory(id: string): Promise<BlogCategory | null> {
  if (!UUID_RE.test(id)) return null;
  const [row] = await db.select().from(blogCategories).where(eq(blogCategories.id, id)).limit(1);
  return row ?? null;
}

/** The slot after the current last author, so a new one lands at the END of
 *  `/blogs/authors` rather than silently ahead of the organisation row the
 *  importer deliberately put first. The imported rows are consecutive, so a
 *  step of one is enough. */
export async function nextAuthorSort(): Promise<number> {
  const [row] = await db.select({ max: max(blogAuthors.sortIndex) }).from(blogAuthors);
  return Number(row?.max ?? 0) + 1;
}

/** The same for a category, over the hub's chip order. */
export async function nextBlogCategorySort(): Promise<number> {
  const [row] = await db.select({ max: max(blogCategories.sortIndex) }).from(blogCategories);
  return Number(row?.max ?? 0) + 1;
}

/**
 * Whether an account exists to link a public byline to.
 *
 * `blog_authors.user_id` is a real foreign key, so this is not the enforcement
 * (the 23503 is, and it is the race backstop the write door catches): it is
 * what turns "that account is gone" into a sentence in the form instead of a
 * generic server failure. No shape guard, because `user.id` is a Better Auth
 * string rather than a uuid.
 */
export async function bylineUserExists(id: string): Promise<boolean> {
  const rows = await db
    .select({ one: sql<number>`1` })
    .from(user)
    .where(eq(user.id, id))
    .limit(1);
  return rows.length > 0;
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

// ── What a visitor can actually see under a taxonomy row ────────────────────

/**
 * How many posts a VISITOR sees under this author or category. It gates the
 * IndexNow ping for a rename: the hub's chips and cards are built from
 * published posts only (`categoryStats` in blogStore.ts), so renaming a row
 * nothing public sits under moves no byte on `/blogs` and must announce
 * nothing.
 *
 * It measures the way the public path measures, and both halves matter. The
 * status clause is `publicPostsWhere()` rather than an inline
 * `eq(status,'published')`, so there is still exactly one definition of what
 * public means. And the id is compared against the PUBLISHED REVISION's
 * column, never the working row's: `selectPublishedPosts` joins the revision's
 * `author_id` / `category_id`, so a post whose working copy was moved to a new
 * author but never republished still renders under the old one.
 */
function publishedCountBy(column: 'authorId' | 'categoryId', id: string): Promise<number> {
  return db
    .select({ n: count() })
    .from(blogPosts)
    .innerJoin(blogPostRevisions, eq(blogPostRevisions.id, blogPosts.publishedRevisionId))
    .where(and(publicPostsWhere(), eq(blogPostRevisions[column], id)))
    .then((rows) => rows[0]?.n ?? 0);
}

export const publishedPostsForAuthor = (id: string): Promise<number> =>
  publishedCountBy('authorId', id);

export const publishedPostsForCategory = (id: string): Promise<number> =>
  publishedCountBy('categoryId', id);

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
