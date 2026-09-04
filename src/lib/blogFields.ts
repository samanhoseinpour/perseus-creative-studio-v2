/**
 * The blog editor's state leaf — every decision about what a post IS, and
 * whether an edit is worth telling anyone about.
 *
 * Zero RUNTIME dependencies, like taskTagFields.ts and spendFields.ts: no zod,
 * no drizzle, no `server-only`, no React, no `node:` imports, and no
 * `Date.now()` anywhere. The filter bar, the editor, the server actions and
 * scripts/check-blogs.mts all import it, so anything server-shaped here would
 * either break a client chunk or put a guard in front of the check script.
 *
 * The two `import type` lines below are the one allowance, and they are free
 * because TypeScript erases a type-only import entirely: src/db/schema.ts
 * takes exactly the same allowance when it type-imports `BlogDoc` from
 * blogBody.ts, and src/db/taskPredicates.ts states it outright ("free only
 * because it is erased at compile time"). They carry the jsonb payload shapes
 * `buildSnapshot` passes straight through — restating them here would be a
 * second definition of the stored row for no benefit, and typing them
 * `unknown` instead would make the snapshot this leaf builds unstorable in the
 * column it is built for. NOTHING here may become a value import.
 *
 * FOUR THINGS LIVE HERE, and each of them is silent when it is wrong:
 *
 *  1. `transitionProblem` — the readable guard in FRONT of migration 0045's
 *     three CHECK constraints. The constraints are the backstop; this is what
 *     a member reads. If the two disagree, a member meets a raw Postgres error
 *     on a button that looked enabled.
 *
 *  2. The two fingerprints — canonical projections compared for equality to
 *     decide whether `content_modified_at` moves (contentFingerprint) and
 *     whether IndexNow gets pinged (publicFingerprint). Neither is a hash: a
 *     hash needs node:crypto, which is not client-safe, and buys nothing here
 *     because the value is only ever compared, never stored.
 *
 *  3. The robots-extra vocabulary — typed rather than free, because
 *     `robotsFor` in src/app/(marketing)/blogs/[blog]/page.tsx spreads the
 *     stored object into both `robots` and `googleBot`, and Next serialises
 *     each entry as `key` or `key:value` joined with ', '. A free-text value
 *     containing a comma injects a SECOND directive into the meta tag.
 *
 *  4. `buildSnapshot` — the ONE projection from a working row to the immutable
 *     snapshot the public site renders. Both the preview and every write door
 *     go through it, so what a writer previews and what a publish stores
 *     cannot diverge. Its two instants are PARAMETERS for the reason stated on
 *     the function itself, and getting that wrong misdates a post everywhere
 *     at once while the sort order stays right.
 *
 * Run `node --import tsx scripts/check-blogs.mts` after touching any of it.
 */
import type { BlogEntity, BlogFaq, BlogMedia, BlogRobotsExtra, BlogSource } from '@/db/schema';
import type { BlogDoc } from '@/lib/blogBody';

// ── Status ──────────────────────────────────────────────────────────────────

/**
 * Must equal the `blog_post_status` pgEnum in src/db/schema.ts, in order. This
 * leaf cannot VALUE-import the schema (drizzle is not client-safe, and the
 * enum's values are a runtime array), so nothing in the app would notice them
 * drifting apart — scripts/check-blogs.mts imports both and asserts it.
 */
export const BLOG_POST_STATUSES = [
  'draft',
  'scheduled',
  'published',
  'archived',
  'trash',
] as const;

export type BlogPostStatus = (typeof BLOG_POST_STATUSES)[number];

/** What a member sees this state called. */
export const BLOG_POST_STATUS_LABELS: Record<BlogPostStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  published: 'Published',
  archived: 'Archived',
  trash: 'Trash',
};

/** History, not intent: `published_at is not null`. It decides where a
 *  restore lands and whether the slug is still editable. */
export type BlogPostHistory = { everPublished: boolean };

/**
 * The moves the editor offers, and nothing else. Each one is a button
 * somebody presses:
 *
 *   draft      -> published (Publish now) | scheduled (Schedule) | trash
 *   scheduled  -> published (the cron, or Publish now) | draft (Unschedule) | trash
 *   published  -> published (Update: a new revision, the pointer moves)
 *                 | archived (Unpublish) | trash
 *   archived   -> published (Publish again) | trash
 *   trash      -> exactly restoreTarget(history)
 *
 * `published -> published` is deliberately in the set and is the only
 * self-move that is: publishing an update is a real act that writes a new
 * revision and moves `published_revision_id`. Every other self-move is a
 * no-op somebody clicked by accident.
 */
