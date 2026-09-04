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

import { blogPostStatus } from '@/db/schema';
import {
  blogMediaSchema,
  stripTrailingEmptyParagraphs,
  validateBlogBody,
  type BlogDoc,
} from '@/lib/blogBody';
import {
  BLOG_POST_STATUSES,
  BLOG_POST_STATUS_LABELS,
  ROBOTS_EXTRA_KEYS,
  ROBOTS_EXTRA_KINDS,
  ROBOTS_PREVIEW_VALUES,
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
import { PORTFOLIO_SLUG_MAX, PORTFOLIO_SLUG_RE } from '@/lib/portfolioFields';
import { PUBLIC_BLOB_HOST } from '@/lib/publicBlobFields';

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

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILED`);
process.exit(fails === 0 ? 0 : 1);
