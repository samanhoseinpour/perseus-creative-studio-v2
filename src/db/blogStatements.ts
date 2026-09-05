import { and, eq, inArray, isNotNull, lte, ne, sql, type SQL } from 'drizzle-orm';

import {
  blogEntities,
  blogPostEntities,
  blogPostRelated,
  blogPostRevisions,
  blogPosts,
  type BlogEntity,
  type BlogPostRow,
  type BlogRevisionSnapshot,
  type NewBlogPostRow,
} from '@/db/schema';
import type { BlogDb } from '@/db/blogPredicates';

/**
 * Every WRITE the blog editor makes, as a function of a passed-in drizzle
 * instance. Guard-free on purpose — the src/db/monitoringStatements.ts and
 * src/db/taskPredicates.ts precedent: no `server-only`, no `@/db` import, no
 * session, no `requireArea`. It takes `db` as its first parameter so
 * `scripts/check-blogs.mts --db` (task 12) can run the REAL statements through
 * its own connection. A check script cannot import a `'use server'` module (it
 * would need a session), so without this split the only thing that script could
 * prove is a hand-copied SQL twin of the doors — a check that asserts a copy of
 * the code, which is exactly the vacuous check this repo deletes. Nothing
 * client-side may import this file; the `server-only` binding to the app's own
 * `db` lives in the actions that call these.
 *
 * TWO RULES BIND EVERY STATEMENT HERE, and both are silent when broken.
 *
 *  1. THE VERSION GUARD IS THE CONCURRENCY CONTROL. neon-http has no
 *     transactions, so `updateWorkingCopy` ends `where id = :id and version =
 *     :version` and sets `version = version + 1`. It returns the new version,
 *     or null when the UPDATE matched nothing, so a caller can tell "somebody
 *     else saved first" from "worked". Zero rows is never an error to swallow:
 *     swallowing it reports a save that did not happen, and the editor then
 *     keeps autosaving a version that no longer exists.
 *
 *  2. `custom_schema` IS NAMED BY NO `.set()` IN THIS FILE. It is a step-4
 *     field with no editor behind it yet, and the way it survives every save is
 *     that no write ever mentions it. `BlogWorkingUpdate` below names it once,
 *     to REMOVE it from the settable set, so a caller cannot pass it even by
 *     accident. Do not add it "so the shape is complete", and never build a
 *     `.set()` by spreading a whole parsed object: a key that is present and
 *     `undefined` is dropped by drizzle, but a key that is present and `null`
 *     writes a null over somebody's hand-written JSON-LD with nothing on any
 *     screen to say so.
 */

/** The canonical empty Tiptap document. `blog_posts.body` is NOT NULL, so a
 *  brand-new draft needs one, and this is the exact shape `validateBlogBody`
 *  canonicalises to — a later save of an untouched draft is a no-op rather
 *  than a rewrite. */
export const EMPTY_BLOG_DOC = { type: 'doc' as const, content: [{ type: 'paragraph' }] };

/* -------------------------------------------------------------------------- */
/* The working row                                                            */
/* -------------------------------------------------------------------------- */

/**
 * What a brand-new draft row carries. Every NOT NULL column with no default,
 * and nothing else: a draft is a half-written post by definition, so the
 * strings start empty and the writer fills them in.
 */
export type NewDraftPost = {
  slug: string;
  categoryId: string;
  authorId: string;
};

/**
 * Insert a draft, tolerating a slug collision.
 *
 * `newDraftSlug()` is eight hex characters behind a UNIQUE index, so a
 * collision is vanishingly rare and completely survivable — but a raw 23505 on
 * a "New post" button is not an acceptable failure mode, so this returns null
 * instead of throwing and the caller re-rolls once. `onConflictDoNothing` with
 * no target covers the slug index (the only one an all-defaults insert can hit).
 */
export async function insertDraftPost(
  db: BlogDb,
  values: NewDraftPost,
): Promise<{ id: string; version: number } | null> {
  const rows = await db
    .insert(blogPosts)
    .values({
      slug: values.slug,
      categoryId: values.categoryId,
      authorId: values.authorId,
      title: '',
      description: '',
      heroAlt: '',
      body: EMPTY_BLOG_DOC,
      bodyText: '',
      wordCount: 0,
      seoTitle: '',
      seoDescription: '',
      ogTitle: '',
      ogDescription: '',
    })
    .onConflictDoNothing()
    .returning({ id: blogPosts.id, version: blogPosts.version });
  return rows[0] ?? null;
}