const ALLOWED_TRANSITIONS: ReadonlyArray<readonly [BlogPostStatus, BlogPostStatus]> = [
  ['draft', 'published'],
  ['draft', 'scheduled'],
  ['draft', 'trash'],
  ['scheduled', 'published'],
  ['scheduled', 'draft'],
  ['scheduled', 'trash'],
  ['published', 'published'],
  ['published', 'archived'],
  ['published', 'trash'],
  ['archived', 'published'],
  ['archived', 'trash'],
];

/**
 * Where a restore from trash lands. Decided by history, never by the caller.
 *
 * A formerly published post restored to `draft` leaves a row whose
 * `published_revision_id` still names a snapshot while its URL 404s. To
 * whoever pressed Restore that reads as data loss, so it goes to `archived`
 * instead — the state that already means "was live, is not now".
 */
export function restoreTarget(history: BlogPostHistory): BlogPostStatus {
  return history.everPublished ? 'archived' : 'draft';
}

/**
 * `null` when the move is allowed, else a sentence a member can act on.
 *
 * Three refusals carry their own wording because a member will actually meet
 * them; everything else gets the generic sentence, which is enough for a
 * combination the UI should never have offered in the first place.
 */
export function transitionProblem(
  from: BlogPostStatus,
  to: BlogPostStatus,
  history: BlogPostHistory,
): string | null {
  if (ALLOWED_TRANSITIONS.some(([f, t]) => f === from && t === to)) return null;
  if (from === 'trash' && to === restoreTarget(history)) return null;

  // Ahead of everything else, so `trash -> trash` reads as a no-op rather than
  // being answered by the restore branch below with "restore it first", which
  // is what it was already in the middle of.
  if (from === to) {
    return `This post is already ${BLOG_POST_STATUS_LABELS[to]}. There is nothing to do.`;
  }

  if (to === 'scheduled' && (from === 'published' || from === 'archived')) {
    // THIS GUARD IS NOT REDUNDANT, and the tempting reading is that it is.
    // migration 0045's blog_posts_pending_only_scheduled does NOT forbid this
    // status pair: a row with status='scheduled', both schedule halves set and
    // a non-null published_at satisfies all three CHECKs. What the constraint
    // forbids is a pending_revision_id on a live `published` row, which is the
    // shape a scheduled UPDATE to a live post would actually need. So the
    // database blocks the mechanism and this blocks the move; deleting either
    // one on the strength of the other leaves a real hole.
    return 'Scheduling an update to a post that has already been live is not built yet. Publish the update now instead.';
  }

  if (from === 'published' && to === 'draft') {
    return 'Taking a live post down is what Archived means. Move it to Archived instead.';
  }

  if (from === 'trash') {
    // The wrong restore door. Naming the right one is the whole point: a bare
    // "you cannot do that" leaves the member with no next move.
    if (to === 'draft' || to === 'archived') {
      return history.everPublished
        ? 'This post was published before, so restoring it puts it back in Archived. Restore it there, then publish again.'
        : 'This post has never been published, so restoring it puts it back in Draft. Restore it there.';
    }
    return `Restore this post from Trash first. It cannot go straight to ${BLOG_POST_STATUS_LABELS[to]}.`;
  }

  return `A post in ${BLOG_POST_STATUS_LABELS[from]} cannot move to ${BLOG_POST_STATUS_LABELS[to]}.`;
}

// ── Robots extras ───────────────────────────────────────────────────────────

/**
 * The extra robots directives the editor offers, deep-merged over the
 * computed base into BOTH `robots` and `googleBot`.
 *
 * A SUBSET of Next's own `robotsKeys` (checked against Next's source in
 * scripts/check-blogs.mts): a key Next does not know is dropped silently, so
 * our UI would render a toggle that emits nothing at all. Next's list also
 * carries `nocache`, `indexifembedded` and `nositelinkssearchbox`, which this
 * studio has no use for; add one here only with a reason.
 */
export const ROBOTS_EXTRA_KEYS = [
  'max-snippet',
  'max-video-preview',
  'max-image-preview',
  'noarchive',
  'nosnippet',
  'noimageindex',
  'notranslate',
  'unavailable_after',
] as const;

export type RobotsExtraKey = (typeof ROBOTS_EXTRA_KEYS)[number];

