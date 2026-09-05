import 'server-only';

import { revalidatePath, revalidateTag, updateTag } from 'next/cache';
import { after } from 'next/server';

import type { AdminPost } from '@/db/blogAdminQueries';
import type { BlogRevisionSnapshot } from '@/db/schema';
import { publicFingerprint, publicUrlFor, type BlogPostStatus } from '@/lib/blogFields';
import { BLOGS_TAG, blogTag } from '@/lib/blogStore';
import { pingIndexNow } from '@/lib/indexnow';

/**
 * The ONE place the blog domain decides what a write refreshes and what it
 * announces — and, since the scheduling cron, the one place that decides what
 * a public REFERENCE to a post is.
 *
 * IT LIVES HERE RATHER THAN BESIDE ITS FIRST CALLER FOR A STRUCTURAL REASON. A
 * `'use server'` module may export only async functions, so `invalidateBlog`
 * could not be exported from `_actions/blogPosts.ts` where it was written:
 * exporting it would have turned a cache helper into an unauthenticated server
 * action. That was fine while every caller was a post door in that same file.
 * `_actions/blogTaxonomy.ts` is not, and the alternative was a second copy of
 * the contract, which is precisely how one screen ends up stale while another
 * refreshes. A plain module both files import is the fix. The four ref builders
 * below moved here for the same reason and from the same file: the
 * `blog-publish` route handler needs them, and two definitions of what a public
 * reference is, is how the cron and the editor end up pinging different URLs
 * for one post.
 *
 * Three doors, one contract:
 *  - `invalidateBlog` for a POST written by a SERVER ACTION, which may be
 *    public or not and carries a fingerprint of its own.
 *  - `invalidateBlogFromCron` for the same post written by a ROUTE HANDLER.
 *  - `invalidateBlogTaxonomy` for an AUTHOR or a CATEGORY, which every public
 *    blog surface renders through and which has no per-slug entry of its own.
 * All three go through `refreshPublicBlog`, and the first two through one
 * `applyBlogInvalidation`, so none can refresh a tag or announce a URL another
 * forgets.
 *
 * THE ONLY DIFFERENCE BETWEEN THE FIRST TWO IS THE TAG FUNCTION, and it is not
 * cosmetic. `updateTag` THROWS outside a server action — Next's own
 * `revalidate.js` refuses it when `workStore.page` ends in `/route`, error
 * E872 — so a cron that copied an action's invalidation block would publish
 * every due row, then throw: `runCron` would stamp the job FAILED and return a
 * 500, the IndexNow ping and the activity row after it would never run, and the
 * site would keep serving the pre-publish snapshot for a whole TTL while
 * /admin/monitoring reddened every fifteen minutes.
 *
 * `{ expire: 0 }` IS THE SECOND ARGUMENT, and `'max'` is the trap next to the
 * trap. The argument is required — the type is `string | CacheLifeConfig` and
 * omitting it warns that the single-argument form is deprecated — but the two
 * spellings do NOT do the same thing, and the difference is invisible until a
 * reader gets a stale page. Traced through Next 16.2.10: `revalidation-utils`
 * resolves a profile to `durations = { expire: cacheLife.expire }`, and
 * `FileSystemCache.revalidateTag` then sets `stale = now` and
 * `expired = now + expire * 1000`. So `'max'` (the built-in profile, expire
 * 31,536,000s) writes an expiry a YEAR away: `areTagsExpired` is false and only
 * `areTagsStale` is true, which is stale-while-revalidate — the first read
 * after the cron is served the PRE-PUBLISH snapshot, on `/blogs` above all,
 * which reads searchParams and renders per request. `{ expire: 0 }` writes
 * `expired = now`, which is byte-for-byte what `updateTag` does. Verified by
 * running Next's own handler: updateTag ⇒ expired=true; 'max' ⇒ expired=false,
 * stale=true; { expire: 0 } ⇒ expired=true.
 *
 * `revalidatePath` has no such restriction and is shared by both doors as is.
 */