/**
 * Every column a write door may set on the ARTICLE, and nothing else.
 *
 * `customSchema` is named here exactly once, in the `Omit`, which is the only
 * safe place to name it: it removes the key from the settable set, so passing
 * it is a type error rather than a silent overwrite. `id`, `version`,
 * `createdAt` and `updatedAt` are excluded for the ordinary reasons — the first
 * three are never edited, and `updatedAt` is stamped by the statements below so
 * no caller can forget it or disagree about the clock.
 *
 * THE SEVEN PUBLICATION COLUMNS ARE EXCLUDED TOO, and that is the structural
 * half of the "separate doors" rule (`patchTask`'s, applied here): a save, an
 * autosave and a revision restore CANNOT reach a status, an editorial date or
 * either revision pointer, because the keys do not exist on the type. It also
 * makes this set disjoint from `BlogTransitionUpdate` below, which is what lets
 * a publish merge the two into ONE `.set()` without either half being able to
 * write the other's columns.
 */
export type BlogWorkingUpdate = Partial<
  Omit<NewBlogPostRow,
    | 'id'
    | 'customSchema'
    | 'version'
    | 'createdAt'
    | 'updatedAt'
    | 'status'
    | 'publishAt'
    | 'publishedAt'
    | 'contentModifiedAt'
    | 'trashedAt'
    | 'publishedRevisionId'
    | 'pendingRevisionId'
  >
>;

/**
 * The version-guarded UPDATE. Returns the NEW version, or null when the row's
 * version had already moved on (somebody else saved first, or this is a stale
 * editor tab replaying an old autosave).
 *
 * `version + 1` is computed in SQL rather than passed in, so two writers racing
 * can never both claim the same next number: whoever loses the `where` clause
 * matches nothing and is told so.
 */
export async function updateWorkingCopy(
  db: BlogDb,
  id: string,
  version: number,
  columns: BlogWorkingUpdate,
): Promise<number | null> {
  const rows = await db
    .update(blogPosts)
    .set({
      ...columns,
      version: sql`${blogPosts.version} + 1`,
      updatedAt: new Date(),
    })
    .where(and(eq(blogPosts.id, id), eq(blogPosts.version, version)))
    .returning({ version: blogPosts.version });
  return rows[0]?.version ?? null;
}

/* -------------------------------------------------------------------------- */
/* Revisions                                                                  */
/* -------------------------------------------------------------------------- */

export type NewRevision = {
  postId: string;
  reason: 'save' | 'publish' | 'schedule' | 'unpublish' | 'restore';
  slug: string;
  title: string;
  categoryId: string;
  authorId: string;
  publishedAt: Date | null;
  contentModifiedAt: Date | null;
  robotsIndex: boolean;
  llmsInclude: boolean;
  wordCount: number;
  snapshot: BlogRevisionSnapshot;
  actorId: string | null;
  actorName: string;
};

/**
 * Insert the next revision for a post.
 *
 * The number is an INLINE subquery, never a read-then-insert: a double-clicked
 * Save would read the same `max(number)` twice and the second insert would be
 * refused by the `(post_id, number)` UNIQUE index, losing a revision the writer
 * asked for. Computed in the statement, the two racers read the same snapshot
 * only if they are genuinely concurrent, and then the UNIQUE index refuses one
 * of them with a 23505 the CALLER retries once. That retry is the whole reason
 * the number is not passed in.
 */
export async function insertRevision(
  db: BlogDb,
  values: NewRevision,
): Promise<{ id: string; number: number }> {
  const rows = await db
    .insert(blogPostRevisions)
    .values({
      ...values,
      number: sql<number>`(select coalesce(max(${blogPostRevisions.number}), 0) + 1 from ${blogPostRevisions} where ${blogPostRevisions.postId} = ${values.postId})`,
    })
    .returning({ id: blogPostRevisions.id, number: blogPostRevisions.number });
  return rows[0];
}