/**
 * What kind of value each key takes. Task 5 builds the zod schema from this;
 * the vocabulary lives here so the editor's toggles and the validator cannot
 * disagree about which keys exist.
 *
 * NOTHING IS FREE TEXT, and that is a correctness rule rather than tidiness:
 * Next joins the resolved entries with ', ', so a string carrying a comma
 * injects a second directive into the meta tag.
 */
export type RobotsExtraKind = 'int' | 'bool' | 'preview' | 'instant';

export const ROBOTS_EXTRA_KINDS: Record<RobotsExtraKey, RobotsExtraKind> = {
  'max-snippet': 'int',
  'max-video-preview': 'int',
  'max-image-preview': 'preview',
  noarchive: 'bool',
  nosnippet: 'bool',
  noimageindex: 'bool',
  notranslate: 'bool',
  unavailable_after: 'instant',
};

/** The only values `max-image-preview` may take. */
export const ROBOTS_PREVIEW_VALUES = ['none', 'standard', 'large'] as const;

export type RobotsPreviewValue = (typeof ROBOTS_PREVIEW_VALUES)[number];

// ── Slugs ───────────────────────────────────────────────────────────────────

/** A brand-new draft needs a legal, unique slug before the row can be
 *  inserted, and one nobody will mistake for a chosen URL. */
export const DRAFT_SLUG_PREFIX = 'draft-';

const DRAFT_SLUG_HEX = 8;

/** Exactly what newDraftSlug makes. Lowercase-only, so anything matching this
 *  also matches PORTFOLIO_SLUG_RE. */
const PLACEHOLDER_SLUG_RE = new RegExp(`^${DRAFT_SLUG_PREFIX}[0-9a-f]{${DRAFT_SLUG_HEX}}$`);

/** Eight lowercase hex characters, without node:crypto (this leaf is
 *  client-safe). Collisions are backstopped by the unique index on
 *  blog_posts.slug, and the value is a placeholder the writer replaces. */
function randomHex(): string {
  let out = '';
  while (out.length < DRAFT_SLUG_HEX) {
    out += Math.floor(Math.random() * 0x10000)
      .toString(16)
      .padStart(4, '0');
  }
  return out.slice(0, DRAFT_SLUG_HEX);
}

/**
 * `draft-` plus eight lowercase hex characters.
 *
 * Lowercase is load-bearing: the slug must satisfy `PORTFOLIO_SLUG_RE` in
 * portfolioFields.ts, which is lowercase-only, or the insert fails on a value
 * the member never typed. Whatever the generator returns is lowercased,
 * stripped to hex and padded, so an unusual generator can never produce a slug
 * the schema rejects. The randomness is injected so scripts/check-blogs.mts
 * can pin the shape deterministically.
 */
export function newDraftSlug(rand: () => string = randomHex): string {
  const hex = rand().toLowerCase().replace(/[^0-9a-f]/g, '');
  // A generator yielding no hex at all would otherwise pad to the CONSTANT
  // `draft-00000000`, so a broken injection would surface as a stream of
  // unique-index violations on the second draft anybody creates rather than as
  // the bug it is. Short-but-real output still pads: it is at least distinct.
  if (!hex) throw new Error('newDraftSlug: the generator produced no hex characters');
  return `${DRAFT_SLUG_PREFIX}${(hex + '0'.repeat(DRAFT_SLUG_HEX)).slice(0, DRAFT_SLUG_HEX)}`;
}

/**
 * Whether this is still a generated placeholder. The editor's title-to-slug
 * auto-follow runs only while it is true, so a slug the writer actually chose
 * is never overwritten by a later title edit.
 */
export function isPlaceholderSlug(slug: string): boolean {
  return PLACEHOLDER_SLUG_RE.test(slug);
}

/**
 * True once the post has ever been published, which is when slug edits lock.
 *
 * The WORKING row's slug is the public URL (not the published revision's), so
 * an unlocked edit moves a live post the moment it saves and every inbound
 * link 404s. The lock lifts when programme step 3 ships redirects.
 */
export function slugLocked(post: { publishedAt: unknown | null }): boolean {
  return post.publishedAt != null;
}

/** The post's public path. Path only, no origin: pingIndexNow takes paths. */
export function publicUrlFor(slug: string): string {
  return `/blogs/${slug}`;
}

// ── Fingerprints ────────────────────────────────────────────────────────────