/** How a door expires a cache tag. The two implementations below are the
 *  ENTIRE difference between a server action's invalidation and a route
 *  handler's, which is why every tag in this module goes through one of them
 *  and neither `updateTag` nor `revalidateTag` is named anywhere else. */
type TagDoor = (tag: string) => void;

/** From a server action: expire and refresh immediately. */
const actionTag: TagDoor = (tag) => updateTag(tag);

/** From a route handler, where `updateTag` throws (E872). EXPIRES, rather than
 *  going stale: see the header on why `'max'` here would be a lag nobody sees. */
const cronTag: TagDoor = (tag) => revalidateTag(tag, { expire: 0 });

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
export const refDates = (snapshot: {
  publishedAt: string | null;
  contentModifiedAt: string | null;
}) => `${snapshot.publishedAt ?? ''}|${snapshot.contentModifiedAt ?? ''}`;

/** Everything a ref needs that is not a snapshot: where the post lives. Both
 *  `AdminPost` (through `identityOf`) and `PostIdentity` from
 *  `postIdentitiesFor` reduce to this, which is what lets the editor's doors
 *  and the cron build the same references from different reads. */
export type BlogRefIdentity = {
  slug: string;
  categorySlug: string;
  authorSlug: string;
};

/** A post nothing outside /admin can see. Cheap by construction: there is no
 *  fingerprint to build, because a post moving into or out of public has
 *  already answered "did anything change?" by moving. */
