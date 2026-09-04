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
  BLOG_POST_STATUSES,
  BLOG_POST_STATUS_LABELS,
  ROBOTS_EXTRA_KEYS,
  ROBOTS_EXTRA_KINDS,
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
import { STUDIO_TZ, dayNoonIn, dayStartIn, dayTimeIn } from '@/lib/calendar';
import { PORTFOLIO_SLUG_MAX, PORTFOLIO_SLUG_RE } from '@/lib/portfolioFields';

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

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILED`);
process.exit(fails === 0 ? 0 : 1);
