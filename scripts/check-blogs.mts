/**
 * Blog editor self-check — the post-state leaf, executable.
 *
 * Run:  node --import tsx scripts/check-blogs.mts    (no DB, no env, no network)
 *
 * src/lib/blogFields.ts decides everything the editor knows about a post's
 * STATE, and every mistake it can make is silent on screen:
 *
 *  - A transition the leaf allows but the database refuses (migration 0045's
 *    three CHECK constraints) surfaces to a member as a raw Postgres error on
 *    a button that looked enabled. A transition the leaf refuses but the
 *    database would have taken is a control that quietly does nothing.
 *  - contentFingerprint decides whether `content_modified_at` moves, which
 *    drives the visible "Updated" byline, the sitemap <lastmod> and JSON-LD
 *    dateModified. Break its INVARIANT half and every SEO tweak rewrites the
 *    lastmod of every post it touches — the site claims a freshness it does
 *    not have, on every URL, with nothing on any screen to say so.
 *  - publicFingerprint gates the IndexNow ping. Ping an unchanged URL and
 *    that is a Bing spam signal (CLAUDE.md: "Never ping unchanged URLs");
 *    miss a real change and Bing serves a stale page for ever.
 *  - Both fingerprints are compared for equality across a jsonb round trip,
 *    and Postgres does not promise key order back out of a jsonb column. An
 *    unsorted JSON.stringify therefore reports a change that never happened,
 *    on a random subset of saves. That is the sortKeys guard, pinned below.
 *  - ROBOTS_EXTRA_KEYS that Next does not know renders a toggle in our UI
 *    which emits no directive at all — the same drift-guard idea as
 *    scripts/check-menu-trigger.mts reading Radix's own source.
 *  - dayTimeIn turns the writer's chosen date and time into the instant the
 *    scheduler fires at. Wrong, and a post goes live on the right day at the
 *    wrong hour, or on the wrong day entirely.
 *
 * Every assertion here has been mutation-tested: the function was broken
 * deliberately and the assertion went red. An assertion that stays green
 * under its own mutation is a comment, not a check, and this repo deletes
 * those.
 *
 * Later tasks in this programme append their own sections to this file.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

import { EMPTY_BLOG_DOC } from '@/db/blogStatements';
import { blogPostStatus } from '@/db/schema';
import {
  blogMediaSchema,
  figures,
  internalLinkSlugs,
  stripTrailingEmptyParagraphs,
  validateBlogBody,
  type BlogDoc,
} from '@/lib/blogBody';
import { articleImageSet, buildPostJsonLd } from '@/lib/blogJsonLd';
import type { BlogHero, PublishedPost } from '@/lib/blogStore';
import {
  BLOG_POST_STATUSES,
  BLOG_POST_STATUS_LABELS,
  ROBOTS_EXTRA_KEYS,
  ROBOTS_EXTRA_KINDS,
  ROBOTS_PREVIEW_VALUES,
  buildSnapshot,
  contentChanged,
  contentFingerprint,
  isPlaceholderSlug,
  newDraftSlug,
  publicFingerprint,
  publicUrlFor,
  restoreTarget,
  slugLocked,
  transitionProblem,
  type BlogPostStatus,
  type BlogSnapshotView,
  type BlogWorkingView,
} from '@/lib/blogFields';
import {
  blogListQs,
  blogStatusFilter,
  parseBlogListParams,
  type BlogListParams,
} from '@/lib/blogFilters';
import {
  blogDraftSchema,
  blogPostFieldsSchema,
  blogPublishSchema,
  blogRobotsExtraSchema,
  flattenBlogIssues,
} from '@/lib/blogPostSchema';
import { STUDIO_TZ, dayNoonIn, dayStartIn, dayTimeIn } from '@/lib/calendar';
import { PORTFOLIO_SLUG_MAX, PORTFOLIO_SLUG_RE, PROJECT_IMAGE_RUNGS } from '@/lib/portfolioFields';
import {
  BLOG_MEDIA_LABELS,
  BLOG_MEDIA_PATHNAME_RE,
  PUBLIC_BLOB_HOST,
  blogMediaBase,
} from '@/lib/publicBlobFields';

const TEHRAN = 'Asia/Tehran';

let fails = 0;
const eq = (label: string, got: unknown, want: unknown) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log(
    `${pass ? 'PASS' : 'FAIL'}  ${label}  got=${JSON.stringify(got)}${pass ? '' : ` want=${JSON.stringify(want)}`}`,
  );
};
const ok = (label: string, cond: boolean) => eq(label, cond, true);

// ═══════════════════════════════════════════════════════════════════════════
// 1. The status vocabulary matches the database
// ═══════════════════════════════════════════════════════════════════════════
// The leaf cannot import src/db/schema.ts (drizzle is not client-safe), so
// nothing in the app would notice the two drifting apart. A status the leaf
// knows and the enum does not is an UPDATE that throws 22P02; a status the
// enum knows and the leaf does not is a row every switch in the editor falls
// through. Order matters too: the sweep below walks BLOG_POST_STATUSES, so a
// value appended to only one side must fail here rather than go untested.

eq(
  'BLOG_POST_STATUSES equals the blog_post_status pgEnum, same order',
  [...BLOG_POST_STATUSES],
  [...blogPostStatus.enumValues],
);

// ═══════════════════════════════════════════════════════════════════════════
// 2. The transition table, swept
// ═══════════════════════════════════════════════════════════════════════════
// Swept over every ordered pair x both values of everPublished (50 cases), not
// written out by hand: the sweep is what forces a status added later through a
// decision instead of letting it inherit one from a case nobody wrote.
//
// The allow-set is restated here independently of the implementation. It must
// agree with migration 0045, whose constraints are the backstop behind this
// guard: blog_posts_published_stamp (published needs published_at),
// blog_posts_schedule_stamp (scheduled needs publish_at + pending_revision_id)
// and blog_posts_pending_only_scheduled (no pending_revision_id outside a
// `scheduled` row). Note what that last one does NOT do: it does not forbid
// the published -> scheduled STATUS PAIR, which satisfies all three CHECKs on
// a row that keeps its published_at. It forbids the pending pointer a
// scheduled update to a live post would need. The database blocks the
// mechanism, transitionProblem blocks the move, and neither is redundant.

/** Allowed regardless of whether the post was ever published. */
const ALLOWED_ALWAYS: ReadonlyArray<readonly [BlogPostStatus, BlogPostStatus]> = [
  ['draft', 'published'], // Publish now
  ['draft', 'scheduled'], // Schedule
  ['draft', 'trash'],
  ['scheduled', 'published'], // the cron, or Publish now
  ['scheduled', 'draft'], // Unschedule
  ['scheduled', 'trash'],
  ['published', 'published'], // Update: a new revision, the pointer moves
  ['published', 'archived'], // Unpublish
  ['published', 'trash'],
  ['archived', 'published'], // Publish again
  ['archived', 'trash'],
];

const allowed = (from: BlogPostStatus, to: BlogPostStatus, everPublished: boolean) =>
  ALLOWED_ALWAYS.some(([f, t]) => f === from && t === to) ||
  // Restoring from trash goes to exactly one place, and which one is decided
  // by history, not by the caller. The other one must be refused.
  (from === 'trash' && to === (everPublished ? 'archived' : 'draft'));

let swept = 0;
let allowedSeen = 0;
for (const from of BLOG_POST_STATUSES) {
  for (const to of BLOG_POST_STATUSES) {
    for (const everPublished of [false, true]) {
      swept++;
      const got = transitionProblem(from, to, { everPublished });
      if (allowed(from, to, everPublished)) {
        allowedSeen++;
        // Exactly null. A falsy empty string would read as "allowed" at every
        // call site and as "refused" to anything checking the type.
        eq(`allow ${from} -> ${to} (everPublished=${everPublished})`, got, null);
      } else {
        ok(
          `refuse ${from} -> ${to} (everPublished=${everPublished}) with a sentence`,
          typeof got === 'string' && got.trim().length > 0,
        );
      }
    }
  }
}
eq('the sweep covered every ordered pair x both histories', swept, BLOG_POST_STATUSES.length ** 2 * 2);
// Guards the sweep itself: if `allowed` ever returned false for everything,
// every case above would pass as a refusal and the allow half would be vacuous.
eq('the sweep exercised the allowed branch', allowedSeen, ALLOWED_ALWAYS.length * 2 + 2);

// No refusal a member reads may carry an em dash (CLAUDE.md's admin copy rule).
for (const from of BLOG_POST_STATUSES) {
  for (const to of BLOG_POST_STATUSES) {
    for (const everPublished of [false, true]) {
      const got = transitionProblem(from, to, { everPublished });
      if (got !== null) ok(`no em dash in "${got}"`, !got.includes('—'));
    }
  }
}

// The refusals a member will actually meet carry their OWN wording, and the
// generic sentence is templated on the two status labels — so comparing a
// refusal against one fixed generic string proves nothing: no other pair could
// ever equal it. (That was the first version, and mutation testing caught it
// staying green while the dedicated wording was deleted.) The template is
// therefore rebuilt for the pair under test, derived from a pair that really
// does get it, so a copy edit to the generic sentence moves this with it.
const GENERIC = transitionProblem('draft', 'archived', { everPublished: false }) ?? '';
const DRAFT_LABEL = BLOG_POST_STATUS_LABELS.draft;
const ARCHIVED_LABEL = BLOG_POST_STATUS_LABELS.archived;
const gFrom = GENERIC.indexOf(DRAFT_LABEL);
const gTo = GENERIC.indexOf(ARCHIVED_LABEL);
ok('the generic refusal names both statuses, in order (fixture guard)', gFrom >= 0 && gTo > gFrom);
const genericFor = (from: BlogPostStatus, to: BlogPostStatus) =>
  GENERIC.slice(0, gFrom) +
  BLOG_POST_STATUS_LABELS[from] +
  GENERIC.slice(gFrom + DRAFT_LABEL.length, gTo) +
  BLOG_POST_STATUS_LABELS[to] +
  GENERIC.slice(gTo + ARCHIVED_LABEL.length);
// (There is deliberately no `genericFor('draft','archived') === GENERIC`
// assertion here. It reassembles GENERIC from slices taken at its own indexOf
// positions, so once the guard above passes it is an identity and could not
// fail under any mutation.)

ok(
  'published -> scheduled says scheduling a live post is not built',
  transitionProblem('published', 'scheduled', { everPublished: true }) !==
    genericFor('published', 'scheduled'),
);
ok(
  'archived -> scheduled gets the same dedicated wording',
  transitionProblem('archived', 'scheduled', { everPublished: true }) ===
    transitionProblem('published', 'scheduled', { everPublished: true }),
);
ok(
  'published -> draft points at Archived rather than the generic sentence',
  transitionProblem('published', 'draft', { everPublished: true }) !== genericFor('published', 'draft'),
);
// Every self-move but `published` is a no-op somebody clicked by accident, so
// all four must get the SAME sentence with only the label swapped. Asserting
// merely "not the generic sentence" was the first version, and it could not
// fail: `trash -> trash` was answered by the restore branch with "Restore this
// post from Trash first", which is neither the generic sentence nor missing
// the label. That is a real defect this equality now catches. THE ORDER of the
// branches in transitionProblem is what it pins: the self-move test has to
// come before the trash branch, because a post in Trash going to Trash is
// already doing the thing it is being told to do first.
const SELF_SAMPLE = transitionProblem('draft', 'draft', { everPublished: false }) ?? '';
const selfFor = (s: BlogPostStatus) =>
  SELF_SAMPLE.split(DRAFT_LABEL).join(BLOG_POST_STATUS_LABELS[s]);
ok('the self-move sentence names the status (fixture guard)', SELF_SAMPLE.includes(DRAFT_LABEL));
for (const s of BLOG_POST_STATUSES) {
  if (s === 'published') continue;
  for (const everPublished of [false, true]) {
    const got = transitionProblem(s, s, { everPublished });
    eq(`${s} -> ${s} gets the nothing-to-do sentence (everPublished=${everPublished})`, got, selfFor(s));
    ok(
      `${s} -> ${s} is not the generic refusal`,
      got !== genericFor(s, s),
    );
  }
}
// The wrong restore door names the RIGHT one, which is the only thing that
// makes the refusal actionable.
ok(
  'trash -> draft on a published post names Archived',
  (transitionProblem('trash', 'draft', { everPublished: true }) ?? '').includes(ARCHIVED_LABEL),
);
ok(
  'trash -> archived on a never-published post names Draft',
  (transitionProblem('trash', 'archived', { everPublished: false }) ?? '').includes(DRAFT_LABEL),
);

// ═══════════════════════════════════════════════════════════════════════════
// 3. restoreTarget
// ═══════════════════════════════════════════════════════════════════════════
// Restoring a formerly published post to `draft` leaves a row whose
// published_revision_id still points at a snapshot while its URL 404s. To
// whoever pressed Restore that reads as data loss.

eq('restore a never-published post to draft', restoreTarget({ everPublished: false }), 'draft');
eq('restore a formerly published post to archived', restoreTarget({ everPublished: true }), 'archived');

for (const everPublished of [false, true]) {
  const target = restoreTarget({ everPublished });
  const other: BlogPostStatus = target === 'draft' ? 'archived' : 'draft';
  eq(
    `trash -> ${target} is the restore (everPublished=${everPublished})`,
    transitionProblem('trash', target, { everPublished }),
    null,
  );
  ok(
    `trash -> ${other} is refused (everPublished=${everPublished})`,
    typeof transitionProblem('trash', other, { everPublished }) === 'string',
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 4-6. The two fingerprints
// ═══════════════════════════════════════════════════════════════════════════

const BASE: BlogSnapshotView = {
  slug: 'video-production-vancouver',
  title: 'Video production in Vancouver',
  description: 'What a shoot week actually looks like.',
  categorySlug: 'production',
  authorSlug: 'saman-hoseinpour',
  serviceSlug: 'video-production',
  hero: {
    staticPath: '/images/blogs/hero.avif',
    media: null,
    alt: 'A camera on a tripod',
    caption: null,
  },
  body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'One.' }] }] },
  bodyText: 'One.',
  keyTakeaways: ['Book the crew first.'],
  faqs: [{ question: 'How long?', answer: 'A day.' }],
  sources: [{ title: 'Canada Media Fund', href: 'https://cmf-fmc.ca' }],
  entities: [{ name: 'Vancouver', sameAs: ['https://www.wikidata.org/wiki/Q24639'], primary: true }],
  relatedSlugs: ['brand-video-checklist'],
  seo: {
    title: 'Video production in Vancouver | Perseus',
    description: 'A shoot week, start to finish.',
    canonicalOverride: null,
    ogTitle: 'Video production in Vancouver',
    ogDescription: 'A shoot week, start to finish.',
    ogImage: null,
    twitterCard: 'summary_large_image',
    robotsIndex: true,
    robotsFollow: true,
    robotsExtra: null,
    focusKeywords: ['video production vancouver'],
    emitLegacyMetaKeywords: false,
  },
  customSchema: null,
};

const CONTENT_BASE = contentFingerprint(BASE);
const PUBLIC_BASE = publicFingerprint(BASE);

const clone = (s: BlogSnapshotView): BlogSnapshotView => JSON.parse(JSON.stringify(s));
const mutated = (fn: (s: BlogSnapshotView) => void): BlogSnapshotView => {
  const c = clone(BASE);
  fn(c);
  return c;
};

type Edit = readonly [string, (s: BlogSnapshotView) => void];

/** What a reader sees as the article. These MUST move contentFingerprint. */
const CONTENT_EDITS: readonly Edit[] = [
  ['title', (s) => void (s.title = 'Video production in Burnaby')],
  ['description', (s) => void (s.description = 'A different summary.')],
  ['body', (s) => void (s.body = { type: 'doc', content: [] })],
  ['keyTakeaways', (s) => void (s.keyTakeaways = ['Book the crew last.'])],
  ['faqs', (s) => void (s.faqs = [{ question: 'How long?', answer: 'Two days.' }])],
  ['sources', (s) => void (s.sources = [])],
  ['entities', (s) => void (s.entities = [{ name: 'Burnaby', sameAs: [], primary: false }])],
  ['relatedSlugs', (s) => void (s.relatedSlugs = [])],
  ['serviceSlug', (s) => void (s.serviceSlug = null)],
  ['hero.alt', (s) => void (s.hero.alt = 'A camera on a gimbal')],
  ['hero.caption', (s) => void (s.hero.caption = 'On location in Gastown.')],
  ['hero.staticPath', (s) => void (s.hero.staticPath = '/images/blogs/hero-2.avif')],
  ['hero.media', (s) => void (s.hero.media = { variants: {}, blurDataUrl: null })],
];

/** Metadata and addressing. These must NOT move contentFingerprint, and MUST
 *  move publicFingerprint. The first half is the one that silently rewrites
 *  every sitemap lastmod if it breaks. */
const SEO_EDITS: readonly Edit[] = [
  ['slug', (s) => void (s.slug = 'video-production-in-vancouver')],
  ['categorySlug', (s) => void (s.categorySlug = 'social')],
  ['authorSlug', (s) => void (s.authorSlug = 'perseus-creative-studio')],
  ['seo.title', (s) => void (s.seo.title = 'Vancouver video production | Perseus')],
  ['seo.description', (s) => void (s.seo.description = 'Another meta description.')],
  ['seo.canonicalOverride', (s) => void (s.seo.canonicalOverride = 'https://example.com/x')],
  ['seo.ogTitle', (s) => void (s.seo.ogTitle = 'A different OG title')],
  ['seo.ogDescription', (s) => void (s.seo.ogDescription = 'A different OG description')],
  ['seo.ogImage', (s) => void (s.seo.ogImage = { staticPath: '/images/og.avif', media: null })],
  ['seo.twitterCard', (s) => void (s.seo.twitterCard = 'summary')],
  ['seo.robotsIndex', (s) => void (s.seo.robotsIndex = false)],
  ['seo.robotsFollow', (s) => void (s.seo.robotsFollow = false)],
  ['seo.robotsExtra', (s) => void (s.seo.robotsExtra = { noarchive: true })],
  // focusKeywords are NOT gated on emitLegacyMetaKeywords. They reach the page
  // twice regardless of it, as openGraph.tags and as JSON-LD `keywords`; only
  // the <meta name="keywords"> tag is gated. So a keyword edit changes bytes a
  // crawler fetches and must ping.
  ['seo.focusKeywords', (s) => void (s.seo.focusKeywords = ['vancouver video crew'])],
  ['seo.emitLegacyMetaKeywords', (s) => void (s.seo.emitLegacyMetaKeywords = true)],
  // Arbitrary hand-written JSON-LD. Nothing renders it yet, which is exactly
  // why it is fingerprinted now: it is already on the public view model, so
  // leaving it out means the day a renderer lands, a schema edit pings nothing.
  ['customSchema', (s) => void (s.customSchema = { '@type': 'HowTo', name: 'Book a shoot' })],
];

for (const [label, fn] of CONTENT_EDITS) {
  const next = mutated(fn);
  // Anti-vacuity: an edit that changed nothing would make both halves below
  // pass for the wrong reason.
  ok(`edit ${label} really changed the snapshot`, JSON.stringify(next) !== JSON.stringify(BASE));
  ok(`contentFingerprint MOVES for ${label}`, contentFingerprint(next) !== CONTENT_BASE);
  ok(`publicFingerprint MOVES for ${label}`, publicFingerprint(next) !== PUBLIC_BASE);
}

for (const [label, fn] of SEO_EDITS) {
  const next = mutated(fn);
  ok(`edit ${label} really changed the snapshot`, JSON.stringify(next) !== JSON.stringify(BASE));
  eq(`contentFingerprint INVARIANT to ${label}`, contentFingerprint(next), CONTENT_BASE);
  ok(`publicFingerprint MOVES for ${label}`, publicFingerprint(next) !== PUBLIC_BASE);
}

