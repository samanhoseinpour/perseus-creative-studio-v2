import { and, eq, inArray, sql } from 'drizzle-orm';

import {
  blogEntities,
  blogPostEntities,
  blogPostRelated,
  blogPostRevisions,
  blogPosts,
  type BlogEntity,
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
 * Every column a write door may set on the working row.
 *
 * `customSchema` is named here exactly once, in the `Omit`, which is the only
 * safe place to name it: it removes the key from the settable set, so passing
 * it is a type error rather than a silent overwrite. `id`, `version`,
 * `createdAt` and `updatedAt` are excluded for the ordinary reasons — the first
 * three are never edited, and `updatedAt` is stamped by this function so no
 * caller can forget it or disagree about the clock.
 */
export type BlogWorkingUpdate = Partial<
  Omit<NewBlogPostRow, 'id' | 'customSchema' | 'version' | 'createdAt' | 'updatedAt'>
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
