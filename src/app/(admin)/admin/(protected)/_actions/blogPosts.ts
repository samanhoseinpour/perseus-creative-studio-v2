'use server';

/**
 * Write actions for blog posts. Reads live in `@/db/blogAdminQueries` (admin
 * side) and `@/lib/blogStore` (the public, cached side); every statement these
 * doors run lives in the guard-free `@/db/blogStatements`, so
 * scripts/check-blogs.mts --db can prove the real SQL without a session.
 *
 * SECURITY: the protected layout's guard does NOT wrap server actions — every
 * action gates itself on the blogs area (`requireArea`), FIRST and outside the
 * try, so its redirect is never swallowed by the catch. Ids are shape-validated
 * before touching Postgres so a malformed one can't 500 on the uuid cast.
 *
 * THIS FILE HOLDS THE THREE DOORS THAT DO NOT CHANGE A POST'S STATUS: create,
 * autosave, and an explicit Save. Publishing, scheduling, unpublishing,
 * trashing and restoring are transitions and are their own doors — the tasks
 * and payroll "separate doors" rule, and here it is what keeps the
 * published_revision_id pointer out of reach of a keystroke.
 *
 * Cache contract, and it is the OPPOSITE of every other domain's:
 *  - Autosave invalidates NOTHING, not even `revalidatePath('/admin','layout')`.
 *    Every prerendered marketing page carries the `blogs` tag (the Navbar reads
 *    the blog panel on every marketing route), so `updateTag(BLOGS_TAG)` on a
 *    keystroke timer would re-render the whole public site every second or two;
 *    and the admin layout revalidation would rebuild the dashboard on a timer
 *    for a value nothing on screen reads. The fresh tree the editor needs rides
 *    back on the action's own response.
 *  - An explicit Save on a PUBLISHED post invalidates no PUBLIC cache, and that
 *    is the core behaviour rather than an omission: the working copy diverges
 *    from the published revision while the public keeps rendering the published
 *    one. Not one public byte changed, so no tag is refreshed and nothing is
 *    announced. Publishing those changes is the Update door's job. It DOES call
 *    `revalidatePath('/admin', 'layout')`, the house contract every other
 *    domain's writes follow (_actions/careers.ts): a Save is a deliberate act
 *    rather than a keystroke, and the posts list's title, status and "Updated"
 *    column should be right when the member navigates back to it.
 *  - `invalidateBlog` below is the ONE invalidation door for the doors that do
 *    move the public site. It is written here, with its callers.
 *
 * Audit contract: `logActivity` in the ok branch only, after the real write
 * succeeded. Autosave writes NO row — it fires every second or two and would
 * bury every other domain in the global feed, the same reason routine task
 * edits stay out of it. A summary may name a post's title and slug; it carries
 * no URL and no other free text a member typed.
 */