/**
 * Remove a revision, by id.
 *
 * This exists for exactly one caller: the lost-race path of an explicit Save.
 * Without transactions the revision lands before the version-guarded UPDATE
 * runs, so a save that loses the race would otherwise leave a row in the
 * history describing a save that never happened, which the revisions screen
 * renders as fact and a restore would replay.
 */
export async function deleteRevision(db: BlogDb, id: string): Promise<void> {
  await db.delete(blogPostRevisions).where(eq(blogPostRevisions.id, id));
}

/* -------------------------------------------------------------------------- */
/* Relations                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Replace a post's working related list, in the writer's order.
 *
 * A slug naming no post is SKIPPED rather than refused, the importer's rule:
 * the snapshot still carries what the writer typed, and a related post that
 * lands later resolves on the next save. A post cannot be related to itself —
 * the composite PK permits the row, and it would render the article in its own
 * "related" strip.
 *
 * Deduped before the insert: `relatedSlugs` is an ordered list with no
 * uniqueness rule on it, and two copies of one slug are two rows against one
 * composite primary key.
 */
export async function replaceRelated(
  db: BlogDb,
  postId: string,
  slugs: readonly string[],
): Promise<void> {
  await db.delete(blogPostRelated).where(eq(blogPostRelated.postId, postId));
  const wanted = [...new Set(slugs)];
  if (wanted.length === 0) return;

  const rows = await db
    .select({ id: blogPosts.id, slug: blogPosts.slug })
    .from(blogPosts)
    .where(inArray(blogPosts.slug, wanted));
  const idBySlug = new Map(rows.map((r) => [r.slug, r.id]));

  const values: { postId: string; relatedPostId: string; position: number }[] = [];
  for (const slug of wanted) {
    const relatedPostId = idBySlug.get(slug);
    if (relatedPostId === undefined || relatedPostId === postId) continue;
    values.push({ postId, relatedPostId, position: values.length });
  }
  if (values.length === 0) return;
  await db.insert(blogPostRelated).values(values).onConflictDoNothing();
}

/**
 * Replace a post's working entity list, in the writer's order.
 *
 * `blog_entities` is a shared vocabulary keyed by name, so an entity is
 * upserted rather than inserted and its `sameAs` list follows the newest edit —
 * the importer's contract, unchanged. Only the LINK rows belong to this post,
 * so only they are cleared first; an entity another post still names survives.
 */
export async function replaceEntities(
  db: BlogDb,
  postId: string,
  entities: readonly BlogEntity[],
): Promise<void> {
  await db.delete(blogPostEntities).where(eq(blogPostEntities.postId, postId));

  const seen = new Set<string>();
  const wanted: BlogEntity[] = [];
  for (const entity of entities) {
    if (seen.has(entity.name)) continue;
    seen.add(entity.name);
    wanted.push(entity);
  }
  if (wanted.length === 0) return;

  // ONE statement for the whole vocabulary, never one per entity, and the
  // reason is correctness before speed: the DELETE above has already run, so a
  // throw part-way through a loop of up to thirty sequential neon-http calls
  // would leave the post with NO entity links at all, the batched link insert
  // never reached. `excluded.same_as` is the row Postgres was about to insert,
  // which is what lets one statement carry thirty different values into the
  // SET. DO UPDATE rather than DO NOTHING because only DO UPDATE returns the
  // rows that conflicted, and their ids are what the links are built from. The
  // dedupe above is what keeps this legal: naming one row twice in a single
  // statement is "ON CONFLICT DO UPDATE command cannot affect row a second
  // time".
  const rows = await db
    .insert(blogEntities)
    .values(wanted.map((entity) => ({ name: entity.name, sameAs: entity.sameAs })))
    .onConflictDoUpdate({
      target: blogEntities.name,
      set: { sameAs: sql`excluded.same_as` },
    })
    .returning({ id: blogEntities.id, name: blogEntities.name });
  const idByName = new Map(rows.map((row) => [row.name, row.id]));

  const links: { postId: string; entityId: string; isPrimary: boolean; position: number }[] = [];
  for (const entity of wanted) {
    const entityId = idByName.get(entity.name);
    if (entityId === undefined) continue;
    links.push({ postId, entityId, isPrimary: entity.primary, position: links.length });
  }
  if (links.length === 0) return;
  await db.insert(blogPostEntities).values(links).onConflictDoNothing();
}

