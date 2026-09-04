'use server';

/**
 * Write actions for the blog's taxonomy: the AUTHORS a post is bylined to and
 * the CATEGORIES it files under. Until now both were rows only the importer
 * and psql could write, so adding the SEO specialist as a public byline was an
 * SQL insert. Task 14 builds the dialogs; this is the door they call.
 *
 * SECURITY: the protected layout's guard does NOT wrap server actions, so
 * every action gates itself on the blogs area (`requireArea`), FIRST and
 * outside the try, so its redirect is never swallowed by the catch. Ids are
 * shape-validated before touching Postgres so a malformed one can't 500 on the
 * uuid cast. `user_id` is the one field the blogs grant is not enough for, and
 * it is gated separately below.
 *
 * TWO REFUSALS CARRY THIS FILE, and both are refusals rather than silent
 * behaviour on purpose:
 *
 *  - A SLUG IS IMMUTABLE after creation. `/blogs/authors/<slug>` is a live URL
 *    and `?category=<slug>` is the hub's filter value, baked into 13 legacy
 *    redirects in next.config.ts. Silently keeping the old one leaves the
 *    member believing the rename worked, which is worse than saying no.
 *  - A DELETE IS REFUSED WHILE ANYTHING POINTS AT THE ROW, and the count
 *    covers `blog_post_revisions` as well as `blog_posts`: both carry the
 *    foreign key with ON DELETE RESTRICT, so counting only the working rows
 *    lets the statement reach Postgres and surface as a raw 23503 instead of a
 *    sentence. `blogUsageRefusal` composes it.
 *
 * Cache contract: every successful write calls `invalidateBlogTaxonomy` in
 * `@/lib/blogInvalidate`, the module `invalidateBlog` was lifted into so both
 * files share one contract. An author's name and role are on every card
 * byline, every author page and every post; a category's title is on every
 * card, the hub's filter chips and the `<title>` of `/blogs?category=`. So the
 * caches always refresh. The IndexNow PING does not: it is gated on a
 * fingerprint over what a visitor can actually read, the same discipline
 * `_actions/careers.ts` uses, because announcing a URL whose bytes did not
 * move is a Bing spam signal.
 *
 * Audit contract: `logActivity` in the ok branch only, after the real write
 * succeeded. A summary names the slug and the name, and no bio prose or other
 * member-typed free text.
 *
 * ONE THING THIS DELIBERATELY DOES NOT REACH. `src/lib/adminIdentity.ts`
 * inlines two team members' photo paths and role strings rather than reading
 * `blog_authors`, because those helpers are synchronous per-render formatters
 * and the dashboard must not depend on the blog store. So editing an author's
 * role HERE will not change the role shown beside their name in the dashboard.
 * That is the intended arrangement, not an oversight to be fixed by wiring the
 * store into the identity helpers.
 */
import { eq } from 'drizzle-orm';
import { after } from 'next/server';

import { db } from '@/db';
import {
  bylineUserExists,
  countPostsForAuthor,
  countPostsForCategory,
  getBlogAuthor,
  getBlogCategory,
  nextAuthorSort,
  nextBlogCategorySort,
  publishedPostsForAuthor,
  publishedPostsForCategory,
} from '@/db/blogAdminQueries';
import { blogAuthors, blogCategories, type BlogAuthor, type BlogCategory } from '@/db/schema';
import { diff } from '@/lib/activityFields';
import { logActivity } from '@/lib/activityLog';
import { requireArea, type AccessProfile } from '@/lib/adminAccess';
import {
  authorPublicFingerprint,
  blogUsageRefusal,
  categoryPublicFingerprint,
} from '@/lib/blogFields';
import { invalidateBlogTaxonomy } from '@/lib/blogInvalidate';
import {
  blogAuthorFieldsSchema,
  blogCategoryFieldsSchema,
  flattenBlogIssues,
  type BlogAuthorFields,
  type BlogCategoryFields,
} from '@/lib/blogPostSchema';
import { reportError } from '@/lib/monitoringRecord';
import { delPublic, listPublic } from '@/lib/publicBlob';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Postgres error code, resolved through the cause chain: drizzle-orm wraps
 * neon-http driver errors in DrizzleQueryError with the NeonDbError (and its
 * `.code`) on `.cause`, so reading `.code` off the thrown error directly is
 * always undefined (same fix as _actions/blogPosts.ts and _actions/careers.ts).
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
const isFkViolation = (error: unknown): boolean => pgCode(error) === '23503';

