import { and, asc, desc, eq, ilike, inArray, sql, type SQL } from 'drizzle-orm';

import { searchAllTokens } from '@/db/taskPredicates';
import { blogAuthors, blogCategories, blogPosts } from '@/db/schema';
import { blogStatusFilter, type BlogListParams } from '@/lib/blogFilters';

/**
 * The admin posts list's WHERE and ORDER BY, split out of blogAdminQueries.ts
 * for the `src/db/taskPredicates.ts` reason and no other: this is the module
 * `scripts/check-blogs.mts --db` imports to run the REAL clause against a real
 * Postgres, and blogAdminQueries is `server-only`, which throws under plain
 * node. Like schema.ts it carries no guard because it holds no connection — it
 * builds predicates, it cannot run one — and it takes no `db`.
 *
 * SEPARATE FROM src/db/blogPredicates.ts on purpose, even though that file is
 * also guard-free and also holds a predicate. blogPredicates is on the PUBLIC
 * read path (blogQueries -> blogStore -> every marketing route), and
 * `searchAllTokens` lives in taskPredicates, which value-imports
 * `@/lib/taskFields` and through it the ~790 KB `react-icons/lu` barrel. Merging
 * the two would drag that whole graph onto the blog's public server path to buy
 * one shared file. Nothing here is read by a marketing route.
 *
 * Nothing client-side may import this file: it is drizzle, like schema.ts.
 */

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
 * here, unlike the task board's, because the caller's query already makes both
 * joins one-to-one, so no row can be multiplied and `count(*) over ()` stays
 * honest. Any caller of this clause therefore MUST join both tables.
 */
export function adminPostsWhere(
  params: Pick<BlogListParams, 'status' | 'q' | 'author' | 'category'>,
): SQL | undefined {
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
export function adminPostsOrder(sort: BlogListParams['sort']): SQL[] {
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