/* -------------------------------------------------------------------------- */
/* Transitions                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Every column a publication TRANSITION may move, and nothing else.
 *
 * A SECOND settable type beside `BlogWorkingUpdate` rather than a widening of
 * it, and the split is the "separate doors" rule tasks and payroll both
 * follow: a save door cannot reach a pointer or an editorial date, and a
 * transition door cannot reach a word of the article. `custom_schema` is
 * absent from both, so rule 2 at the top of this file still holds — no
 * `.set()` in this file names it.
 *
 * `publishedAt` additionally admits an `SQL` because the publish stamp is a
 * `coalesce` computed in the database rather than a value chosen in JS. See
 * `publishPostRow`.
 */
type BlogTransitionUpdate = {
  status?: BlogPostRow['status'];
  publishAt?: Date | null;
  publishedAt?: Date | SQL;
  contentModifiedAt?: Date;
  trashedAt?: Date | null;
  publishedRevisionId?: string;
  pendingRevisionId?: string | null;
};

/**
 * The version-guarded UPDATE every single-post transition rides. Same
 * concurrency contract as `updateWorkingCopy`: the new version, or null when
 * somebody else moved the row first.
 *
 * ONE STATEMENT PER TRANSITION IS NOT A STYLE PREFERENCE. Migration 0045's
 * three CHECK constraints are about COMBINATIONS of these columns —
 * `blog_posts_trash_stamp` is an EQUIVALENCE between `status = 'trash'` and a
 * non-null `trashed_at`, and `blog_posts_schedule_stamp` requires a scheduled
 * row to hold BOTH halves of its schedule. neon-http has no transactions, so a
 * transition split across two statements would offer the database a half-built
 * row in between and be refused outright. Each exported wrapper below therefore
 * names every column its own move touches, in one `.set()`.
 *
 * `also` is an extra predicate for a move that has a SOURCE STATUS as well as a
 * target. The version guard already refuses a row somebody else moved, so this
 * is a second lock rather than the only one, and the readable refusal still
 * belongs in the door: a caller meeting this gets `null`, which reads as a
 * conflict, and "somebody else got there first" is not the sentence a member
 * needs when the post was never in the bin to begin with.
 */
async function guardedTransition(
  db: BlogDb,
  id: string,
  version: number,
  columns: BlogTransitionUpdate & BlogWorkingUpdate,
  also?: SQL,
): Promise<number | null> {
  const rows = await db
    .update(blogPosts)
    .set({ ...columns, version: sql`${blogPosts.version} + 1`, updatedAt: new Date() })
    .where(and(eq(blogPosts.id, id), eq(blogPosts.version, version), also))
    .returning({ version: blogPosts.version });
  return rows[0]?.version ?? null;
}

/**
 * Go live: the pointer moves to the new revision and the schedule, if any, is
 * cleared in the same breath.
 *
 * `published_at` IS COALESCED, NEVER OVERWRITTEN. That is what makes archived
 * back to published keep the date the article actually went out on instead of
 * re-dating a two-year-old post to today, and it is why the caller passes the
 * instant it already resolved (`row.published_at ?? now`) rather than a bare
 * `now`: the read that resolved it is a round trip old, and the coalesce is
 * what makes this statement right on its own terms even if another writer
 * published in between. `amendPublishedAtRow` below is the ONE exception, and
 * says so.
 *
 * `contentModifiedAt` is passed only when the article itself changed
 * (`contentChanged` in blogFields.ts). Omitted, the column keeps its value, so
 * an SEO-only republish moves the pointer without claiming a freshness the
 * page does not have — on the visible "Updated" byline, JSON-LD dateModified
 * and every sitemap lastmod at once.
 *
 * `columns` is the article the writer is publishing, merged into the SAME
 * statement: a publish is a save and a transition at once, and splitting it in
 * two would bump the version twice and leave a window in which the new text is
 * live under the old status. The two settable types are disjoint, so neither
 * half can reach the other's columns.
 */
