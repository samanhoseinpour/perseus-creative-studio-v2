import { and, asc, count, desc, eq, ilike, inArray, sql, type SQL } from 'drizzle-orm';

import type { BlogDb } from '@/db/blogPredicates';
import { searchAllTokens } from '@/db/taskPredicates';
import { blogAuthors, blogCategories, blogPostRevisions, blogPosts } from '@/db/schema';
import type { BlogPostStatus } from '@/lib/blogFields';
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
 *
 * DO NOT ADD `import 'server-only'` HERE. That is the obvious-looking tidy-up,
 * and it would break the thing this file exists for silently: `server-only`
 * maps `default` to a bare throw, so `scripts/check-blogs.mts --db` — which
 * runs under plain node with no `--conditions` flag — would die on import, and
 * the two assertions that prove the real list clause against real rows (the
 * tokenized search reach, and `all` excluding trash in SQL) would go with it.
 * `server-only` belongs on the module that holds the connection, which is
 * blogAdminQueries.ts, and it is already there.
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
  const statuses = blogStatusFilter(params.status);
  const facets = adminPostsFacets(params);
  if (!statuses) return facets;
  const statusClause = inArray(blogPosts.status, statuses);
  return facets ? and(statusClause, facets) : statusClause;
}

/**
 * The same clause with the STATUS half removed: search, author, category.
 *
 * It exists because the tab badges have to answer for the filters. A badge
 * built over the whole corpus reads "Published 38" above three rows the moment
 * anybody searches, which contradicts the list directly underneath it — the
 * reason `countTasksByStatus` takes the board's filters too. So the tabs count
 * through THIS clause and group by status, while the list applies the same
 * clause plus its own tab: same rows, split two ways.
 *
 * Every caller must make the same two joins `adminPostsWhere` requires, and
 * for the same reason: both are `notNull` foreign keys, so an inner join is
 * total and one-to-one and no row can be multiplied or dropped by it.
 */
export function adminPostsFacets(
  params: Pick<BlogListParams, 'q' | 'author' | 'category'>,
): SQL | undefined {
  const clauses: SQL[] = [];
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
 * The tab badges, in ONE grouped query rather than six: a status with no post
 * under the current filters is simply absent from the answer and reads 0.
 *
 * It takes `db` and lives here rather than in the `server-only` query module
 * for the reason `selectPostForPreview` does: this is the statement
 * `scripts/check-blogs.mts --db` runs to prove a filtered badge really is the
 * count of the rows behind it. Asserting a hand-copied twin would be asserting
 * a copy of the code.
 */
export function selectStatusCounts(
  db: BlogDb,
  params: Pick<BlogListParams, 'q' | 'author' | 'category'>,
): Promise<{ status: BlogPostStatus; n: number }[]> {
  return db
    .select({ status: blogPosts.status, n: count() })
    .from(blogPosts)
    .innerJoin(blogCategories, eq(blogCategories.id, blogPosts.categoryId))
    .innerJoin(blogAuthors, eq(blogAuthors.id, blogPosts.authorId))
    .where(adminPostsFacets(params))
    .groupBy(blogPosts.status);
}

/**
 * What a post's revision history says about where its stored `word_count` came
 * from, in one round trip.
 *
 * THE EDITED HALF IS THE IMPORTER'S OWN SKIP RULE, not a second reading of it:
 * scripts/import-blogs.mts refuses to touch a post carrying ANY non-`import`
 * revision anywhere in its history, because that is one the editor has already
 * written to. The same existence test answers the question the editor asks,
 * which is whether the number in `word_count` is still the legacy
 * `countWords(mdx)` over the whole MDX file.
 *
 * THREE READINGS, and every one of them is needed. The revision half alone
 * says the EDITOR has never written a durable version; the count half says the
 * number on the working row is still the one the importer put there.
 *
 *  - `imported`. A post created in the editor has no revisions at all until
 *    its first explicit Save, so "no non-import revision" is true of it too,
 *    and gating on that alone would announce a word-count change on every
 *    brand-new post from 0 to whatever was typed.
 *  - `edited`. The importer's own skip rule.
 *  - `importWordCount` against `workingWordCount`. `saveDraft` writes NO
 *    revision, so the two flags above survive any number of autosaves: without
 *    this third reading a writer could type, get the notice, leave without an
 *    explicit save, come back, type one more word and get the same notice for
 *    a two-word delta between two numbers that are both already the editor's.
 *    An autosave moves `blog_posts.word_count` and leaves the import
 *    revision's alone, so the moment they diverge the count is no longer the
 *    importer's and the notice is spent.
 *
 * `max(...) filter (where reason = 'import')` rather than the NEWEST import
 * revision's count, and the difference only shows on a post the importer wrote
 * twice with a changed body. There the max may be the older, larger figure and
 * the equality fails, so the notice is not shown. That is the safe direction:
 * silence about a change, rather than a toast on a post that never moved.
 *
 * The working count is joined rather than passed in, so this stays ONE round
 * trip that the editor page can fire in parallel with `getAdminPost` instead
 * of waiting for it. Every row of the group belongs to the same post, so `max`
 * over it is exact.
 *
 * A post with no revisions still answers, and that is worth stating because
 * the obvious guess is wrong: there is no GROUP BY here, so this is a scalar
 * aggregate and Postgres returns exactly ONE row whatever the join matched.
 * Over an empty set every column of it is NULL. `isLegacyWordCount` therefore
 * compares against `true` rather than reading the flags as booleans, and
 * tolerates `undefined` for a caller that destructured an empty array rather
 * than because this query can produce one.
 */
export function selectImportProvenance(
  db: BlogDb,
  postId: string,
): Promise<
  {
    imported: boolean | null;
    edited: boolean | null;
    importWordCount: number | null;
    workingWordCount: number | null;
  }[]
> {
  return db
    .select({
      imported: sql<boolean | null>`bool_or(${blogPostRevisions.reason} = 'import')`,
      edited: sql<boolean | null>`bool_or(${blogPostRevisions.reason} <> 'import')`,
      importWordCount: sql<
        number | null
      >`max(${blogPostRevisions.wordCount}) filter (where ${blogPostRevisions.reason} = 'import')`,
      workingWordCount: sql<number | null>`max(${blogPosts.wordCount})`,
    })
    .from(blogPostRevisions)
    .innerJoin(blogPosts, eq(blogPosts.id, blogPostRevisions.postId))
    .where(eq(blogPostRevisions.postId, postId));
}

/**
 * The fold over that row: whether the post's stored `word_count` is still the
 * one the importer wrote.
 *
 * Separate from the query, and guard-free beside it, so `scripts/check-blogs.mts`
 * can pin the decision as well as the SQL. All three readings are load-bearing
 * and each fails in its own direction: without `imported` every brand-new post
 * gets the notice, without `edited` a post the editor has published keeps
 * getting it, and without the count equality it comes back after every reload
 * until somebody presses Save.
 *
 * The count comparison is `===` on two integers, so a null on either side
 * (no import revision, or a row that is not there) answers false without a
 * special case.
 */
export function isLegacyWordCount(
  row:
    | {
        imported: boolean | null;
        edited: boolean | null;
        importWordCount: number | null;
        workingWordCount: number | null;
      }
    | undefined,
): boolean {
  if (row === undefined) return false;
  if (row.imported !== true || row.edited === true) return false;
  return row.importWordCount !== null && row.importWordCount === row.workingWordCount;
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