import { revalidatePath, updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { after } from 'next/server';

import { db } from '@/db';
import {
  getAdminPost,
  listAuthorsAdmin,
  listCategoriesAdmin,
  slugTaken,
  type AdminPost,
} from '@/db/blogAdminQueries';
import {
  deleteRevision,
  insertDraftPost,
  insertRevision,
  replaceEntities,
  replaceRelated,
  updateWorkingCopy,
  type BlogWorkingUpdate,
  type NewRevision,
} from '@/db/blogStatements';
import type { BlogAuthor, BlogCategory } from '@/db/schema';
import { logActivity } from '@/lib/activityLog';
import { requireArea } from '@/lib/adminAccess';
import { bodyText, validateBlogBody, wordCount, type BlogDoc } from '@/lib/blogBody';
import {
  buildSnapshot,
  newDraftSlug,
  publicUrlFor,
  slugLocked,
  type BlogWorkingView,
} from '@/lib/blogFields';
import { blogDraftSchema, flattenBlogIssues, type BlogDraftFields } from '@/lib/blogPostSchema';
import { BLOGS_TAG, blogTag } from '@/lib/blogStore';
import { pingIndexNow } from '@/lib/indexnow';
import { reportError } from '@/lib/monitoringRecord';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Postgres error code, resolved through the cause chain: drizzle-orm wraps
 * neon-http driver errors in DrizzleQueryError with the NeonDbError (and its
 * `.code`) on `.cause`, so reading `.code` off the thrown error directly is
 * always undefined (same fix as _actions/careers.ts and _actions/tasks.ts).
 */
function pgCode(error: unknown): string | undefined {
  for (
    let current = error;
    typeof current === 'object' && current !== null;
    current = (current as { cause?: unknown }).cause
  ) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return undefined;
}

const isUniqueViolation = (error: unknown): boolean => pgCode(error) === '23505';

/**
 * What a member reads when the body will not validate.
 *
 * `validateBlogBody`'s own problems are VALIDATOR DIAGNOSTICS, not copy:
 * `(root): Invalid input`, `body over 2000000 bytes`,
 * `content.0.type: Invalid discriminator value…`. None of them is a sentence,
 * and the editor is the only thing that can produce a malformed document, so
 * the raw string is diagnostic information and belongs on the monitoring
 * trail, not on screen.
 */
const BODY_REFUSAL =
  'This content could not be saved. Undo your last change or reload the editor. If it keeps happening, the post may be too long to store.';

/**
 * Take a revision back out after a save that did not land, without letting the
 * cleanup become the failure. An unguarded delete would lose the database error
 * that caused it on one path, and turn a recoverable `conflict` into a `server`
 * on the other. The orphan it leaves behind is a revision describing a save
 * that never happened, so a failed cleanup is reported rather than swallowed.
 */
async function discardRevision(id: string): Promise<void> {
  try {
    await deleteRevision(db, id);
  } catch (error) {
    reportError('[blogs] discardRevision failed', error);
  }
}

/**
 * `wordCount` and `previousWordCount` ride the successful result deliberately.
 * The FIRST editor save of an imported post changes its stored count: the 38
 * imported rows carry the legacy `countWords(mdx)` over the whole file, while
 * `wordCount({ doc, faqs })` counts the body plus the FAQ prose and comes out 4
 * to 21 percent lower. That moves the visible "N min read" byline, the JSON-LD
 * wordCount and the author-page totals. The change is intended; being silent
 * about it is not, so the editor states it and these are the numbers it states.
 */
export type BlogMutationResult =
  | { ok: true; id: string; version: number; wordCount: number; previousWordCount: number }
  | { ok: false; error: 'validation'; issues: Record<string, string> }
  | { ok: false; error: 'conflict' }
  | { ok: false; error: 'server' };

/** The envelope both save doors take. The fields are NESTED rather than
 *  spread beside the id, because `blogDraftSchema` is `.strict()` and would
 *  refuse the very envelope the editor sends. */
export type BlogSaveInput = {
  id: string;
  /** The version the editor last saw. The concurrency control, not a hint. */
  version: number;
  fields: unknown;
};

// ── Invalidation + IndexNow ─────────────────────────────────────────────────

/** What the public site could see of a post: where it lives, whether it is
 *  visible at all, and a fingerprint over everything a visitor renders. */
export type BlogRef = {
  slug: string;
  authorSlug: string;
  /** Carried because a category move IS a public change, but it pings no URL
   *  of its own: the category view is `/blogs?category=<slug>`, a query URL
   *  the house sitemap rule never emits to a crawler. */
  categorySlug: string;
  /** status === 'published'. The public predicate, which reads no clock. */
  isPublic: boolean;
  /** publicFingerprint(snapshot) from src/lib/blogFields.ts. */
  publicFingerprint: string;
};

/**
 * The ONE invalidation door for a post, mirroring `invalidateProject` in
 * _actions/projects.ts. Pass `previous` as undefined on create, `current` as
 * undefined on delete.
 *
 * `updateTag(BLOGS_TAG)` is mandatory on every public-facing write, not merely
 * belt-and-braces: `getPublishedPost` reaches its per-slug cache entry only
 * after a snapshot membership test, so a newly published slug stays invisible
 * until the COARSE tag is invalidated. The per-slug tag alone does nothing for
 * a post the store has never seen.
 *
 * `updateTag` and NOT `revalidateTag`, because these run inside server actions.
 * The scheduling cron is the opposite case and must use `revalidateTag`:
 * `updateTag` throws inside a route handler.
 *
 * DELIBERATELY NOT EXPORTED. A `'use server'` module may export only async
 * functions, so exporting this would turn a cache-invalidation helper into an
 * unauthenticated server action. Its callers are the transition doors, which
 * belong in this file beside it; a caller in another file lifts it into a
 * plain module rather than exporting it from here.
 *
 * Unused as of this commit, deliberately: NONE of the three doors in this file
 * may invalidate anything (see the cache contract above), and the transition
 * doors that call it land next. Written now rather than later so the rule about
 * what a public write owes is settled in one place before there are two
 * callers to keep in step.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function invalidateBlog(current?: BlogRef, previous?: BlogRef): void {
  // Every /admin render is session-gated, so this is the house contract rather
  // than a public concern: the posts list, its tab badges and the rail all
  // read the row that just moved.
  revalidatePath('/admin', 'layout');

  const wasPublic = previous !== undefined && previous.isPublic;
  const isPublic = current !== undefined && current.isPublic;
  if (!wasPublic && !isPublic) return;

  updateTag(BLOGS_TAG);
  if (current !== undefined) updateTag(blogTag(current.slug));
  if (previous !== undefined && previous.slug !== current?.slug) {
    updateTag(blogTag(previous.slug));
  }
  revalidatePath('/sitemap.xml');
  revalidatePath('/sitemaps/blogs.xml');
  // An author page's lastmod is the newest post it carries, so a post moving
  // in or out of public changes it even when the author did not.
  revalidatePath('/sitemaps/authors.xml');

  // Tell IndexNow-consuming engines (Bing, and through it Copilot/ChatGPT
  // grounding) only when a visitor's bytes actually moved: the URL appeared,
  // the URL disappeared, or it stayed public and its public fingerprint
  // changed. Pinging an unchanged URL is a Bing spam signal, which is why
  // every ping in this repo is fingerprint-gated.
  const changed =
    wasPublic !== isPublic ||
    (isPublic && wasPublic && current.publicFingerprint !== previous.publicFingerprint) ||
    (isPublic && wasPublic && current.slug !== previous.slug);
  if (!changed) return;

  const urls: string[] = [];
  if (isPublic) urls.push(publicUrlFor(current.slug));
  if (wasPublic && (!isPublic || previous.slug !== current.slug)) {
    // A URL that left public still gets announced, so engines refetch, meet
    // the 404, and drop it.
    urls.push(publicUrlFor(previous.slug));
  }
  // The hub card and the author's own page render this post's title and
  // excerpt, so they moved with it. `/blogs/authors` is the index of authors
  // and only changes when the SET of public posts under one does.
  urls.push('/blogs');
  const authors = new Set<string>();
  if (isPublic) authors.add(current.authorSlug);
  if (wasPublic) authors.add(previous.authorSlug);
  for (const slug of authors) urls.push(`/blogs/authors/${slug}`);
  if (wasPublic !== isPublic || (isPublic && wasPublic && current.authorSlug !== previous.authorSlug)) {
    urls.push('/blogs/authors');
  }
  after(() => pingIndexNow(urls));
}

// ── Create ──────────────────────────────────────────────────────────────────

/**
 * Start a brand-new draft and open it in the editor.
 *
 * The slug is a generated placeholder behind a UNIQUE index, so the insert is
 * `onConflictDoNothing` and re-rolls ONCE if nothing came back: a raw 23505 on
 * a "New post" button is not an acceptable failure mode, and a second
 * collision on eight hex characters is not a thing that happens.
 *
 * Nothing is invalidated. A draft is not public, and the redirect re-renders
 * the tree anyway.
 */
export async function createPost(): Promise<BlogMutationResult> {
  const profile = await requireArea('blogs', '/admin');

  let created: { id: string; slug: string };
  try {
    const [categories, authors] = await Promise.all([listCategoriesAdmin(), listAuthorsAdmin()]);
    if (categories.length === 0) {
      return {
        ok: false,
        error: 'validation',
        issues: { _form: 'There are no blog categories yet. Add one before writing a post.' },
      };
    }
    if (authors.length === 0) {
      return {
        ok: false,
        error: 'validation',
        issues: { _form: 'There are no blog authors yet. Add one before writing a post.' },
      };
    }
    // The signed-in writer if they have an author record, otherwise the first
    // author in the site's own order. Either way the writer can change it.
    const author =
      authors.find((a) => a.userId === profile.session.user.id) ?? authors[0];

    let attempt: { id: string; slug: string } | null = null;
    for (let tries = 0; tries < 2 && attempt === null; tries++) {
      const slug = newDraftSlug();
      const inserted = await insertDraftPost(db, {
        slug,
        categoryId: categories[0].id,
        authorId: author.id,
      });
      if (inserted !== null) attempt = { id: inserted.id, slug };
    }
    if (attempt === null) return { ok: false, error: 'server' };
    created = attempt;

    logActivity(profile, {
      area: 'blogs',
      entity: 'blog-post',
      entityId: created.id,
      entityName: 'Untitled post',
      action: 'create',
      summary: 'Started a new post',
      payload: { meta: { slug: created.slug } },
    });
  } catch (error) {
    reportError('[blogs] createPost failed', error);
    return { ok: false, error: 'server' };
  }

  // Outside the try: redirect() works by THROWING NEXT_REDIRECT, and caught it
  // would be logged as a failure and turned into a server error.
  redirect(`/admin/blogs/${created.id}`);
}

// ── The shared half of both save doors ──────────────────────────────────────

/**
 * Everything a save has to decide before it writes anything, resolved once so
 * autosave and Save cannot answer differently. Returns the failure result when
 * something is wrong, so both callers just hand it back.
 */
type Prepared = {
  post: AdminPost;
  data: BlogDraftFields;
  doc: BlogDoc;
  category: BlogCategory;
  author: BlogAuthor;
  columns: BlogWorkingUpdate;
  words: number;
};

async function prepareSave(
  input: BlogSaveInput,
): Promise<{ ok: true; prepared: Prepared } | { ok: false; result: BlogMutationResult }> {
  if (!UUID_RE.test(input.id) || !Number.isInteger(input.version) || input.version < 1) {
    return { ok: false, result: { ok: false, error: 'server' } };
  }

  const parsed = blogDraftSchema.safeParse(input.fields);
  if (!parsed.success) {
    return {
      ok: false,
      result: { ok: false, error: 'validation', issues: flattenBlogIssues(parsed.error) },
    };
  }
  const data = parsed.data;

  // `blogDraftSchema` accepts ANY `content` array — it deliberately owns none
  // of the body's vocabulary, because a second partial copy of it would drift
  // from blogBody.ts. So the document is validated HERE, on every save door,
  // and it is the CANONICAL result that gets stored, never the raw input: the
  // canonical form is what both fingerprints are compared across and what the
  // renderer's closed mapping expects.
  const checked = validateBlogBody(data.body);
  if (!checked.ok) {
    reportError('[blogs] prepareSave body refused', new Error(checked.problems.join(' | ')));
    return {
      ok: false,
      result: { ok: false, error: 'validation', issues: { body: BODY_REFUSAL } },
    };
  }
  const doc = checked.doc;

  const post = await getAdminPost(input.id);
  if (post === null) return { ok: false, result: { ok: false, error: 'server' } };

  if (data.slug !== post.post.slug) {
    // The WORKING row's slug is the public URL, so an unlocked edit moves a
    // live post the moment it saves and every inbound link 404s. The lock
    // lifts when programme step 3 ships redirects.
    if (slugLocked(post.post)) {
      return {
        ok: false,
        result: {
          ok: false,
          error: 'validation',
          issues: {
            slug: 'This post has been published, so its address is fixed. Renaming it would break every link that points at it.',
          },
        },
      };
    }
    if (await slugTaken(data.slug, input.id)) {
      return {
        ok: false,
        result: {
          ok: false,
          error: 'validation',
          issues: { slug: 'That slug is already in use.' },
        },
      };
    }
  }

  // Zero extra round trips in the common case: an autosave never moves a post
  // between categories or authors, so the rows already joined by getAdminPost
  // answer it.
  const category =
    data.categorySlug === post.category.slug
      ? post.category
      : (await listCategoriesAdmin()).find((c) => c.slug === data.categorySlug);
  if (category === undefined) {
    return {
      ok: false,
      result: {
        ok: false,
        error: 'validation',
        issues: { categorySlug: 'Pick a category from the list.' },
      },
    };
  }
  const author =
    data.authorSlug === post.author.slug
      ? post.author
      : (await listAuthorsAdmin()).find((a) => a.slug === data.authorSlug);
  if (author === undefined) {
    return {
      ok: false,
      result: {
        ok: false,
        error: 'validation',
        issues: { authorSlug: 'Pick an author from the list.' },
      },
    };
  }

  const words = wordCount({ doc, faqs: data.faqs });

  return {
    ok: true,
    prepared: {
      post,
      data,
      doc,
      category,
      author,
      words,
      // Built field by field, the `openingColumns` precedent in
      // _actions/careers.ts, and NEVER by spreading `data`. That is what keeps
      // `custom_schema` out of the `.set()`: it is a step-4 field with no
      // editor behind it, and it survives every save by never being named.
      // `status` and every date column are absent for the same structural
      // reason status is absent from `patchTask` — these doors cannot change
      // what a post IS, only what it says.
      columns: {
        slug: data.slug,
        title: data.title,
        description: data.description,
        categoryId: category.id,
        authorId: author.id,
        serviceSlug: data.serviceSlug,
        heroStaticPath: data.heroStaticPath,
        heroMedia: data.heroMedia,
        heroAlt: data.heroAlt,
        heroCaption: data.heroCaption,
        body: doc,
        bodyText: bodyText(doc),
        wordCount: words,
        keyTakeaways: data.keyTakeaways,
        faqs: data.faqs,
        sources: data.sources,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        canonicalOverride: data.canonicalOverride,
        ogTitle: data.ogTitle,
        ogDescription: data.ogDescription,
        ogImageStaticPath: data.ogImageStaticPath,
        ogImageMedia: data.ogImageMedia,
        twitterCard: data.twitterCard,
        robotsIndex: data.robotsIndex,
        robotsFollow: data.robotsFollow,
        robotsExtra: data.robotsExtra,
        focusKeywords: data.focusKeywords,
        emitLegacyMetaKeywords: data.emitLegacyMetaKeywords,
        llmsInclude: data.llmsInclude,
      },
    },
  };
}

/** The label an audit row and a revision carry for a post that may not have a
 *  title yet. A brand-new draft is legitimately untitled. */
const postLabel = (title: string): string => title.trim() || 'Untitled post';

// ── Autosave ────────────────────────────────────────────────────────────────

/**
 * The editor's autosave. The working columns, and nothing else.
 *
 * No revision row: autosave fires every second or two, and a revision per
 * keystroke batch would bury the real history under the noise. No activity
 * row, for the same reason. No cache invalidation of ANY kind, including
 * `revalidatePath('/admin','layout')` — see the cache contract at the top of
 * this file.
 *
 * Legal on a published post, because the working copy is not public. Neither
 * save door looks at status to decide whether to write.
 *
 * On a lost race this returns `conflict` and stops. It does not retry and it
 * does not merge: the other writer's text is on the row, and silently
 * overwriting it is the one outcome nobody could recover from.
 */
export async function saveDraft(input: BlogSaveInput): Promise<BlogMutationResult> {
  // The gate runs for its own sake here: autosave writes no audit row, so the
  // profile it resolves is deliberately unused.
  await requireArea('blogs', '/admin');

  try {
    const prep = await prepareSave(input);
    if (!prep.ok) return prep.result;
    const { post, columns, words } = prep.prepared;

    let version: number | null;
    try {
      version = await updateWorkingCopy(db, input.id, input.version, columns);
    } catch (dbError) {
      // The slug pre-check is a read, so a second writer can land between it
      // and this UPDATE. The unique index is the race backstop.
      if (isUniqueViolation(dbError)) {
        return { ok: false, error: 'validation', issues: { slug: 'That slug is already in use.' } };
      }
      throw dbError;
    }
    if (version === null) return { ok: false, error: 'conflict' };

    return {
      ok: true,
      id: input.id,
      version,
      wordCount: words,
      previousWordCount: post.post.wordCount,
    };
  } catch (error) {
    reportError('[blogs] saveDraft failed', error);
    return { ok: false, error: 'server' };
  }
}

// ── Explicit Save ───────────────────────────────────────────────────────────

/**
 * The Save button. Everything autosave does, plus the working related list and
 * entity list, plus a durable `save` revision, plus an audit row.
 *
 * A SAVE ON A PUBLISHED POST IS ALLOWED AND MUST NOT TOUCH THE PUBLIC SITE.
 * That is the whole WordPress-grade behaviour: the writer edits a live
 * article, presses Save, and the working copy diverges from the published
 * revision while the public keeps rendering the published one. So this door
 * never moves `published_revision_id`, never stamps a date, refreshes no
 * public tag and announces nothing. The editor reads the divergence and offers
 * to publish it; the Update door is what publishes. The admin layout IS
 * revalidated, because the list that a member navigates back to is not the
 * public site.
 *
 * ORDERING IS LOAD-BEARING, because neon-http has NO transactions:
 *
 *   1. Relations first. If one fails here the version has not moved, so the
 *      same Save retries cleanly. Never write relations after the version bump.
 *   2. The revision.
 *   3. The version-guarded UPDATE.
 *   4. If step 3 matched no row, DELETE the revision from step 2 before
 *      returning the conflict. Without that delete every lost race leaves a
 *      revision in the history describing a save that never happened, and the
 *      revisions screen renders it as fact.
 */
export async function savePost(input: BlogSaveInput): Promise<BlogMutationResult> {
  const profile = await requireArea('blogs', '/admin');

  try {
    const prep = await prepareSave(input);
    if (!prep.ok) return prep.result;
    const { post, data, doc, category, author, columns, words } = prep.prepared;
    const row = post.post;

    // 1. Relations, before anything that moves the version.
    await replaceRelated(db, input.id, data.relatedSlugs);
    await replaceEntities(db, input.id, data.entities);

    // The snapshot's `customSchema` comes off the STORED ROW, never off the
    // payload: the field has no editor, so no payload carries it, and building
    // this view from `data` alone would write a revision whose snapshot says
    // `customSchema: null`. Publishing that revision later would silently drop
    // somebody's hand-written JSON-LD, with the column itself still intact and
    // nothing on any screen to explain the difference.
    const view: BlogWorkingView = {
      slug: data.slug,
      title: data.title,
      description: data.description,
      categorySlug: category.slug,
      authorSlug: author.slug,
      serviceSlug: data.serviceSlug,
      heroStaticPath: data.heroStaticPath,
      heroMedia: data.heroMedia,
      heroAlt: data.heroAlt,
      heroCaption: data.heroCaption,
      body: doc,
      bodyText: bodyText(doc),
      wordCount: words,
      keyTakeaways: data.keyTakeaways,
      faqs: data.faqs,
      sources: data.sources,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
      canonicalOverride: data.canonicalOverride,
      ogTitle: data.ogTitle,
      ogDescription: data.ogDescription,
      ogImageStaticPath: data.ogImageStaticPath,
      ogImageMedia: data.ogImageMedia,
      twitterCard: data.twitterCard,
      robotsIndex: data.robotsIndex,
      robotsFollow: data.robotsFollow,
      robotsExtra: data.robotsExtra,
      focusKeywords: data.focusKeywords,
      emitLegacyMetaKeywords: data.emitLegacyMetaKeywords,
      customSchema: row.customSchema,
      llmsInclude: data.llmsInclude,
      publishedAt: row.publishedAt,
      contentModifiedAt: row.contentModifiedAt,
    };
    // The two instants are the ROW's, unchanged. This door stamps neither, so
    // a Save on a live article leaves both its publication date and its
    // "Updated" byline exactly where the last publish put them.
    const snapshot = buildSnapshot(view, {
      relatedSlugs: data.relatedSlugs,
      entities: data.entities,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      contentModifiedAt: row.contentModifiedAt?.toISOString() ?? null,
    });

    const revisionValues: NewRevision = {
      postId: input.id,
      reason: 'save',
      slug: data.slug,
      // A FAITHFUL copy of the column, empty title included: the revision
      // columns are typed copies of what the row held, and substituting a
      // display label here would store a title nobody ever typed.
      title: data.title,
      categoryId: category.id,
      authorId: author.id,
      publishedAt: row.publishedAt,
      contentModifiedAt: row.contentModifiedAt,
      robotsIndex: data.robotsIndex,
      llmsInclude: data.llmsInclude,
      wordCount: words,
      snapshot,
      actorId: profile.session.user.id,
      actorName: profile.session.user.name || 'Unknown',
    };

    // 2. The revision. Its number is an inline subquery, so two genuinely
    // concurrent saves read the same max and one loses the (post_id, number)
    // UNIQUE index. Retried ONCE: by then the winner's row is committed, so
    // the subquery answers one higher.
    let revision: { id: string; number: number };
    try {
      revision = await insertRevision(db, revisionValues);
    } catch (dbError) {
      if (!isUniqueViolation(dbError)) throw dbError;
      revision = await insertRevision(db, revisionValues);
    }

    // 3. The version-guarded UPDATE.
    let version: number | null;
    try {
      version = await updateWorkingCopy(db, input.id, input.version, columns);
    } catch (dbError) {
      await discardRevision(revision.id);
      if (isUniqueViolation(dbError)) {
        return { ok: false, error: 'validation', issues: { slug: 'That slug is already in use.' } };
      }
      throw dbError;
    }

    // 4. Lost the race: take the revision back out before reporting it.
    //
    // KNOWN AND ACCEPTED: the RELATIONS written in step 1 are not undone. The
    // ordering the design requires puts them before anything that moves the
    // version, so a loser's related slugs and entities stay on the row while
    // the winner's columns stand, and a later Publish would snapshot the
    // winner's fields alongside the loser's relations. It is silent, and any
    // re-save from either writer repairs it. The editor's answer is to force a
    // reload on a conflict rather than to unwind here, because unwinding needs
    // the previous lists, which this door never read.
    if (version === null) {
      await discardRevision(revision.id);
      return { ok: false, error: 'conflict' };
    }

    logActivity(profile, {
      area: 'blogs',
      entity: 'blog-post',
      entityId: input.id,
      entityName: postLabel(data.title),
      action: 'update',
      summary: `Saved the post ${postLabel(data.title)}`,
      payload: { meta: { slug: data.slug, revision: revision.number, words } },
    });

    // No PUBLIC cache is touched, on purpose: not one byte a visitor renders
    // moved. The admin tree is the house contract every other domain follows,
    // and it is what makes the posts list's title, status and "Updated" column
    // right when the member navigates back. Autosave is the one door that
    // skips even this.
    revalidatePath('/admin', 'layout');
    return {
      ok: true,
      id: input.id,
      version,
      wordCount: words,
      previousWordCount: row.wordCount,
    };
  } catch (error) {
    reportError('[blogs] savePost failed', error);
    return { ok: false, error: 'server' };
  }
}