/**
 * Just the fields the two fingerprints read, named exactly as
 * `BlogRevisionSnapshot` in src/db/schema.ts names them, so a caller can pass
 * a snapshot straight in. Structural rather than imported, because importing
 * the schema would drag drizzle into this leaf.
 *
 * The jsonb-shaped fields are `unknown` on purpose: the fingerprint stringifies
 * them whole and never reads inside, so restating their shapes here would be a
 * second definition to keep in sync for no benefit.
 */
export type BlogSnapshotView = {
  slug: string;
  title: string;
  description: string;
  categorySlug: string;
  authorSlug: string;
  serviceSlug: string | null;
  hero: {
    staticPath: string | null;
    media: unknown;
    alt: string;
    caption: string | null;
  };
  body: unknown;
  bodyText: string;
  keyTakeaways: readonly string[];
  faqs: readonly unknown[];
  sources: readonly unknown[];
  entities: readonly unknown[];
  relatedSlugs: readonly string[];
  seo: {
    title: string;
    description: string;
    canonicalOverride: string | null;
    ogTitle: string;
    ogDescription: string;
    ogImage: unknown;
    twitterCard: string;
    robotsIndex: boolean;
    robotsFollow: boolean;
    robotsExtra: unknown;
    focusKeywords: readonly string[];
    emitLegacyMetaKeywords: boolean;
  };
  /** Hand-written extra JSON-LD. Nothing renders it yet, but it is already
   *  carried onto the public view model, so it belongs in publicFingerprint
   *  from the start rather than the day a renderer lands. */
  customSchema: unknown;
};

/**
 * Recursively key-sorted copy. Postgres makes NO promise about the key order
 * it hands a jsonb column back in, and these strings are compared for
 * equality across exactly that round trip: an unsorted stringify reports a
 * change that never happened, on an arbitrary subset of saves, which would
 * move every "Updated" byline and ping IndexNow for nothing.
 *
 * (scripts/import-blogs.mts has its own copy for the same reason. It is four
 * lines and lives in a script; importing across that boundary would be worse.)
 */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, sortKeys(record[key])]),
    );
  }
  return value;
}

const canonical = (value: unknown): string => JSON.stringify(sortKeys(value));

/** What a reader sees as the article itself. Both fingerprints build on it. */
function articleParts(snapshot: BlogSnapshotView) {
  return {
    title: snapshot.title,
    description: snapshot.description,
    body: snapshot.body,
    keyTakeaways: snapshot.keyTakeaways,
    faqs: snapshot.faqs,
    sources: snapshot.sources,
    entities: snapshot.entities,
    relatedSlugs: snapshot.relatedSlugs,
    serviceSlug: snapshot.serviceSlug,
    hero: {
      staticPath: snapshot.hero.staticPath,
      media: snapshot.hero.media,
      alt: snapshot.hero.alt,
      caption: snapshot.hero.caption,
    },
    // `wordCount` and `bodyText` are both DELIBERATELY absent: each is derived
    // from `body`, which is already in, so including either would be a second
    // vote for the same change.
  };
}

/**
 * The article as a reader meets it. Moving this is what moves
 * `content_modified_at`, which drives the visible "Updated" byline, the
 * sitemap `<lastmod>` and JSON-LD `dateModified`.
 *
 * SO AN SEO-ONLY EDIT MUST NOT MOVE IT. Retitling a meta description is not
 * an update to the article, and claiming otherwise republishes a freshness
 * signal for every post somebody tidied — invisibly, on every URL at once.
 */
export function contentFingerprint(snapshot: BlogSnapshotView): string {
  return canonical(articleParts(snapshot));
}

/**
 * Whether a publish should stamp `content_modified_at`. The ONE place that
 * decision lives, so the publish door and the schedule door cannot answer it
 * differently.
 *
 * `previous` is the snapshot the public was already rendering, or null when
 * there is none. A NULL PREVIOUS RETURNS FALSE, and that is the interesting
 * half: a first publish has no earlier article for the content to have changed
 * FROM, and `content_modified_at` means "editorially updated since". Stamped on
 * a first publish it would be equal to `published_at` anyway, so nothing would
 * render today; left null it stays honest the day something else starts
 * reading the column. blogStore.ts already treats null as "never updated"
 * (`modifiedAt = contentModifiedAt ?? publishedAt`, and `showsUpdated` requires
 * a non-null value), so the two agree.
 *
 * Equal fingerprints mean an SEO-ONLY edit: the pointer still moves and
 * IndexNow may still be pinged (publicFingerprint reads the metadata this one
 * ignores), but the date does not move and the "Updated" byline does not
 * appear. Claiming otherwise republishes a freshness signal for every post
 * somebody tidied, invisibly, on every URL at once.
 */