export function publishPostRow(
  db: BlogDb,
  id: string,
  version: number,
  values: {
    revisionId: string;
    publishedAt: Date;
    contentModifiedAt?: Date;
    columns: BlogWorkingUpdate;
  },
): Promise<number | null> {
  return guardedTransition(db, id, version, {
    ...values.columns,
    status: 'published',
    publishedRevisionId: values.revisionId,
    publishedAt: sql`coalesce(${blogPosts.publishedAt}, ${values.publishedAt})`,
    ...(values.contentModifiedAt ? { contentModifiedAt: values.contentModifiedAt } : {}),
    publishAt: null,
    pendingRevisionId: null,
  });
}

/**
 * Set or move a schedule. Both halves plus the status in one statement, or
 * `blog_posts_schedule_stamp` refuses the row.
 *
 * `published_at` is deliberately NOT set: a scheduled post has not been
 * published, and stamping it would lock the slug and send a later restore from
 * trash to Archived instead of Draft. The cron is what stamps it, from
 * `publish_at`.
 *
 * `columns` rides along for `publishPostRow`'s reason, and here it is also
 * what makes re-scheduling meaningful: the pending revision is rebuilt from
 * the edits made since, so what goes live is what the writer last saw.
 */
export function schedulePostRow(
  db: BlogDb,
  id: string,
  version: number,
  values: { revisionId: string; publishAt: Date; columns: BlogWorkingUpdate },
): Promise<number | null> {
  return guardedTransition(db, id, version, {
    ...values.columns,
    status: 'scheduled',
    publishAt: values.publishAt,
    pendingRevisionId: values.revisionId,
  });
}

/**
 * Call the schedule off. The pointer is cleared in the SAME statement that
 * leaves `scheduled`, which is the rule any path that drops a pending revision
 * has to follow: `pending_revision_id` is `ON DELETE SET NULL`, so nulling it
 * under a row that is still `scheduled` violates `blog_posts_schedule_stamp`
 * and surfaces as a raw 23514.
 */
export function unschedulePostRow(
  db: BlogDb,
  id: string,
  version: number,
): Promise<number | null> {
  return guardedTransition(db, id, version, {
    status: 'draft',
    publishAt: null,
    pendingRevisionId: null,
  });
}

/**
 * Take a live post down. ONLY the status moves: `published_revision_id` and
 * `published_at` are KEPT, which is what makes Archived mean "was live, is not
 * now" and lets a later republish preserve the original date. A published row
 * carries no schedule to clear (publishPostRow nulled both halves, and
 * `blog_posts_pending_only_scheduled` forbids a pending pointer here).
 */
export function unpublishPostRow(
  db: BlogDb,
  id: string,
  version: number,
): Promise<number | null> {
  return guardedTransition(db, id, version, { status: 'archived' });
}

/**
 * Amend when a published post says it went out. THE ONE PLACE `published_at`
 * is written directly rather than coalesced: the whole act is replacing the
 * date, so a coalesce would make the control silently do nothing.
 *
 * The pointer moves to the new revision because the public date is read off
 * the REVISION while `publicOrder` sorts on `blog_posts.published_at`. Writing
 * one without the other gives a post dated in one place and sorted in another.
 */
export function amendPublishedAtRow(
  db: BlogDb,
  id: string,
  version: number,
  values: { revisionId: string; publishedAt: Date },
): Promise<number | null> {
  return guardedTransition(db, id, version, {
    publishedRevisionId: values.revisionId,
    publishedAt: values.publishedAt,
  });
}

/**
 * Bin one post. All four columns together, and each one for its own reason:
 * `blog_posts_trash_stamp` is an equivalence and refuses a partial write, and
 * a live `publish_at` left on a binned row is a schedule nothing will ever
 * fire while the list still reads "Scheduled for".
 */
export function trashPostRow(
  db: BlogDb,
  id: string,
  version: number,
  at: Date,
): Promise<number | null> {
  return guardedTransition(db, id, version, {
    status: 'trash',
    trashedAt: at,
    publishAt: null,
    pendingRevisionId: null,
  });
}