// focusKeywords, BOTH ways round the legacy flag. The first version of this
// leaf gated them on emitLegacyMetaKeywords, on the reading that they were
// "emitted nowhere" with it off. That is not what the renderer does:
// src/app/(marketing)/blogs/[blog]/page.tsx feeds them to openGraph.tags and
// src/lib/blogJsonLd.ts to JSON-LD `keywords`, neither of them gated. A
// keyword edit therefore changes bytes a crawler fetches whatever the flag
// says, and both cases must ping.
for (const emitLegacyMetaKeywords of [false, true]) {
  const before = mutated((s) => void (s.seo.emitLegacyMetaKeywords = emitLegacyMetaKeywords));
  const after = mutated((s) => {
    s.seo.emitLegacyMetaKeywords = emitLegacyMetaKeywords;
    s.seo.focusKeywords = ['vancouver video crew'];
  });
  ok(
    `keywords (legacy meta ${emitLegacyMetaKeywords ? 'on' : 'off'}): an edit MOVES publicFingerprint`,
    publicFingerprint(after) !== publicFingerprint(before),
  );
  eq(
    `keywords (legacy meta ${emitLegacyMetaKeywords ? 'on' : 'off'}): an edit does not move contentFingerprint`,
    contentFingerprint(after),
    CONTENT_BASE,
  );
}
// The flag still counts on its own account: toggling it adds or removes the
// <meta name="keywords"> tag even when the keywords have not moved.
ok(
  'flipping emitLegacyMetaKeywords alone moves publicFingerprint',
  publicFingerprint(mutated((s) => void (s.seo.emitLegacyMetaKeywords = true))) !== PUBLIC_BASE,
);
eq(
  'flipping emitLegacyMetaKeywords does not move contentFingerprint',
  contentFingerprint(mutated((s) => void (s.seo.emitLegacyMetaKeywords = true))),
  CONTENT_BASE,
);

// customSchema is arbitrary JSON-LD carried onto the public view model. It
// must move publicFingerprint and must NOT move contentFingerprint: it is
// metadata, not the article.
const SCHEMA_EDIT = mutated((s) => void (s.customSchema = { '@type': 'FAQPage' }));
ok('publicFingerprint MOVES for customSchema', publicFingerprint(SCHEMA_EDIT) !== PUBLIC_BASE);
eq('contentFingerprint INVARIANT to customSchema', contentFingerprint(SCHEMA_EDIT), CONTENT_BASE);

// wordCount and bodyText are both derived from the body, which is already in,
// so neither may move a fingerprint on its own. (bodyText is a real
// BlogRevisionSnapshot field, so this is a live exclusion, not a hypothetical.)
const WITH_WORD_COUNT = { ...clone(BASE), wordCount: 1234 } as BlogSnapshotView;
eq('contentFingerprint ignores wordCount', contentFingerprint(WITH_WORD_COUNT), CONTENT_BASE);
eq('publicFingerprint ignores wordCount', publicFingerprint(WITH_WORD_COUNT), PUBLIC_BASE);
const BODY_TEXT_EDIT = mutated((s) => void (s.bodyText = 'Something else entirely.'));
ok('bodyText really changed in the fixture', JSON.stringify(BODY_TEXT_EDIT) !== JSON.stringify(BASE));
eq('contentFingerprint ignores bodyText', contentFingerprint(BODY_TEXT_EDIT), CONTENT_BASE);
eq('publicFingerprint ignores bodyText', publicFingerprint(BODY_TEXT_EDIT), PUBLIC_BASE);

// llmsInclude is excluded for now: nothing serves an llms.txt from the
// database yet. It joins publicFingerprint the day that route ships.
const WITH_LLMS = { ...clone(BASE), llmsInclude: false } as BlogSnapshotView;
eq('publicFingerprint ignores llmsInclude for now', publicFingerprint(WITH_LLMS), PUBLIC_BASE);

// ---- 6. Key order. THE jsonb round-trip guard. Postgres makes no promise
// about the key order it hands a jsonb column back in, so an unsorted
// stringify reports a change that never happened, on an arbitrary subset of
// saves. Same object, keys inserted backwards, including inside `hero` and
// inside an entity.
const REORDERED: BlogSnapshotView = {
  customSchema: null,
  bodyText: 'One.',
  seo: {
    emitLegacyMetaKeywords: false,
    focusKeywords: ['video production vancouver'],
    robotsExtra: null,
    robotsFollow: true,
    robotsIndex: true,
    twitterCard: 'summary_large_image',
    ogImage: null,
    ogDescription: 'A shoot week, start to finish.',
    ogTitle: 'Video production in Vancouver',
    canonicalOverride: null,
    description: 'A shoot week, start to finish.',
    title: 'Video production in Vancouver | Perseus',
  },
  relatedSlugs: ['brand-video-checklist'],
  entities: [{ primary: true, sameAs: ['https://www.wikidata.org/wiki/Q24639'], name: 'Vancouver' }],
  sources: [{ href: 'https://cmf-fmc.ca', title: 'Canada Media Fund' }],
  faqs: [{ answer: 'A day.', question: 'How long?' }],
  keyTakeaways: ['Book the crew first.'],
  body: { content: [{ content: [{ text: 'One.', type: 'text' }], type: 'paragraph' }], type: 'doc' },
  hero: {
    caption: null,
    alt: 'A camera on a tripod',
    media: null,
    staticPath: '/images/blogs/hero.avif',
  },
  serviceSlug: 'video-production',
  authorSlug: 'saman-hoseinpour',
  categorySlug: 'production',
  description: 'What a shoot week actually looks like.',
  title: 'Video production in Vancouver',
  slug: 'video-production-vancouver',
};
// Anti-vacuity: prove the two literals really do disagree about key order, so
// the equalities below are testing sortKeys and not testing nothing.
ok(
  'the reordered fixture really is a different key order',
  JSON.stringify(REORDERED) !== JSON.stringify(BASE),
);
eq('contentFingerprint is invariant to key order', contentFingerprint(REORDERED), CONTENT_BASE);
eq('publicFingerprint is invariant to key order', publicFingerprint(REORDERED), PUBLIC_BASE);

// The canonical form is a plain string, never a hash: the leaf must stay
// client-safe, and node:crypto is not.
ok('contentFingerprint returns a string', typeof CONTENT_BASE === 'string');
ok('the fingerprint is canonical JSON, not a digest', CONTENT_BASE.startsWith('{'));

// ═══════════════════════════════════════════════════════════════════════════
// 7. Robots extras are a SUBSET of what Next knows
// ═══════════════════════════════════════════════════════════════════════════
// Next serialises each robots entry as `key` (boolean) or `key:value` and
// joins them with ', '. A key Next does not know is dropped silently, so our
// UI would render a toggle that emits nothing. Read Next's own source, the
// scripts/check-menu-trigger.mts idea.

const require_ = createRequire(import.meta.url);
const NEXT_BASICS = require_.resolve('next/dist/lib/metadata/resolvers/resolve-basics.js');
const nextSource = readFileSync(NEXT_BASICS, 'utf8');
const robotsBlock = nextSource.match(/const robotsKeys\s*=\s*\[([^\]]*)\]/);
const nextRobotsKeys = robotsBlock
  ? [...robotsBlock[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
  : [];
// Fail loudly rather than passing vacuously: if Next moves or renames this
// array, an empty list would make every subset check below trivially true.
ok('found Next’s robotsKeys array (drift guard)', nextRobotsKeys.length >= 8);
for (const key of ROBOTS_EXTRA_KEYS) {
  ok(`Next knows the robots directive "${key}"`, nextRobotsKeys.includes(key));
}
eq('ROBOTS_EXTRA_KEYS has exactly eight entries', ROBOTS_EXTRA_KEYS.length, 8);
eq(
  'every robots key declares a value kind task 5 can build zod from',
  ROBOTS_EXTRA_KEYS.filter((k) => !ROBOTS_EXTRA_KINDS[k]),
  [],
);
eq(
  'ROBOTS_EXTRA_KINDS declares nothing ROBOTS_EXTRA_KEYS does not offer',
  Object.keys(ROBOTS_EXTRA_KINDS).filter((k) => !(ROBOTS_EXTRA_KEYS as readonly string[]).includes(k)),
  [],
);
eq('max-snippet is an integer', ROBOTS_EXTRA_KINDS['max-snippet'], 'int');
eq('max-video-preview is an integer', ROBOTS_EXTRA_KINDS['max-video-preview'], 'int');
eq('max-image-preview is the three-value enum', ROBOTS_EXTRA_KINDS['max-image-preview'], 'preview');
eq('unavailable_after is an instant', ROBOTS_EXTRA_KINDS['unavailable_after'], 'instant');
for (const key of ['noarchive', 'nosnippet', 'noimageindex', 'notranslate'] as const) {
  eq(`${key} is a boolean`, ROBOTS_EXTRA_KINDS[key], 'bool');
}
// No key may be free text. A string value containing a comma injects a SECOND
// directive into the meta tag, because Next joins entries with ', '.
ok(
  'no robots key takes free text',
  ROBOTS_EXTRA_KEYS.every((k) => ['int', 'bool', 'preview', 'instant'].includes(ROBOTS_EXTRA_KINDS[k])),
);

// ═══════════════════════════════════════════════════════════════════════════
// 8-9. Slugs
// ═══════════════════════════════════════════════════════════════════════════
// The working row's slug IS the public URL, so a placeholder has to be a legal
// slug from the moment the draft row is inserted, and it has to be
// recognisable afterwards: the editor's title-to-slug auto-follow runs only
// while the stored slug is still one of these.

const FIXED = newDraftSlug(() => 'a1b2c3d4');
eq('newDraftSlug uses the injected generator', FIXED, 'draft-a1b2c3d4');
ok('a draft slug matches PORTFOLIO_SLUG_RE', PORTFOLIO_SLUG_RE.test(FIXED));
ok('a draft slug is under PORTFOLIO_SLUG_MAX', FIXED.length < PORTFOLIO_SLUG_MAX);
ok('a draft slug is recognised as a placeholder', isPlaceholderSlug(FIXED));

// Lowercase is load-bearing: PORTFOLIO_SLUG_RE is lowercase-only, so an
// uppercase generator would produce a slug the schema rejects at insert.
const UPPER = newDraftSlug(() => 'A1B2C3D4');
eq('an uppercase generator is lowercased', UPPER, 'draft-a1b2c3d4');
ok('and still matches PORTFOLIO_SLUG_RE', PORTFOLIO_SLUG_RE.test(UPPER));

// A short-but-real generator pads, and the result is still a legal slug: the
// insert must never fail over the placeholder.
const SHORT = newDraftSlug(() => 'abc');
eq('a short generator is padded, not rejected', SHORT, 'draft-abc00000');
ok('and the padded slug is legal', PORTFOLIO_SLUG_RE.test(SHORT));
ok('and it is still recognised as a placeholder', isPlaceholderSlug(SHORT));
const LONG = newDraftSlug(() => 'abcdef0123456789');
eq('an over-long generator is truncated to eight hex characters', LONG, 'draft-abcdef01');

// A generator yielding NO hex at all THROWS rather than padding, because
// padding would return the constant `draft-00000000` every time: a broken
// injection would then surface as unique-index violations on the second draft
// anybody creates, which looks like a database fault rather than a caller bug.
let threw = '';
try {
  newDraftSlug(() => 'zz');
} catch (error) {
  threw = error instanceof Error ? error.message : String(error);
}
ok('a hex-less generator throws instead of returning a constant', threw.length > 0);
ok('and the message says what went wrong', threw.includes('no hex'));

// The default generator (no argument) must satisfy the same shape EVERY time,
// so this counts what it actually produced. It used to assert a hardcoded
// `true` beside that claim, which could not fail.
const DEFAULT_RUNS = 200;
let legalDefaults = 0;
const badDefaults: string[] = [];
for (let i = 0; i < DEFAULT_RUNS; i++) {
  const s = newDraftSlug();
  if (PORTFOLIO_SLUG_RE.test(s) && isPlaceholderSlug(s) && s.length < PORTFOLIO_SLUG_MAX) {
    legalDefaults++;
  } else if (badDefaults.length < 3) {
    badDefaults.push(s);
  }
}
eq(
  `all ${DEFAULT_RUNS} default draft slugs are legal placeholders${badDefaults.length ? ` (e.g. ${badDefaults.join(', ')})` : ''}`,
  legalDefaults,
  DEFAULT_RUNS,
);
// ...and they are not all the SAME slug, which a constant generator would be.
eq(
  'the default generator varies',
  new Set(Array.from({ length: 50 }, () => newDraftSlug())).size > 1,
  true,
);

// A real slug must NOT be mistaken for one, or the editor would keep
// overwriting a slug the writer chose.
for (const real of [
  'video-production-vancouver',
  'draft',
  'draft-',
  'draft-a1b2c3d',
  'draft-a1b2c3d45',
  'draft-a1b2c3g4',
  'draft-post-one',
  'my-draft-a1b2c3d4',
]) {
  ok(`"${real}" is not a placeholder slug`, !isPlaceholderSlug(real));
}

eq('slugLocked once published', slugLocked({ publishedAt: new Date('2026-01-01') }), true);
eq('slugLocked on an ISO string too', slugLocked({ publishedAt: '2026-01-01T00:00:00.000Z' }), true);
eq('slugLocked is false while never published', slugLocked({ publishedAt: null }), false);
eq('slugLocked is false when the field is absent', slugLocked({ publishedAt: undefined }), false);

eq('publicUrlFor is a path, not an origin', publicUrlFor('a-post'), '/blogs/a-post');

// ═══════════════════════════════════════════════════════════════════════════
// 10. dayTimeIn — the scheduler's firing instant
// ═══════════════════════════════════════════════════════════════════════════
// publish_at is a real instant the writer picks as a date plus a time in their
// OWN zone. Two writers picking 09:00 on the same day in different zones must
// get different instants, or the whole reason viewerZone exists is defeated.

const KEY = '2026-06-15';
ok(
  '09:00 in Vancouver and 09:00 in Tehran on one day are different instants',
  dayTimeIn(STUDIO_TZ, KEY, 540).getTime() !== dayTimeIn(TEHRAN, KEY, 540).getTime(),
);
// And the gap is SEASONAL, because Vancouver observes DST and Tehran has not
// since 2022: 10h30m in June, 11h30m in January. A scheduler that resolved the
// zone once and reused the offset would be an hour out for half the year.
eq(
  'Tehran 09:00 is 10h30m ahead of Vancouver 09:00 in June (PDT)',
  (dayTimeIn(STUDIO_TZ, KEY, 540).getTime() - dayTimeIn(TEHRAN, KEY, 540).getTime()) / 60_000,
  630,
);
eq(
  'Tehran 09:00 is 11h30m ahead of Vancouver 09:00 in January (PST)',
  (dayTimeIn(STUDIO_TZ, '2026-01-15', 540).getTime() -
    dayTimeIn(TEHRAN, '2026-01-15', 540).getTime()) /
    60_000,
  690,
);

// It is defined as elapsed time from the day's first moment, so its two named
// endpoints must be exactly the helpers that already exist.
for (const tz of [STUDIO_TZ, TEHRAN, 'UTC', 'Australia/Sydney', 'America/Santiago']) {
  for (const key of ['2026-01-01', '2026-03-08', '2026-06-15', '2026-11-01']) {
    eq(`${tz} ${key}: minute 0 is dayStartIn`, dayTimeIn(tz, key, 0).toISOString(), dayStartIn(tz, key).toISOString());
    eq(`${tz} ${key}: minute 720 is dayNoonIn`, dayTimeIn(tz, key, 720).toISOString(), dayNoonIn(tz, key).toISOString());
    // REAL elapsed time, never a re-derived local wall clock.
    for (const m of [1, 59, 540, 1_439]) {
      eq(
        `${tz} ${key}: minute ${m} is exactly ${m} minutes of real time`,
        dayTimeIn(tz, key, m).getTime() - dayStartIn(tz, key).getTime(),
        m * 60_000,
      );
    }
  }
}

// ---- Both Vancouver DST transitions, using the dates already pinned in
// scripts/check-calendar.mts. Across a shift the WALL CLOCK lands an hour off,
// and that is correct for a firing instant: elapsed time is the thing being
// chosen. What must hold is that the instant still falls on the chosen DAY.
const SPRING = '2026-03-08'; // Vancouver springs forward at 02:00, a 23h day
const FALL = '2026-11-01'; // Vancouver falls back at 02:00, a 25h day
eq(
  'spring forward: 09:00 chosen lands at 17:00Z (10:00 local, an hour late)',
  dayTimeIn(STUDIO_TZ, SPRING, 540).toISOString(),
  '2026-03-08T17:00:00.000Z',
);
eq(
  'fall back: 09:00 chosen lands at 16:00Z (08:00 local, an hour early)',
  dayTimeIn(STUDIO_TZ, FALL, 540).toISOString(),
  '2026-11-01T16:00:00.000Z',
);
// The invariant that actually matters: a schedule picked for a day fires on
// that day, DST or not. Swept every half hour of each transition day, up to
// that day's OWN length.
let escaped = 0;
let sweptMinutes = 0;
for (const [key, nextKey] of [
  [SPRING, '2026-03-09'],
  [FALL, '2026-11-02'],
] as const) {
  const start = dayStartIn(STUDIO_TZ, key);
  const nextStart = dayStartIn(STUDIO_TZ, nextKey);
  const dayMinutes = (nextStart.getTime() - start.getTime()) / 60_000;
  for (let m = 0; m < dayMinutes; m += 30) {
    sweptMinutes++;
    const at = dayTimeIn(STUDIO_TZ, key, m).getTime();
    if (at < start.getTime() || at >= nextStart.getTime()) escaped++;
  }
}
eq('the DST sweep really ran (23h + 25h of half hours)', sweptMinutes, 46 + 50);
eq('no half hour of either DST transition day escapes its own day', escaped, 0);

// THE EDGE, pinned as a decision rather than left to be discovered: a
// spring-forward day is only 23 hours of real time, so 23:00 chosen on it is
// 24 hours after the day began and lands on the NEXT day. dayTimeIn measures
// elapsed time and cannot know otherwise; whatever offers a time picker for
// publish_at has to bound it by the day's real length. Found by this sweep.
eq(
  'spring forward: 23:00 chosen is really the next day',
  dayTimeIn(STUDIO_TZ, SPRING, 23 * 60).toISOString(),
  '2026-03-09T07:00:00.000Z',
);
eq(
  'fall back: the same 23:00 is comfortably inside a 25-hour day',
  dayTimeIn(STUDIO_TZ, FALL, 23 * 60).toISOString(),
  '2026-11-02T06:00:00.000Z',
);
// And the 25-hour day is genuinely 25 hours, so this is not a no-op sweep.
eq(
  'the fall-back day really is 25 hours long',
  (dayStartIn(STUDIO_TZ, '2026-11-02').getTime() - dayStartIn(STUDIO_TZ, FALL).getTime()) / 3_600_000,
  25,
);
eq(
  'the spring-forward day really is 23 hours long',
  (dayStartIn(STUDIO_TZ, '2026-03-09').getTime() - dayStartIn(STUDIO_TZ, SPRING).getTime()) / 3_600_000,
  23,
);

// ═══════════════════════════════════════════════════════════════════════════
// 11. The draft / publish split, the media door, and canonical trailing
//     paragraphs
// ═══════════════════════════════════════════════════════════════════════════
// Two doors save a post and they must disagree in exactly one way. Autosave
// has to accept a half-written post, or it fails on the first keystroke of
// every new one; publish has to refuse anything that renders wrong in public.
// Everything else about them must be the same, because the value is STORED
// either way: a draft may be incomplete, it may not be malformed.
//
// Each mistake here is silent in its own way. A draft schema that relaxed
// SHAPES as well as emptiness would store a `javascript:` source href that
// step 4's inspectors read back. A hero rule written per-field can never say
// "one of these two", and `toHero` in blogStore.ts turns a missing hero into
// `{ type: 'static', src: '' }`, so a published article's OG image silently
// degrades to the wordmark placeholder. A robots value carrying a comma
// injects a second directive into <meta name="robots">, because Next joins
// the resolved entries with ', '. And a trailing empty paragraph appended by
// TrailingNode moves contentFingerprint, which moves the visible "Updated"
// byline, the sitemap lastmod and JSON-LD dateModified on a post nobody
// meaningfully edited.

const HERO_PATH = '/images/blogs/production/hero.avif';
const rung = (pathname: string, host = PUBLIC_BLOB_HOST) => ({
  url: `https://${host}/${pathname}`,
  pathname,
});
const MEDIA = {
  variants: { full: { ...rung('blogs/hero.avif'), width: 1600, height: 900 } },
  blurDataUrl: 'data:image/webp;base64,AAAA',
};
const realBody = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }] };