export function contentChanged(
  previous: BlogSnapshotView | null,
  next: BlogSnapshotView,
): boolean {
  if (previous === null) return false;
  return contentFingerprint(previous) !== contentFingerprint(next);
}

/**
 * Everything that changes the rendered page or its metadata. It gates the
 * IndexNow ping, and pinging an unchanged URL is a Bing spam signal (CLAUDE.md
 * is explicit: never ping unchanged URLs), so this has to be tight in both
 * directions.
 */
export function publicFingerprint(snapshot: BlogSnapshotView): string {
  const { seo } = snapshot;
  return canonical({
    article: articleParts(snapshot),
    slug: snapshot.slug,
    categorySlug: snapshot.categorySlug,
    authorSlug: snapshot.authorSlug,
    seoTitle: seo.title,
    seoDescription: seo.description,
    canonicalOverride: seo.canonicalOverride,
    ogTitle: seo.ogTitle,
    ogDescription: seo.ogDescription,
    ogImage: seo.ogImage,
    twitterCard: seo.twitterCard,
    robotsIndex: seo.robotsIndex,
    robotsFollow: seo.robotsFollow,
    robotsExtra: seo.robotsExtra,
    // UNCONDITIONAL, and the reason is worth stating because it looks like it
    // should be gated: focusKeywords reach the rendered page TWICE regardless
    // of the legacy meta setting, as openGraph.tags in
    // src/app/(marketing)/blogs/[blog]/page.tsx and as JSON-LD `keywords` in
    // src/lib/blogJsonLd.ts. Only the <meta name="keywords"> tag is gated. So
    // a keyword edit with the flag off really does change bytes a crawler
    // fetches, and skipping the ping would leave Bing on a stale page.
    focusKeywords: seo.focusKeywords,
    // The flag stays in on its own account: toggling it adds or removes the
    // legacy meta tag even when the keywords themselves have not moved.
    emitLegacyMetaKeywords: seo.emitLegacyMetaKeywords,
    // Arbitrary hand-written JSON-LD. Nothing renders it TODAY, which is
    // exactly why it is in: it is already carried onto the public view model,
    // so leaving it out would mean the day a renderer lands, a schema edit
    // moves no fingerprint and pings nothing, with nothing to catch it.
    customSchema: snapshot.customSchema,
    // `llmsInclude` is DELIBERATELY absent: nothing serves an llms.txt from
    // the database yet (programme step 5), and unlike customSchema it is a
    // switch rather than content, so the day that route ships every existing
    // post's value is already correct and needs no ping. It joins this
    // fingerprint then, and not before.
  });
}

// ── The taxonomy fingerprints ───────────────────────────────────────────────
//
// An author and a category are rows the whole blog renders THROUGH, so a
// rename moves visible text on `/blogs`, on `/blogs/authors` and on every post
// page at once. These two decide the IndexNow ping for that, and they follow
// `publicFingerprint`'s rule rather than a looser one: only fields a pinged URL
// actually renders are in, because pinging a URL whose bytes did not move is
// the Bing spam signal every ping in this repo is gated against.
//
// `sortIndex` is out of BOTH, deliberately. It reorders `/blogs/authors` and
// the hub's chips, but it changes no single URL's indexable TEXT, so a reorder
// refreshes the caches and announces nothing.

/** What a visitor reads of an author: the card byline on `/blogs`, the row on
 *  `/blogs/authors`, and the whole profile plus its Person JSON-LD on
 *  `/blogs/authors/<slug>`.
 *
 *  `slug` is absent because it is immutable, and `userId` because linking a
 *  byline to a dashboard account changes nothing a visitor can see. */
export function authorPublicFingerprint(author: {
  name: string;
  kind: string;
  role: string;
  bio: string;
  imageStaticPath: string | null;
  imageMedia: unknown;
  ogImageStaticPath: string | null;
  sameAs: string[];
  knowsAbout: string[];
  tags: string[];
  location: unknown;
  /** ACCEPTED AND DELIBERATELY NOT READ, so the exclusion is expressed in the
   *  type and provable by breaking it, rather than being an absence nothing
   *  can go red about. Callers pass the whole row. */
  sortIndex: number;
}): string {
  return canonical({
    name: author.name,
    kind: author.kind,
    role: author.role,
    bio: author.bio,
    imageStaticPath: author.imageStaticPath,
    imageMedia: author.imageMedia,
    ogImageStaticPath: author.ogImageStaticPath,
    sameAs: author.sameAs,
    knowsAbout: author.knowsAbout,
    tags: author.tags,
    location: author.location,
  });
}

