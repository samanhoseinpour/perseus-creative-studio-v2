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
  getRevisionForPost,
  listAuthorsAdmin,
  listCategoriesAdmin,
  postIdentitiesFor,
  publishedRevisionsFor,
  relatedReferrerSlugs,
  slugTaken,
  type AdminPost,
  type PostIdentity,
} from '@/db/blogAdminQueries';
import {
  amendPublishedAtRow,
  deleteRevision,
  insertDraftPost,
  insertRevision,
  publishPostRow,
  purgePostRow,
  replaceEntities,
  replaceRelated,
  restorePostRow,
  restorePostRows,
  schedulePostRow,
  trashPostRow,
  trashPostRows,
  unpublishPostRow,
  unpublishedLinkTargets,
  unschedulePostRow,
  updateWorkingCopy,
  type BlogWorkingUpdate,
  type NewRevision,
} from '@/db/blogStatements';
import type { BlogAuthor, BlogCategory, BlogRevisionSnapshot } from '@/db/schema';
import { logActivity } from '@/lib/activityLog';
import { requireArea } from '@/lib/adminAccess';
import {
  bodyText,
  internalLinkSlugs,
  validateBlogBody,
  wordCount,
  type BlogDoc,
} from '@/lib/blogBody';
import {
  buildSnapshot,
  contentChanged,
  newDraftSlug,
  publicFingerprint,
  publicUrlFor,
  restoreTarget,
  slugLocked,
  transitionProblem,
  type BlogPostStatus,
  type BlogWorkingView,
} from '@/lib/blogFields';
import {
  blogDraftSchema,
  blogPublishSchema,
  flattenBlogIssues,
  type BlogDraftFields,
} from '@/lib/blogPostSchema';
import { BLOGS_TAG, blogTag } from '@/lib/blogStore';
import { DAY_KEY_RE, STUDIO_TZ, dayKeyIn, dayNoonIn } from '@/lib/calendar';
import { pingIndexNow } from '@/lib/indexnow';
import { reportError } from '@/lib/monitoringRecord';
import { delPublic, listPublic } from '@/lib/publicBlob';

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
 * Write the next revision, retrying a `(post_id, number)` collision ONCE.
 *
 * The number is an inline subquery, so two genuinely concurrent writers read
 * the same `max(number)` and one loses the UNIQUE index. By the time the loser
 * retries, the winner's row is committed and the subquery answers one higher.
 * Once, not in a loop: a second collision means something other than a race.
 *
 * Shared by every door that writes a revision. Six private copies of a retry
 * is how one of them ends up not having it, and the failure then is a save the
 * writer asked for that silently did not happen.
 */