/** The importer door's field set, valid: the 24 base fields and nothing else.
 *  POST is this plus the editor-only fields, which is what lets §7 put the
 *  strictness of each door under test on its OWN complete record. */
const IMPORTER_POST = {
  slug: 'a-post',
  title: 'T',
  description: 'D',
  categorySlug: 'production',
  authorSlug: 'saman-hoseinpour',
  serviceSlug: null,
  heroStaticPath: HERO_PATH,
  heroAlt: 'alt',
  heroCaption: null,
  keyTakeaways: ['a'],
  faqs: [{ question: 'q', answer: 'a' }],
  sources: [{ title: 's', href: 'https://a.b/c' }],
  entities: [{ name: 'n', sameAs: ['https://www.wikidata.org/wiki/Q1'], primary: true }],
  relatedSlugs: ['y'],
  seoTitle: 'st',
  seoDescription: 'sd',
  canonicalOverride: null,
  ogTitle: 'ot',
  ogDescription: 'od',
  twitterCard: 'summary_large_image',
  robotsIndex: true,
  robotsFollow: true,
  focusKeywords: ['k'],
  llmsInclude: true,
};

/** Publish-ready: every required field filled, a hero, a real body. */
const POST = {
  ...IMPORTER_POST,
  heroMedia: null,
  ogImageStaticPath: null,
  ogImageMedia: null,
  emitLegacyMetaKeywords: false,
  robotsExtra: null,
  body: realBody,
};

const draftTakes = (label: string, patch: Record<string, unknown>) =>
  ok(`draft accepts ${label}`, blogDraftSchema.safeParse({ ...POST, ...patch }).success);
const draftRefuses = (label: string, patch: Record<string, unknown>) =>
  ok(`draft refuses ${label}`, !blogDraftSchema.safeParse({ ...POST, ...patch }).success);
const publishTakes = (label: string, patch: Record<string, unknown>) =>
  ok(`publish accepts ${label}`, blogPublishSchema.safeParse({ ...POST, ...patch }).success);
const publishIssues = (patch: Record<string, unknown>): Record<string, string> => {
  const parsed = blogPublishSchema.safeParse({ ...POST, ...patch });
  return parsed.success ? {} : flattenBlogIssues(parsed.error);
};

ok('the publish-ready fixture really passes both doors (not a vacuous baseline)',
  blogDraftSchema.safeParse(POST).success && blogPublishSchema.safeParse(POST).success);

// ---- 1. Empty is a draft, not a publish -----------------------------------
// The seven required non-empty strings, all blank at once. This is what the
// editor holds one keystroke after "New post".
const BLANK_TEXT = {
  title: '',
  description: '',
  heroAlt: '',
  seoTitle: '',
  seoDescription: '',
  ogTitle: '',
  ogDescription: '',
};
draftTakes('every required text field empty at once', BLANK_TEXT);
ok('publish refuses the same object', !blogPublishSchema.safeParse({ ...POST, ...BLANK_TEXT }).success);
// It has to NAME them, or the editor can only say "something is wrong".
eq(
  'publish names every empty required field, and nothing else',
  Object.keys(publishIssues(BLANK_TEXT)).sort(),
  ['description', 'heroAlt', 'ogDescription', 'ogTitle', 'seoDescription', 'seoTitle', 'title'],
);
// Each one on its own, so the sweep above cannot pass by accident on a schema
// that only refuses the first blank it meets.
for (const field of Object.keys(BLANK_TEXT)) {
  draftTakes(`a blank ${field}`, { [field]: '' });
  eq(`publish refuses a blank ${field} and says so on that field`, Object.keys(publishIssues({ [field]: '' })), [field]);
}

// A REQUIRED field means somebody filled it in, and `min(1)` does not say
// that: one space satisfies it. Publish is the gate between a draft and a
// live article, so ' ' there ships a post with a blank <title> and a blank
// <h1>, with nothing on screen to say so.
for (const field of Object.keys(BLANK_TEXT)) {
  draftTakes(`a whitespace-only ${field} (a draft may hold anything)`, { [field]: '   ' });
  eq(
    `publish refuses a whitespace-only ${field} and says so on that field`,
    Object.keys(publishIssues({ [field]: '   ' })),
    [field],
  );
}
// Not just spaces: a tab and a non-breaking space are the two that get pasted
// in from a word processor and look exactly like a filled field.
eq('publish refuses a tab-only title', Object.keys(publishIssues({ title: '\t' })), ['title']);
eq('publish refuses a non-breaking-space title', Object.keys(publishIssues({ title: '\u00a0' })), ['title']);
// The optional strings keep taking whitespace on BOTH doors: a space typed
// into a caption is a value somebody chose, not a missing answer.
publishTakes('a whitespace heroCaption', { heroCaption: ' ' });
publishTakes('a whitespace serviceSlug', { serviceSlug: ' ' });

// ---- 2. Relaxed means empty-allowed, NOT shape-free ------------------------
// The value is stored either way, so a draft that took a malformed URL would
// hand step 4's inspectors something it can never render.
draftRefuses('a canonicalOverride with a fragment', { canonicalOverride: 'https://a.b/x#frag' });
draftRefuses('an http canonicalOverride', { canonicalOverride: 'http://a.b/x' });
draftRefuses('a canonicalOverride with credentials', { canonicalOverride: 'https://u:p@a.b/x' });
draftRefuses('a canonicalOverride carrying a control character', {
  canonicalOverride: `https://a.b/${String.fromCharCode(1)}x`,
});
draftRefuses('a javascript: source href', { sources: [{ title: 's', href: 'javascript:alert(1)' }] });
draftRefuses('a protocol-relative source href', { sources: [{ title: 's', href: '//evil.com/x' }] });
draftRefuses('a relative source href', { sources: [{ title: 's', href: '/blogs/x' }] });
draftRefuses('a sameAs that is not a URL', { entities: [{ name: 'n', sameAs: ['nope'], primary: true }] });
draftRefuses('an uppercase slug', { slug: 'A-Post' });
draftRefuses('the reserved slug', { slug: 'authors' });
draftRefuses('a hero path outside /images', { heroStaticPath: '/x.avif' });
draftRefuses('a title over its cap', { title: 'a'.repeat(301) });
draftRefuses('six key takeaways', { keyTakeaways: ['1', '2', '3', '4', '5', '6'] });
draftRefuses('an unknown key', { excerpt: 'x' });
// An empty ogImageStaticPath is malformed rather than half-written: its
// absence is spelled `null`, so '' must fail on BOTH doors.
draftRefuses('an empty ogImageStaticPath', { ogImageStaticPath: '' });

// ---- 3. The hero refinement ------------------------------------------------
// Two independently nullable columns cannot express "at least one of these",
// which is the whole reason this is a refine on the WHOLE object.
draftTakes('no hero at all (a draft is allowed to have none yet)', { heroStaticPath: null, heroMedia: null });
eq(
  'publish refuses a post with neither hero half, on the hero control',
  publishIssues({ heroStaticPath: null, heroMedia: null }),
  { heroMedia: 'Add a hero image before publishing.' },
);
publishTakes('a static hero alone', { heroStaticPath: HERO_PATH, heroMedia: null });
publishTakes('an uploaded hero alone', { heroStaticPath: null, heroMedia: MEDIA });
publishTakes('both hero halves', { heroStaticPath: HERO_PATH, heroMedia: MEDIA });

// ---- 4. The empty-body refinement -----------------------------------------
// Publishing a blank article is one keystroke away, and schema-valid: an empty
// paragraph is a legal node.
eq(
  'publish refuses a body of one empty paragraph, on the body control',
  publishIssues({ body: { type: 'doc', content: [{ type: 'paragraph' }] } }),
  { body: 'This post has no content yet. Write the article before publishing.' },
);
ok('publish refuses a body of several empty paragraphs', Boolean(
  publishIssues({ body: { type: 'doc', content: [{ type: 'paragraph' }, { type: 'paragraph', content: [] }] } }).body,
));
ok('publish refuses a doc with no content array', Boolean(publishIssues({ body: { type: 'doc' } }).body));
ok('publish refuses an absent body', Boolean(publishIssues({ body: undefined }).body));
// The same hole one level down: the zod layer refuses an EMPTY text node but
// takes one holding a space, so `<p> </p>` is a legal, storable, completely
// blank paragraph.
const spaceP = { type: 'paragraph', content: [{ type: 'text', text: ' ' }] };
eq(
  'publish refuses a body whose only text is a space',
  publishIssues({ body: { type: 'doc', content: [spaceP] } }),
  { body: 'This post has no content yet. Write the article before publishing.' },
);
ok('publish refuses a body of a space paragraph and an empty one', Boolean(
  publishIssues({ body: { type: 'doc', content: [spaceP, { type: 'paragraph' }] } }).body,
));
publishTakes('a body whose real content follows a whitespace paragraph', {
  body: { type: 'doc', content: [spaceP, ...realBody.content] },
});
draftTakes('a body of nothing but a space', { body: { type: 'doc', content: [spaceP] } });
publishTakes('a body with real content', { body: realBody });
publishTakes('a body whose real content follows an empty paragraph', {
  body: { type: 'doc', content: [{ type: 'paragraph' }, ...realBody.content] },
});
draftTakes('a body of one empty paragraph', { body: { type: 'doc', content: [{ type: 'paragraph' }] } });
draftTakes('no body at all', { body: undefined });

// ---- 5. blogMediaSchema, the door the hero and the OG image had none of ----
// A SECURITY predicate: *.public.blob.vercel-storage.com matches every Vercel
// tenant and next/image never consults remotePatterns under a custom loader,
// so `url === publicBlobUrl(pathname)` is the only thing between an
// editor-typed URL and an anonymous visitor's <img src>.
ok('media: a full ladder on our store', blogMediaSchema.safeParse({
  variants: {
    full: { ...rung('blogs/a/hero.avif'), width: 1600, height: 900 },
    w960: rung('blogs/a/hero-960.avif'),
    w640: rung('blogs/a/hero-640.avif'),
    w384: rung('blogs/a/hero-384.avif'),
  },
  blurDataUrl: 'data:image/webp;base64,AAAA',
}).success);
ok('media: the master alone, with a null blur', blogMediaSchema.safeParse({
  variants: { full: { ...rung('blogs/hero.avif'), width: 8, height: 6 } },
  blurDataUrl: null,
}).success);
ok('media: a master on ANOTHER blob tenant is refused', !blogMediaSchema.safeParse({
  variants: { full: { ...rung('blogs/hero.avif', 'other.public.blob.vercel-storage.com'), width: 8, height: 6 } },
  blurDataUrl: null,
}).success);
ok('media: a RUNG on another blob tenant is refused too', !blogMediaSchema.safeParse({
  variants: {
    full: { ...rung('blogs/hero.avif'), width: 8, height: 6 },
    w640: rung('blogs/hero-640.avif', 'other.public.blob.vercel-storage.com'),
  },
  blurDataUrl: null,
}).success);
ok('media: a master url that does not derive from its own pathname is refused', !blogMediaSchema.safeParse({
  variants: {
    full: { url: `https://${PUBLIC_BLOB_HOST}/blogs/other.avif`, pathname: 'blogs/hero.avif', width: 8, height: 6 },
  },
  blurDataUrl: null,
}).success);
ok('media: a RUNG url that does not derive from its own pathname is refused', !blogMediaSchema.safeParse({
  variants: {
    full: { ...rung('blogs/hero.avif'), width: 8, height: 6 },
    w640: { url: `https://${PUBLIC_BLOB_HOST}/blogs/other.avif`, pathname: 'blogs/hero-640.avif' },
  },
  blurDataUrl: null,
}).success);
ok('media: a pathname under projects/ is refused', !blogMediaSchema.safeParse({
  variants: { full: { ...rung('projects/hero.avif'), width: 8, height: 6 } },
  blurDataUrl: null,
}).success);
ok('media: a traversing pathname is refused', !blogMediaSchema.safeParse({
  variants: { full: { ...rung('blogs/../projects/hero.avif'), width: 8, height: 6 } },
  blurDataUrl: null,
}).success);
ok('media: a bad blur data url is refused', !blogMediaSchema.safeParse({
  variants: { full: { ...rung('blogs/hero.avif'), width: 8, height: 6 } },
  blurDataUrl: 'data:text/html,x',
}).success);
ok('media: an unknown key is refused', !blogMediaSchema.safeParse({
  variants: { full: { ...rung('blogs/hero.avif'), width: 8, height: 6 } },
  blurDataUrl: null,
  alt: 'x',
}).success);
// The same door reaches the post schemas, on both image slots.
draftTakes('an uploaded OG image', { ogImageMedia: MEDIA });
draftRefuses('an OG image on another blob tenant', {
  ogImageMedia: {
    variants: { full: { ...rung('blogs/og.avif', 'other.public.blob.vercel-storage.com'), width: 8, height: 6 } },
    blurDataUrl: null,
  },
});

// ---- 6. robotsExtra is a TYPED vocabulary, not free text -------------------
// Built from blogFields.ts's keys and kinds, so a key added to the leaf gets a
// validator for free. This is the assertion that proves it is derived.
eq(
  'the robots schema offers exactly the leaf vocabulary',
  Object.keys(blogRobotsExtraSchema.shape).sort(),
  [...ROBOTS_EXTRA_KEYS].sort(),
);
const EVERY_DIRECTIVE = {
  'max-snippet': -1,
  'max-video-preview': 0,
  'max-image-preview': 'large',
  noarchive: true,
  nosnippet: false,
  noimageindex: true,
  notranslate: false,
  unavailable_after: '2026-12-31T23:59:59Z',
};
ok('robots: every allowed key with a well-typed value', blogRobotsExtraSchema.safeParse(EVERY_DIRECTIVE).success);
ok('robots: an empty object', blogRobotsExtraSchema.safeParse({}).success);
draftTakes('every robots directive at once', { robotsExtra: EVERY_DIRECTIVE });
draftTakes('a null robotsExtra', { robotsExtra: null });
publishTakes('a null robotsExtra', { robotsExtra: null });
ok('robots: an unknown key is refused', !blogRobotsExtraSchema.safeParse({ nocache: true }).success);
draftRefuses('an unknown robots key', { robotsExtra: { nocache: true } });
// THE comma rule. Next joins resolved entries with ', ', so a string value
// carrying one injects a SECOND directive into the meta tag.
ok('robots: a comma-injecting max-snippet is refused', !blogRobotsExtraSchema.safeParse({ 'max-snippet': '-1, noindex' }).success);
ok('robots: a numeric max-snippet as a string is refused', !blogRobotsExtraSchema.safeParse({ 'max-snippet': '-1' }).success);
// new Date() parses "December 17, 1995", so the comma has to be refused by
// name and not left to the date parser.
ok('robots: a parseable date CARRYING a comma is refused', !blogRobotsExtraSchema.safeParse({ unavailable_after: 'December 17, 1995 03:24:00' }).success);
// A trailing control character makes the date unparseable, but a LEADING one
// is skipped as whitespace and parses, so the control guard is load-bearing.
ok('robots: a leading control character in unavailable_after is refused', !blogRobotsExtraSchema.safeParse({ unavailable_after: `${String.fromCharCode(1)}2026-12-31` }).success);
ok('robots: an unparseable unavailable_after is refused', !blogRobotsExtraSchema.safeParse({ unavailable_after: 'nope' }).success);
// Isolates the 64-character cap. Padding a valid instant with spaces would
// NOT isolate it: that string no longer parses, so the date guard refuses it
// whatever the cap is. A long fractional-second instant parses, carries no
// comma and no control character, so only the cap can refuse it.
const LONG_INSTANT = `2026-12-31T23:59:59.${'1'.repeat(50)}Z`;
ok('robots: the long instant really parses (so only the cap can refuse it)', !Number.isNaN(new Date(LONG_INSTANT).getTime()) && LONG_INSTANT.length > 64);
ok('robots: an unavailable_after over the length cap is refused', !blogRobotsExtraSchema.safeParse({ unavailable_after: LONG_INSTANT }).success);
ok('robots: max-image-preview outside its three values is refused', !blogRobotsExtraSchema.safeParse({ 'max-image-preview': 'huge' }).success);
for (const value of ROBOTS_PREVIEW_VALUES) {
  ok(`robots: max-image-preview accepts "${value}"`, blogRobotsExtraSchema.safeParse({ 'max-image-preview': value }).success);
}
ok('robots: -1 is allowed (Google documents it as no limit)', blogRobotsExtraSchema.safeParse({ 'max-snippet': -1 }).success);
ok('robots: -2 is refused', !blogRobotsExtraSchema.safeParse({ 'max-snippet': -2 }).success);
ok('robots: a fractional max-video-preview is refused', !blogRobotsExtraSchema.safeParse({ 'max-video-preview': 1.5 }).success);
ok('robots: an absurd max-video-preview is refused', !blogRobotsExtraSchema.safeParse({ 'max-video-preview': 10_001 }).success);
ok('robots: a string in a boolean flag is refused', !blogRobotsExtraSchema.safeParse({ noarchive: 'true' }).success);

// ---- 7. customSchema is preserved by ABSENCE -------------------------------
// It is a step-4 field kept safe by never being named in a payload or a
// `.set()`. `.strict()` refusing it is the mechanism, so this is the guard on
// somebody adding it back "for completeness".
// Each of these adds customSchema to a record that ALREADY passes that door,
// so the `.strict()` is the only thing that can refuse it. A fixture missing
// the required fields would be refused whatever the strictness was, which is
// an assertion that cannot fail.
ok('draft refuses customSchema as an unknown key', !blogDraftSchema.safeParse({ ...POST, customSchema: { '@type': 'FAQPage' } }).success);
ok('publish refuses customSchema as an unknown key', !blogPublishSchema.safeParse({ ...POST, customSchema: { '@type': 'FAQPage' } }).success);
ok('the importer fixture really passes its own door (not a vacuous baseline)', blogPostFieldsSchema.safeParse(IMPORTER_POST).success);
ok('the importer door refuses customSchema on an otherwise valid record', !blogPostFieldsSchema.safeParse({ ...IMPORTER_POST, customSchema: { '@type': 'FAQPage' } }).success);
// And its field set is FROZEN at what the importer writes: handed the
// editor's own record it refuses the extra keys, which is the mechanism that
// keeps an editor-owned column out of a re-import's `.set()`.
ok('the importer door refuses the editor-only fields', !blogPostFieldsSchema.safeParse(POST).success);

// ---- 8. Canonical trailing paragraphs --------------------------------------
// TrailingNode (task 15) appends an empty paragraph whenever the last child is
// not a paragraph. Without this, opening a legacy post that ends in a figure
// and fixing a typo would append <p></p>, move contentFingerprint and grow the
// rendering-parity allowlist.
const para = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const EMPTY = { type: 'paragraph' };
const FIGURE = {
  type: 'figure',
  attrs: { image: { type: 'static', src: HERO_PATH }, alt: 'a', caption: null, credit: null, size: 'default', width: null, height: null, priority: false },
};
const asDoc = (...content: unknown[]) => ({ type: 'doc', content }) as BlogDoc;

eq('strip: one trailing empty paragraph goes',
  stripTrailingEmptyParagraphs(asDoc(para('a'), EMPTY)),
  { type: 'doc', content: [para('a')] });
eq('strip: several trailing empty paragraphs go',
  stripTrailingEmptyParagraphs(asDoc(para('a'), EMPTY, { type: 'paragraph', content: [] }, EMPTY)),
  { type: 'doc', content: [para('a')] });
eq('strip: an INTERIOR empty paragraph is left alone',
  stripTrailingEmptyParagraphs(asDoc(para('a'), EMPTY, para('b'))),
  { type: 'doc', content: [para('a'), EMPTY, para('b')] });
// The doc's content expression is `block+`, so emptying it would produce a doc
// that is no longer a valid document at all.
eq('strip: a doc of a single empty paragraph keeps it',
  stripTrailingEmptyParagraphs(asDoc(EMPTY)),
  { type: 'doc', content: [EMPTY] });
eq('strip: a doc of nothing but empty paragraphs keeps exactly one',
  stripTrailingEmptyParagraphs(asDoc(EMPTY, EMPTY, EMPTY)),
  { type: 'doc', content: [EMPTY] });
eq('strip: a doc with no trailing empty paragraph is returned untouched',
  stripTrailingEmptyParagraphs(asDoc(para('a'), para('b'))),
  { type: 'doc', content: [para('a'), para('b')] });