/**
 * What a visitor reads of a category: its `title`, on the hub's filter chips
 * and on every card and breadcrumb that names it.
 *
 * `seoTitle` and `seoDescription` are DELIBERATELY absent, and this is the
 * half worth stating because it looks like an omission. The only bytes either
 * one moves are the `<title>` and `<meta description>` of
 * `/blogs?category=<slug>`, and a query URL is never emitted to a crawler
 * (src/lib/sitemap.ts refuses any URL carrying `?`), so there is no URL to
 * announce. Putting them in would ping `/blogs`, which renders neither.
 */
export function categoryPublicFingerprint(category: {
  title: string;
  /** Both ACCEPTED AND DELIBERATELY NOT READ, for `sortIndex`'s reason above:
   *  an exclusion nothing can go red about is a comment rather than a rule. */
  seoTitle: string | null;
  seoDescription: string | null;
  sortIndex: number;
}): string {
  return canonical({ title: category.title });
}

/**
 * Why an author or a category cannot be deleted yet, or null when it can.
 *
 * Both `blog_posts` and `blog_post_revisions` carry `author_id` and
 * `category_id` with ON DELETE RESTRICT, so an author reassigned away from
 * every live post still owns the earlier versions of those posts and Postgres
 * still refuses the DELETE. Counting only the working rows would let the
 * statement through to raise a raw 23503 instead of the sentence the member is
 * owed, which is why `countPostsForAuthor` returns the two numbers.
 *
 * THEY ARE NAMED SEPARATELY RATHER THAN ADDED. An author with one post and
 * twelve earlier versions of it would be refused with "13 posts", which is
 * wrong and reads as a bug. Naming the history for what it is also explains
 * the case that otherwise looks broken: a count with zero posts in it.
 *
 * A composer rather than a literal at the call site, so both doors say the
 * same thing and scripts/check-blogs.mts can pin the wording it produces.
 */
export function blogUsageRefusal(
  what: 'author' | 'category',
  usage: { posts: number; revisions: number },
): string | null {
  const named: string[] = [];
  if (usage.posts > 0) named.push(`${usage.posts} post${usage.posts === 1 ? '' : 's'}`);
  if (usage.revisions > 0) {
    named.push(`${usage.revisions} saved version${usage.revisions === 1 ? '' : 's'}`);
  }
  if (named.length === 0) return null;
  return `This ${what} is still on ${named.join(' and ')}. Saved versions count too, because a post keeps every earlier version of itself, so nothing at all can point here before the ${what} can go.`;
}

/**
 * The same two numbers as a plain sentence, for the screen that shows them
 * BEFORE anybody clicks Delete: the row's readout, the disabled button's
 * tooltip and the confirm.
 *
 * `blogUsageRefusal` is what the door says once a delete has been attempted
 * and cannot go through; this is what the dialog says while the member is
 * still deciding. Two composers rather than one because they are answering
 * different questions, and one string bent to serve both would read as a
 * refusal on a row nothing points at.
 *
 * IT NEVER ADDS THE TWO NUMBERS, for `blogUsageRefusal`'s reason: an author
 * with one post and twelve earlier versions of it is not on thirteen posts.
 * The post branch says "and its history" precisely so the number a member
 * reads is the number of POSTS, with the versions named rather than folded
 * into it. The zero branch is the one that actually reaches the confirm,
 * since Delete is offered only when nothing points here.
 */
export function blogUsageSentence(
  what: 'author' | 'category',
  usage: { posts: number; revisions: number },
): string {
  const { posts, revisions } = usage;
  if (posts === 0 && revisions === 0) {
    return `No posts and no saved versions point at this ${what}.`;
  }
  if (posts === 0) {
    return `${revisions} saved version${revisions === 1 ? '' : 's'} still point at this ${what}, from posts that have since moved elsewhere.`;
  }
  // "1 post and its history" is a singular subject, so the verb is singular
  // too. Pinned as a literal in scripts/check-blogs.mts, so both move together.
  return `${posts} post${posts === 1 ? '' : 's'} and ${posts === 1 ? 'its' : 'their'} history still point${posts === 1 ? 's' : ''} at this ${what}.`;
}