async function insertRevisionOnce(values: NewRevision): Promise<{ id: string; number: number }> {
  try {
    return await insertRevision(db, values);
  } catch (dbError) {
    if (!isUniqueViolation(dbError)) throw dbError;
    return insertRevision(db, values);
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
  | {
      ok: true;
      id: string;
      version: number;
      wordCount: number;
      previousWordCount: number;
      /**
       * Sentences the editor shows AFTER a move that succeeded. A warning is
       * never a refusal: publishing a post that links to one you are about to
       * publish next is an ordinary thing to do, and the writer is the only
       * one who knows whether the pair is going out together.
       */
      warnings?: string[];
    }
  | { ok: false; error: 'validation'; issues: Record<string, string> }
  | { ok: false; error: 'conflict' }
  | { ok: false; error: 'server' };

/** What the two bulk doors answer with. No version, no word counts: a
 *  selection has neither, and the list re-reads every row it shows. */
export type BlogBulkResult =
  | { ok: true; count: number }
  | { ok: false; error: 'validation'; issues: Record<string, string> }
  | { ok: false; error: 'server' };

/** What a door that removes the row answers with. There is no version to hand
 *  back and no word count to state, because there is no longer a post. */
export type BlogActionResult =
  | { ok: true }
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
 *  visible at all, and a fingerprint over everything a visitor renders.
 *
 *  A DISCRIMINATED UNION rather than one shape with an `isPublic` flag beside
 *  an always-required fingerprint, and the reason is that the fingerprint is
 *  read in exactly one place: the both-sides-public comparison below. A post
 *  moving into or out of public has already answered "did anything change?"
 *  by moving, so building a fingerprint for that side would mean fetching a
 *  whole published snapshot to fill a field nothing reads — per row, on the
 *  bulk doors. The union says that in the type instead of in a comment. */
export type BlogRef = {
  slug: string;
  authorSlug: string;
  /** Carried because a category move IS a public change, but it pings no URL
   *  of its own: the category view is `/blogs?category=<slug>`, a query URL
   *  the house sitemap rule never emits to a crawler. */
  categorySlug: string;
} & (
  | { isPublic: false }
  | {
      /** status === 'published'. The public predicate, which reads no clock. */
      isPublic: true;
      /** publicFingerprint(snapshot) from src/lib/blogFields.ts. */
      publicFingerprint: string;
      /**
       * The two instants the page renders, as one comparable string.
       *
       * They ride HERE rather than inside publicFingerprint because that leaf
       * deliberately ignores them: dating a post is not an edit to it, and a
       * fingerprint that read the dates would report a change on every
       * republish. But an AMENDED publication date really does move the
       * visible byline, `og:publishedTime`, JSON-LD `datePublished` and the
       * listing order, so something has to notice it or the amend is the one
       * public change in this domain that never reaches IndexNow.
       */
      dates: string;
    }
);

/** The `dates` half of a public ref, from the snapshot that carries them. */
const refDates = (snapshot: { publishedAt: string | null; contentModifiedAt: string | null }) =>
  `${snapshot.publishedAt ?? ''}|${snapshot.contentModifiedAt ?? ''}`;

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
 * `alsoTag` refreshes OTHER posts' per-slug entries without announcing
 * anything about them: the purge door's case, where another post's published
 * snapshot may still name the slug that is about to stop existing. It runs
 * before the early return, because a purge has no public side of its own.
 */
function invalidateBlog(
  current?: BlogRef,
  previous?: BlogRef,
  alsoTag: readonly string[] = [],
): void {
  // Every /admin render is session-gated, so this is the house contract rather
  // than a public concern: the posts list, its tab badges and the rail all
  // read the row that just moved.
  revalidatePath('/admin', 'layout');

  for (const slug of alsoTag) updateTag(blogTag(slug));

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
    (isPublic && wasPublic && current.dates !== previous.dates) ||
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
  view: BlogWorkingView;
  words: number;
};

/**
 * `draft` relaxes every required string to allow `''` (a draft is a
 * half-written post, and refusing an empty title would fail autosave on the
 * first keystroke of every new one); `publish` is the strict base plus the two
 * refusals no per-field rule can make. ONE function either way, because
 * everything else a save has to decide — the body's second gate, the slug
 * lock, the category and author lookups, the word count, the settable columns
 * — is identical, and a second copy of it for the transition doors is a second
 * set of bugs.
 */
type PrepareMode = 'draft' | 'publish';

async function prepareSave(
  input: BlogSaveInput,
  mode: PrepareMode,
): Promise<{ ok: true; prepared: Prepared } | { ok: false; result: BlogMutationResult }> {
  if (!UUID_RE.test(input.id) || !Number.isInteger(input.version) || input.version < 1) {
    return { ok: false, result: { ok: false, error: 'server' } };
  }

  const parsed = (mode === 'publish' ? blogPublishSchema : blogDraftSchema).safeParse(input.fields);
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
  const row = post.post;

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
      // The projection every revision-writing door snapshots through, built
      // once here so a Save and a Publish of the same payload cannot describe
      // the post differently.
      //
      // `customSchema` comes off the STORED ROW, never off the payload: the
      // field has no editor, so no payload carries it, and building this from
      // `data` alone would write a revision whose snapshot says
      // `customSchema: null`. Publishing that revision later would silently
      // drop somebody's hand-written JSON-LD, with the column itself still
      // intact and nothing on any screen to explain the difference.
      //
      // The two instants are the ROW's, unchanged. A door that stamps one
      // passes its own value to `buildSnapshot`, which takes both as
      // parameters and never reads them off this object.
      view: {
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
      },
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
    const prep = await prepareSave(input, 'draft');
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
    const prep = await prepareSave(input, 'draft');
    if (!prep.ok) return prep.result;
    const { post, data, category, author, columns, view, words } = prep.prepared;
    const row = post.post;

    // 1. Relations, before anything that moves the version.
    await replaceRelated(db, input.id, data.relatedSlugs);
    await replaceEntities(db, input.id, data.entities);

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

    // 2. The revision, through the one door that owns the collision retry.
    const revision = await insertRevisionOnce(revisionValues);

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

// ── The transition doors ────────────────────────────────────────────────────

/**
 * Everything below this line CHANGES WHAT A POST IS. Each door is one
 * `transitionProblem` call, at most one revision, and exactly ONE
 * version-guarded UPDATE whose columns all move together (see
 * `guardedTransition` in blogStatements.ts for why together is not optional).
 *
 * `transitionProblem` in blogFields.ts is the only place a move is judged.
 * Migration 0045's three CHECK constraints are the BACKSTOP, not the guard: a
 * constraint violation reaches a member as a raw server error on a button that
 * looked enabled, and the transition function is what gives them a sentence
 * they can act on.
 */

/** A validation failure, which is what every refusal here is: the member typed
 *  or clicked something the domain will not take, and the sentence says why. */
const refuse = (issues: Record<string, string>): BlogMutationResult => ({
  ok: false,
  error: 'validation',
  issues,
});

/** Shape-check an id and a version before either reaches Postgres, so a
 *  malformed one cannot 500 on the uuid cast. */
const badTarget = (id: string, version: number): boolean =>
  !UUID_RE.test(id) || !Number.isInteger(version) || version < 1;

/**
 * `blog_categories.seo_title` and `seo_description` are nullable and the
 * `branding` row has both empty, so publishing into it would render
 * `/blogs?category=branding` with no metadata at all. Refused by name, because
 * a bare "you cannot do that" leaves the writer with no next move.
 *
 * Blank counts as missing. A category titled with a space renders exactly the
 * empty tag a null one does, and the column cannot tell the two apart.
 */
function categoryReady(category: BlogCategory): string | null {
  if (category.seoTitle?.trim() && category.seoDescription?.trim()) return null;
  return `The category "${category.title}" has no SEO title and description yet. Add those before publishing a post into it.`;
}

/** How many unpublished link targets a warning names before it folds. */
const LINK_WARNING_NAMES = 5;

/**
 * The publish-time warning about links pointing at posts that are not live.
 * A WARNING and never a refusal: publishing a pair of posts that reference
 * each other is ordinary, and only the writer knows whether the second one is
 * going out in the next minute.
 */
async function unpublishedLinkWarning(doc: BlogDoc, ownSlug: string): Promise<string | null> {
  const linked = internalLinkSlugs(doc).filter((slug) => slug !== ownSlug);
  if (linked.length === 0) return null;
  const missing = await unpublishedLinkTargets(db, linked);
  if (missing.length === 0) return null;
  const named = missing.slice(0, LINK_WARNING_NAMES).join(', ');
  const rest = missing.length - LINK_WARNING_NAMES;
  const list = rest > 0 ? `${named}, and ${rest} more` : named;
  return missing.length === 1
    ? `This post links to ${list}, which is not published yet. That link will not work until it is.`
    : `This post links to ${missing.length} posts that are not published yet: ${list}. Those links will not work until they are.`;
}

/** The post as `buildSnapshot` reads it, straight off the stored row. The
 *  doors that take no payload (unpublish, revision restore) snapshot through
 *  this; `customSchema` and both instants ride the spread rather than being
 *  named, which is how the column survives a write that has no business
 *  touching it. */
const rowView = (post: AdminPost): BlogWorkingView => ({
  ...post.post,
  categorySlug: post.category.slug,
  authorSlug: post.author.slug,
});

/** A post nothing outside /admin can see. Cheap by construction: there is no
 *  fingerprint to build, because a post moving into or out of public has
 *  already answered "did anything change?" by moving. */
const hiddenRef = (post: { slug: string; categorySlug: string; authorSlug: string }): BlogRef => ({
  slug: post.slug,
  categorySlug: post.categorySlug,
  authorSlug: post.authorSlug,
  isPublic: false,
});

/**
 * What the public was actually rendering, built from the PUBLISHED revision's
 * own snapshot rather than from the working row: a saved-but-unpublished
 * category or author move lives on the working row and has not reached a
 * visitor, so comparing against it would ping a URL whose bytes did not move.
 *
 * The `slug` is the exception and comes from the working row, because that is
 * the live URL. `slugLocked` pins it the moment a post is published, so the
 * two agree.
 */
const publishedRef = (slug: string, snapshot: BlogRevisionSnapshot): BlogRef => ({
  slug,
  categorySlug: snapshot.categorySlug,
  authorSlug: snapshot.authorSlug,
  isPublic: true,
  publicFingerprint: publicFingerprint(snapshot),
  dates: refDates(snapshot),
});

/** The ref for a post as it stood BEFORE a transition: public only when its
 *  status really was `published`, which is the predicate the site reads. */
const beforeRef = (
  post: { slug: string; status: BlogPostStatus; categorySlug: string; authorSlug: string },
  published: BlogRevisionSnapshot | null,
): BlogRef =>
  post.status === 'published' && published !== null
    ? publishedRef(post.slug, published)
    : hiddenRef(post);

/** The identity half of an AdminPost, in the shape the two ref builders take
 *  (the bulk doors read the same fields through `postIdentitiesFor`). */
const identityOf = (post: AdminPost) => ({
  slug: post.post.slug,
  status: post.post.status,
  categorySlug: post.category.slug,
  authorSlug: post.author.slug,
});

/** The snapshot the public is rendering for one post, or null. */
async function publishedSnapshot(id: string): Promise<BlogRevisionSnapshot | null> {
  return (await publishedRevisionsFor([id])).get(id)?.snapshot ?? null;
}

// ── Publish ─────────────────────────────────────────────────────────────────

/**
 * Take a post live: draft, scheduled, archived or published (an Update) to
 * `published`.
 *
 * THE PUBLISH INSTANT IS RESOLVED ONCE AND WRITTEN TO THREE PLACES: the
 * revision's typed `published_at` column, `snapshot.publishedAt`, and
 * `blog_posts.published_at`. The public DATE is read off the REVISION
 * (`toSummary` in blogStore.ts falls back to the post's `created_at`) while
 * `publicOrder` sorts on the POST row, so writing one without the others gives
 * an article sorted in one place and dated in another, and a first publish
 * that misses the revision renders dated its draft-creation day.
 *
 * It is `row.publishedAt ?? now` rather than a bare `now`, so an archived post
 * going back up keeps the date it actually went out on. The statement
 * coalesces as well, which is the race backstop: this read is a round trip old.
 *
 * ORDERING, because neon-http has NO transactions: relations, then the
 * revision, then the single guarded UPDATE, and the revision comes back OUT on
 * a lost race. See savePost for the full reasoning; it is the same shape.
 */
export async function publishPost(input: BlogSaveInput): Promise<BlogMutationResult> {
  const profile = await requireArea('blogs', '/admin');

  try {
    const prep = await prepareSave(input, 'publish');
    if (!prep.ok) return prep.result;
    const { post, data, doc, category, author, columns, view, words } = prep.prepared;
    const row = post.post;

    const problem = transitionProblem(row.status, 'published', {
      everPublished: row.publishedAt !== null,
    });
    if (problem !== null) return refuse({ _form: problem });

    const categoryProblem = categoryReady(category);
    if (categoryProblem !== null) return refuse({ categorySlug: categoryProblem });

    // Read before the write: a failure here is the database being unavailable,
    // which the very next statement would meet anyway, and computing it
    // afterwards would mean either swallowing that failure or turning a
    // publish that already succeeded into a server error.
    const warning = await unpublishedLinkWarning(doc, data.slug);

    const previouslyPublished = await publishedSnapshot(input.id);
    const previous = beforeRef(identityOf(post), previouslyPublished);

    const instant = row.publishedAt ?? new Date();
    const base = buildSnapshot(view, {
      relatedSlugs: data.relatedSlugs,
      entities: data.entities,
      publishedAt: instant.toISOString(),
      contentModifiedAt: row.contentModifiedAt?.toISOString() ?? null,
    });
    // The "Updated" byline, JSON-LD dateModified and every sitemap lastmod
    // move together with this, so it moves only when the ARTICLE moved.
    // contentFingerprint ignores the instants, which is what makes comparing a
    // snapshot built with the old value legitimate.
    const movedAt = contentChanged(previouslyPublished, base) ? new Date() : null;
    const snapshot =
      movedAt === null ? base : { ...base, contentModifiedAt: movedAt.toISOString() };

    // 1. Relations, before anything that moves the version.
    await replaceRelated(db, input.id, data.relatedSlugs);
    await replaceEntities(db, input.id, data.entities);

    // 2. The revision this publish makes public.
    const revision = await insertRevisionOnce({
      postId: input.id,
      reason: 'publish',
      slug: data.slug,
      title: data.title,
      categoryId: category.id,
      authorId: author.id,
      publishedAt: instant,
      contentModifiedAt: movedAt ?? row.contentModifiedAt,
      robotsIndex: data.robotsIndex,
      llmsInclude: data.llmsInclude,
      wordCount: words,
      snapshot,
      actorId: profile.session.user.id,
      actorName: profile.session.user.name || 'Unknown',
    });

    // 3. The article and the publication state, in ONE version-guarded
    // statement. A publish is a save and a transition at once, and splitting
    // it would bump the version twice and leave a window in which the new text
    // was live under the old status.
    let version: number | null;
    try {
      version = await publishPostRow(db, input.id, input.version, {
        revisionId: revision.id,
        publishedAt: instant,
        ...(movedAt ? { contentModifiedAt: movedAt } : {}),
        columns,
      });
    } catch (dbError) {
      await discardRevision(revision.id);
      // The slug pre-check is a read, so a second writer can land between it
      // and this UPDATE. The unique index is the race backstop.
      if (isUniqueViolation(dbError)) {
        return refuse({ slug: 'That slug is already in use.' });
      }
      throw dbError;
    }
    if (version === null) {
      await discardRevision(revision.id);
      return { ok: false, error: 'conflict' };
    }

    logActivity(profile, {
      area: 'blogs',
      entity: 'blog-post',
      entityId: input.id,
      entityName: postLabel(data.title),
      action: 'status',
      summary: `Published the post ${postLabel(data.title)}`,
      payload: {
        changes: { status: { from: row.status, to: 'published' } },
        meta: { slug: data.slug, revision: revision.number },
      },
    });

    invalidateBlog(publishedRef(data.slug, snapshot), previous);
    return {
      ok: true,
      id: input.id,
      version,
      wordCount: words,
      previousWordCount: row.wordCount,
      ...(warning ? { warnings: [warning] } : {}),
    };
  } catch (error) {
    reportError('[blogs] publishPost failed', error);
    return { ok: false, error: 'server' };
  }
}

// ── Schedule ────────────────────────────────────────────────────────────────

/** What both schedule doors take. The DAY and TIME the writer picked are
 *  resolved to an instant in the EDITOR, through `dayTimeIn(viewerZone, ...)`,
 *  because only the browser knows whose clock they were reading. */
export type BlogScheduleOptions = { publishAt: string };

/**
 * The shared body of `schedulePost` and `updateSchedule`.
 *
 * A scheduled post goes live UNATTENDED, so it must already satisfy every
 * publish rule: the strict schema, a hero, a body, and a category with
 * metadata. The only difference between the two doors is the judgement at the
 * top, which is why `mode` exists and why the door itself is not the place for
 * either branch.
 *
 * The revision carries the INTENDED instant in its typed `published_at` and in
 * `snapshot.publishedAt`. That is what lets the cron publish with one UPDATE
 * and touch no revision row: the public date is read off the revision, so if
 * it were not written here the cron would have to write it later, from a route
 * handler, without a version to guard.
 */
async function writeSchedule(
  profile: Awaited<ReturnType<typeof requireArea>>,
  input: BlogSaveInput,
  options: BlogScheduleOptions,
  mode: 'new' | 'update',
): Promise<BlogMutationResult> {
  const at = new Date(options.publishAt);
  if (Number.isNaN(at.getTime())) return refuse({ publishAt: 'Pick a date and a time.' });
  if (at.getTime() <= Date.now()) {
    return refuse({ publishAt: 'Pick a time in the future. That moment has already passed.' });
  }

  const prep = await prepareSave(input, 'publish');
  if (!prep.ok) return prep.result;
  const { post, data, doc, category, author, columns, view, words } = prep.prepared;
  const row = post.post;

  if (mode === 'new') {
    const problem = transitionProblem(row.status, 'scheduled', {
      everPublished: row.publishedAt !== null,
    });
    if (problem !== null) return refuse({ _form: problem });
  } else if (row.status !== 'scheduled') {
    // NOT `transitionProblem`, deliberately: it refuses scheduled -> scheduled
    // as "nothing to do", which is right for a STATUS change and wrong here.
    // Moving a schedule is an edit of a scheduled post, not a transition.
    return refuse({ _form: 'This post is not scheduled, so there is no schedule to move.' });
  }

  const categoryProblem = categoryReady(category);
  if (categoryProblem !== null) return refuse({ categorySlug: categoryProblem });

  const warning = await unpublishedLinkWarning(doc, data.slug);

  const snapshot = buildSnapshot(view, {
    relatedSlugs: data.relatedSlugs,
    entities: data.entities,
    publishedAt: at.toISOString(),
    contentModifiedAt: row.contentModifiedAt?.toISOString() ?? null,
  });

  await replaceRelated(db, input.id, data.relatedSlugs);
  await replaceEntities(db, input.id, data.entities);

  const revision = await insertRevisionOnce({
    postId: input.id,
    reason: 'schedule',
    slug: data.slug,
    title: data.title,
    categoryId: category.id,
    authorId: author.id,
    publishedAt: at,
    contentModifiedAt: row.contentModifiedAt,
    robotsIndex: data.robotsIndex,
    llmsInclude: data.llmsInclude,
    wordCount: words,
    snapshot,
    actorId: profile.session.user.id,
    actorName: profile.session.user.name || 'Unknown',
  });

  let version: number | null;
  try {
    version = await schedulePostRow(db, input.id, input.version, {
      revisionId: revision.id,
      publishAt: at,
      columns,
    });
  } catch (dbError) {
    await discardRevision(revision.id);
    if (isUniqueViolation(dbError)) return refuse({ slug: 'That slug is already in use.' });
    throw dbError;
  }
  if (version === null) {
    // Safe to delete: the guarded UPDATE matched nothing, so this revision was
    // never pointed at by `pending_revision_id`. The rule it would otherwise
    // trip is that dropping a revision a still-`scheduled` row points at nulls
    // the pointer under it and violates `blog_posts_schedule_stamp`.
    await discardRevision(revision.id);
    return { ok: false, error: 'conflict' };
  }

  logActivity(profile, {
    area: 'blogs',
    entity: 'blog-post',
    entityId: input.id,
    entityName: postLabel(data.title),
    action: 'status',
    summary:
      mode === 'new'
        ? `Scheduled the post ${postLabel(data.title)}`
        : `Moved the schedule for the post ${postLabel(data.title)}`,
    payload: { meta: { slug: data.slug, revision: revision.number, publishAt: at.toISOString() } },
  });

  // Nothing public moved: a scheduled post is not on the site yet. Both refs
  // are the same hidden post, so this is the admin layout and nothing else.
  invalidateBlog(hiddenRef(identityOf(post)), hiddenRef(identityOf(post)));
  return {
    ok: true,
    id: input.id,
    version,
    wordCount: words,
    previousWordCount: row.wordCount,
    ...(warning ? { warnings: [warning] } : {}),
  };
}

/** Set a schedule on a draft. Only from `draft`: the CHECK
 *  `blog_posts_pending_only_scheduled` refuses a pending revision on any other
 *  status, so a scheduled UPDATE to a live post has no shape in this model and
 *  is deferred on purpose. */
export async function schedulePost(
  input: BlogSaveInput,
  options: BlogScheduleOptions,
): Promise<BlogMutationResult> {
  const profile = await requireArea('blogs', '/admin');
  try {
    return await writeSchedule(profile, input, options, 'new');
  } catch (error) {
    reportError('[blogs] schedulePost failed', error);
    return { ok: false, error: 'server' };
  }
}

/** Move a schedule, or refresh what it will publish. It RE-SNAPSHOTS, so the
 *  edits made since scheduling are the ones that go live; the editor tells the
 *  writer that, and this door just does it. */
export async function updateSchedule(
  input: BlogSaveInput,
  options: BlogScheduleOptions,
): Promise<BlogMutationResult> {
  const profile = await requireArea('blogs', '/admin');
  try {
    return await writeSchedule(profile, input, options, 'update');
  } catch (error) {
    reportError('[blogs] updateSchedule failed', error);
    return { ok: false, error: 'server' };
  }
}

/**
 * Call a schedule off: `scheduled` back to `draft`.
 *
 * No revision, because nothing was published and the schedule revision is
 * already in the history where it belongs. Both halves of the schedule clear
 * in the SAME statement that leaves `scheduled`, which is what keeps
 * `blog_posts_schedule_stamp` satisfied at every instant.
 */
export async function unschedulePost(id: string, version: number): Promise<BlogMutationResult> {
  const profile = await requireArea('blogs', '/admin');

  try {
    if (badTarget(id, version)) return { ok: false, error: 'server' };
    const post = await getAdminPost(id);
    if (post === null) return { ok: false, error: 'server' };
    const row = post.post;

    const problem = transitionProblem(row.status, 'draft', {
      everPublished: row.publishedAt !== null,
    });
    if (problem !== null) return refuse({ _form: problem });

    const next = await unschedulePostRow(db, id, version);
    if (next === null) return { ok: false, error: 'conflict' };

    logActivity(profile, {
      area: 'blogs',
      entity: 'blog-post',
      entityId: id,
      entityName: postLabel(row.title),
      action: 'status',
      summary: `Unscheduled the post ${postLabel(row.title)}`,
      payload: {
        changes: { status: { from: row.status, to: 'draft' } },
        meta: { slug: row.slug },
      },
    });

    invalidateBlog(hiddenRef(identityOf(post)), hiddenRef(identityOf(post)));
    return {
      ok: true,
      id,
      version: next,
      wordCount: row.wordCount,
      previousWordCount: row.wordCount,
    };
  } catch (error) {
    reportError('[blogs] unschedulePost failed', error);
    return { ok: false, error: 'server' };
  }
}

// ── Unpublish ───────────────────────────────────────────────────────────────

/**
 * Take a live post down: `published` to `archived`.
 *
 * `published_revision_id` and `published_at` are KEPT, which is the whole
 * meaning of Archived: it was live, it is not now, and publishing it again
 * restores the date it originally went out on rather than re-dating a
 * two-year-old article to today.
 *
 * The revision it writes describes the post as it stood, off the STORED ROW
 * rather than a payload: this door takes no fields, and inventing any would
 * publish edits nobody asked to publish.
 */
export async function unpublishPost(id: string, version: number): Promise<BlogMutationResult> {
  const profile = await requireArea('blogs', '/admin');

  try {
    if (badTarget(id, version)) return { ok: false, error: 'server' };
    const post = await getAdminPost(id);
    if (post === null) return { ok: false, error: 'server' };
    const row = post.post;

    const problem = transitionProblem(row.status, 'archived', {
      everPublished: row.publishedAt !== null,
    });
    if (problem !== null) return refuse({ _form: problem });

    const previous = beforeRef(identityOf(post), await publishedSnapshot(id));

    const snapshot = buildSnapshot(rowView(post), {
      relatedSlugs: post.relatedSlugs,
      entities: post.entities,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      contentModifiedAt: row.contentModifiedAt?.toISOString() ?? null,
    });
    const revision = await insertRevisionOnce({
      postId: id,
      reason: 'unpublish',
      slug: row.slug,
      title: row.title,
      categoryId: row.categoryId,
      authorId: row.authorId,
      publishedAt: row.publishedAt,
      contentModifiedAt: row.contentModifiedAt,
      robotsIndex: row.robotsIndex,
      llmsInclude: row.llmsInclude,
      wordCount: row.wordCount,
      snapshot,
      actorId: profile.session.user.id,
      actorName: profile.session.user.name || 'Unknown',
    });

    const next = await unpublishPostRow(db, id, version);
    if (next === null) {
      await discardRevision(revision.id);
      return { ok: false, error: 'conflict' };
    }

    logActivity(profile, {
      area: 'blogs',
      entity: 'blog-post',
      entityId: id,
      entityName: postLabel(row.title),
      action: 'status',
      summary: `Unpublished the post ${postLabel(row.title)}`,
      payload: {
        changes: { status: { from: row.status, to: 'archived' } },
        meta: { slug: row.slug, revision: revision.number },
      },
    });

    // The current side is not public, which is what announces the vanished URL
    // to IndexNow: engines refetch, meet the 404, and drop it.
    invalidateBlog(hiddenRef(identityOf(post)), previous);
    return {
      ok: true,
      id,
      version: next,
      wordCount: row.wordCount,
      previousWordCount: row.wordCount,
    };
  } catch (error) {
    reportError('[blogs] unpublishPost failed', error);
    return { ok: false, error: 'server' };
  }
}

// ── Trash, restore and purge ────────────────────────────────────────────────

/** How many rows one bulk move may touch. The list pages at 25, and a cap is
 *  what keeps a hand-built call from rewriting the whole corpus in one go. */
const BULK_MAX = 100;

/**
 * Shape-check and dedupe a selection, or say why not.
 *
 * Over the cap is a REFUSAL rather than a slice. A silent truncation here
 * returns a `count` smaller than the selection with no way to tell "already in
 * the bin" from "quietly dropped", which on a destructive move is the house
 * no-silent-truncation rule at its most expensive.
 */
function bulkIds(ids: string[]): { ok: true; ids: string[] } | { ok: false; result: BlogBulkResult } {
  const unique = [...new Set(ids.filter((id) => UUID_RE.test(id)))];
  if (unique.length > BULK_MAX) {
    return {
      ok: false,
      result: {
        ok: false,
        error: 'validation',
        issues: { _form: `Pick at most ${BULK_MAX} posts at a time.` },
      },
    };
  }
  return { ok: true, ids: unique };
}

/**
 * Bin one post: any status except `trash`.
 *
 * ALL FOUR COLUMNS MOVE TOGETHER, in `trashPostRow`. `blog_posts_trash_stamp`
 * is an EQUIVALENCE, so a status without its stamp is refused outright; and a
 * `publish_at` left behind on a binned row is a schedule that will never fire
 * while the list still reads "Scheduled for".
 *
 * No revision: nothing about the article changed, and the history already says
 * what it was.
 */
export async function trashPost(id: string, version: number): Promise<BlogMutationResult> {
  const profile = await requireArea('blogs', '/admin');

  try {
    if (badTarget(id, version)) return { ok: false, error: 'server' };
    const post = await getAdminPost(id);
    if (post === null) return { ok: false, error: 'server' };
    const row = post.post;

    const problem = transitionProblem(row.status, 'trash', {
      everPublished: row.publishedAt !== null,
    });
    if (problem !== null) return refuse({ _form: problem });

    const previous = beforeRef(identityOf(post), await publishedSnapshot(id));

    const next = await trashPostRow(db, id, version, new Date());
    if (next === null) return { ok: false, error: 'conflict' };

    logActivity(profile, {
      area: 'blogs',
      entity: 'blog-post',
      entityId: id,
      entityName: postLabel(row.title),
      action: 'status',
      summary: `Moved the post ${postLabel(row.title)} to Trash`,
      payload: {
        changes: { status: { from: row.status, to: 'trash' } },
        meta: { slug: row.slug },
      },
    });

    invalidateBlog(hiddenRef(identityOf(post)), previous);
    return {
      ok: true,
      id,
      version: next,
      wordCount: row.wordCount,
      previousWordCount: row.wordCount,
    };
  } catch (error) {
    reportError('[blogs] trashPost failed', error);
    return { ok: false, error: 'server' };
  }
}

/**
 * Bin a selection. No version and no per-row judgement: what replaces the
 * version guard is the `status <> 'trash'` predicate inside the statement, so
 * a row somebody else already binned is skipped rather than restamped with a
 * new `trashed_at`, and the RETURNING says which rows really moved.
 *
 * One audit row per POST rather than one per action, so a post's own history
 * on /admin/logs records how it got to the bin.
 */
export async function trashPosts(ids: string[]): Promise<BlogBulkResult> {
  const profile = await requireArea('blogs', '/admin');

  try {
    const picked = bulkIds(ids);
    if (!picked.ok) return picked.result;
    if (picked.ids.length === 0) return { ok: true, count: 0 };

    const identities = await postIdentitiesFor(picked.ids);
    const movable = identities.filter((post) => post.status !== 'trash');
    if (movable.length === 0) return { ok: true, count: 0 };

    const published = await publishedRevisionsFor(
      movable.filter((post) => post.status === 'published').map((post) => post.id),
    );

    const moved = await trashPostRows(
      db,
      movable.map((post) => post.id),
      new Date(),
    );
    const movedIds = new Set(moved.map((row) => row.id));
    const done = movable.filter((post) => movedIds.has(post.id));
    if (done.length === 0) return { ok: true, count: 0 };

    logActivity(
      profile,
      done.map((post) => ({
        area: 'blogs',
        entity: 'blog-post',
        entityId: post.id,
        entityName: postLabel(post.title),
        action: 'status' as const,
        summary: `Moved the post ${postLabel(post.title)} to Trash`,
        payload: {
          changes: { status: { from: post.status, to: 'trash' } },
          meta: { slug: post.slug },
        },
      })),
    );

    for (const post of done) {
      invalidateBlog(hiddenRef(post), beforeRef(post, published.get(post.id)?.snapshot ?? null));
    }
    return { ok: true, count: done.length };
  } catch (error) {
    reportError('[blogs] trashPosts failed', error);
    return { ok: false, error: 'server' };
  }
}

/**
 * Lift one post out of the bin, to wherever its own history sends it.
 *
 * `restoreTarget` decides, never the caller: a formerly live post comes back
 * as Archived, because a `draft` row still carrying a `published_revision_id`
 * says "published" to every reader of the working row while its URL 404s, and
 * to whoever pressed Restore that reads as data loss. Republishing is a
 * separate, deliberate act.
 */
export async function restorePost(id: string, version: number): Promise<BlogMutationResult> {
  const profile = await requireArea('blogs', '/admin');

  try {
    if (badTarget(id, version)) return { ok: false, error: 'server' };
    const post = await getAdminPost(id);
    if (post === null) return { ok: false, error: 'server' };
    const row = post.post;

    const history = { everPublished: row.publishedAt !== null };
    const target = restoreTarget(history);
    const problem = transitionProblem(row.status, target, history);
    if (problem !== null) return refuse({ _form: problem });

    const next = await restorePostRow(db, id, version, target);
    if (next === null) return { ok: false, error: 'conflict' };

    logActivity(profile, {
      area: 'blogs',
      entity: 'blog-post',
      entityId: id,
      entityName: postLabel(row.title),
      action: 'status',
      summary: `Restored the post ${postLabel(row.title)} from Trash`,
      payload: {
        changes: { status: { from: row.status, to: target } },
        meta: { slug: row.slug },
      },
    });

    // Neither side is public: a restore never goes straight back to published.
    invalidateBlog(hiddenRef(identityOf(post)), hiddenRef(identityOf(post)));
    return {
      ok: true,
      id,
      version: next,
      wordCount: row.wordCount,
      previousWordCount: row.wordCount,
    };
  } catch (error) {
    reportError('[blogs] restorePost failed', error);
    return { ok: false, error: 'server' };
  }
}

/**
 * Lift a selection out of the bin. The rows are SPLIT by `restoreTarget` in
 * JS and written one statement per target, rather than expressed as a SQL
 * `case`: the rule about where a restore lands lives in blogFields.ts, and a
 * second copy of it in a WHERE clause is a second copy that can drift.
 */
export async function restorePosts(ids: string[]): Promise<BlogBulkResult> {
  const profile = await requireArea('blogs', '/admin');

  try {
    const picked = bulkIds(ids);
    if (!picked.ok) return picked.result;
    if (picked.ids.length === 0) return { ok: true, count: 0 };

    const identities = await postIdentitiesFor(picked.ids);
    const binned = identities.filter((post) => post.status === 'trash');
    if (binned.length === 0) return { ok: true, count: 0 };

    const byTarget = new Map<BlogPostStatus, PostIdentity[]>();
    for (const post of binned) {
      const target = restoreTarget({ everPublished: post.publishedAt !== null });
      byTarget.set(target, [...(byTarget.get(target) ?? []), post]);
    }

    const done: { post: PostIdentity; target: BlogPostStatus }[] = [];
    for (const [target, group] of byTarget) {
      const moved = await restorePostRows(
        db,
        group.map((post) => post.id),
        target,
        new Date(),
      );
      const movedIds = new Set(moved.map((row) => row.id));
      for (const post of group) {
        if (movedIds.has(post.id)) done.push({ post, target });
      }
    }
    if (done.length === 0) return { ok: true, count: 0 };

    logActivity(
      profile,
      done.map(({ post, target }) => ({
        area: 'blogs',
        entity: 'blog-post',
        entityId: post.id,
        entityName: postLabel(post.title),
        action: 'status' as const,
        summary: `Restored the post ${postLabel(post.title)} from Trash`,
        payload: {
          changes: { status: { from: post.status, to: target } },
          meta: { slug: post.slug },
        },
      })),
    );

    for (const { post } of done) invalidateBlog(hiddenRef(post), hiddenRef(post));
    return { ok: true, count: done.length };
  } catch (error) {
    reportError('[blogs] restorePosts failed', error);
    return { ok: false, error: 'server' };
  }
}

/**
 * Delete a post for good. `trash` only.
 *
 * ONE statement, with `status = 'trash'` in its WHERE: that predicate is the
 * guard that stops a stale id, from a list somebody left open, from deleting a
 * live article. The revisions, related rows and entity links all CASCADE, and
 * the pointers are deliberately not nulled first (two more statements, two
 * more failure windows, in a system with no transactions).
 *
 * Two consequences are encoded rather than left to be discovered:
 *
 *  - `article_feedback` rows are keyed by bare slug with no foreign key, so
 *    the votes on this post survive it. /admin/feedback already renders an
 *    orphan as the slug plus "(removed post)". They are KEPT on purpose, and
 *    the confirm copy says so.
 *  - Another post's PUBLISHED snapshot may still name this slug in its
 *    `relatedSlugs`, and the cascade only cleans the WORKING table. So the
 *    referrers are read BEFORE the delete and their per-slug cache entries are
 *    refreshed. No IndexNow ping for them: a binned post was already out of
 *    every related strip, so their rendered bytes did not move.
 */
export async function purgePost(id: string): Promise<BlogActionResult> {
  const profile = await requireArea('blogs', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'server' };
    const post = await getAdminPost(id);
    if (post === null) return refuse({ _form: 'That post is no longer here.' });
    const row = post.post;

    if (row.status !== 'trash') {
      return refuse({
        _form: 'Only a post in Trash can be deleted for good. Move it to Trash first.',
      });
    }

    const referrers = await relatedReferrerSlugs(id);

    const deleted = await purgePostRow(db, id);
    if (!deleted) return { ok: false, error: 'conflict' };

    logActivity(profile, {
      area: 'blogs',
      entity: 'blog-post',
      entityId: id,
      entityName: postLabel(row.title),
      action: 'delete',
      summary: `Deleted the post ${postLabel(row.title)} for good`,
      payload: { meta: { slug: row.slug } },
    });

    invalidateBlog(undefined, hiddenRef(identityOf(post)), referrers);

    // POST-RESPONSE, best-effort, and structurally unable to fail the action:
    // the row is already gone, so a blob left behind is storage hygiene rather
    // than a correctness problem, and holding the confirm open for two serial
    // Blob API calls would be worse than the stray.
    after(async () => {
      try {
        const strays = await listPublic({ prefix: `blogs/${id}/` });
        if (strays.blobs.length > 0) await delPublic(strays.blobs.map((b) => b.pathname));
      } catch (error) {
        reportError('[blogs] purgePost blob sweep failed', error);
      }
    });

    return { ok: true };
  } catch (error) {
    reportError('[blogs] purgePost failed', error);
    return { ok: false, error: 'server' };
  }
}

// ── The published date ──────────────────────────────────────────────────────

/**
 * Change when a published post says it went out.
 *
 * The day is a DAY KEY and it is stored through `dayNoonIn(STUDIO_TZ, ...)`,
 * never as an instant chosen in a browser: all 38 imported rows are
 * noon-anchored, and an editor in Tehran picking a morning time would store an
 * instant that `dayKeyIn(STUDIO_TZ, ...)` reads back as the day before. The
 * key is round-tripped rather than merely pattern-matched, so `2026-13-45`
 * is refused instead of silently rolling over into the next year.
 *
 * It is a normal Update: a new `publish` revision carrying the amended instant
 * in its typed column and in its snapshot, and the pointer moves to it. History
 * is never edited in place. `published_at` is set DIRECTLY here, the one place
 * the publish coalesce does not apply, because replacing the date is the whole
 * act.
 *
 * The snapshot is the CURRENTLY PUBLISHED one with only its date changed, not
 * the working copy: a writer amending a date must not discover that they also
 * published a fortnight of unfinished edits.
 */
export async function amendPublishedDate(
  id: string,
  version: number,
  dayKey: string,
): Promise<BlogMutationResult> {
  const profile = await requireArea('blogs', '/admin');

  try {
    if (badTarget(id, version)) return { ok: false, error: 'server' };
    if (!DAY_KEY_RE.test(dayKey)) return refuse({ publishedAt: 'Pick a date.' });
    const instant = dayNoonIn(STUDIO_TZ, dayKey);
    if (dayKeyIn(STUDIO_TZ, instant) !== dayKey) return refuse({ publishedAt: 'Pick a real date.' });

    const post = await getAdminPost(id);
    if (post === null) return { ok: false, error: 'server' };
    const row = post.post;

    if (row.status !== 'published') {
      return refuse({ publishedAt: 'Only a published post has a publication date to change.' });
    }
    const current = (await publishedRevisionsFor([id])).get(id) ?? null;
    if (current === null) {
      return refuse({ publishedAt: 'This post has no published version to re-date.' });
    }

    const previous = publishedRef(row.slug, current.snapshot);
    const snapshot: BlogRevisionSnapshot = {
      ...current.snapshot,
      publishedAt: instant.toISOString(),
    };

    const revision = await insertRevisionOnce({
      postId: id,
      reason: 'publish',
      slug: current.slug,
      title: current.title,
      categoryId: current.categoryId,
      authorId: current.authorId,
      publishedAt: instant,
      contentModifiedAt: current.contentModifiedAt,
      robotsIndex: current.robotsIndex,
      llmsInclude: current.llmsInclude,
      wordCount: current.wordCount,
      snapshot,
      actorId: profile.session.user.id,
      actorName: profile.session.user.name || 'Unknown',
    });

    const next = await amendPublishedAtRow(db, id, version, {
      revisionId: revision.id,
      publishedAt: instant,
    });
    if (next === null) {
      await discardRevision(revision.id);
      return { ok: false, error: 'conflict' };
    }

    logActivity(profile, {
      area: 'blogs',
      entity: 'blog-post',
      entityId: id,
      entityName: postLabel(row.title),
      action: 'update',
      summary: `Changed the publication date of the post ${postLabel(row.title)}`,
      payload: { meta: { slug: row.slug, revision: revision.number, day: dayKey } },
    });

    // The fingerprint has not moved (publicFingerprint ignores the instants on
    // purpose), so `dates` on the ref is what tells IndexNow this URL really
    // did change: the visible byline, og:publishedTime, JSON-LD datePublished
    // and the position of the post in every listing.
    invalidateBlog(publishedRef(row.slug, snapshot), previous);
    return {
      ok: true,
      id,
      version: next,
      wordCount: row.wordCount,
      previousWordCount: row.wordCount,
    };
  } catch (error) {
    reportError('[blogs] amendPublishedDate failed', error);
    return { ok: false, error: 'server' };
  }
}

// ── Restoring an earlier version ────────────────────────────────────────────

/**
 * Copy a revision's snapshot back into the WORKING columns and the two
 * relation tables, and touch nothing else.
 *
 * THREE THINGS IT MUST NOT RESTORE, each deliberate:
 *  - the SLUG. It is the public URL, and it is locked once a post has ever
 *    been published. `BlogWorkingUpdate` can express it, so its absence from
 *    the columns below is the guard.
 *  - the DATES. `published_at`, `publish_at` and `content_modified_at` are
 *    publication facts, not content.
 *  - the STATUS and either pointer. Restoring content into a live post does
 *    not republish it; the writer presses Update for that.
 * The last two are structural: `BlogWorkingUpdate` omits all seven columns, so
 * naming one here is a type error rather than a rule to remember.
 *
 * And one thing it RECOMPUTES rather than copies: `word_count`. An import-era
 * snapshot carries the legacy `countWords(mdx)` over the whole MDX file, which
 * runs 4 to 21 percent high, so copying it would put that number back onto a
 * post that no longer has any legacy anything.
 */
export async function restoreRevision(
  postId: string,
  revisionId: string,
  version: number,
): Promise<BlogMutationResult> {
  const profile = await requireArea('blogs', '/admin');

  try {
    if (badTarget(postId, version) || !UUID_RE.test(revisionId)) {
      return { ok: false, error: 'server' };
    }
    const post = await getAdminPost(postId);
    if (post === null) return { ok: false, error: 'server' };
    const row = post.post;

    if (row.status === 'trash') {
      return refuse({ _form: 'This post is in Trash. Restore the post first.' });
    }

    const source = await getRevisionForPost(postId, revisionId);
    if (source === null) return refuse({ _form: 'That version is no longer available.' });
    const snap = source.snapshot;

    // Re-validated rather than trusted: it makes the CANONICAL document the
    // thing that goes back into the column, and it is what the word count and
    // the body text are then derived from.
    const checked = validateBlogBody(snap.body);
    if (!checked.ok) {
      reportError('[blogs] restoreRevision body refused', new Error(checked.problems.join(' | ')));
      return refuse({ body: BODY_REFUSAL });
    }
    const doc = checked.doc;

    // The snapshot stores SLUGS where the row stores ids. A category or author
    // deleted since keeps its current value rather than failing the restore:
    // there is nothing to restore it to, and refusing would strand the writer.
    const [categories, authors] = await Promise.all([listCategoriesAdmin(), listAuthorsAdmin()]);
    const category = categories.find((c) => c.slug === snap.categorySlug) ?? post.category;
    const author = authors.find((a) => a.slug === snap.authorSlug) ?? post.author;

    const words = wordCount({ doc, faqs: snap.faqs });
    const view: BlogWorkingView = {
      ...rowView(post),
      title: snap.title,
      description: snap.description,
      categorySlug: category.slug,
      authorSlug: author.slug,
      serviceSlug: snap.serviceSlug,
      heroStaticPath: snap.hero.staticPath,
      heroMedia: snap.hero.media,
      heroAlt: snap.hero.alt,
      heroCaption: snap.hero.caption,
      body: doc,
      bodyText: bodyText(doc),
      wordCount: words,
      keyTakeaways: snap.keyTakeaways,
      faqs: snap.faqs,
      sources: snap.sources,
      seoTitle: snap.seo.title,
      seoDescription: snap.seo.description,
      canonicalOverride: snap.seo.canonicalOverride,
      ogTitle: snap.seo.ogTitle,
      ogDescription: snap.seo.ogDescription,
      ogImageStaticPath: snap.seo.ogImage?.staticPath ?? null,
      ogImageMedia: snap.seo.ogImage?.media ?? null,
      twitterCard: snap.seo.twitterCard,
      robotsIndex: snap.seo.robotsIndex,
      robotsFollow: snap.seo.robotsFollow,
      robotsExtra: snap.seo.robotsExtra,
      focusKeywords: snap.seo.focusKeywords,
      emitLegacyMetaKeywords: snap.seo.emitLegacyMetaKeywords,
      llmsInclude: snap.llmsInclude,
    };

    // Derived FROM the view, so the columns written and the snapshot stored
    // cannot describe two different articles.
    const columns: BlogWorkingUpdate = {
      title: view.title,
      description: view.description,
      categoryId: category.id,
      authorId: author.id,
      serviceSlug: view.serviceSlug,
      heroStaticPath: view.heroStaticPath,
      heroMedia: view.heroMedia,
      heroAlt: view.heroAlt,
      heroCaption: view.heroCaption,
      body: view.body,
      bodyText: view.bodyText,
      wordCount: view.wordCount,
      keyTakeaways: view.keyTakeaways,
      faqs: view.faqs,
      sources: view.sources,
      seoTitle: view.seoTitle,
      seoDescription: view.seoDescription,
      canonicalOverride: view.canonicalOverride,
      ogTitle: view.ogTitle,
      ogDescription: view.ogDescription,
      ogImageStaticPath: view.ogImageStaticPath,
      ogImageMedia: view.ogImageMedia,
      twitterCard: view.twitterCard,
      robotsIndex: view.robotsIndex,
      robotsFollow: view.robotsFollow,
      robotsExtra: view.robotsExtra,
      focusKeywords: view.focusKeywords,
      emitLegacyMetaKeywords: view.emitLegacyMetaKeywords,
      llmsInclude: view.llmsInclude,
    };

    await replaceRelated(db, postId, snap.relatedSlugs);
    await replaceEntities(db, postId, snap.entities);

    const snapshot = buildSnapshot(view, {
      relatedSlugs: snap.relatedSlugs,
      entities: snap.entities,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      contentModifiedAt: row.contentModifiedAt?.toISOString() ?? null,
    });
    const revision = await insertRevisionOnce({
      postId,
      reason: 'restore',
      slug: row.slug,
      title: snap.title,
      categoryId: category.id,
      authorId: author.id,
      publishedAt: row.publishedAt,
      contentModifiedAt: row.contentModifiedAt,
      robotsIndex: snap.seo.robotsIndex,
      llmsInclude: snap.llmsInclude,
      wordCount: words,
      snapshot,
      actorId: profile.session.user.id,
      actorName: profile.session.user.name || 'Unknown',
    });

    const next = await updateWorkingCopy(db, postId, version, columns);
    if (next === null) {
      await discardRevision(revision.id);
      return { ok: false, error: 'conflict' };
    }

    logActivity(profile, {
      area: 'blogs',
      entity: 'blog-post',
      entityId: postId,
      entityName: postLabel(row.title),
      action: 'update',
      summary: `Restored version ${source.number} of the post ${postLabel(row.title)}`,
      payload: { meta: { slug: row.slug, from: source.number, revision: revision.number } },
    });

    // The WORKING copy moved and nothing public did, so this follows savePost
    // rather than invalidateBlog: on a live post the published revision is
    // still what visitors are reading, and refreshing BLOGS_TAG here would
    // re-render the whole marketing site for an edit nobody outside /admin can
    // see.
    revalidatePath('/admin', 'layout');
    return {
      ok: true,
      id: postId,
      version: next,
      wordCount: words,
      previousWordCount: row.wordCount,
    };
  } catch (error) {
    reportError('[blogs] restoreRevision failed', error);
    return { ok: false, error: 'server' };
  }
}