// The deliberate asymmetry between the two predicates, pinned: a trailing
// paragraph holding a SPACE is a node somebody typed, so the strip must leave
// it alone. Canonicalising it away would EDIT a stored body, which is exactly
// what this whole change exists to avoid; deciding it is not worth reading is
// the publish door's job, not the validator's.
const SPACE_P = { type: 'paragraph', content: [{ type: 'text', text: ' ' }] };
eq('strip: a trailing paragraph of whitespace is NOT stripped',
  stripTrailingEmptyParagraphs(asDoc(para('a'), SPACE_P)),
  { type: 'doc', content: [para('a'), SPACE_P] });
eq('strip: an empty paragraph AFTER a whitespace one still goes',
  stripTrailingEmptyParagraphs(asDoc(para('a'), SPACE_P, EMPTY)),
  { type: 'doc', content: [para('a'), SPACE_P] });

// The exact TrailingNode case, through the REAL validator: a doc ending in a
// figure plus the appended empty paragraph must canonicalise to the same value
// as the same doc without it.
const withTrailer = validateBlogBody(asDoc(para('a'), FIGURE, EMPTY));
const without = validateBlogBody(asDoc(para('a'), FIGURE));
ok('validate: both TrailingNode docs are valid', withTrailer.ok && without.ok);
eq(
  'validate: a figure-ending doc canonicalises the same with or without the appended paragraph',
  withTrailer.ok ? JSON.stringify(withTrailer.doc) : 'invalid',
  without.ok ? JSON.stringify(without.doc) : 'invalid',
);
// And the canonical result still re-validates to itself, which is the property
// every stored body depends on.
const again = withTrailer.ok ? validateBlogBody(withTrailer.doc) : null;
eq(
  'validate: the canonical result re-validates unchanged',
  again?.ok ? JSON.stringify(again.doc) : 'invalid',
  withTrailer.ok ? JSON.stringify(withTrailer.doc) : 'invalid',
);
// A blank doc must still come back as a doc rather than being emptied.
const blankDoc = validateBlogBody(asDoc(EMPTY));
eq('validate: a blank doc stays a one-paragraph doc', blankDoc.ok ? blankDoc.doc.content?.length : null, 1);

// ═══════════════════════════════════════════════════════════════════════════
// 12. The posts list URL contract (blogFilters.ts)
// ═══════════════════════════════════════════════════════════════════════════
// /admin/blogs reads and writes this contract from at least three places at
// once (the filter bar, the list page, the row menu) plus the CSV-free row
// links, so a parse/serialize mismatch between any two of them would show up
// as a filter silently resetting on navigation, or a bookmarked URL landing
// on a different set of rows than the one that made it. blogStatusFilter is
// the one place "all excludes trash" lives; task 13's query layer imports it
// rather than restating the rule in SQL, so the two cannot drift apart.

/** Turn a serialized query string back into the Record shape a Next.js page's
 *  awaited searchParams gives, so the round trip below exercises the same
 *  input shape the real callers do. */
const qsToRecord = (qs: string): Record<string, string | string[] | undefined> => {
  const out: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(qs)) out[key] = value;
  return out;
};
const roundTrip = (p: BlogListParams): BlogListParams =>
  parseBlogListParams(qsToRecord(blogListQs(p)));

const DEFAULTS: BlogListParams = {
  status: 'all',
  q: '',
  author: '',
  category: '',
  sort: 'updated',
  page: 1,
};

// ---- 1. Round trip, over a spread of combinations --------------------------
eq('round trip: defaults', roundTrip(DEFAULTS), DEFAULTS);
eq(
  'round trip: one facet alone (a status tab)',
  roundTrip({ ...DEFAULTS, status: 'draft' }),
  { ...DEFAULTS, status: 'draft' },
);
eq(
  'round trip: the trash tab specifically',
  roundTrip({ ...DEFAULTS, status: 'trash' }),
  { ...DEFAULTS, status: 'trash' },
);
eq(
  'round trip: q carrying an internal space and a percent sign',
  roundTrip({ ...DEFAULTS, q: 'vancouver % realtors' }),
  { ...DEFAULTS, q: 'vancouver % realtors' },
);
eq('round trip: page above 1', roundTrip({ ...DEFAULTS, page: 4 }), { ...DEFAULTS, page: 4 });
const EVERY_FACET: BlogListParams = {
  status: 'published',
  q: 'brand video vancouver',
  author: 'saman-hoseinpour',
  category: 'production',
  sort: 'title',
  page: 3,
};
eq('round trip: every facet set at once', roundTrip(EVERY_FACET), EVERY_FACET);

// ---- 2. Defaults never reach the URL ----------------------------------------
eq('blogListQs(defaults) serialises to the empty string', blogListQs(DEFAULTS), '');
eq(
  'a params object differing only in status: "all" also serialises to the empty string',
  blogListQs({ ...DEFAULTS, status: 'all' }),
  '',
);

// ---- 3. Canonical key order -------------------------------------------------
eq(
  'every field set serialises with the keys in the documented order',
  blogListQs(EVERY_FACET)
    .split('&')
    .map((pair) => pair.split('=')[0]),
  ['status', 'q', 'author', 'category', 'sort', 'page'],
);

// ---- 4. blogStatusFilter: "all" excludes trash, swept -----------------------
for (const status of BLOG_POST_STATUSES) {
  eq(`blogStatusFilter('${status}') returns exactly itself`, blogStatusFilter(status), [status]);
}
eq(
  "blogStatusFilter('all') returns the four non-trash statuses",
  blogStatusFilter('all'),
  ['draft', 'scheduled', 'published', 'archived'],
);
ok("blogStatusFilter('all') excludes trash", !(blogStatusFilter('all') ?? []).includes('trash'));

// ---- 5. Degradation: nothing here ever throws, everything falls back -------
eq("an unknown status falls back to 'all'", parseBlogListParams({ status: 'bogus' }).status, 'all');
eq("an unknown sort falls back to 'updated'", parseBlogListParams({ sort: 'bogus' }).sort, 'updated');
eq(
  'a slug with an uppercase letter is dropped',
  parseBlogListParams({ author: 'Saman-Hoseinpour' }).author,
  '',
);
eq(
  'a slug over PORTFOLIO_SLUG_MAX is dropped',
  parseBlogListParams({ category: 'a'.repeat(PORTFOLIO_SLUG_MAX + 1) }).category,
  '',
);
eq(
  'a slug exactly AT PORTFOLIO_SLUG_MAX is kept',
  parseBlogListParams({ category: 'a'.repeat(PORTFOLIO_SLUG_MAX) }).category,
  'a'.repeat(PORTFOLIO_SLUG_MAX),
);
eq(
  'q over 200 characters is truncated, not refused',
  parseBlogListParams({ q: 'x'.repeat(250) }).q.length,
  200,
);
eq(
  'q is trimmed of leading and trailing whitespace',
  parseBlogListParams({ q: '  hello  ' }).q,
  'hello',
);
eq('page=0 falls back to 1', parseBlogListParams({ page: '0' }).page, 1);
eq('page=-3 falls back to 1', parseBlogListParams({ page: '-3' }).page, 1);
eq('page=abc falls back to 1', parseBlogListParams({ page: 'abc' }).page, 1);
eq(
  'page=1e9 clamps to the sane upper bound rather than reaching Postgres whole',
  parseBlogListParams({ page: '1e9' }).page,
  1_000_000,
);
{
  const neverThrows = (fn: () => void): boolean => {
    try {
      fn();
      return true;
    } catch {
      return false;
    }
  };
  ok(
    'parseBlogListParams never throws on a maximally garbage record',
    neverThrows(() =>
      parseBlogListParams({
        status: 'not-a-status',
        sort: 'not-a-sort',
        author: 'BAD SLUG !! '.repeat(100),
        category: 'y'.repeat(9_999),
        q: 'z'.repeat(9_999),
        page: 'not-a-number',
      }),
    ),
  );
}

// ---- 6. Array-valued params: take the first, never join --------------------
eq(
  'a repeated ?status= takes the first value, never joins them',
  parseBlogListParams({ status: ['draft', 'published'] }).status,
  'draft',
);
eq(
  'a repeated ?q= takes the first value, never joins them',
  parseBlogListParams({ q: ['hello', 'world'] }).q,
  'hello',
);

// ═══════════════════════════════════════════════════════════════════════════
// 7. buildSnapshot — the one projection from a working row to a stored
//    revision
// ═══════════════════════════════════════════════════════════════════════════
// Two callers share it and MUST agree: the preview renders an unsaved draft
// through the same shaping the public site uses, and every write door stores
// what a publish will serve. A second projection anywhere would be a second
// set of bugs, and the preview's whole promise is that it shows what will
// ship.
//
// The defect this section exists for is the two instants. On a FIRST publish
// the working row's `published_at` is still null while the snapshot is being
// built, so a buildSnapshot that read it off the row would freeze
// `publishedAt: null` into the revision — and since every public date is read
// off the REVISION (`toSummary` falls back to the post's `created_at`), the
// post would render dated its DRAFT-CREATION day in the byline, the OG
// `publishedTime`, the JSON-LD and the sitemap, while `publicOrder` sorted it
// by `blog_posts.published_at`. Dated in one place, sorted by another, and
// every screen still renders a plausible date. So the fixture below carries
// its own instants on the row, DIFFERENT from the parameters, and every
// assertion about a date is really an assertion that the row's copy lost.

{
  const DOC: BlogDoc = {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello Vancouver.' }] }],
  };
  const MEDIA = {
    variants: {
      full: { url: `https://${PUBLIC_BLOB_HOST}/blogs/og-abc.avif`, width: 1600, height: 900, pathname: 'blogs/og-abc.avif' },
    },
    blurDataUrl: null,
  };

  // Every value is distinct, so an assertion cannot pass on a cross-wired
  // field (`title: post.description` has to go red somewhere). The four
  // BOOLEANS are the exception that cannot be fixed here — four of them can
  // only ever take two values — so they are separated by a second fixture at
  // 7g instead.
  const WORKING: BlogWorkingView = {
    slug: 'vancouver-realtors-video',
    title: 'Vancouver Realtors: Video and Social Content',
    description: 'What a realtor actually needs on camera.',
    categorySlug: 'production',
    authorSlug: 'saman-hoseinpour',
    serviceSlug: 'video-production',
    heroStaticPath: '/images/blogs/realtors/hero.avif',
    heroMedia: null,
    heroAlt: 'A realtor being filmed in a kitchen',
    heroCaption: 'Shot on the Sony FX3.',
    body: DOC,
    bodyText: 'Hello Vancouver.',
    wordCount: 1234,
    keyTakeaways: ['Book the shoot before the listing goes live.'],
    faqs: [{ question: 'How long does a shoot take?', answer: 'About half a day.' }],
    sources: [{ title: 'REBGV stats', href: 'https://www.rebgv.org/' }],
    seoTitle: 'Video for Vancouver realtors',
    seoDescription: 'A meta description, which is not the post description.',
    canonicalOverride: null,
    ogTitle: 'An OG title',
    ogDescription: 'An OG description',
    ogImageStaticPath: null,
    ogImageMedia: null,
    twitterCard: 'summary_large_image',
    // The four booleans carry the FIRST half of the two-bit codes explained at
    // 7g: robotsIndex 1, robotsFollow 1, emitLegacyMetaKeywords 0,
    // llmsInclude 0. Do not "tidy" these into a single value.
    robotsIndex: true,
    robotsFollow: true,
    robotsExtra: { 'max-image-preview': 'large' },
    focusKeywords: ['vancouver realtor video'],
    emitLegacyMetaKeywords: false,
    customSchema: { '@type': 'FAQPage' },
    llmsInclude: false,
    // THE TRAP. Both are on the row (a caller spreads the whole row in) and
    // both must lose to the parameters below.
    publishedAt: new Date('2019-01-01T08:00:00.000Z'),
    contentModifiedAt: new Date('2019-06-01T08:00:00.000Z'),
  };

  const EXTRA = {
    relatedSlugs: ['drone-video-vancouver', 'listing-photography'],
    entities: [
      { name: 'Vancouver', sameAs: ['https://en.wikipedia.org/wiki/Vancouver'], primary: true },
      { name: 'Sony FX3', sameAs: [], primary: false },
    ],
    publishedAt: '2026-02-08T20:00:00.000Z',
    contentModifiedAt: '2026-08-30T20:00:00.000Z',
  };

  const snap = buildSnapshot(WORKING, EXTRA);

  // ---- 7a. Every field the stored type declares is actually populated ------
  // Restated by hand from BlogRevisionSnapshot in src/db/schema.ts rather than
  // derived from the output, so a field buildSnapshot forgets fails here. No
  // type can say this: a required field with no value is a compile error only
  // where the result is assigned into the column, and the preview is the only
  // such site today.
  eq(
    'buildSnapshot fills every top-level field of BlogRevisionSnapshot',
    Object.keys(snap).sort(),
    [
      'authorSlug',
      'body',
      'bodyText',
      'categorySlug',
      'contentModifiedAt',
      'customSchema',
      'description',
      'entities',
      'faqs',
      'hero',
      'keyTakeaways',
      'llmsInclude',
      'publishedAt',
      'relatedSlugs',
      'seo',
      'serviceSlug',
      'slug',
      'sources',
      'title',
      'wordCount',
    ],
  );
  eq('buildSnapshot fills every hero field', Object.keys(snap.hero).sort(), [
    'alt',
    'caption',
    'media',
    'staticPath',
  ]);
  eq('buildSnapshot fills every seo field', Object.keys(snap.seo).sort(), [
    'canonicalOverride',
    'description',
    'emitLegacyMetaKeywords',
    'focusKeywords',
    'ogDescription',
    'ogImage',
    'ogTitle',
    'robotsExtra',
    'robotsFollow',
    'robotsIndex',
    'title',
    'twitterCard',
  ]);

  // ---- 7b. Each field carries the column it is meant to carry --------------
  const CARRIED: [string, unknown, unknown][] = [
    ['slug', snap.slug, WORKING.slug],
    ['title', snap.title, WORKING.title],
    ['description', snap.description, WORKING.description],
    ['categorySlug', snap.categorySlug, WORKING.categorySlug],
    ['authorSlug', snap.authorSlug, WORKING.authorSlug],
    ['serviceSlug', snap.serviceSlug, WORKING.serviceSlug],
    ['hero.staticPath', snap.hero.staticPath, WORKING.heroStaticPath],
    ['hero.media', snap.hero.media, WORKING.heroMedia],
    ['hero.alt', snap.hero.alt, WORKING.heroAlt],
    ['hero.caption', snap.hero.caption, WORKING.heroCaption],
    ['body', snap.body, WORKING.body],
    ['bodyText', snap.bodyText, WORKING.bodyText],
    ['wordCount', snap.wordCount, WORKING.wordCount],
    ['keyTakeaways', snap.keyTakeaways, WORKING.keyTakeaways],
    ['faqs', snap.faqs, WORKING.faqs],
    ['sources', snap.sources, WORKING.sources],
    ['seo.title', snap.seo.title, WORKING.seoTitle],
    ['seo.description', snap.seo.description, WORKING.seoDescription],
    ['seo.canonicalOverride', snap.seo.canonicalOverride, WORKING.canonicalOverride],
    ['seo.ogTitle', snap.seo.ogTitle, WORKING.ogTitle],
    ['seo.ogDescription', snap.seo.ogDescription, WORKING.ogDescription],
    ['seo.twitterCard', snap.seo.twitterCard, WORKING.twitterCard],
    ['seo.robotsIndex', snap.seo.robotsIndex, WORKING.robotsIndex],
    ['seo.robotsFollow', snap.seo.robotsFollow, WORKING.robotsFollow],
    ['seo.robotsExtra', snap.seo.robotsExtra, WORKING.robotsExtra],
    ['seo.focusKeywords', snap.seo.focusKeywords, WORKING.focusKeywords],
    [
      'seo.emitLegacyMetaKeywords',
      snap.seo.emitLegacyMetaKeywords,
      WORKING.emitLegacyMetaKeywords,
    ],
    ['customSchema', snap.customSchema, WORKING.customSchema],
    ['llmsInclude', snap.llmsInclude, WORKING.llmsInclude],
  ];
  for (const [name, got, want] of CARRIED) {
    eq(`buildSnapshot carries ${name} from the working row`, got, want);
  }

  // The two lists are the admin-side tables, not columns on the post, so they
  // arrive alongside it and must keep their order (both fingerprints read
  // relatedSlugs, so a reordering would read as a content change).
  eq('relatedSlugs come from the extra, in order', snap.relatedSlugs, EXTRA.relatedSlugs);
  eq('entities come from the extra, in order', snap.entities, EXTRA.entities);

  // ---- 7c. The instants are the PARAMETERS, never the row's own -----------
  eq('publishedAt is the parameter', snap.publishedAt, EXTRA.publishedAt);
  eq('contentModifiedAt is the parameter', snap.contentModifiedAt, EXTRA.contentModifiedAt);
  ok(
    'publishedAt is NOT the instant sitting on the row',
    snap.publishedAt !== WORKING.publishedAt?.toISOString(),
  );
  ok(
    'contentModifiedAt is NOT the instant sitting on the row',
    snap.contentModifiedAt !== WORKING.contentModifiedAt?.toISOString(),
  );

  // The exact first-publish shape: the row has no instant yet because the
  // caller is deciding it in the same breath. Reading the row here is what
  // dates a brand-new post its draft-creation day on every surface at once.
  {
    const firstPublish = buildSnapshot(
      { ...WORKING, publishedAt: null, contentModifiedAt: null },
      { ...EXTRA, contentModifiedAt: null },
    );
    eq(
      'a FIRST publish dates the snapshot from the parameter, not the null on the row',
      firstPublish.publishedAt,
      EXTRA.publishedAt,
    );
    eq('a never-updated post keeps a null contentModifiedAt', firstPublish.contentModifiedAt, null);
  }

  // And the mirror: a row carrying real instants must still produce nulls when
  // the caller passes none (an unpublished draft's preview).
  {
    const draft = buildSnapshot(WORKING, {
      ...EXTRA,
      publishedAt: null,
      contentModifiedAt: null,
    });
    eq('a null publishedAt parameter wins over a dated row', draft.publishedAt, null);
    eq('a null contentModifiedAt parameter wins over a dated row', draft.contentModifiedAt, null);
  }

  // ---- 7d. JSON-safe by construction --------------------------------------
  // The column is jsonb, so anything that is not JSON (a Date above all, since
  // the working row carries three of them) comes back out as something else
  // entirely, and the value the editor then reads is not the value it stored.
  //
  // A `JSON.parse(JSON.stringify(...))` round trip CANNOT prove this and was
  // written that way first: both sides normalise identically, so a Date, an
  // undefined and a NaN all compare equal to themselves. Mutation testing
  // found it vacuous. This walks the built snapshot instead and names anything
  // that is not a JSON value.
  const notJson = (value: unknown, path: string): string[] => {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return [];
    if (typeof value === 'number') return Number.isFinite(value) ? [] : [path];
    if (Array.isArray(value)) return value.flatMap((v, i) => notJson(v, `${path}[${i}]`));
    if (typeof value === 'object') {
      const proto = Object.getPrototypeOf(value) as unknown;
      // A Date, a Map, a class instance: anything jsonb would not give back.
      if (proto !== Object.prototype && proto !== null) return [path];
      return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
        notJson(v, `${path}.${k}`),
      );
    }
    return [path]; // undefined, a function, a symbol, a bigint
  };
  eq('every value in the snapshot is JSON, so the jsonb column round-trips it', notJson(snap, 'snapshot'), []);

  // `customSchema` is the ONE field of BlogWorkingView typed `unknown`, and
  // `unknown` admits `undefined` — `{ ...row, customSchema: undefined }`
  // compiles clean, where the same edit to `heroMedia` is a type error. So the
  // `?? null` on that field is not the dead guard its three siblings were, and
  // task 8's write door is exactly the caller that will hand this an optional
  // zod field. Without it `JSON.stringify` drops the key on the way into the
  // column: the stored snapshot's key set matches no other post's, and
  // publicFingerprint reads as moved, pinging IndexNow for a URL whose bytes
  // did not change. Nothing on any screen says either.
  {
    const undef = buildSnapshot({ ...WORKING, customSchema: undefined }, EXTRA);
    const nulled = buildSnapshot({ ...WORKING, customSchema: null }, EXTRA);
    eq('an undefined customSchema is stored as null', undef.customSchema, null);
    eq('an undefined customSchema leaves no undefined in the snapshot', notJson(undef, 'snapshot'), []);
    // Through JSON, because that is the round trip the column makes and the
    // only place a dropped key becomes visible: Object.keys() alone still
    // reports a key whose value is undefined.
    eq(
      'an undefined customSchema keeps its key through the jsonb column',
      Object.keys(JSON.parse(JSON.stringify(undef))).sort(),
      Object.keys(JSON.parse(JSON.stringify(nulled))).sort(),
    );
    eq(
      'publicFingerprint cannot tell an undefined customSchema from a null one',
      publicFingerprint(undef),
      publicFingerprint(nulled),
    );
  }

  // ---- 7e. ogImage: null MEANS "use the hero" -----------------------------
  eq('ogImage is null when the post carries no OG image of its own', snap.seo.ogImage, null);
  eq(
    'a static OG path builds the pair',
    buildSnapshot({ ...WORKING, ogImageStaticPath: '/images/blogs/og.avif' }, EXTRA).seo.ogImage,
    { staticPath: '/images/blogs/og.avif', media: null },
  );
  eq(
    'an uploaded OG image builds the pair with a null static path',
    buildSnapshot({ ...WORKING, ogImageMedia: MEDIA }, EXTRA).seo.ogImage,
    { staticPath: null, media: MEDIA },
  );

  // ---- 7f. The output feeds both fingerprints -----------------------------
  // Guarded, so a snapshot shaped in a way a fingerprint cannot read reports
  // as a FAIL here rather than taking the whole script down with a TypeError.
  const fingerprint = (fn: () => string): string => {
    try {
      return fn();
    } catch {
      return '';
    }
  };
  ok('contentFingerprint accepts a built snapshot', fingerprint(() => contentFingerprint(snap)).length > 0);
  ok('publicFingerprint accepts a built snapshot', fingerprint(() => publicFingerprint(snap)).length > 0);

  // ---- 7g. The four booleans, separated -----------------------------------
  // A boolean takes one of two values, so four of them in ONE fixture can
  // never all differ, and a cross-wire between two that happen to agree passes
  // every assertion above. That is not theoretical: with robotsIndex and
  // emitLegacyMetaKeywords both true, `robotsIndex: post.emitLegacyMetaKeywords`
  // left all 594 assertions green, and it is a post that quietly noindexes
  // itself.
  //
  // TWO fixtures close it, and two are enough: give each of the four a
  // distinct two-bit code across the pair and every ordered pair of them
  // differs in at least one. The codes are robotsIndex (1,0), robotsFollow
  // (1,1), emitLegacyMetaKeywords (0,0), llmsInclude (0,1) — so changing one
  // value in either fixture reopens the hole for whichever pair it collides
  // with.
  {
    const second = buildSnapshot(
      {
        ...WORKING,
        robotsIndex: false,
        robotsFollow: true,
        emitLegacyMetaKeywords: false,
        llmsInclude: true,
      },
      EXTRA,
    );
    eq('second boolean fixture: seo.robotsIndex', second.seo.robotsIndex, false);
    eq('second boolean fixture: seo.robotsFollow', second.seo.robotsFollow, true);
    eq(
      'second boolean fixture: seo.emitLegacyMetaKeywords',
      second.seo.emitLegacyMetaKeywords,
      false,
    );
    eq('second boolean fixture: llmsInclude', second.llmsInclude, true);
  }

  // Dating a post is not an edit to it. If either fingerprint read the
  // instants, publishing would move `content_modified_at` (an "Updated"
  // byline on a post published one second ago) and every republish would ping
  // IndexNow for a page whose bytes did not change.
  {
    const later = buildSnapshot(WORKING, {
      ...EXTRA,
      publishedAt: '2027-01-01T00:00:00.000Z',
      contentModifiedAt: '2027-01-02T00:00:00.000Z',
    });
    eq(
      'contentFingerprint ignores the instants',
      contentFingerprint(later),
      contentFingerprint(snap),
    );
    eq('publicFingerprint ignores the instants', publicFingerprint(later), publicFingerprint(snap));
  }
}