/** What a create or an edit answers with. `BlogMutationResult`'s shape minus
 *  the two fields a taxonomy row has no analogue of: there is no version to
 *  race on, so no `conflict`, and no word count to report. */
export type BlogTaxonomyResult =
  | { ok: true; id: string }
  | { ok: false; error: 'validation'; issues: Record<string, string> }
  | { ok: false; error: 'server' };

/** What a delete answers with. No id: there is no longer a row. */
export type BlogTaxonomyActionResult =
  | { ok: true }
  | { ok: false; error: 'validation'; issues: Record<string, string> }
  | { ok: false; error: 'server' };

/** Every refusal here is a validation failure: the member typed or clicked
 *  something the domain will not take, and the sentence says why. */
const refuse = (issues: Record<string, string>) =>
  ({ ok: false, error: 'validation', issues }) as const;

const SLUG_LOCKED_AUTHOR =
  'An author slug cannot change after creation, because it is the /blogs/authors address people already have.';
const SLUG_LOCKED_CATEGORY =
  'A category slug cannot change after creation, because it is the filter value on /blogs and several old links redirect to it.';

/**
 * Fill `sortIndex` when the caller did not send one, BEFORE the parse.
 *
 * `blogAuthorFieldsSchema` requires it, and that is right for the importer,
 * which is reproducing a declaration order it already knows. A dialog does not
 * know one: a new row goes at the END. Defaulting here rather than relaxing
 * the schema keeps `.strict()` doing its job for the caller that would notice
 * a missing order, and an update falls back to the row's own slot rather than
 * quietly moving it.
 */
async function withSortIndex(input: unknown, fallback: () => Promise<number>): Promise<unknown> {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return input;
  const record = input as Record<string, unknown>;
  if (record.sortIndex !== undefined) return input;
  return { ...record, sortIndex: await fallback() };
}

/**
 * The `user_id` column, or nothing at all.
 *
 * `user_id` links a public byline to a dashboard account, which is a privilege
 * change rather than a copy edit, so ONLY the owner or a superadmin may set,
 * change or clear it. `getAccessProfile()` already carries the role, so this
 * costs no query. A member granting themselves a byline link is not a hole
 * worth leaving open.
 *
 * `undefined` means the caller did not send the field and the stored value is
 * left alone; `null` clears it. The parameter is `unknown` deliberately: the
 * value arrives from a browser, so a compile-time type is not a refusal, and
 * the shape has to be checked at runtime.
 */
async function bylineColumn(
  profile: AccessProfile,
  userId: unknown,
): Promise<
  | { ok: true; set: { userId?: string | null } }
  | { ok: false; issues: Record<string, string> }
> {
  if (userId === undefined) return { ok: true, set: {} };
  if (!profile.superadmin) {
    return {
      ok: false,
      issues: { userId: 'Only an owner or a superadmin can link a byline to a dashboard account.' },
    };
  }
  if (userId === null) return { ok: true, set: { userId: null } };
  if (typeof userId !== 'string' || userId === '' || userId.length > 255) {
    return { ok: false, issues: { userId: 'Pick an account from the list.' } };
  }
  if (!(await bylineUserExists(userId))) {
    return { ok: false, issues: { userId: 'That account is no longer here, so pick another.' } };
  }
  return { ok: true, set: { userId } };
}

// ── Authors ─────────────────────────────────────────────────────────────────

/**
 * The stored columns for an author.
 *
 * `imageMedia` is named ONLY when the caller sent it, and that is a
 * preservation mechanism rather than convenience: the schema field is optional
 * (see blogPostSchema.ts) precisely so a form that does not carry the photo
 * cannot write `image_media: null` over one somebody uploaded. A key never
 * named is a column that cannot be clobbered.
 */
function authorColumns(data: BlogAuthorFields) {
  return {
    name: data.name,
    kind: data.kind,
    role: data.role,
    bio: data.bio,
    imageStaticPath: data.imageStaticPath,
    ogImageStaticPath: data.ogImageStaticPath,
    sameAs: data.sameAs,
    knowsAbout: data.knowsAbout,
    tags: data.tags,
    location: data.location,
    sortIndex: data.sortIndex,
    ...(data.imageMedia !== undefined ? { imageMedia: data.imageMedia } : {}),
  };
}