/**
 * The same two numbers as a compact readout for a row: "3 posts, 12 saved
 * versions".
 *
 * IT EXISTS BECAUSE THE TOOLTIP IS UNREACHABLE. Both dialogs grey out Delete
 * while anything still points at the row, and a `title` on a DISABLED button
 * fires no mouse events in any browser and cannot be reached on a touch device
 * at all, so a tooltip is not a carrier for the number: the row itself has to
 * print it. Both rosters call this rather than pluralising in JSX, which is how
 * the authors roster came to show only "0 posts" beside a greyed-out Delete on
 * an author whose twelve saved versions were the actual reason.
 *
 * SAME ONE RULE AS ITS TWO SIBLINGS: never add the numbers. The revisions are
 * named as saved versions, never folded into a post count nobody could then
 * go and find.
 */
export function blogUsageCount(usage: { posts: number; revisions: number }): string {
  const { posts, revisions } = usage;
  if (posts === 0 && revisions === 0) return 'nothing points here';
  return `${posts} post${posts === 1 ? '' : 's'}, ${revisions} saved version${revisions === 1 ? '' : 's'}`;
}

// ── The revision snapshot ───────────────────────────────────────────────────

/**
 * The working row as `buildSnapshot` reads it: every `blog_posts` column that
 * reaches a rendered page, plus the category and author SLUGS, which the
 * snapshot stores in place of the row's foreign keys because a slug is what
 * every public reader looks up. The caller has already joined both.
 *
 * Structural rather than `BlogPostRow`, so a caller may spread a wider row
 * straight in. `publishedAt` and `contentModifiedAt` are declared here for
 * exactly that reason — they are on the row somebody spreads — and
 * `buildSnapshot` must never read either one.
 */
export type BlogWorkingView = {
  slug: string;
  title: string;
  description: string;
  categorySlug: string;
  authorSlug: string;
  serviceSlug: string | null;
  heroStaticPath: string | null;
  heroMedia: BlogMedia | null;
  heroAlt: string;
  heroCaption: string | null;
  body: BlogDoc;
  bodyText: string;
  wordCount: number;
  keyTakeaways: string[];
  faqs: BlogFaq[];
  sources: BlogSource[];
  seoTitle: string;
  seoDescription: string;
  canonicalOverride: string | null;
  ogTitle: string;
  ogDescription: string;
  ogImageStaticPath: string | null;
  ogImageMedia: BlogMedia | null;
  twitterCard: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  robotsExtra: BlogRobotsExtra | null;
  focusKeywords: string[];
  emitLegacyMetaKeywords: boolean;
  customSchema: unknown;
  llmsInclude: boolean;
  /** On the row, and DELIBERATELY unread by buildSnapshot. See below. */
  publishedAt: Date | null;
  contentModifiedAt: Date | null;
};

/**
 * Field for field `BlogRevisionSnapshot` in src/db/schema.ts, restated here so
 * the leaf owns the shape it builds. The two are pinned together by the
 * compiler rather than by a comment: `getDraftPost` in blogStore.ts assigns
 * what this function returns into a `blog_post_revisions.snapshot` slot, so a
 * field that drifted, disappeared or changed type would fail `npm run build`.
 * scripts/check-blogs.mts pins the other half — that every field is actually
 * POPULATED, which no type can say.
 */
export type BlogRevisionSnapshotView = {
  slug: string;
  title: string;
  description: string;
  categorySlug: string;
  authorSlug: string;
  serviceSlug: string | null;
  hero: { staticPath: string | null; media: BlogMedia | null; alt: string; caption: string | null };
  body: BlogDoc;
  bodyText: string;
  wordCount: number;
  keyTakeaways: string[];
  faqs: BlogFaq[];
  sources: BlogSource[];
  entities: BlogEntity[];
  relatedSlugs: string[];
  seo: {
    title: string;
    description: string;
    canonicalOverride: string | null;
    ogTitle: string;
    ogDescription: string;
    ogImage: { staticPath: string | null; media: BlogMedia | null } | null;
    twitterCard: string;
    robotsIndex: boolean;
    robotsFollow: boolean;
    robotsExtra: BlogRobotsExtra | null;
    focusKeywords: string[];
    emitLegacyMetaKeywords: boolean;
  };
  customSchema: unknown;
  llmsInclude: boolean;
  /** ISO instants, never Date: the column is jsonb. */
  publishedAt: string | null;
  contentModifiedAt: string | null;
};