// ═══════════════════════════════════════════════════════════════════════════
// 8. The write doors: the body's second gate, and the promises the doors make
// ═══════════════════════════════════════════════════════════════════════════
// The statements themselves are proved against a real Postgres in task 12.
// What is left over is a set of promises no type can express and no page can
// show, each silent in its own way:
//
//  - `blogDraftSchema` accepts ANY `content` array on purpose (blogBody.ts
//    owns the vocabulary, and a second partial copy of it would drift). So a
//    save door that parsed with the schema alone would store a body that never
//    met the closed vocabulary, and the renderer's mapping would drop the node
//    at request time, on the public page, with nothing anywhere to say so. The
//    door has to run validateBlogBody as a SECOND gate and store its CANONICAL
//    output, not the input.
//  - Autosave fires every second or two. One `updateTag(BLOGS_TAG)` in it
//    re-renders the whole marketing site on a keystroke timer, because the
//    Navbar reads the blog panel on every marketing route.
//  - An explicit Save on a live article must move no public byte, or the
//    working copy stops being a working copy.
//  - `custom_schema` has no editor yet and survives every save by being named
//    by no `.set()`. It is one line away from being wiped for ever, and the
//    column would still read as valid.
//  - neon-http has no transactions, so a lost race has to take its own
//    revision back out. Otherwise the history renders a save that never
//    happened, and a restore would replay it.
//
// The structural half reads the two files' own source, the way §7 reads Next's
// robotsKeys array. Comments are stripped first: this file's rules are about
// what the CODE does, and its comments quote the very identifiers under test.

const readRepoFile = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const STATEMENTS_SRC = readRepoFile('../src/db/blogStatements.ts');
const ACTIONS_SRC = readRepoFile('../src/app/(admin)/admin/(protected)/_actions/blogPosts.ts');

// Fail loudly rather than passing vacuously: an empty read would make every
// "does not contain" assertion below trivially true.
ok('read src/db/blogStatements.ts (drift guard)', STATEMENTS_SRC.length > 2000);
ok('read the blog post actions (drift guard)', ACTIONS_SRC.length > 2000);

const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

const occurrences = (hay: string, needle: string) => hay.split(needle).length - 1;

/** Lines mentioning a token. Counted by LINE rather than by occurrence,
 *  because `customSchema: row.customSchema` is one decision written twice. */
const linesWith = (code: string, needle: string) =>
  code.split('\n').filter((line) => line.includes(needle));

/** The source between two literal markers, with its own drift guard so a
 *  renamed function fails here instead of silently emptying every assertion
 *  that reads the slice. */
function region(source: string, from: string, to: string, label: string): string {
  const start = source.indexOf(from);
  const end = to === '' ? source.length : source.indexOf(to, start + from.length);
  const found = start >= 0 && end > start;
  ok(`found ${label} in its file (drift guard)`, found);
  return found ? source.slice(start, end) : '';
}

const STATEMENTS_CODE = stripComments(STATEMENTS_SRC);
const ACTIONS_CODE = stripComments(ACTIONS_SRC);

const CREATE_POST = region(
  ACTIONS_SRC,
  'export async function createPost(',
  '// ── The shared half',
  'createPost',
);
const PREPARE_SAVE = region(
  ACTIONS_SRC,
  'async function prepareSave(',
  '// ── Autosave',
  'prepareSave',
);
const SAVE_DRAFT = region(
  ACTIONS_SRC,
  'export async function saveDraft(',
  '// ── Explicit Save',
  'saveDraft',
);
// Ends at the transitions header, not at the end of the file. Task 9's doors
// live below it, and a region running to EOF would swallow them: every
// "savePost does not do X" sweep would then be answered by a publish door that
// legitimately does X, and the assertions would fail for the wrong reason.
const SAVE_POST = region(
  ACTIONS_SRC,
  'export async function savePost(',
  '// ── The transition doors',
  'savePost',
);
const UPDATE_WORKING = region(
  STATEMENTS_SRC,
  'export async function updateWorkingCopy(',
  'export type NewRevision',
  'updateWorkingCopy',
);
const INSERT_REVISION = region(
  STATEMENTS_SRC,
  'export async function insertRevision(',
  'export async function deleteRevision',
  'insertRevision',
);
const REPLACE_ENTITIES = region(
  STATEMENTS_SRC,
  'export async function replaceEntities(',
  '/* Transitions',
  'replaceEntities',
);

const CREATE_POST_CODE = stripComments(CREATE_POST);
const PREPARE_SAVE_CODE = stripComments(PREPARE_SAVE);
const SAVE_DRAFT_CODE = stripComments(SAVE_DRAFT);
const SAVE_POST_CODE = stripComments(SAVE_POST);

// ── The body's second gate ──────────────────────────────────────────────────
// Carried over from §11's review: the schema deliberately does not validate the
// body, so the DOOR has to, and it has to store what the validator returns.

const UNKNOWN_NODE_BODY = { type: 'doc', content: [{ type: 'marquee', attrs: { speed: 3 } }] };
ok(
  'blogDraftSchema alone ACCEPTS a body carrying an unknown node type (fixture guard)',
  blogDraftSchema.safeParse({ ...POST, body: UNKNOWN_NODE_BODY }).success,
);
ok('validateBlogBody refuses that same body', !validateBlogBody(UNKNOWN_NODE_BODY).ok);

// "Store the canonical result, not the input" is only a real distinction if the
// two can differ. They can: an empty `content: []` is legal input and is not
// the canonical form.
const LOOSE_BODY = { type: 'doc', content: [{ type: 'paragraph', content: [] }] };
const canonical = validateBlogBody(LOOSE_BODY);
ok(
  'validateBlogBody canonicalises rather than echoing its input (fixture guard)',
  canonical.ok && JSON.stringify(canonical.doc) !== JSON.stringify(LOOSE_BODY),
);
eq(
  'and the canonical form is what a save has to keep',
  canonical.ok ? canonical.doc : null,
  { type: 'doc', content: [{ type: 'paragraph' }] },
);

