import type { BlogLocation, BlogMedia } from '@/db/schema';

/**
 * The slim, serializable row shapes the two taxonomy dialogs take, built by
 * `/admin/blogs/page.tsx` from `listAuthorsAdmin` / `listCategoriesAdmin` plus
 * `blogTaxonomyUsage` (the `AdminOpeningItem` precedent).
 *
 * Every optional column arrives as `''` rather than null so a dialog can bind
 * it straight to an input, and no `Date` crosses: `created_at` and
 * `updated_at` are on both rows and neither dialog shows them, so neither is
 * carried. The rosters in this dashboard never construct a Date in the
 * browser.
 *
 * `sameAs`, `knowsAbout`, `tags` and `location` ride along whole because the
 * write door's schema is `.strict()` and `authorColumns` names every one of
 * them in its `.set()`: a save that omitted a field would not leave it alone,
 * it would fail the parse. The dialog edits the ones the screen offers and
 * hands the rest back exactly as they came.
 */
export type BlogAuthorItem = {
  id: string;
  slug: string;
  name: string;
  kind: 'person' | 'organization';
  role: string;
  bio: string;
  /** The seeded `/images/...` asset, '' when there is none. */
  imageStaticPath: string;
  /** An uploaded photo, which WINS over the static path everywhere the public
   *  site renders an author (`toHero` in blogStore.ts takes media first). */
  imageMedia: BlogMedia | null;
  /** Round-tripped, not edited here. */
  ogImageStaticPath: string;
  sameAs: string[];
  knowsAbout: string[];
  /** Round-tripped, not edited here. */
  tags: string[];
  /** Round-tripped, not edited here. */
  location: BlogLocation | null;
  sortIndex: number;
  /** The linked dashboard account, '' when the byline stands on its own. */
  userId: string;
  /** What a delete would have to get past: both tables, counted separately. */
  usage: { posts: number; revisions: number };
};

export type BlogCategoryItem = {
  id: string;
  slug: string;
  title: string;
  /** '' when unset, which is the state that blocks publishing into it. */
  seoTitle: string;
  seoDescription: string;
  sortIndex: number;
  usage: { posts: number; revisions: number };
};

/** One dashboard account the byline picker offers. Fetched, and rendered, only
 *  for an owner or a superadmin, matching the action's own gate. */
export type BylineAccountOption = { id: string; label: string };
