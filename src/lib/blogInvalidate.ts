import 'server-only';

import { revalidatePath, updateTag } from 'next/cache';
import { after } from 'next/server';

import { publicUrlFor } from '@/lib/blogFields';
import { BLOGS_TAG, blogTag } from '@/lib/blogStore';
import { pingIndexNow } from '@/lib/indexnow';

/**
 * The ONE place the blog domain decides what a write refreshes and what it
 * announces.
 *
 * IT LIVES HERE RATHER THAN BESIDE ITS FIRST CALLER FOR A STRUCTURAL REASON. A
 * `'use server'` module may export only async functions, so `invalidateBlog`
 * could not be exported from `_actions/blogPosts.ts` where it was written:
 * exporting it would have turned a cache helper into an unauthenticated server
 * action. That was fine while every caller was a post door in that same file.
 * `_actions/blogTaxonomy.ts` is not, and the alternative was a second copy of
 * the contract, which is precisely how one screen ends up stale while another
 * refreshes. A plain module both files import is the fix.
 *
 * Two doors, one contract:
 *  - `invalidateBlog` for a POST, which may be public or not and carries a
 *    fingerprint of its own.
 *  - `invalidateBlogTaxonomy` for an AUTHOR or a CATEGORY, which every public
 *    blog surface renders through and which has no per-slug entry of its own.
 * Both go through `refreshPublicBlog`, so neither can refresh a tag the other
 * forgets.
 *
 * `updateTag` and NOT `revalidateTag`, because these run inside server actions.
 * The scheduling cron is the opposite case and must use `revalidateTag`:
 * `updateTag` throws inside a route handler.
 */

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

/**
 * The caches a change to PUBLIC blog content refreshes, whatever moved.
 *
 * `updateTag(BLOGS_TAG)` is mandatory rather than belt-and-braces:
 * `getPublishedPost` reaches its per-slug cache entry only after a snapshot
 * membership test, so a newly published slug stays invisible until the COARSE
 * tag is invalidated, and every author and category row is read through that
 * same snapshot. The per-slug tag alone does nothing for a post the store has
 * never seen.
 *
 * `/sitemaps/authors.xml` is in for both doors: an author page's lastmod is
 * the newest post it carries, so a post moving in or out of public changes it
 * even when the author did not, and an author edit changes it directly.
 */
function refreshPublicBlog(): void {
  updateTag(BLOGS_TAG);
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
  // Every /admin render is session-gated, so this is the house contract rather
  // than a public concern: the posts list, its tab badges and the rail all
  // read the row that just moved.
  revalidatePath('/admin', 'layout');

  for (const slug of alsoTag) updateTag(blogTag(slug));

  const wasPublic = previous !== undefined && previous.isPublic;
  const isPublic = current !== undefined && current.isPublic;
  if (!wasPublic && !isPublic) return;

  refreshPublicBlog();
  if (current !== undefined) updateTag(blogTag(current.slug));
  if (previous !== undefined && previous.slug !== current?.slug) {
    updateTag(blogTag(previous.slug));
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
  refreshPublicBlog();
  if (urls.length > 0) {
    const list = [...urls];
    after(() => pingIndexNow(list));
  }
}