/** The author page and the authors index, which every author change moves.
 *  `/blogs` is added only when a card actually carries the byline. */
const authorUrls = (slug: string) => ['/blogs/authors', `/blogs/authors/${slug}`];

export async function createAuthor(
  input: unknown,
  userId?: unknown,
): Promise<BlogTaxonomyResult> {
  const profile = await requireArea('blogs', '/admin');

  try {
    const byline = await bylineColumn(profile, userId);
    if (!byline.ok) return refuse(byline.issues);

    const parsed = blogAuthorFieldsSchema.safeParse(await withSortIndex(input, nextAuthorSort));
    if (!parsed.success) {
      return { ok: false, error: 'validation', issues: flattenBlogIssues(parsed.error) };
    }
    const data = parsed.data;

    let inserted: BlogAuthor[];
    try {
      inserted = await db
        .insert(blogAuthors)
        .values({ slug: data.slug, ...authorColumns(data), ...byline.set })
        .returning();
    } catch (dbError) {
      if (isUniqueViolation(dbError)) {
        return refuse({ slug: 'That author slug is already in use.' });
      }
      if (isFkViolation(dbError)) {
        return refuse({ userId: 'That account is no longer here, so pick another.' });
      }
      throw dbError;
    }
    const row = inserted[0];

    logActivity(profile, {
      area: 'blogs',
      entity: 'blog-author',
      entityId: row.id,
      entityName: row.name,
      action: 'create',
      summary: `Added the blog author ${row.name}`,
      payload: { meta: { slug: row.slug, kind: row.kind } },
    });

    // A brand-new author has no posts, so no card and no post page moved. The
    // authors index and the authors sitemap DO list every author whether or
    // not they have written anything (fetchAuthors in blogQueries.ts reads the
    // whole table), so the index changed and the profile URL is new.
    invalidateBlogTaxonomy(authorUrls(row.slug));
    return { ok: true, id: row.id };
  } catch (error) {
    reportError('[blogs] createAuthor failed', error);
    return { ok: false, error: 'server' };
  }
}

export async function updateAuthor(
  id: string,
  input: unknown,
  userId?: unknown,
): Promise<BlogTaxonomyResult> {
  const profile = await requireArea('blogs', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'server' };
    const byline = await bylineColumn(profile, userId);
    if (!byline.ok) return refuse(byline.issues);

    const existing = await getBlogAuthor(id);
    if (existing === null) return refuse({ _form: 'That author is no longer here.' });

    const parsed = blogAuthorFieldsSchema.safeParse(
      await withSortIndex(input, async () => existing.sortIndex),
    );
    if (!parsed.success) {
      return { ok: false, error: 'validation', issues: flattenBlogIssues(parsed.error) };
    }
    const data = parsed.data;
    if (data.slug !== existing.slug) return refuse({ slug: SLUG_LOCKED_AUTHOR });

    let updated: BlogAuthor[];
    try {
      // `updated_at` is stamped on EVERY save here, including a reorder, and
      // that is safe rather than sloppy: unlike `job_openings.updated_at`,
      // nothing reads this column. The authors sitemap's lastmod is the newest
      // POST an author carries (`latestPostDate` in blogStore.ts), so there is
      // no freshness signal for a reorder to falsify.
      updated = await db
        .update(blogAuthors)
        .set({ ...authorColumns(data), ...byline.set, updatedAt: new Date() })
        .where(eq(blogAuthors.id, id))
        .returning();
    } catch (dbError) {
      if (isFkViolation(dbError)) {
        return refuse({ userId: 'That account is no longer here, so pick another.' });
      }
      throw dbError;
    }
    const row = updated[0];
    if (!row) return refuse({ _form: 'That author is no longer here.' });

    logActivity(profile, {
      area: 'blogs',
      entity: 'blog-author',
      entityId: id,
      entityName: row.name,
      action: 'update',
      summary: `Edited the blog author ${row.name}`,
      payload: {
        changes: diff({ name: existing.name, role: existing.role }, { name: row.name, role: row.role }),
        meta: { slug: row.slug },
      },
    });

    // The fingerprint reads the STORED row, so it reports what was actually
    // written rather than what was asked for. A reorder and a byline link move
    // it not at all, which is the whole point: neither changes indexable text
    // on any single URL, so neither announces anything.
    const moved =
      authorPublicFingerprint(row) !== authorPublicFingerprint(existing);
    const urls = moved ? authorUrls(row.slug) : [];
    // The hub's cards carry the byline, but only for posts a VISITOR can see,
    // so an author with nothing published moves no byte on /blogs.
    if (moved && (await publishedPostsForAuthor(id)) > 0) urls.push('/blogs');
    invalidateBlogTaxonomy(urls);
    return { ok: true, id };
  } catch (error) {
    reportError('[blogs] updateAuthor failed', error);
    return { ok: false, error: 'server' };
  }
}