/**
 * Lift one post out of the bin, to the status its own history decides
 * (`restoreTarget` in blogFields.ts, resolved by the caller). `trashed_at`
 * clears in the same statement for the equivalence CHECK's sake.
 *
 * `status = 'trash'` IS PART OF THE WHERE, and it is the half that stops this
 * from being a silent unpublish. The target comes from history, so on a LIVE
 * post `restoreTarget` answers `archived` and every layer above would let it
 * through: `published -> archived` is a legal pair, so `transitionProblem`
 * returns null, and the door's own audit row would read "restored from Trash"
 * over a post that was never in it. `restorePostRows` has carried this
 * predicate since it was written; the asymmetry was the bug.
 */
export function restorePostRow(
  db: BlogDb,
  id: string,
  version: number,
  status: BlogPostRow['status'],
): Promise<number | null> {
  return guardedTransition(
    db,
    id,
    version,
    { status, trashedAt: null },
    eq(blogPosts.status, 'trash'),
  );
}

/* -------------------------------------------------------------------------- */
/* Bulk transitions                                                           */
/* -------------------------------------------------------------------------- */

/**
 * The two bulk moves take no version, because a selection of rows has no one
 * version to guard, and they take no per-row judgement either. What replaces
 * the version guard is a STATUS predicate in the WHERE — `setTasksStatusBulk`'s
 * rule — so a row somebody else already moved is skipped rather than moved
 * twice, and the RETURNING says which rows actually changed. The version still
 * bumps, so an editor tab holding the old number loses its next save rather
 * than writing over a bulk move it never saw.
 */
export async function trashPostRows(
  db: BlogDb,
  ids: string[],
  at: Date,
): Promise<{ id: string; slug: string }[]> {
  if (ids.length === 0) return [];
  return db
    .update(blogPosts)
    .set({
      status: 'trash',
      trashedAt: at,
      publishAt: null,
      pendingRevisionId: null,
      version: sql`${blogPosts.version} + 1`,
      updatedAt: at,
    })
    .where(and(inArray(blogPosts.id, ids), ne(blogPosts.status, 'trash')))
    .returning({ id: blogPosts.id, slug: blogPosts.slug });
}

/**
 * Restore a group that all land on the SAME status. The caller splits the
 * selection by `restoreTarget` and calls this once per target, so the rule
 * stays in blogFields.ts and is never re-expressed as a SQL `case`.
 */
export async function restorePostRows(
  db: BlogDb,
  ids: string[],
  status: BlogPostRow['status'],
  at: Date,
): Promise<{ id: string; slug: string }[]> {
  if (ids.length === 0) return [];
  return db
    .update(blogPosts)
    .set({
      status,
      trashedAt: null,
      version: sql`${blogPosts.version} + 1`,
      updatedAt: at,
    })
    .where(and(inArray(blogPosts.id, ids), eq(blogPosts.status, 'trash')))
    .returning({ id: blogPosts.id, slug: blogPosts.slug });
}

/**
 * Delete a post for good. ONE statement, and `status = 'trash'` in the WHERE is
 * the guard: it is what stops a stale id from a list somebody left open
 * deleting a live article.
 *
 * The pointers are deliberately NOT nulled first. `blog_post_revisions`,
 * `blog_post_related` and `blog_post_entities` all cascade from the post row,
 * and a system with no transactions cannot afford two extra statements whose
 * failure would leave a post stripped of its own history but still on the list.
 *
 * Returns whether a row went, so the caller can tell "deleted" from "somebody
 * restored it while this confirm was open".
 */
export async function purgePostRow(db: BlogDb, id: string): Promise<boolean> {
  const rows = await db
    .delete(blogPosts)
    .where(and(eq(blogPosts.id, id), eq(blogPosts.status, 'trash')))
    .returning({ id: blogPosts.id });
  return rows.length > 0;
}

/**
 * Which of these slugs name a post that is not live. The publish door's
 * internal-link warning reads it.
 *
 * A slug naming NO post is absent from the answer, deliberately: several
 * retired post slugs are permanent redirects in next.config.ts, so treating an
 * unknown slug as broken would cry wolf on a link that resolves perfectly well.
 * What this reports is the case nothing else can catch — a link to a post that
 * exists in the editor and 404s for a reader.
 */