ok(
  'the save path runs validateBlogBody as a second gate',
  /const checked = validateBlogBody\(data\.body\)/.test(PREPARE_SAVE_CODE) &&
    /if \(!checked\.ok\) \{[\s\S]*?error: 'validation'/.test(PREPARE_SAVE_CODE),
);
ok(
  'the save path stores the CANONICAL doc and never the raw input',
  /const doc = checked\.doc/.test(PREPARE_SAVE_CODE) &&
    /\bbody: doc,/.test(PREPARE_SAVE_CODE) &&
    !/\bbody: data\.body/.test(PREPARE_SAVE_CODE),
);
// validateBlogBody's problems are diagnostics (`(root): Invalid input`,
// `body over 2000000 bytes`), not copy. The member gets one house sentence and
// the raw string goes to the monitoring trail.
ok(
  'a refused body gives the member a sentence, not a validator diagnostic',
  /issues: \{ body: BODY_REFUSAL \}/.test(PREPARE_SAVE_CODE) &&
    /reportError\('\[blogs\] prepareSave body refused', new Error\(checked\.problems/.test(
      PREPARE_SAVE_CODE,
    ),
);
ok(
  'the word count and body text are derived from that same canonical doc',
  /wordCount\(\{ doc, faqs: data\.faqs \}\)/.test(PREPARE_SAVE_CODE) &&
    /bodyText: bodyText\(doc\)/.test(PREPARE_SAVE_CODE),
);

// A brand-new draft needs a body the column will take and the validator will
// leave alone, or the first save of an untouched draft rewrites it.
const emptyDraftBody = validateBlogBody(EMPTY_BLOG_DOC);
ok('the new-draft body is storable', emptyDraftBody.ok);
eq(
  'and is already canonical, so an untouched draft saves as a no-op',
  emptyDraftBody.ok ? emptyDraftBody.doc : null,
  EMPTY_BLOG_DOC,
);

// ── custom_schema survives by never being named ─────────────────────────────

eq(
  'blogStatements.ts code names customSchema on exactly one line',
  linesWith(STATEMENTS_CODE, 'customSchema').length,
  1,
);
ok(
  'and that once is the Omit that REMOVES it from the settable set',
  /Omit<NewBlogPostRow,[^>]*'customSchema'/.test(STATEMENTS_CODE),
);
eq(
  'the post actions name customSchema on exactly one line',
  linesWith(ACTIONS_CODE, 'customSchema').length,
  1,
);
ok(
  'and that once is the snapshot carrying the STORED value forward, not a payload',
  /customSchema: row\.customSchema/.test(ACTIONS_CODE),
);

// ── Autosave invalidates nothing at all ─────────────────────────────────────

// Scoped to the door PLUS the shared half, and that is the whole correction a
// review found: most of what an autosave does happens in prepareSave, so
// `revalidatePath('/admin', 'layout')` added at the top of THAT function fires
// on every keystroke batch while a door-only sweep stays green. Same class of
// mis-scoping as the columns sweep below.
const AUTOSAVE_PATH = SAVE_DRAFT_CODE + PREPARE_SAVE_CODE;
for (const forbidden of ['updateTag', 'revalidateTag', 'revalidatePath'] as const) {
  ok(`nothing on the autosave path calls ${forbidden}`, !AUTOSAVE_PATH.includes(forbidden));
}
ok('nothing on the autosave path writes a revision', !AUTOSAVE_PATH.includes('insertRevision'));
ok('nothing on the autosave path writes an activity row', !AUTOSAVE_PATH.includes('logActivity'));
// `!includes('for (')` was the first version of this and a `while` loop or a
// recursive call to the door itself walked straight past it. The self-call
// count is 1 because the slice opens with the declaration.
ok(
  'saveDraft reports a lost race rather than retrying or merging',
  SAVE_DRAFT_CODE.includes("error: 'conflict'") &&
    !/\b(for|while|do)\s*\(/.test(SAVE_DRAFT_CODE) &&
    occurrences(SAVE_DRAFT_CODE, 'saveDraft(') === 1,
);

// ── An explicit Save moves no public byte ───────────────────────────────────

for (const forbidden of [
  'updateTag',
  'revalidateTag',
  'pingIndexNow',
  'invalidateBlog',
] as const) {
  ok(`savePost refreshes no public cache: no ${forbidden}`, !SAVE_POST_CODE.includes(forbidden));
}
// `revalidatePath` is deliberately NOT in that list. An explicit Save is not
// keystroke-frequency, and the admin tree is not the public site: the posts
// list's title, status and "Updated" column have to be right when the member
// navigates back. This is the house contract _actions/careers.ts states and
// every other domain follows, so its absence would be the anomaly.
ok(
  'savePost revalidates the admin layout, the house contract for a deliberate write',
  SAVE_POST_CODE.includes("revalidatePath('/admin', 'layout')"),
);
// Scoped to the SAVE PATH — create, prepareSave, autosave and Save — and not
// to savePost alone, which is the fix a mutation found: the working columns are
// assembled in prepareSave, so a `publishedRevisionId: null` added there would
// never appear in savePost's own slice and a door-only sweep would have stayed
// green.
//
// It was whole-file until task 9. The transition doors below legitimately name
// every one of these tokens — that is what a transition IS — so the sweep was
// narrowed to the code that must still obey it rather than deleted. The hazard
// it exists for has not gone anywhere: a save door that could reach a pointer
// or a stamp would move a post between public and private on a keystroke, and
// nothing on any screen would say so. The structural half now backs it up
// (`BlogWorkingUpdate` omits all seven publication columns, so naming one in a
// save is also a type error), but the sweep catches the shapes a type cannot:
// a stray statement call, a spread, a payload field.
const SAVE_PATH_CODE = CREATE_POST_CODE + PREPARE_SAVE_CODE + SAVE_DRAFT_CODE + SAVE_POST_CODE;
ok('the save-path slice is not empty (fixture guard)', SAVE_PATH_CODE.length > 2000);
for (const forbidden of [
  'publishedRevisionId',
  'pendingRevisionId',
  'publishAt',
  'trashedAt',
  'status:',
] as const) {
  ok(`no save door in this file sets ${forbidden}`, !SAVE_PATH_CODE.includes(forbidden));
}
ok(
  'savePost’s revision carries the row’s own instants',
  /publishedAt: row\.publishedAt/.test(SAVE_POST_CODE) &&
    /contentModifiedAt: row\.contentModifiedAt/.test(SAVE_POST_CODE),
);
// Same narrowing as the sweep above, for the same reason and with the same
// hazard intact: a SAVE that stamps an editorial instant moves the visible
// "Updated" byline, JSON-LD dateModified and every sitemap lastmod, invisibly,
// on a keystroke timer. `publishPost` and `amendPublishedDate` legitimately
// resolve an instant and hand it to a statement, which is why the sweep is no
// longer whole-file; the save path is exactly the code that must never do it.
ok(
  'no save door in this file stamps an editorial instant',
  !/(publishedAt|contentModifiedAt): new Date\(/.test(SAVE_PATH_CODE),
);

// ── The ordering neon-http's lack of transactions forces ────────────────────

const iRelated = SAVE_POST_CODE.indexOf('replaceRelated(');
const iEntities = SAVE_POST_CODE.indexOf('replaceEntities(');
const iRevision = SAVE_POST_CODE.indexOf('insertRevisionOnce(');
const iUpdate = SAVE_POST_CODE.indexOf('updateWorkingCopy(');
ok(
  'savePost writes both relation tables before the revision',
  iRelated >= 0 && iEntities >= 0 && iRevision > iRelated && iRevision > iEntities,
);
ok('savePost writes the revision before the version-guarded update', iUpdate > iRevision);

// The lost-race path specifically. Asserting only that SOME deleteRevision
// precedes the conflict return would stay green while the one in the conflict
// branch was deleted, because the error path above it also calls it, so the
// branch itself is sliced out and read on its own.
// Sliced from the COMMENT-STRIPPED source, like every other region here. It
// was the raw one, which was harmless only until the branch grew a comment,
// and it just grew one: a `// discardRevision(...) happens below` line would
// otherwise satisfy the index test on its own. The replaceEntities assertion
// made exactly this mistake and was found by its own mutation.
const CONFLICT_BRANCH = region(
  SAVE_POST_CODE,
  'if (version === null) {',
  'logActivity',
  'the savePost conflict branch',
);
// Through the guarded wrapper, never the raw statement: an unguarded delete
// that throws turns a recoverable conflict into a server error.
ok(
  'both revision cleanups go through the guarded discardRevision',
  occurrences(SAVE_POST_CODE, 'discardRevision(revision.id)') === 2 &&
    !SAVE_POST_CODE.includes('deleteRevision('),
);
// Ordered, not merely present: `includes` alone stays green with the return
// written above the delete, which is the mistake being guarded against.
const iDiscard = CONFLICT_BRANCH.indexOf('discardRevision(revision.id)');
const iReturnConflict = CONFLICT_BRANCH.indexOf("error: 'conflict'");
ok(
  'the conflict branch deletes the revision BEFORE reporting the conflict',
  iDiscard >= 0 && iReturnConflict > iDiscard,
);

// ── The version guard is the concurrency control ────────────────────────────

ok(
  'updateWorkingCopy matches on the caller’s own version',
  /eq\(blogPosts\.version, version\)/.test(UPDATE_WORKING),
);
ok('updateWorkingCopy bumps the version in SQL, never in JS', /version\} \+ 1/.test(UPDATE_WORKING));
ok(
  'updateWorkingCopy returns the new version, so zero rows is distinguishable',
  UPDATE_WORKING.includes('.returning({ version: blogPosts.version })'),
);

// A loop of up to thirty sequential upserts on the Save path, AFTER the delete
// has already run, means one throw part-way leaves the post with no entity
// links at all.
// Read the COMMENT-STRIPPED slice. The first version of this read the raw one
// and stayed green under its own mutation, because the prose above the
// statement quotes `excluded.same_as` and satisfied the regex on its own.
const REPLACE_ENTITIES_CODE = stripComments(REPLACE_ENTITIES);
ok(
  'replaceEntities upserts the whole vocabulary in ONE statement',
  /excluded\.same_as/.test(REPLACE_ENTITIES_CODE) &&
    occurrences(REPLACE_ENTITIES_CODE, 'await db') === 3,
);
const ENTITY_FOLD = region(
  REPLACE_ENTITIES_CODE,
  'for (const entity of wanted) {',
  '\n  }',
  'the replaceEntities link fold',
);
ok('and its per-entity fold touches the database not at all', !ENTITY_FOLD.includes('await'));
ok(
  'insertRevision numbers itself with an inline subquery',
  /select coalesce\(max\(/.test(INSERT_REVISION),
);
ok('and never reads the current max first', !INSERT_REVISION.includes('.select('));
// Re-scoped when the retry moved out of savePost into a shared helper: SIX
// doors write a revision now, and six private copies of a two-line retry is
// how one of them ends up without it. Stronger than the version it replaces,
// because it also pins that no door reaches the raw statement around it.
const INSERT_ONCE = stripComments(
  region(
    ACTIONS_SRC,
    'async function insertRevisionOnce(',
    '\n}',
    'the shared revision writer',
  ),
);
ok(
  'the shared revision writer retries the (post_id, number) collision exactly once',
  occurrences(INSERT_ONCE, 'insertRevision(db, values)') === 2,
);
eq(
  'and it is the only caller of the raw statement in the actions file',
  occurrences(ACTIONS_CODE, 'insertRevision(db,'),
  2,
);

// ── The house rules every action in the dashboard follows ───────────────────

ok(
  'createPost invalidates nothing (a draft is not public, and it redirects)',
  !CREATE_POST_CODE.includes('updateTag') &&
    !CREATE_POST_CODE.includes('revalidatePath') &&
    !CREATE_POST_CODE.includes('pingIndexNow'),
);
ok(
  'createPost re-rolls a colliding placeholder slug instead of throwing a 23505',
  /tries < 2/.test(CREATE_POST_CODE) && CREATE_POST_CODE.includes('newDraftSlug()'),
);
ok(
  'createPost redirects OUTSIDE its try, so NEXT_REDIRECT is never caught',
  CREATE_POST_CODE.lastIndexOf('redirect(`/admin/blogs/') >
    CREATE_POST_CODE.lastIndexOf('} catch (error) {'),
);

eq(
  'every exported action gates on the blogs area',
  occurrences(ACTIONS_CODE, "requireArea('blogs', '/admin')"),
  occurrences(ACTIONS_CODE, 'export async function'),
);
/**
 * Every function in the actions file, sliced from the file ITSELF rather than
 * from a list of names.
 *
 * That is the whole point: the hand-written list this replaced covered three
 * doors, then eleven more landed beside them and four of the new ones were
 * simply not swept. A door added by a later task is covered here without
 * anybody remembering to add it, and a door RENAMED does not quietly fall out.
 *
 * Non-exported helpers are in too, because the work of a door routinely lives
 * in one (`prepareSave` holds most of what an autosave does, and
 * `writeSchedule` holds both schedule doors).
 */
const FN_SLICES: { name: string; exported: boolean; code: string }[] = (() => {
  const re = /\n(export )?async function (\w+)[(<]/g;
  const heads = [...ACTIONS_SRC.matchAll(re)].map((m) => ({
    at: m.index,
    exported: m[1] !== undefined,
    name: m[2],
  }));
  return heads.map((head, i) => ({
    name: head.name,
    exported: head.exported,
    code: stripComments(ACTIONS_SRC.slice(head.at, heads[i + 1]?.at ?? ACTIONS_SRC.length)),
  }));
})();
const fnNamed = (name: string) => FN_SLICES.find((fn) => fn.name === name)?.code ?? '';
// Fixture guards: an empty or truncated sweep would make every assertion built
// on it vacuously true.
ok('found every function in the actions file (fixture guard)', FN_SLICES.length >= 18);
eq(
  'and every exported one, matching the file’s own count',
  FN_SLICES.filter((fn) => fn.exported).length,
  occurrences(ACTIONS_CODE, 'export async function'),
);
for (const name of ['createPost', 'saveDraft', 'savePost', 'publishPost', 'restorePost'] as const) {
  ok(`the sweep found ${name} (fixture guard)`, fnNamed(name).length > 200);
}

// The count above says the gate is THERE; it cannot say it runs first. Moving
// it inside a try swallows requireArea's redirect into reportError and hands a
// member `{ ok: false, error: 'server' }` where they should have been sent to
// /admin, which looks exactly like a broken button.
for (const fn of FN_SLICES) {
  if (!fn.exported) continue;
  const iGate = fn.code.indexOf("requireArea('blogs', '/admin')");
  const iTry = fn.code.indexOf('try {');
  ok(`${fn.name} gates FIRST and OUTSIDE its try`, iGate >= 0 && iTry > iGate);
}
ok(
  'no non-async value export (a "use server" module may export only async functions)',
  !/export\s+(const|let|var|class|function)\s/.test(ACTIONS_CODE),
);
// Per BLOCK rather than by a pair of totals: the body refusal now reports
// outside any catch, so two equal counts would no longer mean what it says.
const caughtBlocks = ACTIONS_CODE.split('} catch (error) {').slice(1);
ok('found the catch blocks to scan (fixture guard)', caughtBlocks.length >= 4);
eq(
  'every caught failure is reported under its own [blogs] key',
  caughtBlocks.filter((block) => block.slice(0, 200).includes("reportError('[blogs] ")).length,
  caughtBlocks.length,
);

// ── Member-visible copy carries no em dash ──────────────────────────────────
// Nothing else in the repo enforces this, and a validation message is the most
// likely place for one to reach a member. Comments are stripped first, so the
// prose above (which may keep its dashes) is out of scope.

const literals = (code: string) => [
  ...[...code.matchAll(/'(?:[^'\\\n]|\\.)*'/g)].map((m) => m[0]),
  ...[...code.matchAll(/`(?:[^`\\]|\\.)*`/g)].map((m) => m[0]),
];
ok('found string literals to scan (fixture guard)', literals(ACTIONS_CODE).length > 20);
for (const [label, code] of [
  ['blogStatements.ts', STATEMENTS_CODE],
  ['_actions/blogPosts.ts', ACTIONS_CODE],
] as const) {
  eq(
    `no em dash in any ${label} string literal`,
    literals(code).filter((s) => s.includes('—')),
    [],
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 9. The transition doors: publish, schedule, unpublish, trash, restore, purge
// ═══════════════════════════════════════════════════════════════════════════
// Every mistake available here is SILENT ON SCREEN. The post still renders; it
// is just dated wrong, ordered wrong, or invisible. Four decisions carry the
// weight:
//
//  - THE PUBLISH INSTANT goes to three places at once (the revision's typed
//    column, snapshot.publishedAt, and blog_posts.published_at), because the
//    public DATE is read off the revision while publicOrder sorts on the POST
//    row. Write one without the others and a post is dated in one place and
//    sorted by another, with nothing on any screen to say which is wrong.
//  - `published_at` is COALESCED on every publish, which is what lets archived
//    go back to published without re-dating a two-year-old article to today.
//    The amend is the single exception and says so.
//  - `content_modified_at` moves only when the ARTICLE moved. An SEO-only
//    republish that stamped it would claim a freshness the page does not have,
//    on the byline, the JSON-LD and every sitemap lastmod at once.
//  - Ordering. neon-http has no transactions, so relations, then the revision,
//    then ONE guarded UPDATE, and the revision comes back out on a conflict.

// ── contentChanged: the one place the "Updated" date is decided ─────────────

const CONTENT_SNAP: BlogSnapshotView = {
  slug: 'vancouver-realtor-video',
  title: 'Video for Vancouver realtors',
  description: 'What a listing video costs you in time.',
  categorySlug: 'production',
  authorSlug: 'saman-hoseinpour',
  serviceSlug: null,
  hero: { staticPath: '/images/blogs/realtors/hero.avif', media: null, alt: 'A kitchen', caption: null },
  body: { type: 'doc', content: [{ type: 'paragraph' }] },
  bodyText: 'Hello Vancouver.',
  keyTakeaways: ['Book the shoot before the listing goes live.'],
  faqs: [{ question: 'How long?', answer: 'Half a day.' }],
  sources: [],
  entities: [],
  relatedSlugs: ['drone-video-vancouver'],
  seo: {
    title: 'Video for Vancouver realtors',
    description: 'A meta description, which is not the post description.',
    canonicalOverride: null,
    ogTitle: 'An OG title',
    ogDescription: 'An OG description',
    ogImage: null,
    twitterCard: 'summary_large_image',
    robotsIndex: true,
    robotsFollow: true,
    robotsExtra: null,
    focusKeywords: ['vancouver realtor video'],
    emitLegacyMetaKeywords: false,
  },
  customSchema: null,
};

// A FIRST publish. There is no earlier article for the content to have changed
// from, and `content_modified_at` means "editorially updated since". Returning
// true here would put an "Updated" claim on a post that went live one second
// ago, on every URL a first publish touches.
eq('contentChanged: a first publish does not stamp', contentChanged(null, CONTENT_SNAP), false);
eq(
  'contentChanged: republishing the same article does not stamp',
  contentChanged(CONTENT_SNAP, CONTENT_SNAP),
  false,
);
for (const [label, next] of [
  ['a retitled post', { ...CONTENT_SNAP, title: 'Something else' }],
  ['a rewritten body', { ...CONTENT_SNAP, bodyText: 'x', body: { type: 'doc', content: [] } }],
  ['a changed description', { ...CONTENT_SNAP, description: 'New standfirst.' }],
  ['a changed hero', { ...CONTENT_SNAP, hero: { ...CONTENT_SNAP.hero, alt: 'A different room' } }],
  ['a changed FAQ', { ...CONTENT_SNAP, faqs: [{ question: 'How long?', answer: 'A day.' }] }],
  ['a changed related list', { ...CONTENT_SNAP, relatedSlugs: ['listing-photography'] }],
] as const) {
  eq(`contentChanged: ${label} stamps`, contentChanged(CONTENT_SNAP, next), true);
}

// THE LOAD-BEARING ONE. Every one of these edits changes the page a crawler
// fetches (so publicFingerprint moves and IndexNow is pinged), and none of
// them is an update to the ARTICLE. Stamping here is how a tidy-up of forty
// meta descriptions rewrites forty sitemap lastmods.
for (const [label, next] of [
  ['a new meta title', { ...CONTENT_SNAP, seo: { ...CONTENT_SNAP.seo, title: 'New meta title' } }],
  [
    'a new meta description',
    { ...CONTENT_SNAP, seo: { ...CONTENT_SNAP.seo, description: 'New meta description.' } },
  ],
  ['a noindex flip', { ...CONTENT_SNAP, seo: { ...CONTENT_SNAP.seo, robotsIndex: false } }],
  [
    'new focus keywords',
    { ...CONTENT_SNAP, seo: { ...CONTENT_SNAP.seo, focusKeywords: ['realtor video'] } },
  ],
  ['a moved slug', { ...CONTENT_SNAP, slug: 'realtor-video-vancouver' }],
  ['a category move', { ...CONTENT_SNAP, categorySlug: 'social' }],
] as const) {
  eq(`contentChanged: ${label} does NOT stamp`, contentChanged(CONTENT_SNAP, next), false);
  // Paired, so the assertion above can never pass by the fingerprints simply
  // being blind to the field: the PUBLIC one has to notice every one of these,
  // or the URL goes unannounced.
  ok(
    `publicFingerprint still notices ${label}`,
    publicFingerprint(CONTENT_SNAP) !== publicFingerprint(next),
  );
}

// The jsonb round trip does not promise key order, and the previous snapshot
// has literally been through it. An order-sensitive comparison would stamp on
// an arbitrary subset of republishes.
{
  const reordered: BlogSnapshotView = {
    customSchema: CONTENT_SNAP.customSchema,
    seo: { ...CONTENT_SNAP.seo },
    relatedSlugs: CONTENT_SNAP.relatedSlugs,
    entities: CONTENT_SNAP.entities,
    sources: CONTENT_SNAP.sources,
    faqs: CONTENT_SNAP.faqs,
    keyTakeaways: CONTENT_SNAP.keyTakeaways,
    bodyText: CONTENT_SNAP.bodyText,
    body: CONTENT_SNAP.body,
    hero: { ...CONTENT_SNAP.hero },
    serviceSlug: CONTENT_SNAP.serviceSlug,
    authorSlug: CONTENT_SNAP.authorSlug,
    categorySlug: CONTENT_SNAP.categorySlug,
    description: CONTENT_SNAP.description,
    title: CONTENT_SNAP.title,
    slug: CONTENT_SNAP.slug,
  };
  ok(
    'the reordered fixture really does have a different key order (fixture guard)',
    JSON.stringify(Object.keys(reordered)) !== JSON.stringify(Object.keys(CONTENT_SNAP)),
  );
  eq(
    'contentChanged survives a jsonb key reordering',
    contentChanged(CONTENT_SNAP, reordered),
    false,
  );
}

// ── internalLinkSlugs: what the publish warning is built from ───────────────

{
  const raw = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'one', marks: [{ type: 'link', attrs: { href: '/blogs/first-post' } }] },
          {
            type: 'text',
            text: ' two',
            marks: [{ type: 'link', attrs: { href: 'https://example.com/blogs/elsewhere' } }],
          },
          {
            type: 'text',
            text: ' three',
            marks: [{ type: 'link', attrs: { href: '/blogs/authors/saman-hoseinpour' } }],
          },
          {
            type: 'text',
            text: ' four',
            marks: [{ type: 'link', attrs: { href: '/blogs/first-post#faqs' } }],
          },
          {
            type: 'text',
            text: ' five',
            marks: [{ type: 'link', attrs: { href: '/blogs/second-post/' } }],
          },
          { type: 'text', text: ' six', marks: [{ type: 'bold' }] },
          { type: 'text', text: ' seven' },
        ],
      },
      {
        type: 'blockquote',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'deep',
                marks: [{ type: 'link', attrs: { href: '/blogs/third-post?utm=x' } }],
              },
            ],
          },
        ],
      },
    ],
  };
  // Through the REAL validator, so this pins the shape a stored body actually
  // has rather than one written to suit the function under test.
  const checked = validateBlogBody(raw);
  ok('the link fixture is a storable body (fixture guard)', checked.ok);
  const doc = checked.ok ? checked.doc : ({ type: 'doc' } as BlogDoc);
  eq('internalLinkSlugs finds our own posts, deduped, in document order', internalLinkSlugs(doc), [
    'first-post',
    'second-post',
    'third-post',
  ]);
  eq('internalLinkSlugs finds nothing in an empty body', internalLinkSlugs({ type: 'doc' }), []);
  // Not through the validator: `safeHref` refuses these upstream, which is the
  // point — this pins that the extractor does not resurrect one if it ever got
  // past, and that the slug class is what excludes the authors route.
  for (const href of ['//evil.com', '/blogs', '/blogsomething', '/blogs/', '/blogs/A_Post']) {
    eq(
      `internalLinkSlugs ignores ${href}`,
      internalLinkSlugs({
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'link', attrs: { href } }] }] },
        ],
      }),
      [],
    );
  }
}

// ── The transition statements ───────────────────────────────────────────────

const GUARDED_TRANSITION = stripComments(
  region(STATEMENTS_SRC, 'async function guardedTransition(', 'export function publishPostRow(', 'guardedTransition'),
);
const statementRegion = (from: string, to: string, label: string) =>
  stripComments(region(STATEMENTS_SRC, from, to, label));

const PUBLISH_ROW = statementRegion(
  'export function publishPostRow(',
  'export function schedulePostRow(',
  'publishPostRow',
);
const SCHEDULE_ROW = statementRegion(
  'export function schedulePostRow(',
  'export function unschedulePostRow(',
  'schedulePostRow',
);
const UNSCHEDULE_ROW = statementRegion(
  'export function unschedulePostRow(',
  'export function unpublishPostRow(',
  'unschedulePostRow',
);
const UNPUBLISH_ROW = statementRegion(
  'export function unpublishPostRow(',
  'export function amendPublishedAtRow(',
  'unpublishPostRow',
);
const AMEND_ROW = statementRegion(
  'export function amendPublishedAtRow(',
  'export function trashPostRow(',
  'amendPublishedAtRow',
);
const TRASH_ROW = statementRegion(
  'export function trashPostRow(',
  'export function restorePostRow(',
  'trashPostRow',
);
const RESTORE_ROW = statementRegion(
  'export function restorePostRow(',
  '/* Bulk transitions',
  'restorePostRow',
);
const PURGE_ROW = statementRegion(
  'export async function purgePostRow(',
  'export async function unpublishedLinkTargets(',
  'purgePostRow',
);

// The concurrency control, same contract as updateWorkingCopy's.
ok(
  'guardedTransition matches on the caller’s own version',
  /eq\(blogPosts\.version, version\)/.test(GUARDED_TRANSITION),
);
ok('guardedTransition bumps the version in SQL, never in JS', /version\} \+ 1/.test(GUARDED_TRANSITION));
ok(
  'guardedTransition returns the new version, so zero rows is distinguishable',
  GUARDED_TRANSITION.includes('.returning({ version: blogPosts.version })'),
);

// EVERY transition is ONE statement. Migration 0045's CHECKs are about
// COMBINATIONS of these columns — blog_posts_trash_stamp is an equivalence,
// blog_posts_schedule_stamp needs both halves — so a move split in two would
// offer the database a half-built row in between and be refused outright.
for (const [label, code] of [
  ['publishPostRow', PUBLISH_ROW],
  ['schedulePostRow', SCHEDULE_ROW],
  ['unschedulePostRow', UNSCHEDULE_ROW],
  ['unpublishPostRow', UNPUBLISH_ROW],
  ['amendPublishedAtRow', AMEND_ROW],
  ['trashPostRow', TRASH_ROW],
  ['restorePostRow', RESTORE_ROW],
] as const) {
  eq(`${label} moves its columns in exactly one statement`, occurrences(code, 'guardedTransition('), 1);
  ok(`${label} runs no statement of its own`, !code.includes('await db'));
}

// The coalesce is what makes archived -> published keep the date the article
// actually went out on. Overwritten, a two-year-old post re-dates to today and
// jumps to the top of every listing.
ok(
  'publishPostRow coalesces published_at rather than overwriting it',
  /publishedAt: sql`coalesce\(\$\{blogPosts\.publishedAt\}, \$\{values\.publishedAt\}\)`/.test(
    PUBLISH_ROW,
  ),
);
ok(
  'publishPostRow moves the pointer, the status and both schedule halves together',
  /status: 'published'/.test(PUBLISH_ROW) &&
    /publishedRevisionId: values\.revisionId/.test(PUBLISH_ROW) &&
    /publishAt: null/.test(PUBLISH_ROW) &&
    /pendingRevisionId: null/.test(PUBLISH_ROW),
);
ok(
  'publishPostRow stamps content_modified_at only when it is given one',
  /\.\.\.\(values\.contentModifiedAt \? \{ contentModifiedAt: values\.contentModifiedAt \} : \{\}\)/.test(
    PUBLISH_ROW,
  ),
);
// THE ONE EXCEPTION, and it has to be an exception or the control does nothing
// at all: replacing the date is the whole act.
ok('amendPublishedAtRow writes published_at DIRECTLY', /publishedAt: values\.publishedAt/.test(AMEND_ROW));
ok('and does not coalesce it', !AMEND_ROW.includes('coalesce'));
ok(
  'amendPublishedAtRow moves the pointer with the date',
  /publishedRevisionId: values\.revisionId/.test(AMEND_ROW),
);

ok(
  'schedulePostRow writes both halves of the schedule with the status',
  /status: 'scheduled'/.test(SCHEDULE_ROW) &&
    /publishAt: values\.publishAt/.test(SCHEDULE_ROW) &&
    /pendingRevisionId: values\.revisionId/.test(SCHEDULE_ROW),
);
// A scheduled post has not been published. Stamping it would lock the slug and
// send a later restore from trash to Archived instead of Draft.
ok('schedulePostRow does not stamp published_at', !SCHEDULE_ROW.includes('publishedAt'));
ok(
  'unschedulePostRow clears the pointer in the SAME statement that leaves scheduled',
  /status: 'draft'/.test(UNSCHEDULE_ROW) &&
    /publishAt: null/.test(UNSCHEDULE_ROW) &&
    /pendingRevisionId: null/.test(UNSCHEDULE_ROW),
);
// Archived means "was live, is not now". Both are KEPT, which is what lets a
// republish preserve the original publication date.
ok(
  'unpublishPostRow keeps the published pointer and the published date',
  /status: 'archived'/.test(UNPUBLISH_ROW) &&
    !UNPUBLISH_ROW.includes('publishedRevisionId') &&
    !UNPUBLISH_ROW.includes('publishedAt'),
);
ok(
  'trashPostRow moves all four columns together',
  /status: 'trash'/.test(TRASH_ROW) &&
    /trashedAt: at/.test(TRASH_ROW) &&
    /publishAt: null/.test(TRASH_ROW) &&
    /pendingRevisionId: null/.test(TRASH_ROW),
);
ok(
  'restorePostRow clears the trash stamp with the status',
  /status,/.test(RESTORE_ROW) && /trashedAt: null/.test(RESTORE_ROW),
);

// ONE DELETE, and `status = 'trash'` in the WHERE is the guard: it is what
// stops a stale id from a list somebody left open deleting a live article.
eq('purgePostRow is a single delete', occurrences(PURGE_ROW, '.delete('), 1);
ok(
  'purgePostRow guards on the trash status',
  /eq\(blogPosts\.status, 'trash'\)/.test(PURGE_ROW) && /eq\(blogPosts\.id, id\)/.test(PURGE_ROW),
);
ok('purgePostRow nulls no pointer first', !PURGE_ROW.includes('.update('));

// The two bulk moves take no version, so the STATUS predicate is what replaces
// it (setTasksStatusBulk's rule): a row somebody else already moved is skipped
// rather than moved twice, and the RETURNING says which really changed.
const TRASH_ROWS = statementRegion(
  'export async function trashPostRows(',
  'export async function restorePostRows(',
  'trashPostRows',
);
const RESTORE_ROWS = statementRegion(
  'export async function restorePostRows(',
  'export async function purgePostRow(',
  'restorePostRows',
);
ok(
  'trashPostRows skips a row already in the bin',
  /ne\(blogPosts\.status, 'trash'\)/.test(TRASH_ROWS) && /inArray\(blogPosts\.id, ids\)/.test(TRASH_ROWS),
);
ok(
  'restorePostRows only ever lifts a row that is in the bin',
  /eq\(blogPosts\.status, 'trash'\)/.test(RESTORE_ROWS) &&
    /inArray\(blogPosts\.id, ids\)/.test(RESTORE_ROWS),
);
for (const [label, code] of [
  ['trashPostRows', TRASH_ROWS],
  ['restorePostRows', RESTORE_ROWS],
] as const) {
  ok(`${label} bumps the version, so a stale editor tab loses its next save`, /version\} \+ 1/.test(code));
  ok(`${label} returns the rows it actually moved`, code.includes('.returning({ id: blogPosts.id'));
}

// The structural half of the "separate doors" rule: a save cannot express a
// publication column at all, which is what lets a publish merge the two
// settable sets into one `.set()` without either half reaching the other's.
for (const column of [
  'status',
  'publishAt',
  'publishedAt',
  'contentModifiedAt',
  'trashedAt',
  'publishedRevisionId',
  'pendingRevisionId',
] as const) {
  ok(
    `BlogWorkingUpdate cannot express ${column}`,
    new RegExp(`Omit<NewBlogPostRow,[^>]*'${column}'`).test(STATEMENTS_CODE),
  );
}

// ── The doors ───────────────────────────────────────────────────────────────

const actionRegion = (from: string, to: string, label: string) =>
  stripComments(region(ACTIONS_SRC, from, to, label));

const PUBLISH_DOOR = actionRegion(
  'export async function publishPost(',
  '// ── Schedule',
  'publishPost',
);
const WRITE_SCHEDULE = actionRegion(
  'async function writeSchedule(',
  'export async function schedulePost(',
  'writeSchedule',
);
const UNSCHEDULE_DOOR = actionRegion(
  'export async function unschedulePost(',
  '// ── Unpublish',
  'unschedulePost',
);
const UNPUBLISH_DOOR = actionRegion(
  'export async function unpublishPost(',
  '// ── Trash, restore and purge',
  'unpublishPost',
);
const TRASH_DOOR = actionRegion(
  'export async function trashPost(',
  'export async function trashPosts(',
  'trashPost',
);
const RESTORE_DOOR = actionRegion(
  'export async function restorePost(',
  'export async function restorePosts(',
  'restorePost',
);
const PURGE_DOOR = actionRegion(
  'export async function purgePost(',
  '// ── The published date',
  'purgePost',
);
const AMEND_DOOR = actionRegion(
  'export async function amendPublishedDate(',
  '// ── Restoring an earlier version',
  'amendPublishedDate',
);
/**
 * A top-level function's OWN source: from its head to its own closing brace at
 * column 0 (every declaration in these files is top-level and indents its
 * body, so no interior `}` starts a line).
 *
 * It exists because `restoreRevision` is the last door in the actions file and
 * was sliced to EOF. That is only correct while nothing follows it: append a
 * door below and every "restoreRevision never does X" assertion is silently
 * answered by the new function instead, which is the widening trap task 9 had
 * to fix on savePost by hand. Bounding on the function itself fixes it once,
 * for whatever is appended later. The helper is proved against a synthetic
 * two-function source below rather than against the real file, where the
 * distinction it makes is not yet expressible.
 */
const functionRegion = (source: string, from: string, label: string) =>
  stripComments(region(source, from, '\n}\n', label));

{
  const FIXTURE = [
    'export async function alpha(x) {',
    '  if (x) {',
    '    return 1;',
    '  }',
    '  return LAST_LINE_OF_ALPHA;',
    '}',
    '',
    'export async function beta() {',
    '  return BELONGS_TO_BETA;',
    '}',
    '',
  ].join('\n');
  const alpha = functionRegion(FIXTURE, 'export async function alpha(', 'the fixture alpha');
  ok('functionRegion keeps the whole function, nested braces included', alpha.includes('LAST_LINE_OF_ALPHA'));
  ok('functionRegion stops at the function it named', !alpha.includes('BELONGS_TO_BETA'));
}

const RESTORE_REVISION = functionRegion(ACTIONS_SRC, 'export async function restoreRevision(', 'restoreRevision');
ok(
  'the restoreRevision slice runs to its own catch (fixture guard)',
  RESTORE_REVISION.length > 2000 &&
    RESTORE_REVISION.includes("reportError('[blogs] restoreRevision failed'"),
);

// (The "gates FIRST and OUTSIDE its try" sweep is not repeated here: §8's now
// runs over every function the file declares, derived from the file, so these
// eleven doors and any added later are covered by it without a second list.)

// ── A door accepts only the status it is FOR ────────────────────────────────
//
// `transitionProblem` answers "may this post move from A to B", and the escape
// at the top of it — `from === 'trash' && to === restoreTarget(history)` — is a
// RESTORE permission. Three doors have a target that escape can equal, so a
// BINNED post passes every gate they ask and the write then either violates
// `blog_posts_trash_stamp` (a raw 23514 on a button that looked enabled) or,
// for the restore door, silently unpublishes a live article: `restoreTarget`
// reads history, answers `archived`, and `published -> archived` is a legal
// pair. Nothing here pinned that until this round, and one assertion of this
// shape would have caught both.

// COMPUTED from transitionProblem itself, not listed: a fourth restore target
// added later widens this set on its own and drags the sweep below with it.
const ESCAPE_TARGETS = BLOG_POST_STATUSES.filter((to) =>
  [false, true].some((everPublished) => transitionProblem('trash', to, { everPublished }) === null),
);
eq('the trash escape reaches exactly the two restore targets', [...ESCAPE_TARGETS].sort(), [
  'archived',
  'draft',
]);

/** The status a statement moves a post to: a literal where it has one, the
 *  sentinel where the CALLER decides (`status,` is a parameter), and null
 *  where the statement moves no status at all. Read off the statement's own
 *  source, so the table cannot drift from the code it describes. */
const CALLER_DECIDED = '(caller)';
const statementTarget = (code: string): string | null =>
  /status: '(\w+)'/.exec(code)?.[1] ?? (/\bstatus,/.test(code) ? CALLER_DECIDED : null);

const STATEMENT_TARGETS: [string, string | null][] = [
  ['publishPostRow', statementTarget(PUBLISH_ROW)],
  ['schedulePostRow', statementTarget(SCHEDULE_ROW)],
  ['unschedulePostRow', statementTarget(UNSCHEDULE_ROW)],
  ['unpublishPostRow', statementTarget(UNPUBLISH_ROW)],
  ['amendPublishedAtRow', statementTarget(AMEND_ROW)],
  ['trashPostRow', statementTarget(TRASH_ROW)],
  ['restorePostRow', statementTarget(RESTORE_ROW)],
  ['trashPostRows', statementTarget(TRASH_ROWS)],
  ['restorePostRows', statementTarget(RESTORE_ROWS)],
];
eq(
  'every transition statement declares a target, or leaves it to the caller',
  STATEMENT_TARGETS.map(([name, target]) => `${name}=${target ?? 'none'}`),
  [
    'publishPostRow=published',
    'schedulePostRow=scheduled',
    'unschedulePostRow=draft',
    'unpublishPostRow=archived',
    'amendPublishedAtRow=none',
    'trashPostRow=trash',
    `restorePostRow=${CALLER_DECIDED}`,
    'trashPostRows=trash',
    `restorePostRows=${CALLER_DECIDED}`,
  ],
);

// Swept over the whole file rather than a list of doors, so the requirement is
// INHERITED: a door added later that writes to `draft` or `archived`, or that
// hands the target in from the caller, fails here until it checks its source.
let exposedSeen = 0;
for (const fn of FN_SLICES) {
  const targets = STATEMENT_TARGETS.filter(([stmt]) => fn.code.includes(`${stmt}(`)).map(
    ([, target]) => target,
  );
  const exposed = targets.some(
    (target) =>
      target === CALLER_DECIDED ||
      (target !== null && (ESCAPE_TARGETS as readonly string[]).includes(target)),
  );
  if (!exposed) continue;
  exposedSeen++;
  // `row.status !== 'x'` on a single door, `post.status === 'x'` on a bulk one:
  // either says which status this door is for.
  const iSource = fn.code.search(/\.status [!=]== '\w+'/);
  const iWrite = Math.min(
    ...STATEMENT_TARGETS.map(([stmt]) => fn.code.indexOf(`${stmt}(`)).filter((i) => i >= 0),
  );
  ok(`${fn.name} checks its source status explicitly`, iSource >= 0);
  ok(`${fn.name} checks it BEFORE it writes`, iSource >= 0 && iSource < iWrite);
}
// Guards the sweep itself: with `exposed` always false every door would be
// skipped and the loop would pass by testing nothing. Three doors are exposed
// today (unschedule, unpublish, and both restore doors, of which the bulk one
// counts once).
eq('the sweep exercised the exposed branch', exposedSeen, 4);
// And the second layer on the one door where the mistake is a SILENT UNPUBLISH
// rather than a refused write: the statement carries the predicate too, which
// its bulk sibling has done since it was written.
ok(
  'restorePostRow refuses a row that is not in the bin',
  /eq\(blogPosts\.status, 'trash'\)/.test(RESTORE_ROW),
);

// THE THREE PLACES. Two typed `Date` writes (the revision column and the
// statement) and one ISO string (the snapshot the public reads its date off).
// Counting the comma-terminated form separately from the `.toISOString()` one
// is what stops the three collapsing into two under a mutation.
eq(
  'publishPost writes the resolved instant to the revision AND the row',
  occurrences(PUBLISH_DOOR, 'publishedAt: instant,'),
  2,
);
ok(
  'and to the snapshot, as the ISO string a jsonb column round-trips',
  PUBLISH_DOOR.includes('publishedAt: instant.toISOString()'),
);
// `row.publishedAt ?? new Date()`, never a bare `new Date()`: the coalesce in
// the statement is the race backstop, and this is what makes the REVISION
// carry the original date too. Miss it and the row sorts by the old instant
// while the page renders today's.
ok(
  'the instant preserves an existing publication date',
  /const instant = row\.publishedAt \?\? new Date\(\)/.test(PUBLISH_DOOR),
);
ok(
  'publishPost decides the "Updated" stamp through contentChanged',
  /contentChanged\(previouslyPublished, base\)/.test(PUBLISH_DOOR),
);
// Rewritten this round. The version here asserted `!includes('contentChanged(
// view')`, which could never go red: `contentChanged` takes a
// BlogSnapshotView, so that call would be a compile error rather than a
// failing assertion. What is actually worth pinning is that ONE read answers
// both questions — whether the article moved, and what the public fingerprint
// was — because two reads is how they come to disagree about what the visitor
// had, and reading the working row instead would make an SEO-only republish
// look like a content change on any post that had been saved since.
ok(
  'one read of the published revision answers both the stamp and the ping',
  /const previouslyPublished = await publishedSnapshot\(input\.id\);/.test(PUBLISH_DOOR) &&
    /beforeRef\(identityOf\(post\), previouslyPublished\)/.test(PUBLISH_DOOR) &&
    occurrences(PUBLISH_DOOR, 'publishedSnapshot(') === 1,
);
ok(
  'and that read really is the PUBLISHED revision, not the working row',
  /publishedRevisionsFor\(\[id\]\)/.test(fnNamed('publishedSnapshot')) &&
    /\?\.snapshot \?\? null/.test(fnNamed('publishedSnapshot')),
);

// Ordering, because neon-http has no transactions.
{
  const iRelated = PUBLISH_DOOR.indexOf('replaceRelated(');
  const iEntities = PUBLISH_DOOR.indexOf('replaceEntities(');
  const iRevision = PUBLISH_DOOR.indexOf('insertRevisionOnce(');
  const iUpdate = PUBLISH_DOOR.indexOf('publishPostRow(');
  ok(
    'publishPost writes both relation tables before the revision',
    iRelated >= 0 && iEntities >= 0 && iRevision > iRelated && iRevision > iEntities,
  );
  ok('publishPost writes the revision before the guarded UPDATE', iUpdate > iRevision);
}

// EVERY door that writes a revision before its UPDATE, swept from the file
// rather than listed. There are two failure paths, not one: the lost race
// (`next === null`) and a THROW — a connection blip, or a CHECK a door above
// missed. Handling only the first leaves a permanent row in an immutable
// history describing something that never happened, which the revisions screen
// renders as fact and a restore would replay. Three doors had exactly that hole
// until this round, and a per-door list is how the next one gets it too.
let revisionWriters = 0;
for (const fn of FN_SLICES) {
  if (!fn.code.includes('await insertRevisionOnce(')) continue;
  revisionWriters++;
  eq(
    `${fn.name} takes its revision back out on BOTH failure paths`,
    occurrences(fn.code, 'discardRevision(revision.id)'),
    2,
  );
  // Ordered, not merely present: `includes` alone stays green with the return
  // written above the delete, which is the mistake being guarded against.
  const iCatch = fn.code.indexOf('} catch (dbError) {');
  const iConflict = fn.code.indexOf("return { ok: false, error: 'conflict' }");
  const iThrowClean = fn.code.indexOf('discardRevision(revision.id)');
  ok(`${fn.name} wraps its guarded UPDATE in a catch`, iCatch >= 0 && iCatch < iConflict);
  ok(`${fn.name} cleans up before it reports`, iThrowClean >= 0 && iThrowClean < iConflict);
  // Through the guarded wrapper, never the raw statement: an unguarded delete
  // that throws turns a recoverable conflict into a server error.
  ok(`${fn.name} cleans up through discardRevision`, !fn.code.includes('deleteRevision('));
}
// savePost, publishPost, writeSchedule, unpublishPost, amendPublishedDate and
// restoreRevision. Without this the loop would pass by testing nothing.
eq('the sweep found every revision-writing door', revisionWriters, 6);
// A post that links to one you are about to publish next is ordinary. A
// refusal here would make the writer publish them in an order the tool chose.
ok(
  'an unpublished internal link is a warning and never a refusal',
  PUBLISH_DOOR.includes('warnings: [warning]') && !/refuse\(\{ [^}]*warning/.test(PUBLISH_DOOR),
);
ok(
  'publishing into a category with no metadata is refused by name',
  /categoryReady\(category\)/.test(PUBLISH_DOOR) && /refuse\(\{ categorySlug:/.test(PUBLISH_DOOR),
);

// The schedule revision carries the INTENDED instant, which is the whole
// reason the cron can publish with one UPDATE and touch no revision row.
eq(
  'the schedule revision carries the intended instant in its typed column',
  occurrences(WRITE_SCHEDULE, 'publishedAt: at,'),
  1,
);
ok(
  'and in the snapshot the public will read its date off',
  WRITE_SCHEDULE.includes('publishedAt: at.toISOString()'),
);
ok('and the row carries it as publish_at', /publishAt: at,/.test(WRITE_SCHEDULE));
ok(
  'a schedule in the past is refused',
  /at\.getTime\(\) <= Date\.now\(\)/.test(WRITE_SCHEDULE) && /refuse\(\{ publishAt:/.test(WRITE_SCHEDULE),
);
// A scheduled post goes live unattended, so it has to satisfy every publish
// rule before anybody walks away from it.
ok(
  'a schedule runs the publish schema and the category check',
  WRITE_SCHEDULE.includes("prepareSave(input, 'publish')") && WRITE_SCHEDULE.includes('categoryReady('),
);
// transitionProblem refuses scheduled -> scheduled as "nothing to do", which
// is right for a STATUS change and wrong for MOVING a schedule. So the update
// path routes as an edit instead, and the judgement appears exactly once.
eq(
  'only the new-schedule path asks transitionProblem',
  occurrences(WRITE_SCHEDULE, 'transitionProblem('),
  1,
);
ok(
  'and moving a schedule checks the status directly',
  WRITE_SCHEDULE.includes("row.status !== 'scheduled'"),
);

// Every status move is judged in one place. The CHECK constraints are the
// backstop; this is what gives a member a sentence.
for (const [label, code] of [
  ['publishPost', PUBLISH_DOOR],
  ['unschedulePost', UNSCHEDULE_DOOR],
  ['unpublishPost', UNPUBLISH_DOOR],
  ['trashPost', TRASH_DOOR],
  ['restorePost', RESTORE_DOOR],
] as const) {
  ok(`${label} asks transitionProblem before it writes`, code.includes('transitionProblem('));
}
// Where a restore lands is decided by HISTORY, never by the caller, and the
// bulk door splits its selection through the same function rather than
// re-expressing the rule as a SQL case.
ok('restorePost resolves its target through restoreTarget', RESTORE_DOOR.includes('restoreTarget('));
{
  const bulk = actionRegion(
    'export async function restorePosts(',
    'export async function purgePost(',
    'restorePosts',
  );
  ok('restorePosts does too', bulk.includes('restoreTarget('));
  // Tightened this round. The version here forbade `case when` and a `sql`
  // template, which nothing in an actions file tends toward. What the code
  // could plausibly drift into is the tidier-looking ONE call for the whole
  // selection, with the target decided in SQL — and that is exactly where the
  // rule would stop living in blogFields.ts. So the split itself is what gets
  // pinned: group by restoreTarget, then one statement per group.
  const iGroup = bulk.indexOf('byTarget.set(');
  const iLoop = bulk.indexOf('for (const [target, group] of byTarget)');
  const iCall = bulk.indexOf('restorePostRows(');
  ok(
    'restorePosts groups by restoreTarget and writes one statement per group',
    iGroup >= 0 && iLoop > iGroup && iCall > iLoop,
  );
}
// A selection over the cap is REFUSED, never sliced. A silent truncation
// returns a count smaller than the selection with no way to tell "already in
// the bin" from "quietly dropped", which on a destructive move is the house
// no-silent-truncation rule at its most expensive.
{
  const BULK_IDS = actionRegion(
    'function bulkIds(ids: string[])',
    'export async function trashPost(',
    'bulkIds',
  );
  ok('an oversized bulk selection is refused', /unique\.length > BULK_MAX/.test(BULK_IDS));
  ok('and never silently sliced', !BULK_IDS.includes('.slice('));
}

// Unpublish keeps both, which is what Archived means.
ok(
  'unpublishPost announces the vanished URL by passing a hidden current side',
  /invalidateBlog\(hiddenRef\(identityOf\(post\)\), previous\)/.test(UNPUBLISH_DOOR),
);
ok(
  'unpublishPost snapshots the STORED row rather than any payload',
  UNPUBLISH_DOOR.includes('buildSnapshot(rowView(post)') && !UNPUBLISH_DOOR.includes('prepareSave('),
);

// The purge.
{
  const iReferrers = PURGE_DOOR.indexOf('relatedReferrerSlugs(');
  const iDelete = PURGE_DOOR.indexOf('purgePostRow(');
  ok('purgePost reads the referrers BEFORE the delete', iReferrers >= 0 && iDelete > iReferrers);
  ok(
    'and refreshes their per-slug entries without pinging them',
    /invalidateBlog\(undefined, hiddenRef\(identityOf\(post\)\), referrers\)/.test(PURGE_DOOR),
  );
  ok(
    'purgePost refuses anything that is not in the bin',
    PURGE_DOOR.includes("row.status !== 'trash'"),
  );
  const iAfter = PURGE_DOOR.indexOf('after(');
  ok('the blob sweep runs post-response', iAfter > iDelete);
  ok(
    'and cannot fail the action, because the row is already gone',
    /after\(async \(\) => \{\s*try \{/.test(PURGE_DOOR),
  );
}

// The amend. A DAY KEY through dayNoonIn, never an instant from a browser:
// every one of the 38 imported rows is noon-anchored, and a Tehran editor
// picking a morning time would store an instant that reads back as yesterday.
ok(
  'amendPublishedDate anchors the day at noon in the studio zone',
  /dayNoonIn\(STUDIO_TZ, dayKey\)/.test(AMEND_DOOR),
);
ok('and never at the start of the day', !AMEND_DOOR.includes('dayStartIn'));
ok(
  'and refuses a day key that does not round-trip',
  /dayKeyIn\(STUDIO_TZ, instant\) !== dayKey/.test(AMEND_DOOR),
);
ok(
  'the amend re-dates the PUBLISHED snapshot rather than the working copy',
  /\.\.\.current\.snapshot,\s*publishedAt: instant\.toISOString\(\)/.test(AMEND_DOOR) &&
    !AMEND_DOOR.includes('prepareSave('),
);
ok(
  'and writes a new revision rather than editing one in place',
  AMEND_DOOR.includes('insertRevisionOnce(') && !AMEND_DOOR.includes('update(blogPostRevisions'),
);

// The revision restore. Three things it must not restore; the first is the one
// a type cannot catch, because BlogWorkingUpdate can still express a slug.
{
  const RESTORE_COLUMNS = stripComments(
    region(
      RESTORE_REVISION,
      'const columns: BlogWorkingUpdate = {',
      '\n    };',
      'the restoreRevision columns',
    ),
  );
  ok('the restore columns slice is not empty (fixture guard)', RESTORE_COLUMNS.length > 400);
  for (const column of [
    'slug',
    'status',
    'publishAt',
    'publishedAt',
    'contentModifiedAt',
    'trashedAt',
    'publishedRevisionId',
    'pendingRevisionId',
  ] as const) {
    ok(`restoreRevision never writes ${column}`, !RESTORE_COLUMNS.includes(column));
  }
  ok(
    'restoreRevision writes through the working-copy door, which owns no publication column',
    RESTORE_REVISION.includes('updateWorkingCopy(db, postId, version, columns)'),
  );
  // An import-era snapshot carries the legacy countWords(mdx) over the whole
  // file, 4 to 21 percent high. Copied back, it puts that number on a post
  // that no longer has any legacy anything.
  ok(
    'restoreRevision RECOMPUTES the word count instead of copying it',
    /wordCount\(\{ doc, faqs: snap\.faqs \}\)/.test(RESTORE_REVISION) &&
      !RESTORE_REVISION.includes('snap.wordCount'),
  );
  ok(
    'restoreRevision replays the two relation tables from the snapshot',
    RESTORE_REVISION.includes('replaceRelated(db, postId, snap.relatedSlugs)') &&
      RESTORE_REVISION.includes('replaceEntities(db, postId, snap.entities)'),
  );
  // The working copy moved and nothing public did, so this follows savePost.
  // invalidateBlog would refresh BLOGS_TAG, which re-renders the whole
  // marketing site for an edit nobody outside /admin can see.
  ok(
    'restoreRevision refreshes no public cache',
    !RESTORE_REVISION.includes('invalidateBlog') &&
      !RESTORE_REVISION.includes('updateTag') &&
      RESTORE_REVISION.includes("revalidatePath('/admin', 'layout')"),
  );
  ok(
    'restoreRevision scopes the revision by BOTH ids',
    RESTORE_REVISION.includes('getRevisionForPost(postId, revisionId)'),
  );
}

// The dates ride the ref rather than the fingerprint, and something has to
// notice them or an amended publication date is the one public change in this
// domain that never reaches IndexNow.
{
  const INVALIDATE = stripComments(
    region(ACTIONS_SRC, 'function invalidateBlog(', '// ── Create', 'invalidateBlog'),
  );
  ok(
    'invalidateBlog treats a moved publication date as a change',
    /current\.dates !== previous\.dates/.test(INVALIDATE),
  );
  ok(
    'and refreshes the referrers before the not-public early return',
    INVALIDATE.indexOf('for (const slug of alsoTag)') < INVALIDATE.indexOf('if (!wasPublic && !isPublic) return;'),
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 10. Blog media uploads, and the image licence claim
// ═══════════════════════════════════════════════════════════════════════════
//
// Two unrelated-looking things, joined by one fact: until this round nobody
// could put an image on a post except by hand, and both rules below were true
// only because of that.
//
//  - The Blob PATHNAME is assembled from an owner id and a slot label, and
//    NEITHER guard beneath it is a traversal guard. `assertPublicPrefix` in
//    publicBlob.ts is a `startsWith` test, and BLOG_MEDIA_PATHNAME_RE permits
//    nested segments. So a post id of `authors/<some-uuid>` would write into
//    the authors namespace and satisfy both, and the only thing that can
//    refuse it is the builder.
//  - src/lib/blogJsonLd.ts emits `license`, `acquireLicensePage`, `creator`,
//    `creditText`, `copyrightNotice` and `copyrightHolder` over the hero and
//    every showcase figure. That is a machine-readable claim that this studio
//    created the image and licenses it on the terms at /license. It was
//    correct while every image in the corpus was hand-curated. The moment
//    /admin can upload one it stops being, and the site starts publishing a
//    copyright claim over a photograph nobody vetted.

// ── The pathname builder ────────────────────────────────────────────────────

const OWNER_A = '11111111-2222-3333-4444-555555555555';
const OWNER_B = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

eq(
  'blogMediaBase: a post slot lands under the post id',
  blogMediaBase({ kind: 'post', id: OWNER_A }, 'hero'),
  `blogs/${OWNER_A}/hero`,
);
eq(
  'blogMediaBase: an author photo lands under blogs/authors/',
  blogMediaBase({ kind: 'author', id: OWNER_B }, 'photo'),
  `blogs/authors/${OWNER_B}/photo`,
);

// THE assertion this builder exists for. A post id of `authors/<uuid>` is the
// shape that crosses into the author namespace while passing every check
// downstream, and it arrives in a FormData, so refusing it at compile time
// would not be refusing it at all.
eq(
  'blogMediaBase: a post id that is itself a path into the authors namespace is refused',
  blogMediaBase({ kind: 'post', id: `authors/${OWNER_B}` }, 'hero'),
  null,
);
eq(
  'blogMediaBase: an id carrying any slash is refused',
  blogMediaBase({ kind: 'post', id: `${OWNER_A}/x` }, 'hero'),
  null,
);
eq(
  'blogMediaBase: a traversing id is refused',
  blogMediaBase({ kind: 'post', id: '../../clients' }, 'hero'),
  null,
);
eq(
  'blogMediaBase: an id that is not a uuid at all is refused',
  blogMediaBase({ kind: 'post', id: 'a-post' }, 'hero'),
  null,
);
eq(
  'blogMediaBase: an empty id is refused',
  blogMediaBase({ kind: 'post', id: '' }, 'hero'),
  null,
);
// The other half of the filename. Both refusals are runtime refusals for the
// same reason: the label is a FormData string.
eq(
  'blogMediaBase: a label carrying a slash is refused',
  blogMediaBase({ kind: 'post', id: OWNER_A }, 'hero/../../clients/logo'),
  null,
);
eq(
  'blogMediaBase: a label outside the closed set is refused',
  blogMediaBase({ kind: 'post', id: OWNER_A }, 'avatar'),
  null,
);
// A slot belongs to one kind of owner. A `photo` under a post id, or a `hero`
// under an author id, is a file nothing would ever read.
eq(
  'blogMediaBase: a post cannot take the author photo slot',
  blogMediaBase({ kind: 'post', id: OWNER_A }, 'photo'),
  null,
);
eq(
  'blogMediaBase: an author cannot take a post slot',
  blogMediaBase({ kind: 'author', id: OWNER_A }, 'hero'),
  null,
);

// Swept over the whole vocabulary rather than listed, so a slot added later is
// forced through this instead of inheriting a pass: every offered pair, at
// every rung, in every extension, must build a pathname the READER accepts and
// that stays inside this post's or author's own folder.
{
  const rungs = ['full', ...PROJECT_IMAGE_RUNGS.map((w) => `w${w}`)];
  const exts = ['avif', 'webp', 'png', 'jpg'];
  const offered = ([{ kind: 'post' }, { kind: 'author' }] as const).flatMap((o) =>
    BLOG_MEDIA_LABELS.map((label) => ({ kind: o.kind, label })),
  );
  const built = offered
    .map(({ kind, label }) => ({ kind, label, base: blogMediaBase({ kind, id: OWNER_A }, label) }))
    .filter((b): b is typeof b & { base: string } => b.base !== null);
  ok('every owner kind offers at least one slot (fixture guard)', built.length >= 4);
  const bad = built.flatMap(({ kind, label, base }) =>
    rungs.flatMap((r) =>
      exts
        .map((ext) => `${base}-${r}.${ext}`)
        .filter(
          (pathname) =>
            !BLOG_MEDIA_PATHNAME_RE.test(pathname) ||
            !pathname.startsWith(kind === 'author' ? `blogs/authors/${OWNER_A}/` : `blogs/${OWNER_A}/`),
        )
        .map((pathname) => `${kind}/${label}: ${pathname}`),
    ),
  );
  eq('every built pathname is read back by BLOG_MEDIA_PATHNAME_RE, inside its own folder', bad, []);

  // And the whole ladder round-trips through the schema the save doors run, so
  // the writer and the reader cannot drift apart.
  const base = blogMediaBase({ kind: 'post', id: OWNER_A }, 'hero')!;
  ok(
    'a ladder built from blogMediaBase satisfies blogMediaSchema',
    blogMediaSchema.safeParse({
      variants: {
        full: { ...rung(`${base}-full.avif`), width: 1600, height: 900 },
        w960: rung(`${base}-w960.avif`),
        w640: rung(`${base}-w640.avif`),
        w384: rung(`${base}-w384.avif`),
      },
      blurDataUrl: 'data:image/webp;base64,AAAA',
    }).success,
  );
}

// The reason the builder has to be the guard, stated as an assertion rather
// than left in a comment: the schema BELOW it accepts a cross-namespace
// pathname perfectly happily, because nested segments are legal (an author
// photo is one). Nothing downstream of blogMediaBase can catch this.
ok(
  'blogMediaSchema alone would accept a pathname in the authors namespace, so the builder is the only guard',
  blogMediaSchema.safeParse({
    variants: { full: { ...rung(`blogs/authors/${OWNER_B}/hero-full.avif`), width: 8, height: 6 } },
    blurDataUrl: null,
  }).success,
);

// ── The licence claim ───────────────────────────────────────────────────────

const STATIC_FIGURE_SRC = '/images/blogs/production/figure.avif';
const FIGURE_MEDIA_PATH = 'blogs/shot.avif';

/** A figure only reaches the ImageObject set when it carries a caption or a
 *  credit, so every fixture below carries one. */
const figureNode = (
  image: unknown,
  extra: Record<string, unknown>,
): Record<string, unknown> => ({
  type: 'figure',
  attrs: { image, alt: 'alt text', size: 'default', priority: false, width: 800, height: 600, ...extra },
});

const staticImage = { type: 'static', src: STATIC_FIGURE_SRC };
const mediaImage = {
  type: 'media',
  variants: { full: { ...rung(FIGURE_MEDIA_PATH), width: 800, height: 600 } },
  blurDataUrl: null,
};

function figuresOf(...nodes: Record<string, unknown>[]) {
  const parsed = validateBlogBody({ type: 'doc', content: nodes });
  ok('the figure fixture validates (fixture guard)', parsed.ok);
  return parsed.ok ? figures(parsed.doc) : [];
}

// `source` is carried from the document rather than sniffed off the url, so
// pin the carry itself: it is the input every assertion below reads.
{
  const both = figuresOf(
    figureNode(staticImage, { caption: 'A caption' }),
    figureNode(mediaImage, { credit: 'Someone Else' }),
  );
  eq('figures carries each image source through', both.map((f) => f.source), ['static', 'media']);
}

const HERO: BlogHero = { type: 'static', src: '/images/blogs/production/hero.avif' };

/** The smallest PublishedPost that renders a post page's @graph. */
function postView(hero: BlogHero, body: BlogDoc): PublishedPost {
  return {
    id: OWNER_A,
    slug: 'a-post',
    href: '/blogs/a-post',
    legacyId: null,
    title: 'A post',
    description: 'D',
    hero,
    imageUrl: hero.type === 'static' ? hero.src : hero.variants.full.url,
    imageAlt: 'alt text',
    date: 'Feb 8, 2026',
    publishedDay: '2026-02-08',
    modifiedDay: '2026-02-08',
    showsUpdated: false,
    category: { slug: 'production', title: 'Production' },
    authorSlug: 'perseus-creative-studio',
    author: {
      slug: 'perseus-creative-studio',
      name: 'Perseus Creative Studio',
      kind: 'organization',
      role: 'R',
      bio: 'B',
      href: '/blogs/authors/perseus-creative-studio',
      imageUrl: '/images/perseus-logo-black.avif',
      ogImage: null,
      sameAs: [],
      knowsAbout: [],
      tags: [],
      location: null,
      sortIndex: 0,
    },
    serviceSlug: null,
    wordCount: 100,
    robotsIndex: true,
    canonicalOverride: null,
    relatedSlugs: [],
    body,
    bodyText: 'x',
    heroCaption: null,
    keyTakeaways: [],
    faqs: [],
    sources: [],
    entities: [],
    seo: {
      title: 'T',
      description: 'D',
      selfUrl: 'https://www.perseustudio.com/blogs/a-post',
      canonicalUrl: 'https://www.perseustudio.com/blogs/a-post',
      ogTitle: 'T',
      ogDescription: 'D',
      ogImage: hero,
      twitterCard: 'summary_large_image',
      robots: { index: true, follow: true },
      robotsExtra: null,
      focusKeywords: [],
      emitLegacyMetaKeywords: false,
    },
    customSchema: null,
    llmsInclude: true,
  };
}

/** The ImageObject nodes a post page emits for its figures, through the REAL
 *  builder rather than a re-implementation of it. */
function figureNodes(...nodes: Record<string, unknown>[]) {
  const body = { type: 'doc', content: nodes } as unknown as BlogDoc;
  const graph = buildPostJsonLd({
    view: postView(HERO, body),
    crumbs: [{ label: 'Blog', href: '/blogs' }],
    toc: [],
    videos: [],
    figures: figuresOf(...nodes),
    howTos: [],
  });
  return (graph['@graph'] as Record<string, unknown>[]).filter((n) => n['@type'] === 'ImageObject');
}

const LICENCE_KEYS = [
  'creator',
  'creditText',
  'copyrightNotice',
  'copyrightHolder',
  'license',
  'acquireLicensePage',
] as const;

{
  const [uncredited] = figureNodes(figureNode(mediaImage, { caption: 'A caption' }));
  ok('an uploaded figure still emits an ImageObject (fixture guard)', uncredited?.['@type'] === 'ImageObject');
  eq(
    'an uploaded figure claims no ownership, credit or licence',
    LICENCE_KEYS.filter((k) => k in uncredited),
    [],
  );
  // The specific default that had to go: an absent credit must render NO
  // credit, not this studio's name over somebody else's photograph.
  ok(
    'and no credit is invented for it',
    !JSON.stringify(uncredited).includes('Perseus Creative Studio'),
  );
}

{
  const [credited] = figureNodes(figureNode(mediaImage, { credit: 'Someone Else' }));
  eq(
    'an uploaded figure emits the credit the writer typed, and nothing else',
    LICENCE_KEYS.filter((k) => k in credited),
    ['creditText'],
  );
  eq('and that credit is theirs, not ours', credited.creditText, 'Someone Else');
}

{
  const [statik] = figureNodes(figureNode(staticImage, { caption: 'A caption' }));
  eq(
    'a static figure keeps every ownership and licence field',
    LICENCE_KEYS.filter((k) => k in statik),
    [...LICENCE_KEYS],
  );
  // The exact values, unchanged by this task: a static post's JSON-LD has to
  // come out byte-identical, and all 38 live posts are static.
  eq('static figure: creator', statik.creator, {
    '@type': 'Organization',
    name: 'Perseus Creative Studio',
    url: 'https://www.perseustudio.com',
  });
  eq('static figure: creditText falls back to the studio', statik.creditText, 'Perseus Creative Studio');
  eq('static figure: copyrightNotice carries the modified year', statik.copyrightNotice, '© 2026 Perseus Creative Studio');
  eq('static figure: copyrightHolder', statik.copyrightHolder, {
    '@type': 'Organization',
    name: 'Perseus Creative Studio',
  });
  eq('static figure: license', statik.license, 'https://www.perseustudio.com/license');
  eq('static figure: acquireLicensePage', statik.acquireLicensePage, 'https://www.perseustudio.com/license');
  eq('static figure: an explicit credit still wins', figureNodes(figureNode(staticImage, { credit: 'Studio Hand' }))[0].creditText, 'Studio Hand');
  // Key ORDER, because that is what a byte-level parity diff compares. The
  // ownership block moved behind a spread; if it moved POSITION the rendered
  // JSON-LD changes for every live post without a single field changing.
  eq(
    'static figure: the emitted key order is unchanged',
    Object.keys(statik),
    [
      '@type',
      '@id',
      'url',
      'contentUrl',
      'caption',
      'description',
      'width',
      'height',
      ...LICENCE_KEYS,
      'isPartOf',
      'inLanguage',
    ],
  );
}

// The hero, through articleImageSet. It takes the fact from the view's own
// discriminator; sniffing the url for it would be a guess.
eq(
  'the hero image set claims a licence for a static hero',
  articleImageSet('https://www.perseustudio.com/images/blogs/production/hero.avif', true),
  [
    {
      '@type': 'ImageObject',
      url: 'https://www.perseustudio.com/images/blogs/production/hero.avif',
      license: 'https://www.perseustudio.com/license',
      acquireLicensePage: 'https://www.perseustudio.com/license',
    },
  ],
);
eq(
  'and none for an uploaded one',
  articleImageSet(`https://${PUBLIC_BLOB_HOST}/${FIGURE_MEDIA_PATH}`, false),
  [{ '@type': 'ImageObject', url: `https://${PUBLIC_BLOB_HOST}/${FIGURE_MEDIA_PATH}` }],
);

// And that the post builder really passes its own hero's discriminator, rather
// than a constant: the same graph, built twice, differing only in the hero.
{
  const empty = { type: 'doc', content: [] } as unknown as BlogDoc;
  const call = (hero: BlogHero) => {
    const graph = buildPostJsonLd({
      view: postView(hero, empty),
      crumbs: [{ label: 'Blog', href: '/blogs' }],
      toc: [],
      videos: [],
      figures: [],
      howTos: [],
    });
    const article = (graph['@graph'] as Record<string, unknown>[]).find((n) => n['@type'] === 'BlogPosting');
    return (article?.image as Record<string, unknown>[])[0];
  };
  const staticHero = call(HERO);
  const mediaHero = call({ type: 'media', variants: MEDIA.variants, blurDataUrl: null });
  eq(
    'a static hero keeps its licence fields on the article image',
    [('license' in staticHero), ('acquireLicensePage' in staticHero)],
    [true, true],
  );
  eq(
    'an uploaded hero carries neither',
    [('license' in mediaHero), ('acquireLicensePage' in mediaHero)],
    [false, false],
  );
  eq('and the uploaded hero is still the master url', mediaHero.url, MEDIA.variants.full.url);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILED`);
process.exit(fails === 0 ? 0 : 1);