/**
 * Delete an author, and take their photo with them.
 *
 * The blob sweep is not optional hygiene here. `uploadBlogMedia` writes an
 * author's photo to `blogs/authors/<authorId>/`, and `purgePost`'s sweep only
 * ever visits `blogs/<postId>/`, so nothing else will ever collect them:
 * without this every deleted author leaves its photo ladder in the public
 * store for good. Post-response and best-effort, exactly as the purge path
 * does it: the row is already gone, so a stray blob is storage hygiene rather
 * than a correctness problem, and holding the confirm open for two serial Blob
 * API calls would be worse than the stray.
 */
export async function deleteAuthor(id: string): Promise<BlogTaxonomyActionResult> {
  const profile = await requireArea('blogs', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'server' };
    const existing = await getBlogAuthor(id);
    if (existing === null) return refuse({ _form: 'That author is no longer here.' });

    const problem = blogUsageRefusal('author', await countPostsForAuthor(id));
    if (problem) return refuse({ _form: problem });

    try {
      await db.delete(blogAuthors).where(eq(blogAuthors.id, id));
    } catch (dbError) {
      // The FK is the race backstop: a post or a revision claimed this author
      // between the count and the delete.
      if (isFkViolation(dbError)) {
        return refuse({ _form: 'A post claimed this author a moment ago, so it cannot be deleted.' });
      }
      throw dbError;
    }

    logActivity(profile, {
      area: 'blogs',
      entity: 'blog-author',
      entityId: id,
      entityName: existing.name,
      action: 'delete',
      summary: `Deleted the blog author ${existing.name}`,
      payload: { meta: { slug: existing.slug } },
    });

    // Nothing published was under them (the refusal above guarantees it), so
    // the hub did not move. The index lost a row, and the profile URL now
    // 404s: announcing it is what makes an engine refetch and drop it.
    invalidateBlogTaxonomy(authorUrls(existing.slug));

    after(async () => {
      try {
        const strays = await listPublic({ prefix: `blogs/authors/${id}/` });
        if (strays.blobs.length > 0) await delPublic(strays.blobs.map((b) => b.pathname));
      } catch (error) {
        reportError('[blogs] deleteAuthor blob sweep failed', error);
      }
    });

    return { ok: true };
  } catch (error) {
    reportError('[blogs] deleteAuthor failed', error);
    return { ok: false, error: 'server' };
  }
}

// ── Categories ──────────────────────────────────────────────────────────────

/**
 * `seoTitle` and `seoDescription` stay NULLABLE here, deliberately.
 * `categoryReady` in _actions/blogPosts.ts refuses to publish a post into a
 * category missing them, so this door is where they get FILLED, but requiring
 * them would make the `branding` row (both null since the import) uneditable
 * until somebody wrote copy for it. The dialog says what the gap costs.
 */
function categoryColumns(data: BlogCategoryFields) {
  return {
    title: data.title,
    seoTitle: data.seoTitle,
    seoDescription: data.seoDescription,
    sortIndex: data.sortIndex,
  };
}