export const hiddenRef = (post: BlogRefIdentity): BlogRef => ({
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
export const publishedRef = (slug: string, snapshot: BlogRevisionSnapshot): BlogRef => ({
  slug,
  categorySlug: snapshot.categorySlug,
  authorSlug: snapshot.authorSlug,
  isPublic: true,
  publicFingerprint: publicFingerprint(snapshot),
  dates: refDates(snapshot),
});

/** The ref for a post as it stood BEFORE a transition: public only when its
 *  status really was `published`, which is the predicate the site reads. */
export const beforeRef = (
  post: BlogRefIdentity & { status: BlogPostStatus },
  published: BlogRevisionSnapshot | null,
): BlogRef =>
  post.status === 'published' && published !== null
    ? publishedRef(post.slug, published)
    : hiddenRef(post);

/** The identity half of an AdminPost, in the shape the two ref builders take
 *  (the bulk doors and the cron read the same fields through
 *  `postIdentitiesFor`, which already returns it). */
export const identityOf = (post: AdminPost): BlogRefIdentity & { status: BlogPostStatus } => ({
  slug: post.post.slug,
  status: post.post.status,
  categorySlug: post.category.slug,
  authorSlug: post.author.slug,
});

/**
 * The caches a change to PUBLIC blog content refreshes, whatever moved.
 *
 * Expiring `BLOGS_TAG` is mandatory rather than belt-and-braces:
 * `getPublishedPost` reaches its per-slug cache entry only after a snapshot
 * membership test, so a newly published slug stays invisible until the COARSE
 * tag is invalidated, and every author and category row is read through that
 * same snapshot. The per-slug tag alone does nothing for a post the store has
 * never seen. That is also why the cron cannot get away with the per-slug tag:
 * every post it publishes is one the store has never seen.
 *
 * `/sitemaps/authors.xml` is in for every door: an author page's lastmod is
 * the newest post it carries, so a post moving in or out of public changes it
 * even when the author did not, and an author edit changes it directly.
 */
function refreshPublicBlog(tag: TagDoor): void {
  tag(BLOGS_TAG);
  revalidatePath('/sitemap.xml');
  revalidatePath('/sitemaps/blogs.xml');
  revalidatePath('/sitemaps/authors.xml');
}

/**
 * The invalidation door for a post, mirroring `invalidateProject` in
 * _actions/projects.ts. Pass `previous` as undefined on create, `current` as
 * undefined on delete.
 *
 * `alsoTag` refreshes OTHER posts' per-slug entries without announcing
 * anything about them: the purge door's case, where another post's published
 * snapshot may still name the slug that is about to stop existing. It runs
 * before the early return, because a purge has no public side of its own.
 */
export function invalidateBlog(
  current?: BlogRef,
  previous?: BlogRef,
  alsoTag: readonly string[] = [],
): void {
  applyBlogInvalidation(actionTag, current, previous, alsoTag);
}

/**
 * The same door for the `blog-publish` ROUTE HANDLER, which may not call
 * `updateTag`. Both arguments are required here because a cron has neither of
 * the two shapes the optional ones exist for: it never creates a post and
 * never deletes one, it only moves a schedule that has come due, so the post
 * exists on both sides of the transition.
 */
export function invalidateBlogFromCron(current: BlogRef, previous: BlogRef): void {
  applyBlogInvalidation(cronTag, current, previous);
}

/**
 * The FLOOR the scheduling cron falls back to when it published rows it can no
 * longer describe: refresh every public blog surface, announce nothing.
 *
 * It exists because the failure it covers is unrecoverable rather than merely
 * unlikely. The publish is ONE atomic UPDATE with no transaction around it, so
 * once it commits the rows are live; if the reads that follow then throw (a
 * cold-start timeout on a scale-to-zero database is the realistic one), the
 * handler rejects, nothing is invalidated, and the retry fifteen minutes later
 * matches nothing and reports zero. There is no second chance: the posts stay
 * invisible until the store's own 24-hour TTL lapses. Expiring the COARSE tag
 * is enough to fix that on its own, because `getPublishedPost` reaches its
 * per-slug entry only after a snapshot membership test — the per-slug tags and
 * the IndexNow ping are what the fallback gives up, and a ping is a hint.
 *
 * Deliberately the shape of `invalidateBlogTaxonomy()` called with no urls,
 * which is the same idea from a server action.
 */
export function invalidateBlogCoarseFromCron(): void {
  revalidatePath('/admin', 'layout');
  refreshPublicBlog(cronTag);
}

function applyBlogInvalidation(
  tag: TagDoor,
  current?: BlogRef,
  previous?: BlogRef,
  alsoTag: readonly string[] = [],
): void {
  // Every /admin render is session-gated, so this is the house contract rather
  // than a public concern: the posts list, its tab badges and the rail all
  // read the row that just moved.
  revalidatePath('/admin', 'layout');

  for (const slug of alsoTag) tag(blogTag(slug));

  const wasPublic = previous !== undefined && previous.isPublic;
  const isPublic = current !== undefined && current.isPublic;
  if (!wasPublic && !isPublic) return;

  refreshPublicBlog(tag);
  if (current !== undefined) tag(blogTag(current.slug));
  if (previous !== undefined && previous.slug !== current?.slug) {
    tag(blogTag(previous.slug));
  }

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

/**
 * The invalidation door for an AUTHOR or a CATEGORY.
 *
 * The caches refresh UNCONDITIONALLY, because every public blog surface reads
 * these rows through the one cached snapshot: even a reorder, which announces
 * nothing, changes the order `/blogs/authors` draws.
 *
 * The PING is what the caller gates. `urls` is empty for anything a visitor
 * cannot see moving (a reorder, a category's SEO pair, a byline linked to a
 * dashboard account) and carries the pages a rename really did move otherwise.
 * The caller decides because only the caller holds the before-and-after row.
 *
 * The post pages a rename also moved are deliberately NOT enumerated: a
 * category with 20 posts would announce 20 URLs for one word, and IndexNow is
 * a hint rather than the only route in. Under-announcing is safe; announcing a
 * URL whose bytes did not move is the thing that is not.
 */
export function invalidateBlogTaxonomy(urls: readonly string[] = []): void {
  revalidatePath('/admin', 'layout');
  // Every taxonomy caller is a server action; there is no cron that renames a
  // category, so this door takes no tag parameter.
  refreshPublicBlog(actionTag);
  if (urls.length > 0) {
    const list = [...urls];
    after(() => pingIndexNow(list));
  }
}