/**
 * The ONE projection from a working row to the snapshot the public site
 * renders. The preview builds one to render an unsaved draft through the same
 * component production uses, and every write door builds one to store; a
 * second projection anywhere would be a second set of bugs, and the preview's
 * whole promise is that it shows what a publish will store.
 *
 * THE TWO INSTANTS ARE PARAMETERS AND ARE NEVER READ OFF `post`. That is the
 * entire reason for this signature. On a FIRST publish the working row's
 * `published_at` is still null at the moment the snapshot is built — the
 * caller is deciding it in the same breath — so a `buildSnapshot` that read it
 * back would freeze `publishedAt: null` into the revision. Every public date
 * then comes off the REVISION (`toSummary` in blogStore.ts falls back to the
 * post's `created_at`), so the post would render dated its DRAFT-CREATION day
 * in the visible byline, the OG `publishedTime`, the JSON-LD and the sitemap,
 * while `publicOrder` sorted it by `blog_posts.published_at` — dated in one
 * place, sorted by another, and nothing on screen to say which is wrong.
 *
 * They are ISO strings rather than `Date` objects so the result is JSON-safe
 * by construction: it goes into a jsonb column, comes back out through
 * `JSON.parse`, and the stored type already declares them as `string | null`.
 * That is also why every field of `BlogWorkingView` is required and nullable
 * rather than optional: `JSON.stringify` DROPS an `undefined` value, so an
 * optional field would silently change the key set of a stored snapshot and,
 * with it, both fingerprints. The types carry that for every field but ONE, so
 * there is exactly one `?? null` below — on `customSchema`, the only field
 * typed `unknown`, which admits `undefined`. The three sibling coalesces that
 * were written beside it are gone: `heroMedia`, `ogImageMedia` and
 * `robotsExtra` are all `T | null`, so nothing can hand them an `undefined`,
 * and a guard that cannot fire reads as a promise coming from somewhere it is
 * not.
 */
export function buildSnapshot(
  post: BlogWorkingView,
  extra: {
    relatedSlugs: string[];
    entities: BlogEntity[];
    publishedAt: string | null;
    contentModifiedAt: string | null;
  },
): BlogRevisionSnapshotView {
  return {
    slug: post.slug,
    title: post.title,
    description: post.description,
    categorySlug: post.categorySlug,
    authorSlug: post.authorSlug,
    serviceSlug: post.serviceSlug,
    hero: {
      staticPath: post.heroStaticPath,
      media: post.heroMedia,
      alt: post.heroAlt,
      caption: post.heroCaption,
    },
    body: post.body,
    bodyText: post.bodyText,
    wordCount: post.wordCount,
    keyTakeaways: post.keyTakeaways,
    faqs: post.faqs,
    sources: post.sources,
    entities: extra.entities,
    relatedSlugs: extra.relatedSlugs,
    seo: {
      title: post.seoTitle,
      description: post.seoDescription,
      canonicalOverride: post.canonicalOverride,
      ogTitle: post.ogTitle,
      ogDescription: post.ogDescription,
      // `null` MEANS "use the hero" to every reader of this snapshot, so the
      // pair is only built when the post actually carries an OG image of its
      // own. An always-built `{ staticPath: null, media: null }` would read as
      // "a distinct OG image that resolves to nothing".
      ogImage:
        post.ogImageStaticPath === null && post.ogImageMedia === null
          ? null
          : { staticPath: post.ogImageStaticPath, media: post.ogImageMedia },
      twitterCard: post.twitterCard,
      robotsIndex: post.robotsIndex,
      robotsFollow: post.robotsFollow,
      robotsExtra: post.robotsExtra,
      focusKeywords: post.focusKeywords,
      emitLegacyMetaKeywords: post.emitLegacyMetaKeywords,
    },
    // NOT the dead guard the other three coalesces were, and the difference is
    // exactly `unknown`: it is the one field here typed that way, and `unknown`
    // admits `undefined`, so `{ ...row, customSchema: undefined }` compiles
    // clean where the same edit to `heroMedia` is a type error. Task 8's write
    // door is precisely the caller that hands this an optional zod field.
    // Left un-coalesced, `JSON.stringify` DROPS the key on the way into the
    // jsonb column: the stored snapshot's key set then matches no other post's,
    // and `publicFingerprint` reads as changed, which pings IndexNow for a URL
    // whose bytes did not move. Both silent.
    customSchema: post.customSchema ?? null,
    llmsInclude: post.llmsInclude,
    publishedAt: extra.publishedAt,
    contentModifiedAt: extra.contentModifiedAt,
  };
}