export async function createCategory(input: unknown): Promise<BlogTaxonomyResult> {
  const profile = await requireArea('blogs', '/admin');

  try {
    const parsed = blogCategoryFieldsSchema.safeParse(
      await withSortIndex(input, nextBlogCategorySort),
    );
    if (!parsed.success) {
      return { ok: false, error: 'validation', issues: flattenBlogIssues(parsed.error) };
    }
    const data = parsed.data;

    let inserted: BlogCategory[];
    try {
      inserted = await db
        .insert(blogCategories)
        .values({ slug: data.slug, ...categoryColumns(data) })
        .returning();
    } catch (dbError) {
      if (isUniqueViolation(dbError)) {
        return refuse({ slug: 'That category slug is already in use.' });
      }
      throw dbError;
    }
    const row = inserted[0];

    logActivity(profile, {
      area: 'blogs',
      entity: 'blog-category',
      entityId: row.id,
      entityName: row.title,
      action: 'create',
      summary: `Added the blog category ${row.title}`,
      payload: { meta: { slug: row.slug } },
    });

    // Nothing public changed: the hub's chips and cards are built from
    // published posts (categoryStats in blogStore.ts), and a new category has
    // none, so it renders nowhere yet. The careers precedent exactly.
    invalidateBlogTaxonomy();
    return { ok: true, id: row.id };
  } catch (error) {
    reportError('[blogs] createCategory failed', error);
    return { ok: false, error: 'server' };
  }
}

export async function updateCategory(
  id: string,
  input: unknown,
): Promise<BlogTaxonomyResult> {
  const profile = await requireArea('blogs', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'server' };
    const existing = await getBlogCategory(id);
    if (existing === null) return refuse({ _form: 'That category is no longer here.' });

    const parsed = blogCategoryFieldsSchema.safeParse(
      await withSortIndex(input, async () => existing.sortIndex),
    );
    if (!parsed.success) {
      return { ok: false, error: 'validation', issues: flattenBlogIssues(parsed.error) };
    }
    const data = parsed.data;
    if (data.slug !== existing.slug) return refuse({ slug: SLUG_LOCKED_CATEGORY });

    // Stamped unconditionally, for the reason given in `updateAuthor`: no
    // sitemap and no rendered page reads this column.
    const [row] = await db
      .update(blogCategories)
      .set({ ...categoryColumns(data), updatedAt: new Date() })
      .where(eq(blogCategories.id, id))
      .returning();
    if (!row) return refuse({ _form: 'That category is no longer here.' });

    logActivity(profile, {
      area: 'blogs',
      entity: 'blog-category',
      entityId: id,
      entityName: row.title,
      action: 'update',
      summary: `Edited the blog category ${row.title}`,
      payload: {
        changes: diff({ title: existing.title }, { title: row.title }),
        meta: { slug: row.slug },
      },
    });

    // Only the TITLE reaches a URL this repo announces. The SEO pair moves the
    // <title> and description of `/blogs?category=<slug>`, and a query URL is
    // never emitted to a crawler, so filling it in refreshes the caches and
    // announces nothing (categoryPublicFingerprint says so, once).
    const moved =
      categoryPublicFingerprint(row) !== categoryPublicFingerprint(existing);
    const listed = moved && (await publishedPostsForCategory(id)) > 0;
    invalidateBlogTaxonomy(listed ? ['/blogs'] : []);
    return { ok: true, id };
  } catch (error) {
    reportError('[blogs] updateCategory failed', error);
    return { ok: false, error: 'server' };
  }
}

export async function deleteCategory(id: string): Promise<BlogTaxonomyActionResult> {
  const profile = await requireArea('blogs', '/admin');

  try {
    if (!UUID_RE.test(id)) return { ok: false, error: 'server' };
    const existing = await getBlogCategory(id);
    if (existing === null) return refuse({ _form: 'That category is no longer here.' });

    const problem = blogUsageRefusal('category', await countPostsForCategory(id));
    if (problem) return refuse({ _form: problem });

    try {
      await db.delete(blogCategories).where(eq(blogCategories.id, id));
    } catch (dbError) {
      if (isFkViolation(dbError)) {
        return refuse({ _form: 'A post claimed this category a moment ago, so it cannot be deleted.' });
      }
      throw dbError;
    }

    logActivity(profile, {
      area: 'blogs',
      entity: 'blog-category',
      entityId: id,
      entityName: existing.title,
      action: 'delete',
      summary: `Deleted the blog category ${existing.title}`,
      payload: { meta: { slug: existing.slug } },
    });

    // Nothing published was filed under it, so no chip and no card moved.
    invalidateBlogTaxonomy();
    return { ok: true };
  } catch (error) {
    reportError('[blogs] deleteCategory failed', error);
    return { ok: false, error: 'server' };
  }
}