export async function unpublishedLinkTargets(
  db: BlogDb,
  slugs: string[],
): Promise<string[]> {
  if (slugs.length === 0) return [];
  const rows = await db
    .select({ slug: blogPosts.slug })
    .from(blogPosts)
    .where(and(inArray(blogPosts.slug, slugs), ne(blogPosts.status, 'published')));
  return rows.map((row) => row.slug);
}

/* -------------------------------------------------------------------------- */
/* Scheduled publication                                                      */
/* -------------------------------------------------------------------------- */
/* LAST IN THE FILE ON PURPOSE. scripts/check-blogs.mts slices this module into
   per-statement regions by "from one signature to the next", so a statement
   dropped between two existing ones is swallowed by its neighbour's region and
   that neighbour's assertions quietly start describing the wrong code. Anything
   added here goes at the end, or moves a marker in the check with it. */

/**
 * Flip every schedule that has come due. ONE atomic UPDATE, and the only
 * caller is the `blog-publish` cron route — which is why it lives here with
 * the rest of the blog's writes rather than inline in a route handler: a
 * statement nothing outside a route can reach is a statement no check script
 * can run, and every rule below is silent when broken.
 *
 * IDEMPOTENT BY CONSTRUCTION, which is the requirement rather than a bonus:
 * Vercel documents duplicate cron invocations, so a second run in the same
 * minute is the realistic case. After the first run `status` is no longer
 * `scheduled`, so the WHERE matches nothing, zero rows come back and nothing
 * moves. There is no read-then-write anywhere in it, so two invocations racing
 * cannot both claim one row: the second UPDATE's own WHERE re-evaluates after
 * the first commits.
 *
 * `published_at = coalesce(published_at, publish_at)` carries two rules at
 * once. It takes the INTENDED instant rather than the run time, so a cron that
 * fires late does not re-date the post to whenever the platform got round to
 * it; and the coalesce keeps an EARLIER publication date if the row already
 * had one, the same rule `publishPostRow` states. Written as a bare
 * `publish_at` it would silently re-date a post on its next scheduled run.
 *
 * All four publication columns move in that one statement, which is what keeps
 * migration 0045's three CHECK constraints satisfied at every instant: there
 * are no transactions here, so a two-statement version would offer Postgres a
 * half-built row in between and be refused outright.
 *
 * `pending_revision_id is not null` is redundant against
 * `blog_posts_schedule_stamp` and stays anyway: it is what makes the
 * `published_revision_id = pending_revision_id` assignment provably non-null,
 * so a constraint dropped later can never turn this into a statement that
 * publishes a post pointing at nothing.
 *
 * It touches NO revision row. The schedule revision already carries the
 * intended instant in its typed `published_at` and in `snapshot.publishedAt`,
 * because the public date is read off the REVISION.
 *
 * `published_revision_id` is in the RETURNING because the cron has to build a
 * real public reference for the post it just made live, and that reference
 * carries a fingerprint over the snapshot a visitor now renders. Postgres
 * RETURNING gives the NEW row, so `pending_revision_id` comes back null here
 * while `published_revision_id` holds the id this statement just promoted —
 * which is both the proof that the post now points at a readable revision (the
 * WHERE required a non-null pending one) and the value the cron checks the
 * snapshot it reads back against.
 */
export async function publishDuePostRows(
  db: BlogDb,
  at: Date,
): Promise<{ id: string; slug: string; publishedRevisionId: string | null }[]> {
  return db
    .update(blogPosts)
    .set({
      status: 'published',
      publishedRevisionId: sql`${blogPosts.pendingRevisionId}`,
      pendingRevisionId: null,
      publishedAt: sql`coalesce(${blogPosts.publishedAt}, ${blogPosts.publishAt})`,
      publishAt: null,
      version: sql`${blogPosts.version} + 1`,
      updatedAt: at,
    })
    .where(
      and(
        eq(blogPosts.status, 'scheduled'),
        lte(blogPosts.publishAt, at),
        isNotNull(blogPosts.pendingRevisionId),
      ),
    )
    .returning({
      id: blogPosts.id,
      slug: blogPosts.slug,
      publishedRevisionId: blogPosts.publishedRevisionId,
    });
}
