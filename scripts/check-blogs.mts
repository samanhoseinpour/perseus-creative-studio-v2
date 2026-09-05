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
import { readdirSync, readFileSync } from 'node:fs';

import { getSchema, type JSONContent, type Mark } from '@tiptap/core';
import { DOMSerializer, Node as PMNode, type Schema } from '@tiptap/pm/model';

import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { and, eq as eqCol, like, notLike, sql } from 'drizzle-orm';

import {
  adminPostsOrder,
  adminPostsWhere,
  isLegacyWordCount,
  selectImportProvenance,
  selectStatusCounts,
} from '@/db/blogAdminPredicates';
import { selectPostForPreview, selectPublishedPost, type BlogDb } from '@/db/blogPredicates';
import {
  EMPTY_BLOG_DOC,
  deleteRevision,
  insertDraftPost,
  insertRevision,
  publishDuePostRows,
  publishPostRow,
  purgePostRow,
  replaceEntities,
  replaceRelated,
  schedulePostRow,
  trashPostRow,
  unpublishPostRow,
  updateWorkingCopy,
  type BlogWorkingUpdate,
} from '@/db/blogStatements';
import * as schema from '@/db/schema';
import {
  blogAuthors,
  blogCategories,
  blogEntities,
  blogPostEntities,
  blogPostRelated,
  blogPostRevisions,
  blogPostStatus,
  blogPosts,
  blogRevisionReason,
  type BlogRevisionSnapshot,
} from '@/db/schema';
import {
  CUSTOM_NODE_NAMES,
  EXTENSIONS,
  blogMediaSchema,
  blogSchema,
  figures,
  internalLinkSlugs,
  stripTrailingEmptyParagraphs,
  validateBlogBody,
  type BlogDoc,
} from '@/lib/blogBody';
import {
  BLOG_BLOCK_COMMANDS,
  BLOG_BLOCK_DIALOGS,
  BLOG_BLOCK_ITEMS,
  figureBlock,
  filterBlogBlocks,
  instagramBlock,
  youtubeBlock,
  type BlogBlockItem,
} from '@/lib/blogEditorBlocks';
import { BLOG_EDITOR_EXTENSIONS, overrideByName } from '@/lib/blogEditorExtensions';
import { BLOG_NODE_ATTR_CODECS } from '@/lib/blogNodeHtml';
import { articleImageSet, buildPostJsonLd } from '@/lib/blogJsonLd';
import { CRON_JOBS } from '@/lib/monitoringFields';
import type { BlogHero, PublishedPost } from '@/lib/blogStore';
import {
  BLOG_POST_STATUSES,
  BLOG_POST_STATUS_LABELS,
  BLOG_PREVIEW_REVISION_PARAM,
  BLOG_REVISION_MARKER_LABELS,
  BLOG_REVISION_REASONS,
  BLOG_REVISION_REASON_LABELS,
  ROBOTS_EXTRA_KEYS,
  ROBOTS_EXTRA_KINDS,
  ROBOTS_PREVIEW_VALUES,
  BLOG_REVISION_LIST_CAP,
  blogPreviewHref,
  blogRevisionsHref,
  buildSnapshot,
  canRestoreRevision,
  foldRevisionList,
  contentChanged,
  contentFingerprint,
  authorPublicFingerprint,
  blogUsageCount,
  blogUsageRefusal,
  blogUsageSentence,
  categoryPublicFingerprint,
  isPlaceholderSlug,
  newDraftSlug,
  publicFingerprint,
  publicUrlFor,
  restoreTarget,
  revisionMarker,
  slugLocked,
  transitionProblem,
  type BlogPostStatus,
  type BlogSnapshotView,
  type BlogWorkingView,
} from '@/lib/blogFields';
import {
  blogListQs,
  blogStatusFilter,
  isBlogListStatus,
  parseBlogListParams,
  type BlogListParams,
  type BlogListStatus,
} from '@/lib/blogFilters';
import {
  BLOG_BULK_ACTIONS,
  BLOG_LIST_TABS,
  BLOG_STATUS_DATE_LABELS,
  blogRowActions,
  blogStatusDate,
  blogTabCount,
  blogTabLabel,
  bulkOutcome,
} from '@/lib/blogListFields';
import { postGrid, tabItem, tabStrip } from '@/components/Admin/blogs/listBox';
import {
  editorSkeletonLine,
  editorSkeletonToolbar,
} from '@/components/Admin/blogs/editor/editorBox';
import {
  BLOG_SAVE_STATE_LABELS,
  blogEditorActions,
  buildPostFields,
  clampDayMinutes,
  compactPostLists,
  dayLengthMinutes,
  describeWordCountChange,
  inspectorPaneFor,
  PRIMARY_ACTION_GATE,
  minutesToTimeValue,
  nextSlug,
  nextSlugFollow,
  primaryAction,
  scheduleInstant,
  slugFollowArms,
  snippetClamp,
  studioDayFor,
  timeValueToMinutes,
  wordCountLine,
  type BlogEditorValues,
  type SlugFollow,
  type SlugFollowEvent,
} from '@/lib/blogEditorFields';
import {
  blogAuthorFieldsSchema,
  blogCategoryFieldsSchema,
  blogDraftSchema,
  blogPostFieldsSchema,
  blogPublishSchema,
  blogRobotsExtraSchema,
  blogSlugSchema,
  flattenBlogIssues,
} from '@/lib/blogPostSchema';
import { STUDIO_TZ, dayKeyIn, dayNoonIn, dayStartIn, dayTimeIn } from '@/lib/calendar';
import { isFkViolation, isUniqueViolation, pgCode } from '@/lib/pgError';
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
/** Whether a synchronous call refused. Used where the refusal IS the
 *  behaviour: an override nobody applied looks exactly like a feature nobody
 *  wrote, so `overrideByName` throws rather than shrugging. */
const refuses = (fn: () => unknown): boolean => {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
};

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
const TAXONOMY_SRC = readRepoFile('../src/app/(admin)/admin/(protected)/_actions/blogTaxonomy.ts');
const INVALIDATE_SRC = readRepoFile('../src/lib/blogInvalidate.ts');
// Read for the em-dash sweep alone: `blogUsageRefusal` puts a member-visible
// sentence in this leaf, and the leaf is otherwise exercised by calling it.
const FIELDS_SRC = readRepoFile('../src/lib/blogFields.ts');

// Fail loudly rather than passing vacuously: an empty read would make every
// "does not contain" assertion below trivially true.
ok('read src/db/blogStatements.ts (drift guard)', STATEMENTS_SRC.length > 2000);
ok('read the blog post actions (drift guard)', ACTIONS_SRC.length > 2000);
ok('read the blog taxonomy actions (drift guard)', TAXONOMY_SRC.length > 2000);
ok('read src/lib/blogInvalidate.ts (drift guard)', INVALIDATE_SRC.length > 2000);
ok('read src/lib/blogFields.ts (drift guard)', FIELDS_SRC.length > 2000);

const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

const occurrences = (hay: string, needle: string) => hay.split(needle).length - 1;

/**
 * How many times a WHOLE word appears, which is the only honest way to count a
 * name or a label in source or copy.
 *
 * It exists because this file has now written the same bug twice, in the same
 * round, twenty lines apart: `includes('revisionChip')` was satisfied by
 * `revisionChipCell`, and `includes('published')` by `unpublished`. Both left a
 * real mutation green. Any assertion asking "is this name used" or "does this
 * sentence say this word" goes through here rather than through `includes`,
 * which answers a question nobody meant to ask.
 *
 * The needle is escaped, so a label carrying a `.` or a `(` cannot silently
 * become a wildcard.
 */
const wordHits = (hay: string, word: string): number =>
  [...hay.matchAll(new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'))].length;

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
  // `blogUsageRefusal` is the one member-visible sentence composed in the
  // leaf rather than at a call site, so the sweep has to reach it too.
  ['blogFields.ts', stripComments(FIELDS_SRC)],
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

// ── The cron's one statement ────────────────────────────────────────────────
//
// The `blog-publish` cron is a route handler, which no check script can import
// (it needs the CRON_SECRET request), so the statement lives here for the same
// reason every other one does. Its --db half proves it end to end; these pin
// the shape, because three of its clauses are load-bearing in ways a passing
// run would not reveal.
// Sliced with `functionRegion`, not to end of file: `publishDuePostRows` is
// the LAST statement in its module, and a region running to EOF would let a
// statement appended below answer these positive regexes on its behalf while
// this one quietly lost a clause. That is `restoreRevision`'s trap, one file
// over. (It also has to sit below functionRegion's own declaration, which is
// why this block is here rather than beside the other statement regions.)
const PUBLISH_DUE = functionRegion(STATEMENTS_SRC, 'export async function publishDuePostRows(', 'publishDuePostRows');
ok(
  'publishDuePostRows fires only on a due schedule that has something to publish',
  /eq\(blogPosts\.status, 'scheduled'\)/.test(PUBLISH_DUE) &&
    /lte\(blogPosts\.publishAt, at\)/.test(PUBLISH_DUE) &&
    /isNotNull\(blogPosts\.pendingRevisionId\)/.test(PUBLISH_DUE),
);
// Vercel documents duplicate cron invocations, so idempotence is the ordinary
// case. It comes from the status predicate alone: there is no version to guard
// a set of rows with, exactly as for the two bulk doors.
ok('publishDuePostRows takes no version', !/version: number/.test(PUBLISH_DUE));
// COALESCED, never assigned bare. A post being re-scheduled already carries the
// date it first went out, and `published_at = publish_at` would silently
// re-date it — on the page, in JSON-LD and in publicOrder at once.
ok(
  'publishDuePostRows coalesces published_at rather than overwriting it',
  /coalesce\(\$\{blogPosts\.publishedAt\}, \$\{blogPosts\.publishAt\}\)/.test(PUBLISH_DUE),
);
// All four publication columns in ONE .set(), or migration 0045's CHECKs
// refuse the half-built row: there are no transactions here.
ok(
  'and moves the pointer and clears both halves of the schedule in one statement',
  /publishedRevisionId: sql`\$\{blogPosts\.pendingRevisionId\}`/.test(PUBLISH_DUE) &&
    /pendingRevisionId: null/.test(PUBLISH_DUE) &&
    /publishAt: null/.test(PUBLISH_DUE),
);
// The intended instant already lives on the revision (its typed `published_at`
// and its snapshot), written when the schedule was set, because the public
// date is read off the REVISION. The cron has nothing to write there.
ok('publishDuePostRows touches no revision row', !PUBLISH_DUE.includes('blogPostRevisions'));
// The RETURNING carries the revision the UPDATE just PROMOTED — Postgres
// returns the NEW row, so `pending_revision_id` comes back null while
// `published_revision_id` holds it. The cron needs it because the ref it
// announces carries a fingerprint over the snapshot a visitor now renders, and
// a placeholder there would work today (nothing compares a fingerprint while
// the previous side is hidden) and rot the first time a scheduled update to an
// already-live post ships.
eq(
  'publishDuePostRows returns the revision it promoted, and the id and slug the cron reads by',
  [
    /publishedRevisionId: blogPosts\.publishedRevisionId/.test(PUBLISH_DUE),
    /id: blogPosts\.id/.test(PUBLISH_DUE),
    /slug: blogPosts\.slug/.test(PUBLISH_DUE),
  ],
  [true, true, true],
);

// ── The cron that runs it ───────────────────────────────────────────────────
//
// A route handler cannot be imported here (it needs a CRON_SECRET request), so
// what is left is its source. Every rule below is silent when broken, and the
// first one is silent in the worst possible way: it fails on every WORKING run
// and passes on every empty one, which looks healthy for weeks.

const CRON_ROUTE_SRC = readRepoFile('../src/app/api/cron/blog-publish/route.ts');
ok('read the blog-publish route (drift guard)', CRON_ROUTE_SRC.length > 1000);
const CRON_ROUTE_CODE = stripComments(CRON_ROUTE_SRC);

// THE trap, and it is swept over the WHOLE cron directory rather than this one
// file, because the next person to reach for `updateTag` will be writing a
// different cron and will be copying an editor door that legitimately uses it.
// `updateTag` throws outside a server action — Next's own revalidate.js
// refuses it when `workStore.page` ends in `/route`, error E872 — so a cron
// that called it would publish every due row and THEN throw: runCron stamps
// the job failed and returns a 500, the ping and the activity row never run,
// and the site keeps serving the pre-publish snapshot for a whole TTL while
// /admin/monitoring reddens every fifteen minutes.
{
  const dir = new URL('../src/app/api/cron/', import.meta.url);
  const routes = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map(
      (entry) =>
        [entry.name, stripComments(readFileSync(new URL(`${entry.name}/route.ts`, dir), 'utf8'))] as const,
    );
  // Vacuity guard: an empty or short read would make the sweep below trivially
  // true, which is the one way a privacy- or availability-shaped sweep fails.
  eq('every cron route was read (drift guard)', [routes.length >= CRON_JOBS.length, routes.every(([, code]) => code.length > 500)], [true, true]);
  // "calls", not "names": the sweep reads COMMENT-STRIPPED source, which is
  // what lets the blog route's own header name the trap seven times while the
  // rule still bites on a single line of code.
  eq(
    'no cron route calls updateTag, which throws in a route handler',
    routes.filter(([, code]) => wordHits(code, 'updateTag') > 0).map(([name]) => name),
    [],
  );
  // The mirror of it: the one door a route handler MAY use is named where it
  // has to be. Without this, deleting the invalidation entirely would satisfy
  // the sweep above and publish posts the site never shows.
  //
  // `wordHits` and not `includes`, and this pair is why: the FORBIDDEN name is
  // a PREFIX of the REQUIRED one. `!code.includes('invalidateBlog')` is
  // unsatisfiable here — the correct file fails it — so whoever wrote it that
  // way would delete the refusal rather than fix it, and the cron would be
  // free to call the door that throws. A whole-word count is the only form in
  // which this refusal can be stated at all.
  eq(
    'and the blog cron invalidates through the route-handler door',
    [occurrences(CRON_ROUTE_CODE, 'invalidateBlogFromCron('), wordHits(CRON_ROUTE_CODE, 'invalidateBlog')],
    [1, 0],
  );
}

// scripts/check-monitoring.mts proves CRON_JOBS and vercel.json agree, both
// ways. What neither of them can see is the route FILE: a handler calling
// runCron under a name that is not its own stamps a DIFFERENT job's
// monitoring_checks row, so the registry would report this job as never having
// run while the other never looked late — two wrong answers from one typo.
{
  const job = CRON_JOBS.find((j) => j.name === 'blog-publish');
  eq(
    'blog-publish is a registered job and its route stamps its own name',
    [job?.path, job?.schedule, CRON_ROUTE_CODE.includes(`runCron('${job?.name ?? ''}', request`)],
    ['/api/cron/blog-publish', '*/15 * * * *', true],
  );
  ok("and it is rendered per request, never prerendered", CRON_ROUTE_CODE.includes("export const dynamic = 'force-dynamic'"));
}

// A zero-work day writes NO activity row. Three of the other four crons do the
// same, which is exactly why activity_log can never answer "did it run?" and
// the checks row runCron stamps is what does.
{
  // Sliced from inside the HANDLER, not from the top of the file: the imports
  // name every one of these, so a file-start slice would count them and fail
  // for the wrong reason — or, with the counts inverted, pass for one.
  const from = CRON_ROUTE_CODE.indexOf("runCron('blog-publish'");
  const cut = CRON_ROUTE_CODE.indexOf('const ids =');
  ok('the early return sits between the handler and the reads (drift guard)', from > 0 && cut > from);
  const early = CRON_ROUTE_CODE.slice(from, cut);
  eq(
    'nothing due RETURNS, writing no activity row and reading nothing further',
    [
      // The guard must EXIT, and the `return` is the whole assertion rather
      // than a detail of it. Delete just that keyword's statement and every
      // other clause here still holds — the condition is still written, the
      // three names are still absent — while execution falls through on an
      // empty run and files "Published 0 scheduled posts" every fifteen
      // minutes: 96 rows a day, ~35,000 inside the 365-day retention window,
      // into the feed this rule exists to keep clean.
      /published\.length === 0\)\s*\{\s*return\b/.test(early),
      wordHits(early, 'logSystemActivity'),
      wordHits(early, 'postIdentitiesFor'),
      wordHits(early, 'publishedRevisionsFor'),
    ],
    [true, 0, 0, 0],
  );
}

// ONE row per RUN, not per post, and counts only. /admin/logs is a wider
// audience than the blogs area, so a summary naming a title or a slug would
// publish the editorial calendar to it — the rule every cron row follows.
{
  const row = stripComments(region(CRON_ROUTE_SRC, 'logSystemActivity(', '});', 'the cron activity row'));
  const loop = stripComments(
    region(CRON_ROUTE_SRC, 'for (const row of published) {', '\n      }\n', 'the cron invalidation loop'),
  );
  ok('the loop slice really is the loop (drift guard)', loop.includes('invalidateBlogFromCron('));
  eq(
    'one activity row per run, carrying counts and neither a title nor a slug',
    [
      occurrences(CRON_ROUTE_CODE, 'logSystemActivity('),
      // ONE CALL SITE IS NOT ONE ROW. Counting sites catches a second call and
      // misses the realistic refactor: move the existing call inside the
      // per-post loop and the count stays at 1 while the job files one audit
      // row per POST. The loop has to be shown not to contain it.
      wordHits(loop, 'logSystemActivity'),
      /payload: \{ count: published\.length \}/.test(row),
      wordHits(row, 'title'),
      wordHits(row, 'slug'),
      wordHits(row, 'identity'),
    ],
    [1, 0, true, 0, 0, 0],
  );
}

// ── The degradation floor ───────────────────────────────────────────────────
//
// The publish is one atomic UPDATE with no transaction round it, so by the time
// the reads below it run, the rows are LIVE. An unguarded throw there — a cold
// start on a scale-to-zero database, at the same minute as the probe that wakes
// it — would reject the handler with nothing invalidated and no activity row,
// and the retry fifteen minutes later would match nothing and report zero. The
// posts would stay invisible for the store's whole 24-hour TTL while the alert
// said "the cron threw". So the read-and-announce block degrades instead.
eq(
  'a failed read still invalidates coarsely, records the run and says so',
  [
    // The try must OPEN before the reads and the catch must reach the floor.
    /const warnings: string\[\] = \[\];\s*try \{\s*const ids =/.test(CRON_ROUTE_CODE),
    /catch \(error\) \{[\s\S]*?invalidateBlogCoarseFromCron\(\);\s*\}/.test(CRON_ROUTE_CODE),
    // Through `reportCronStep`, which is the designed channel: one stdout line,
    // one cron-source monitoring signal and the string for `warnings`, rather
    // than a silent swallow.
    wordHits(CRON_ROUTE_CODE, 'reportCronStep'),
    // And the activity row is OUTSIDE the try, because "N posts published" is
    // true whether or not the announcement worked.
    CRON_ROUTE_CODE.indexOf('logSystemActivity(') > CRON_ROUTE_CODE.indexOf('invalidateBlogCoarseFromCron();'),
  ],
  [true, true, 2, true],
);

// The previous ref is `hiddenRef` and NOT nothing: a scheduled post is not
// public, so the ping fires because the URL APPEARED. The current ref is built
// from the snapshot the UPDATE promoted rather than from a placeholder, and
// the read-back is checked against the RETURNING so a post republished
// underneath the cron is reported rather than passed off as this run's work.
eq(
  'the cron announces a real published ref against a hidden one',
  [
    /invalidateBlogFromCron\(publishedRef\(identity\.slug, revision\.snapshot\), hiddenRef\(identity\)\)/.test(
      CRON_ROUTE_CODE,
    ),
    CRON_ROUTE_CODE.includes('revision.id !== row.publishedRevisionId'),
    wordHits(CRON_ROUTE_CODE, 'publicFingerprint'),
  ],
  [true, true, 0],
);

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
    region(
      INVALIDATE_SRC,
      'export function invalidateBlog(',
      'export function invalidateBlogTaxonomy(',
      'invalidateBlog',
    ),
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

// ═══════════════════════════════════════════════════════════════════════════
// 11. The taxonomy doors: authors and categories
// ═══════════════════════════════════════════════════════════════════════════
//
// An author and a category are rows the whole blog renders THROUGH, which is
// what makes every mistake available here invisible on the screen that made
// it. Four decisions carry the weight:
//
//  - A SLUG IS IMMUTABLE. `/blogs/authors/<slug>` is a live URL and
//    `?category=<slug>` is the hub's filter value with 13 legacy redirects
//    pointing at it. Silently keeping the old slug is worse than refusing,
//    because the member goes away believing the rename worked.
//  - A DELETE COUNTS REVISIONS TOO. Both `blog_posts` and
//    `blog_post_revisions` carry the foreign key with ON DELETE RESTRICT, so
//    an author reassigned away from every live post still owns the earlier
//    versions of those posts. Count only the working rows and the DELETE
//    reaches Postgres, where it surfaces as a raw 23503 instead of a sentence.
//  - `user_id` LINKS A PUBLIC BYLINE TO A DASHBOARD ACCOUNT, which is a
//    privilege change rather than a copy edit. The blogs grant is not enough.
//  - THE PING IS FINGERPRINT-GATED. A reorder changes no indexable text on any
//    single URL, and a category's SEO pair changes only `/blogs?category=`,
//    a query URL this repo never emits to a crawler. Announcing either is the
//    Bing spam signal every ping here is gated against.

// ── The two fingerprints ────────────────────────────────────────────────────

const AUTHOR_ROW = {
  name: 'Saman Hoseinpour',
  kind: 'person',
  role: 'Co-Founder and CTO',
  bio: 'Builds the studio websites.',
  imageStaticPath: '/images/blogs/authors/blogs-authors-saman-hoseinpour.avif',
  imageMedia: null as unknown,
  ogImageStaticPath: null as string | null,
  sameAs: ['https://www.linkedin.com/in/saman'],
  knowsAbout: ['Next.js'],
  tags: ['engineering'],
  location: { locality: 'Vancouver', region: 'British Columbia', country: 'Canada' } as unknown,
  sortIndex: 3,
};
const author = (patch: Partial<typeof AUTHOR_ROW>) =>
  authorPublicFingerprint({ ...AUTHOR_ROW, ...patch });

// Every field a visitor reads moves it. Swept rather than written as one
// assertion, so dropping any single field from the fingerprint fails on the
// name of the field that was dropped.
const AUTHOR_MOVES: [string, Partial<typeof AUTHOR_ROW>][] = [
  ['name', { name: 'S. Hoseinpour' }],
  ['kind', { kind: 'organization' }],
  ['role', { role: 'CTO' }],
  ['bio', { bio: 'A different sentence entirely.' }],
  ['imageStaticPath', { imageStaticPath: '/images/blogs/authors/blogs-authors-other.avif' }],
  ['imageMedia', { imageMedia: { variants: { full: { url: 'x' } } } }],
  ['ogImageStaticPath', { ogImageStaticPath: '/images/shared/og.avif' }],
  ['sameAs', { sameAs: [] }],
  ['knowsAbout', { knowsAbout: ['Technical SEO'] }],
  ['tags', { tags: [] }],
  ['location', { location: null }],
];
for (const [field, patch] of AUTHOR_MOVES) {
  ok(`an author's ${field} moves the public fingerprint`, author(patch) !== author({}));
}
// The rule the brief states, and the only one an editor can trip by accident:
// reordering `/blogs/authors` changes no URL's indexable text, so it must
// announce nothing. `sortIndex` is a PARAMETER the leaf deliberately ignores,
// so adding it to the fingerprint fails here rather than passing silently.
ok('but a reorder does not', author({ sortIndex: 99 }) === author({}));
// `location` and `imageMedia` are jsonb columns compared for equality across a
// Postgres round trip, which promises nothing about key order. An unsorted
// stringify would report a rename that never happened.
ok(
  'and the fingerprint is invariant to jsonb key order',
  author({ location: { country: 'Canada', locality: 'Vancouver', region: 'British Columbia' } }) ===
    author({}),
);

const CATEGORY_ROW = {
  title: 'Production',
  seoTitle: 'Video production in Vancouver' as string | null,
  seoDescription: 'What a shoot actually involves.' as string | null,
  sortIndex: 2,
};
const category = (patch: Partial<typeof CATEGORY_ROW>) =>
  categoryPublicFingerprint({ ...CATEGORY_ROW, ...patch });

ok("a category's title moves the public fingerprint", category({ title: 'Film' }) !== category({}));
// The three exclusions, each a parameter the leaf accepts and does not read.
// The SEO pair moves only the <title> and description of `/blogs?category=`,
// and src/lib/sitemap.ts refuses to emit any URL carrying `?`, so there is no
// URL to announce; putting them in would ping `/blogs`, which renders neither.
ok('but filling in its seoTitle does not', category({ seoTitle: 'Filled in at last' }) === category({}));
ok('nor its seoDescription', category({ seoDescription: 'Filled in at last' }) === category({}));
ok('nor a reorder', category({ sortIndex: 40 }) === category({}));

// ── The delete refusal ──────────────────────────────────────────────────────

eq('nothing points at it, so it can go', blogUsageRefusal('author', { posts: 0, revisions: 0 }), null);

// The case the whole two-number shape exists for: an author reassigned away
// from every live post still owns the earlier versions of those posts, and
// counting only `blog_posts` would let the DELETE reach Postgres.
{
  const onlyHistory = blogUsageRefusal('author', { posts: 0, revisions: 12 }) ?? '';
  ok('an author with no posts but 12 saved versions is still refused', onlyHistory !== '');
  ok('and the refusal calls them saved versions', onlyHistory.includes('12 saved versions'));
  ok('never posts, which is what a sum would have said', !onlyHistory.includes('12 posts'));
}
{
  const both = blogUsageRefusal('category', { posts: 3, revisions: 12 }) ?? '';
  eq(
    'both halves are named separately',
    [both.includes('3 posts'), both.includes('12 saved versions')],
    [true, true],
  );
  ok('and never added into one wrong number', !both.includes('15'));
  ok('the noun is the row that was clicked', both.includes('This category is still on'));
}
ok(
  'one of each reads as a sentence',
  (blogUsageRefusal('author', { posts: 1, revisions: 1 }) ?? '').includes(
    'This author is still on 1 post and 1 saved version.',
  ),
);

// ── The same two numbers, BEFORE anybody clicks Delete ──────────────────────
// `blogUsageRefusal` is what the door says once a delete cannot go through;
// `blogUsageSentence` is what the dialog says while somebody is still deciding,
// on the row, on the disabled button's tooltip and in the confirm. It has the
// same one rule: NEVER add the two numbers. An author on one post with twelve
// earlier versions of it is not on thirteen posts, and a screen that said so
// would send somebody hunting for ten posts that do not exist.

eq(
  'the branch the confirm actually reaches names both halves as zero',
  blogUsageSentence('author', { posts: 0, revisions: 0 }),
  'No posts and no saved versions point at this author.',
);
{
  const onlyHistory = blogUsageSentence('category', { posts: 0, revisions: 12 });
  ok('history with no posts left is named for what it is', onlyHistory.includes('12 saved versions'));
  ok('and never reported as posts', !onlyHistory.includes('12 posts'));
  ok('and never as "0 posts", which reads as safe to delete', !onlyHistory.includes('0 post'));
  ok('the noun follows the row that was clicked', onlyHistory.includes('this category'));
}
{
  const one = blogUsageSentence('author', { posts: 1, revisions: 3 });
  ok('one post owns ITS history', one.includes('1 post and its history'));
  // A singular subject takes a singular verb. Pinned because the sentence is
  // composed from three ternaries and the verb is the one that has no obvious
  // home, so it is the one that gets left plural.
  ok('and reads as one subject', one.includes('and its history still points at this author.'));
  ok('and the number a member reads is the number of POSTS', !one.includes('4'));
}
{
  const many = blogUsageSentence('author', { posts: 3, revisions: 12 });
  ok('several posts own THEIR history', many.includes('3 posts and their history'));
  ok('and they still point, plural', many.includes('history still point at this author.'));
  ok('and the two are still never added', !many.includes('15'));
}
// THE BRANCH ABOVE NEEDS ITS OWN CATEGORY FIXTURE. Both cases above pass
// 'author', and the two noun assertions read the OTHER two branches, so
// hardcoding `${what}` to 'author' HERE stayed green across every other
// assertion in this file while a category's row would have read "3 posts and
// their history still point at this author." A green mutation is a missing
// fixture, not a mutation to repoint.
ok(
  'and the posts branch names a category as a category',
  blogUsageSentence('category', { posts: 2, revisions: 5 }).includes(
    '2 posts and their history still point at this category.',
  ),
);

// ── The same two numbers as a row's own readout ─────────────────────────────
// `title` on a DISABLED button is not a carrier: a disabled element fires no
// mouse events in any browser, and no touch device could reach a tooltip
// anyway. So both rosters print the numbers, through this rather than through
// their own pluralisation, which is how the authors roster came to show "0
// posts" beside a greyed-out Delete on an author whose twelve saved versions
// were the whole reason.

eq('nothing pointing here reads as nothing', blogUsageCount({ posts: 0, revisions: 0 }), 'nothing points here');
eq(
  'the zero that matters is the one with history behind it',
  blogUsageCount({ posts: 0, revisions: 12 }),
  '0 posts, 12 saved versions',
);
eq('one of each is singular twice', blogUsageCount({ posts: 1, revisions: 1 }), '1 post, 1 saved version');
{
  const many = blogUsageCount({ posts: 3, revisions: 12 });
  eq('and the usual case names both', many, '3 posts, 12 saved versions');
  ok('never added, here either', !many.includes('15'));
}

// ── What the fields schema will not carry ───────────────────────────────────

const AUTHOR_FIELDS = {
  slug: 'saman-hoseinpour',
  name: 'Saman Hoseinpour',
  kind: 'person',
  role: 'Co-Founder and CTO',
  bio: 'Builds the studio websites.',
  imageStaticPath: '/images/blogs/authors/blogs-authors-saman-hoseinpour.avif',
  ogImageStaticPath: null,
  sameAs: [],
  knowsAbout: [],
  tags: [],
  location: null,
  sortIndex: 3,
};
ok('the author fields fixture parses (fixture guard)', blogAuthorFieldsSchema.safeParse(AUTHOR_FIELDS).success);
// The structural half of the role gate. `user_id` is a privilege change, so it
// travels as its OWN argument that only an owner or a superadmin may send; a
// `.strict()` object that never names the column is what stops a member's form
// smuggling one through the validated fields into a `.set()`.
ok(
  'but a userId inside them is refused, so a byline link can never ride the form',
  !blogAuthorFieldsSchema.safeParse({ ...AUTHOR_FIELDS, userId: 'abc' }).success,
);
// Why `withSortIndex` exists: the schema requires an order because the
// importer always knows the one it is reproducing. A dialog does not, so the
// door fills it in before the parse or every create fails validation.
ok(
  'and an author with no sortIndex is refused, which is what the door defaults',
  !blogAuthorFieldsSchema.safeParse({ ...AUTHOR_FIELDS, sortIndex: undefined }).success,
);

const CATEGORY_FIELDS = {
  slug: 'branding',
  title: 'Branding',
  seoTitle: null,
  seoDescription: null,
  sortIndex: 4,
};
// The `branding` row really does carry both as null. Requiring them here would
// make it uneditable, which is the opposite of what this door is for: task 9's
// publish gate refuses a post into a category missing them, so this is where
// they get FILLED.
ok('a category with a null SEO pair still parses', blogCategoryFieldsSchema.safeParse(CATEGORY_FIELDS).success);

// ── The doors themselves ────────────────────────────────────────────────────

const TAXONOMY_CODE = stripComments(TAXONOMY_SRC);

/** Every top-level function in a file, async or not, sliced from the file
 *  ITSELF. Both kinds, unlike §8's sweep: `authorColumns` sits between two
 *  doors here, and a slice that swallowed it would answer for the door above. */
function taxonomySlices(source: string) {
  const re = /\n(export )?(async )?function (\w+)[(<]/g;
  const heads = [...source.matchAll(re)].map((m) => ({
    at: m.index,
    exported: m[1] !== undefined,
    name: m[3],
  }));
  return heads.map((head, i) => ({
    name: head.name,
    exported: head.exported,
    code: stripComments(source.slice(head.at, heads[i + 1]?.at ?? source.length)),
  }));
}
const TAX_SLICES = taxonomySlices(TAXONOMY_SRC);
const taxNamed = (name: string) => TAX_SLICES.find((fn) => fn.name === name)?.code ?? '';

const TAXONOMY_DOORS = [
  'createAuthor',
  'updateAuthor',
  'deleteAuthor',
  'createCategory',
  'updateCategory',
  'deleteCategory',
] as const;
eq(
  'the six doors this task promised are exported',
  TAX_SLICES.filter((fn) => fn.exported).map((fn) => fn.name).sort(),
  [...TAXONOMY_DOORS].sort(),
);
for (const name of TAXONOMY_DOORS) {
  ok(`the sweep found ${name} (fixture guard)`, taxNamed(name).length > 200);
}

// A CONSISTENCY assertion, not a safety one: `.returning()` on a statement that
// did not throw always yields a row, so none of these four guards can fire.
// They are here so the four doors that read a row back all read it the same
// way, and this pins that rather than claiming the guard protects anything.
eq('all four doors that read a row back guard it the same way', occurrences(TAXONOMY_CODE, 'if (!row) return'), 4);

// The house rules §8 pins for the post doors, over the new file.
eq(
  'every taxonomy action gates on the blogs area',
  occurrences(TAXONOMY_CODE, "requireArea('blogs', '/admin')"),
  occurrences(TAXONOMY_CODE, 'export async function'),
);
for (const fn of TAX_SLICES) {
  if (!fn.exported) continue;
  const iGate = fn.code.indexOf("requireArea('blogs', '/admin')");
  const iTry = fn.code.indexOf('try {');
  ok(`${fn.name} gates FIRST and OUTSIDE its try`, iGate >= 0 && iTry > iGate);
}
ok(
  'no non-async value export from the taxonomy actions',
  !/export\s+(const|let|var|class|function)\s/.test(TAXONOMY_CODE),
);
{
  const blocks = TAXONOMY_CODE.split('} catch (error) {').slice(1);
  ok('found the taxonomy catch blocks to scan (fixture guard)', blocks.length >= 6);
  eq(
    'every caught taxonomy failure is reported under its own [blogs] key',
    blocks.filter((block) => block.slice(0, 200).includes("reportError('[blogs] ")).length,
    blocks.length,
  );
}
ok('found taxonomy string literals to scan (fixture guard)', literals(TAXONOMY_CODE).length > 20);
eq(
  'no em dash in any _actions/blogTaxonomy.ts string literal',
  literals(TAXONOMY_CODE).filter((s) => s.includes('—')),
  [],
);

// ── The slug is refused, not ignored ────────────────────────────────────────

for (const [door, refusal] of [
  ['updateAuthor', 'SLUG_LOCKED_AUTHOR'],
  ['updateCategory', 'SLUG_LOCKED_CATEGORY'],
] as const) {
  const code = taxNamed(door);
  const iCheck = code.indexOf('data.slug !== existing.slug');
  const iWrite = code.search(/db\s*\.update\(/);
  ok(`${door} compares the sent slug against the stored one`, iCheck > 0);
  ok(`${door} returns a refusal rather than dropping it`, code.includes(`refuse({ slug: ${refusal} })`));
  // `iCheck > 0` is load-bearing: without it, DELETING the check outright
  // would leave `iWrite > -1` true and this would pass on the very bug it is
  // here for.
  ok(`${door} refuses BEFORE it writes anything`, iCheck > 0 && iWrite > iCheck);
}
// Silently keeping the old slug is the failure this guards, so each refusal
// has to be a sentence that says WHICH url it is protecting.
eq(
  'and each refusal names the URL it protects',
  [
    TAXONOMY_CODE.includes('An author slug cannot change after creation, because it is the /blogs/authors'),
    TAXONOMY_CODE.includes('A category slug cannot change after creation, because it is the filter value on /blogs'),
  ],
  [true, true],
);
// The other half of "immutable": the ONLY statements that may name the column
// are the two inserts, so an update door or a column builder that grew a
// `slug:` would make three.
eq('nothing but the two creates ever writes a slug', occurrences(TAXONOMY_CODE, 'slug: data.slug'), 2);
// `userId` likewise: it travels as its own role-gated argument, never inside
// the validated fields, so `authorColumns` naming it would route around
// `bylineColumn` entirely.
ok('nor a byline link', !taxNamed('authorColumns').includes('userId'));
{
  const gate = taxNamed('bylineColumn');
  ok('the byline link is gated on the role, not on the blogs area', gate.includes('profile.superadmin'));
  // A compile-time type is not a refusal for a value that arrives from a
  // browser, so the runtime shape check has to be there.
  ok('and its value is shape-checked at runtime', /typeof userId !== 'string'/.test(gate));
  ok('and must name an account that exists', gate.includes('bylineUserExists('));
  eq(
    'both author doors route their userId through it',
    [taxNamed('createAuthor').includes('bylineColumn(profile, userId)'), taxNamed('updateAuthor').includes('bylineColumn(profile, userId)')],
    [true, true],
  );
}

// ── The delete doors count the history ──────────────────────────────────────

for (const [door, counter, noun] of [
  ['deleteAuthor', 'countPostsForAuthor(', "'author'"],
  ['deleteCategory', 'countPostsForCategory(', "'category'"],
] as const) {
  const code = taxNamed(door);
  ok(`${door} refuses through the shared composer`, code.includes(`blogUsageRefusal(${noun}, await ${counter}`));
  const iRefuse = code.indexOf('blogUsageRefusal(');
  const iDelete = code.indexOf('db.delete(');
  ok(`${door} counts BEFORE it deletes`, iRefuse > 0 && iDelete > iRefuse);
  // The FK is the race backstop, not the everyday guard: something can claim
  // the row between the count and the statement.
  ok(`${door} still catches the 23503 the count cannot rule out`, code.includes('isFkViolation(dbError)'));
}

// ── The author blob sweep ───────────────────────────────────────────────────
//
// `uploadBlogMedia` writes an author photo under `blogs/authors/<authorId>/`,
// and `purgePost`'s sweep only ever visits `blogs/<postId>/`. So nothing else
// in the app will ever collect an author's photo, and without this sweep every
// deleted author leaves its ladder in the public store for good.

{
  const sweptPrefix = (code: string) =>
    (/listPublic\(\{ prefix: `([^`]*)` \}\)/.exec(code)?.[1] ?? '').replace('${id}', OWNER_A);
  const authorSweep = sweptPrefix(taxNamed('deleteAuthor'));
  const postSweep = sweptPrefix(PURGE_DOOR);
  const photo = blogMediaBase({ kind: 'author', id: OWNER_A }, 'photo') ?? '';
  ok('found both sweep prefixes and the photo path (fixture guard)', authorSweep !== '' && postSweep !== '' && photo !== '');
  // Read out of the door's own source and compared against where the UPLOADER
  // really writes, so narrowing either one fails here.
  ok('deleteAuthor sweeps exactly where an author photo is written', photo.startsWith(authorSweep));
  ok('which purgePost never reaches, so this is the only sweep that can', !photo.startsWith(postSweep));
  const sweep = taxNamed('deleteAuthor');
  const iAfter = sweep.indexOf('after(');
  const iDelete = sweep.indexOf('db.delete(');
  ok('and it runs post-response, after the row is already gone', iDelete > 0 && iAfter > iDelete);
  ok('inside a try, so a stray blob can never fail the delete', /after\(async \(\) => \{\s*try \{/.test(sweep));
}

// ── Invalidation, and what each door announces ──────────────────────────────

for (const door of TAXONOMY_DOORS) {
  eq(`${door} invalidates exactly once`, occurrences(taxNamed(door), 'invalidateBlogTaxonomy('), 1);
}
// One door for the whole contract: nothing here reaches for a tag, a path or
// IndexNow on its own, which is what stops a second copy drifting from the
// first (the reason invalidateBlog was lifted out of _actions/blogPosts.ts).
eq(
  'and nothing in the file invalidates or announces by hand',
  [
    TAXONOMY_CODE.includes('updateTag('),
    TAXONOMY_CODE.includes('revalidatePath('),
    TAXONOMY_CODE.includes('pingIndexNow('),
  ],
  [false, false, false],
);
// A new category renders nowhere (`categoryStats` in blogStore.ts is built
// from published posts) and a deleted one had none, so both announce nothing.
// A new author DOES appear: fetchAuthors reads the whole table, so the index
// and the authors sitemap both gain a row.
eq(
  'a created or deleted category announces nothing',
  [
    taxNamed('createCategory').includes('invalidateBlogTaxonomy();'),
    taxNamed('deleteCategory').includes('invalidateBlogTaxonomy();'),
  ],
  [true, true],
);
// What `authorUrls` RETURNS, not merely that the doors call it. Asserting the
// call site while the behaviour lives in the helper is the shape this suite has
// been bitten by before: `=> []` would leave both author doors announcing
// nothing at all with every call-site assertion still green.
{
  const body = /const authorUrls = \(slug: string\) =>\s*(\[[^\]]*\]);/.exec(TAXONOMY_CODE)?.[1] ?? '';
  ok('found the authorUrls body (fixture guard)', body.startsWith('[') && body.endsWith(']'));
  eq(
    'authorUrls announces the index and the profile, and nothing else',
    literals(body.replace('${slug}', 'saman-hoseinpour')).map((lit) => lit.slice(1, -1)),
    ['/blogs/authors', '/blogs/authors/saman-hoseinpour'],
  );
}
eq(
  'while an author create and delete announce the index and the profile',
  [
    taxNamed('createAuthor').includes('invalidateBlogTaxonomy(authorUrls('),
    taxNamed('deleteAuthor').includes('invalidateBlogTaxonomy(authorUrls('),
  ],
  [true, true],
);
// The hub only carries a byline or a chip for a post a VISITOR can see, so
// both rename doors gate `/blogs` on a published count rather than announcing
// it for a row nothing public sits under.
eq(
  'and a rename only announces /blogs when something published sits under it',
  [
    /publishedPostsForAuthor\(id\)\) > 0\) urls\.push\('\/blogs'\)/.test(taxNamed('updateAuthor')),
    /publishedPostsForCategory\(id\)\) > 0/.test(taxNamed('updateCategory')),
  ],
  [true, true],
);
// The CONJUNCTION, spelled out. The two assertions above prove each gate is
// present; neither proves they are ANDed, and `moved && ` dropped from either
// line makes a pure REORDER of a published author or category ping `/blogs`,
// which is the exact false-freshness ping the gate exists for. Nothing else
// would notice: noUnusedLocals is off and no-unused-vars is a warning.
eq(
  'and the two gates are ANDed, so a reorder never announces anything',
  [
    /if \(moved && \(await publishedPostsForAuthor\(id\)\) > 0\) urls\.push\('\/blogs'\);/.test(
      taxNamed('updateAuthor'),
    ),
    /const listed = moved && \(await publishedPostsForCategory\(id\)\) > 0;/.test(
      taxNamed('updateCategory'),
    ),
  ],
  [true, true],
);
eq(
  'each gated on its own fingerprint having moved',
  [
    taxNamed('updateAuthor').includes('authorPublicFingerprint(row) !== authorPublicFingerprint(existing)'),
    taxNamed('updateCategory').includes('categoryPublicFingerprint(row) !== categoryPublicFingerprint(existing)'),
  ],
  [true, true],
);

// ── The shared Postgres-code helper ─────────────────────────────────────────
//
// Every "count first, then delete" door in this file leans on 23503 as its race
// backstop, and every insert leans on 23505 to turn a taken slug into a
// sentence. Both were private copies per action file until this task; the codes
// are pinned HERE, against real error shapes, because a copy that drifts turns
// a refusal into a generic "try again" and nothing on screen says so.

eq('pgCode reads a code off the error itself', pgCode({ code: '23505' }), '23505');
// The one that actually matters: drizzle-orm wraps neon-http errors, so reading
// `.code` directly is always undefined.
eq(
  'and through the cause chain drizzle wraps it in',
  pgCode({ name: 'DrizzleQueryError', cause: { code: '23503' } }),
  '23503',
);
eq('however deep the chain goes', pgCode({ cause: { cause: { code: '23514' } } }), '23514');
eq('the nearest code wins', pgCode({ code: '23505', cause: { code: '23503' } }), '23505');
eq('an error with no code anywhere is undefined', pgCode(new Error('boom')), undefined);
// A numeric `code` is a different library's convention, not ours.
eq('and a non-string code is not a code', pgCode({ code: 23505 }), undefined);
eq('null and undefined do not throw', [pgCode(null), pgCode(undefined)], [undefined, undefined]);
eq(
  '23505 is the unique violation, and nothing else is',
  [isUniqueViolation({ cause: { code: '23505' } }), isUniqueViolation({ cause: { code: '23503' } })],
  [true, false],
);
eq(
  '23503 is the foreign key violation, and nothing else is',
  [isFkViolation({ cause: { code: '23503' } }), isFkViolation({ cause: { code: '23514' } })],
  [true, false],
);
// The second-copy guard, the same one `invalidateBlog` carries: three verbatim
// copies of a cause-chain walk is how one of them ends up reading `.code`.
eq(
  'and both blog action files reach for the shared helper rather than a private copy',
  [
    ACTIONS_CODE.includes("from '@/lib/pgError'"),
    /function pgCode\(/.test(ACTIONS_CODE),
    TAXONOMY_CODE.includes("from '@/lib/pgError'"),
    /function pgCode\(/.test(TAXONOMY_CODE),
  ],
  [true, false, true, false],
);

// ── The lifted invalidation module ──────────────────────────────────────────

const INVALIDATE_CODE = stripComments(INVALIDATE_SRC);
{
  const refresh = stripComments(
    region(INVALIDATE_SRC, 'function refreshPublicBlog(', '\n}\n', 'refreshPublicBlog'),
  );
  eq(
    'refreshPublicBlog names the coarse tag and all three sitemap paths',
    [
      refresh.includes('tag(BLOGS_TAG)'),
      refresh.includes("revalidatePath('/sitemap.xml')"),
      refresh.includes("revalidatePath('/sitemaps/blogs.xml')"),
      refresh.includes("revalidatePath('/sitemaps/authors.xml')"),
    ],
    [true, true, true, true],
  );
  // ONE definition, two callers. A door that spelled the tag set out again is
  // exactly how one screen goes stale while another refreshes, which is the
  // whole reason this module exists.
  eq('and it is the only place the coarse tag is refreshed', occurrences(INVALIDATE_CODE, 'tag(BLOGS_TAG)'), 1);
  eq(
    'reached by all three doors, each through its own tag function',
    [
      occurrences(INVALIDATE_CODE, 'refreshPublicBlog(tag);'),
      occurrences(INVALIDATE_CODE, 'refreshPublicBlog(actionTag);'),
      occurrences(INVALIDATE_CODE, 'refreshPublicBlog(cronTag);'),
    ],
    [1, 1, 1],
  );
}
{
  // The cron's FLOOR: refresh every public blog surface, announce nothing. It
  // is what a failed read degrades to, so the two things that would make it
  // useless are pinned — using the action tag (which throws in a route
  // handler, taking the fallback down with the thing it was catching) and
  // announcing a URL it cannot describe.
  const floor = stripComments(
    region(INVALIDATE_SRC, 'export function invalidateBlogCoarseFromCron(', '\n}\n', 'invalidateBlogCoarseFromCron'),
  );
  eq(
    'the cron floor refreshes through the cron tag and pings nothing',
    [
      floor.includes('refreshPublicBlog(cronTag);'),
      floor.includes("revalidatePath('/admin', 'layout')"),
      wordHits(floor, 'actionTag'),
      wordHits(floor, 'pingIndexNow'),
      wordHits(floor, 'blogTag'),
    ],
    [true, true, 0, 0, 0],
  );
}
{
  // THE WHOLE DIFFERENCE between the editor's invalidation and the cron's is
  // one function, and this is what holds it to one. `updateTag` throws in a
  // route handler (E872) and `revalidateTag` warns without its second
  // argument, so a third call site of either — added for one caller, reachable
  // by the other — is how the cron acquires the bug this split exists to
  // prevent. Naming each exactly once, inside its own door, says that in the
  // code rather than in a comment.
  const actionDoor = stripComments(
    region(INVALIDATE_SRC, 'export function invalidateBlog(', '\n}\n', 'invalidateBlog'),
  );
  const cronDoor = stripComments(
    region(INVALIDATE_SRC, 'export function invalidateBlogFromCron(', '\n}\n', 'invalidateBlogFromCron'),
  );
  eq(
    'updateTag and revalidateTag are each named exactly once, inside their own door',
    [
      occurrences(INVALIDATE_CODE, 'updateTag('),
      occurrences(INVALIDATE_CODE, 'revalidateTag('),
      /const actionTag: TagDoor = \(tag\) => updateTag\(tag\)/.test(INVALIDATE_CODE),
      // `{ expire: 0 }` AND NOT `'max'`, and the difference is not stylistic.
      // Traced through Next 16.2.10: a profile resolves to
      // `durations = { expire: cacheLife.expire }`, and the cache handler then
      // sets `stale = now` and `expired = now + expire * 1000`. `'max'` is the
      // built-in 365-day profile, so it writes an expiry a YEAR out:
      // `areTagsExpired` stays false and only `areTagsStale` flips, which is
      // stale-while-revalidate — the first read after the cron is served the
      // PRE-PUBLISH snapshot, on `/blogs` above all, which reads searchParams
      // and renders per request. `{ expire: 0 }` writes `expired = now`, which
      // is exactly what `updateTag` does, so the two doors really do invalidate
      // identically. Run against Next's own handler: updateTag => expired=true;
      // 'max' => expired=false, stale=true; { expire: 0 } => expired=true.
      /const cronTag: TagDoor = \(tag\) => revalidateTag\(tag, \{ expire: 0 \}\)/.test(INVALIDATE_CODE),
      // The trap spelled out, so nobody "simplifies" it back.
      occurrences(INVALIDATE_CODE, "'max'"),
    ],
    [1, 1, true, true, 0],
  );
  eq(
    'and both post doors fold through one apply, differing only in that function',
    [
      actionDoor.includes('applyBlogInvalidation(actionTag,'),
      cronDoor.includes('applyBlogInvalidation(cronTag,'),
      occurrences(INVALIDATE_CODE, 'function applyBlogInvalidation('),
    ],
    [true, true, 1],
  );
}
{
  const taxonomy = stripComments(
    region(INVALIDATE_SRC, 'export function invalidateBlogTaxonomy(', '\n}\n', 'invalidateBlogTaxonomy'),
  );
  // UNCONDITIONAL: every public blog surface reads these rows through the one
  // cached snapshot, so even a reorder, which announces nothing, changes the
  // order `/blogs/authors` draws.
  ok(
    'invalidateBlogTaxonomy refreshes before it can return',
    taxonomy.indexOf('refreshPublicBlog(actionTag);') > 0 &&
      !/\breturn\b/.test(taxonomy.slice(0, taxonomy.indexOf('refreshPublicBlog(actionTag);'))),
  );
  ok('and the admin tree with it', taxonomy.includes("revalidatePath('/admin', 'layout')"));
  // The ping is the half the caller gates, so an empty list must announce
  // nothing rather than posting an empty urlList.
  ok('but announces nothing when the caller passed no url', /if \(urls\.length > 0\)/.test(taxonomy));
  ok('and post-response when it does', /after\(\(\) => pingIndexNow\(/.test(taxonomy));
}
// The second-copy guard. `invalidateBlog` was written in _actions/blogPosts.ts
// and could not be exported from there, because a 'use server' module may
// export only async functions.
eq(
  'the post actions import the one invalidation door rather than defining a second',
  [
    ACTIONS_CODE.includes("from '@/lib/blogInvalidate'"),
    /function invalidateBlog\(/.test(ACTIONS_CODE),
  ],
  [true, false],
);
// The four REF BUILDERS followed it out of that file when the blog-publish
// route needed them, and the reason is the same one, one level down: two
// definitions of what a public reference IS, is how the cron and the editor
// end up pinging different URLs for one post. So the actions must still USE
// all four and DEFINE none of them.
{
  const builders = ['hiddenRef', 'publishedRef', 'beforeRef', 'identityOf'] as const;
  eq(
    'the four ref builders live in the shared module, and the actions only call them',
    builders.map((name) => [
      new RegExp(`export const ${name}\\b`).test(INVALIDATE_CODE),
      new RegExp(`(const|function)\\s+${name}\\s*[=(]`).test(ACTIONS_CODE),
      wordHits(ACTIONS_CODE, name) > 0,
    ]),
    builders.map(() => [true, false, true]),
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 13. The posts list screen
// ═══════════════════════════════════════════════════════════════════════════
// /admin/blogs is the first SCREEN in this feature, and four of its decisions
// are silent when they are wrong: the list still renders, it just says or
// offers the wrong thing.
//
//  - A TAB BADGE that is not the count of the rows behind it, in either of the
//    two ways it can miss. The FOLD can be wrong: "all" here is not "every
//    row", because the bin is excluded, and that rule lives in
//    `blogStatusFilter` alone, which is the same door `adminPostsWhere`
//    applies, so summing the whole counts record puts a number on the default
//    tab that no page of it adds up to. And the WINDOW can be wrong: the tab
//    links carry `q`, `author` and `category` across, so a badge counted over
//    the corpus reads "Published 38" above three rows the moment anybody
//    searches. `countTasksByStatus` takes the board's filters for that reason,
//    and `statusCounts` takes the list's; the `--db` half below proves a
//    filtered badge really is the count of the rows behind it.
//  - A STATUS WITH NO TAB. It is a set of posts nothing on the list can ever
//    select, and nothing on screen says they exist.
//  - A ROW MENU offering a move the state leaf refuses, or offering PURGE
//    early. Purge is the one irreversible act in this domain: it deletes the
//    post, its revisions and its uploaded images. Offering it beside "Edit" on
//    a live article is one misclick from losing one.
//  - A STATUS CELL labelling the wrong instant. A scheduled post's
//    `publish_at` is in the FUTURE; captioned "Published" it claims a post is
//    live that is not.
//
// Every assertion below was mutation-tested: the function was broken
// deliberately and the assertion went red.

// ---- 1. The tab strip -------------------------------------------------------
eq(
  'the tabs read all, then every status in the order the vocabulary declares',
  [...BLOG_LIST_TABS],
  ['all', 'draft', 'scheduled', 'published', 'archived', 'trash'],
);
ok(
  'every tab is a status the URL parser will accept back',
  BLOG_LIST_TABS.every((tab) => isBlogListStatus(tab)),
);
eq("the default tab is labelled 'All'", blogTabLabel('all'), 'All');
for (const status of BLOG_POST_STATUSES) {
  eq(
    `the ${status} tab is labelled the same word its pill carries`,
    blogTabLabel(status),
    BLOG_POST_STATUS_LABELS[status],
  );
}

// ---- 2. The badge counts the rows the tab returns ---------------------------
// Distinct primes so a fold that sums the wrong subset cannot land on the
// right number by accident, and a bin big enough that including it is obvious.
const TAB_COUNTS: Record<BlogPostStatus, number> = {
  draft: 3,
  scheduled: 5,
  published: 7,
  archived: 11,
  trash: 13,
};
for (const status of BLOG_POST_STATUSES) {
  eq(
    `the ${status} badge is that status's own count`,
    blogTabCount(status, TAB_COUNTS),
    TAB_COUNTS[status],
  );
}
// This one is derived from the same door the fold uses, so on its own it would
// survive a change to that door. Its teeth are the two assertions beside it:
// the literal 26, and the strict inequality against the whole record. Both go
// red the moment the trash exclusion breaks.
eq(
  "the all badge sums exactly the statuses blogStatusFilter('all') names",
  blogTabCount('all', TAB_COUNTS),
  (blogStatusFilter('all') ?? []).reduce((sum, s) => sum + TAB_COUNTS[s], 0),
);
eq('the all badge is 3 + 5 + 7 + 11, stated as a literal', blogTabCount('all', TAB_COUNTS), 26);
ok(
  'the all badge does not count the bin',
  blogTabCount('all', TAB_COUNTS) <
    Object.values(TAB_COUNTS).reduce((sum, n) => sum + n, 0),
);

// ---- 3. The row menu, swept over the whole vocabulary -----------------------
for (const status of BLOG_POST_STATUSES) {
  const actions = blogRowActions(status);
  const binned = status === 'trash';
  ok(`preview is offered on a ${status} post`, actions.preview);
  eq(
    `View live is offered on a ${status} post only if it is published`,
    actions.viewLive,
    status === 'published',
  );
  eq(`trash is offered on a ${status} post only if it is not binned`, actions.trash, !binned);
  eq(`restore is offered on a ${status} post only from the bin`, actions.restore, binned);
  // The irreversible one. Nothing can be destroyed without having been binned
  // first, which is a second deliberate act by the same person.
  eq(`purge is offered on a ${status} post only from the bin`, actions.purge, binned);
  ok(
    `a ${status} post is never offered both trash and restore`,
    !(actions.trash && actions.restore),
  );
}

// The drift guard: the menu may never offer a move `transitionProblem`
// refuses, or a member meets a refusal on a control that looked live.
for (const status of BLOG_POST_STATUSES) {
  for (const everPublished of [false, true]) {
    const history = { everPublished };
    const actions = blogRowActions(status);
    eq(
      `Move to trash on a ${status} post (everPublished=${everPublished}) matches transitionProblem`,
      actions.trash,
      transitionProblem(status, 'trash', history) === null,
    );
    if (actions.restore) {
      eq(
        `Restore on a ${status} post (everPublished=${everPublished}) lands somewhere the leaf allows`,
        transitionProblem(status, restoreTarget(history), history),
        null,
      );
    }
  }
}

// ---- 4. Bulk: trash and restore, and nothing else ---------------------------
eq('a selection may only be trashed or restored', [...BLOG_BULK_ACTIONS], ['trash', 'restore']);
ok(
  'there is no bulk publish: it would have to swallow a refusal or explain a mixed outcome',
  !(BLOG_BULK_ACTIONS as readonly string[]).includes('publish'),
);
ok(
  'there is no bulk purge: it deletes uploaded images and cannot be undone',
  !(BLOG_BULK_ACTIONS as readonly string[]).includes('purge'),
);
for (const action of BLOG_BULK_ACTIONS) {
  const offering = BLOG_POST_STATUSES.filter((status) => blogRowActions(status)[action]);
  // A bulk button whose action every status offers can never hide, so it would
  // sit over a selection it cannot move.
  ok(
    `the bulk "${action}" button is offered by some statuses and refused by others`,
    offering.length > 0 && offering.length < BLOG_POST_STATUSES.length,
  );
}

// ---- 4b. What a bulk door is allowed to claim -------------------------------
// The number in the toast is the door's own `count`, and the door can answer
// zero on a selection of five: each bulk door has three `count: 0` early
// returns, and the statement under them SKIPS a row somebody else already
// moved rather than restamping it. So the count has to be worded, not just
// interpolated.
eq(
  'a bulk door that moved nothing says so instead of naming a number',
  bulkOutcome(0, 'moved to the trash', 'Nothing moved. Those posts were already in the trash.'),
  'Nothing moved. Those posts were already in the trash.',
);
ok(
  'and the sentence it says carries no digit at all',
  !/\d/.test(bulkOutcome(0, 'moved to the trash', 'Nothing moved. Those posts were already in the trash.')),
);
eq('one row is singular', bulkOutcome(1, 'moved to the trash', 'none'), '1 post moved to the trash.');
eq('several are plural', bulkOutcome(5, 'moved to the trash', 'none'), '5 posts moved to the trash.');
// A door can only ever answer 0 or more, but a negative would be the one value
// that renders as a sentence nobody could parse.
eq('a negative is treated as nothing', bulkOutcome(-1, 'moved to the trash', 'none'), 'none');

// ---- 5. Which instant the Status cell is describing -------------------------
for (const [status, kind] of [
  ['draft', 'updated'],
  ['scheduled', 'scheduled'],
  ['published', 'published'],
  // Archived HAS a publish date, but "Published <date>" over a post that no
  // longer resolves reads as a claim that it is live.
  ['archived', 'updated'],
  ['trash', 'trashed'],
] as const) {
  eq(`a ${status} post's Status cell states its ${kind} date`, blogStatusDate(status), kind);
}
eq(
  'the four captions are four different words, so no two states read alike',
  new Set(Object.values(BLOG_STATUS_DATE_LABELS)).size,
  Object.keys(BLOG_STATUS_DATE_LABELS).length,
);
ok(
  'no caption is blank',
  Object.values(BLOG_STATUS_DATE_LABELS).every((label) => label.trim().length > 0),
);
ok(
  'a scheduled post is never captioned as published',
  !BLOG_STATUS_DATE_LABELS[blogStatusDate('scheduled')].includes('Publish'),
);

// ---- 6. The boxes the list and its skeleton share --------------------------
// `overflow-x-auto` makes the Y axis scrollable too, so a `-mb-px` child inside
// the tab scroller lets iOS rubber-band the whole strip off screen. It has to
// sit on the scroller, with the border on the wrapper above it.
ok('the tab strip carries the -mb-px lift', tabStrip.includes('-mb-px'));
ok('no individual tab carries it', !tabItem.includes('-mb-px'));
// The seven columns exist only from `lg`. Ungated, a 360px phone gets a
// seven-column grid instead of the stack, and the row is unreadable.
ok('the post grid only becomes a grid at lg', postGrid.includes('lg:grid-cols-['));
ok('the post grid never lays out columns below lg', !/(^|\s)grid-cols-/.test(postGrid));

// ---- 7. The screen's own source -------------------------------------------
const LIST_SRC = readRepoFile('../src/components/Admin/blogs/BlogsList.tsx');
const ROWMENU_SRC = readRepoFile('../src/components/Admin/blogs/BlogRowMenu.tsx');
const FILTERBAR_SRC = readRepoFile('../src/components/Admin/blogs/BlogsFilterBar.tsx');
const PILL_SRC = readRepoFile('../src/components/Admin/blogs/BlogStatusPill.tsx');
const BLOGS_PAGE_SRC = readRepoFile('../src/app/(admin)/admin/(protected)/blogs/page.tsx');
const SKELETONS_SRC = readRepoFile('../src/components/Admin/skeletons/AdminSkeletons.tsx');
const ADMINPAGE_SRC = readRepoFile('../src/components/Admin/AdminPage.tsx');

const LEAF_SRC = readRepoFile('../src/lib/blogListFields.ts');
// The skeleton's own copy lives in one function, and only that function's copy
// is this screen's. Sliced BEFORE the em-dash sweep for that reason: the rest
// of AdminSkeletons belongs to twenty-eight other routes.
const BLOGS_SKELETON = region(
  SKELETONS_SRC,
  'export function BlogsListSkeleton(',
  'export function SubmissionDetailSkeleton(',
  'BlogsListSkeleton',
);

const LIST_SCREEN_FILES = [
  ['BlogsList.tsx', LIST_SRC],
  ['BlogRowMenu.tsx', ROWMENU_SRC],
  ['BlogsFilterBar.tsx', FILTERBAR_SRC],
  ['BlogStatusPill.tsx', PILL_SRC],
  ['blogs/page.tsx', BLOGS_PAGE_SRC],
  // Both carry member-visible copy: the leaf owns every tab and caption word,
  // and the skeleton's region carries the header sentence the page repeats.
  ['blogListFields.ts', LEAF_SRC],
  ['the BlogsListSkeleton region', BLOGS_SKELETON],
] as const;

for (const [label, src] of LIST_SCREEN_FILES) {
  ok(`read ${label} (drift guard)`, src.length > 500);
}
ok('read AdminSkeletons.tsx (drift guard)', SKELETONS_SRC.length > 2000);

// Admin copy carries no em dash: members read this dashboard daily and it is
// the most recognisable machine-writing tell. The ONE allowance is the empty
// value glyph in a cell, which is a spreadsheet convention rather than prose,
// so it is removed by its exact form before the sweep.
const EMPTY_CELL_GLYPH = /(?:'—'|>—<)/g;
for (const [label, src] of LIST_SCREEN_FILES) {
  eq(
    `no em dash in ${label} outside the empty-cell glyph`,
    stripComments(src).replace(EMPTY_CELL_GLYPH, '').includes('—'),
    false,
  );
}

// The badges answer for the FILTERS, which is two claims in two files: the
// query has to take them, and the page has to hand them over. The `--db` half
// proves the resulting number is the count of the rows behind it; this is what
// stops the page quietly going back to counting the corpus.
const QUERIES_SRC = readRepoFile('../src/db/blogAdminQueries.ts');
const STATUS_COUNTS = region(
  QUERIES_SRC,
  'export async function statusCounts(',
  '// ── The editor',
  'statusCounts',
);
ok('statusCounts takes the list params', /statusCounts\(\s*\n?\s*params:/.test(STATUS_COUNTS));
ok(
  'and counts through the shared facet clause rather than a second one',
  STATUS_COUNTS.includes('selectStatusCounts(db, params)'),
);
{
  const page = stripComments(BLOGS_PAGE_SRC);
  ok('the page hands it the parsed params', page.includes('statusCounts(params)'));
  ok('and never counts the whole corpus', !/statusCounts\(\s*\)/.test(page));
}

// Next prefetches every in-viewport Link, so twenty-five row titles pointing at
// the editor would fire twenty-five RSC requests for a route nobody opened —
// the reason the calendar's day chips carry the same flag. Counted in pairs, so
// a second editor link added without it fails here too.
eq(
  'every editor link on a row carries prefetch={false}',
  [
    occurrences(LIST_SRC, 'href={`/admin/blogs/${item.id}`}'),
    occurrences(LIST_SRC, 'prefetch={false}'),
  ],
  [1, 1],
);

// The other half of the same rule, in the file that calls the door: the toast
// is worded from the ANSWER, never from the request. `${ids.length}` in a
// message is the exact shape of the defect.
{
  const list = stripComments(LIST_SRC);
  ok('the bulk toast is worded from the door\'s own count', list.includes('res.ok ? res.count : 0'));
  ok('and never from the size of the selection', !list.includes('${ids.length}'));
}

// The rosters in this dashboard never construct a Date in the browser: every
// date arrives as a finished string, formatted once on the server in the
// viewer's own zone. A `new Date()` here would render one zone on the server
// and another in the browser, which is a hydration mismatch on a value nobody
// would think to check.
for (const [label, src] of [
  ['BlogsList.tsx', LIST_SRC],
  ['BlogRowMenu.tsx', ROWMENU_SRC],
  ['BlogsFilterBar.tsx', FILTERBAR_SRC],
  ['BlogStatusPill.tsx', PILL_SRC],
] as const) {
  eq(`${label} constructs no Date in the browser`, occurrences(stripComments(src), 'new Date('), 0);
}

// The skeleton and the page must pass AdminPage the SAME width token, or
// loading.tsx renders at one measure and the page snaps to another on swap.
// Both take the default here, so the two defaults are READ rather than
// assumed, and the Shell one is read from Shell's own region: over the whole
// file the pattern holds today only because there happens to be one
// occurrence of it.
const SKELETON_SHELL = region(SKELETONS_SRC, 'function Shell({', '\n/**', 'the skeleton Shell');
// Both patterns tolerate ANY attribute order. `<AdminPage width="…">` alone
// would let `<AdminPage role="x" width="table">` fall through to the default
// below and stay green, which is the one shape the assertion exists to catch.
const widthPassed = (code: string, tag: string): string =>
  code.match(new RegExp(`<${tag}[^>]*\\swidth="(\\w+)"`))?.[1] ?? 'wide';
ok("AdminPage's own default width is 'wide'", /width = 'wide'/.test(ADMINPAGE_SRC));
ok("the skeleton Shell's default width is 'wide'", /width = 'wide'/.test(SKELETON_SHELL));
eq(
  'the posts page and BlogsListSkeleton pass the same AdminPage width',
  [widthPassed(BLOGS_PAGE_SRC, 'AdminPage'), widthPassed(BLOGS_SKELETON, 'Shell')],
  ['wide', 'wide'],
);

// The header now carries three unconditional controls, and the skeleton has to
// reserve all three: one pill under a header that renders three leaves the row
// a control short and reflows it the moment loading.tsx swaps for the page.
// Counted on both sides from their own source rather than written down here.
eq(
  'the posts header and its skeleton reserve the same number of controls',
  [
    [
      ...region(
        BLOGS_PAGE_SRC,
        '<div className="flex flex-wrap items-center gap-2">',
        '</header>',
        "the posts header's control row",
      ).matchAll(/<\w+Button\b/g),
    ].length,
    [
      ...region(
        BLOGS_SKELETON,
        'action={',
        '<GlassPanel',
        "the skeleton's header action",
      ).matchAll(/'w-\d+'/g),
    ].length,
  ],
  [3, 3],
);

// ---- 8. The two taxonomy dialogs ------------------------------------------
// The authors and categories write doors get a screen, off the posts list
// header. Everything below is a decision a reader cannot check by looking at
// the dialog, because in every case the wrong version still renders.

const AUTHORS_SRC = readRepoFile('../src/components/Admin/blogs/AuthorsDialog.tsx');
const CATEGORIES_SRC = readRepoFile('../src/components/Admin/blogs/CategoriesDialog.tsx');
const TAXONOMY_FORM_SRC = readRepoFile('../src/components/Admin/blogs/taxonomyForm.ts');
const TAXONOMY_TYPES_SRC = readRepoFile('../src/components/Admin/blogs/taxonomyTypes.ts');
const GLASSDIALOG_SRC = readRepoFile('../src/components/Admin/GlassDialog.tsx');

const TAXONOMY_FILES = [
  ['AuthorsDialog.tsx', AUTHORS_SRC],
  ['CategoriesDialog.tsx', CATEGORIES_SRC],
  ['taxonomyForm.ts', TAXONOMY_FORM_SRC],
  ['taxonomyTypes.ts', TAXONOMY_TYPES_SRC],
] as const;

for (const [label, src] of TAXONOMY_FILES) {
  ok(`read ${label} (drift guard)`, src.length > 500);
}

for (const [label, src] of TAXONOMY_FILES) {
  eq(
    `no em dash in ${label} outside the empty-cell glyph`,
    stripComments(src).replace(EMPTY_CELL_GLYPH, '').includes('—'),
    false,
  );
  eq(`${label} constructs no Date in the browser`, occurrences(stripComments(src), 'new Date('), 0);
}

// THE BUNDLE RULE, and it is the one thing here that would cost every visitor
// rather than every admin. `blogPostSchema.ts` imports `blogBody.ts`, which
// imports @tiptap/core, StarterKit and the table kit at module scope, and
// Turbopack merges every eagerly referenced client module into ONE shared
// chunk group that all 86 routes load. So validating in the browser the way
// careers does would put the whole Tiptap document schema in front of the
// marketing site to save one round trip on a form somebody opens by hand.
for (const [label, src] of TAXONOMY_FILES) {
  const code = stripComments(src);
  eq(
    `${label} pulls neither zod nor the Tiptap body schema into the client graph`,
    [
      code.includes("from '@/lib/blogPostSchema'"),
      code.includes("from '@/lib/blogBody'"),
      code.includes("from 'zod'"),
      code.includes("from '@tiptap/"),
    ],
    [false, false, false, false],
  );
}

// Every menu in this dashboard comes from Admin/DropdownMenu.tsx, and the way
// that stays true in a file that legitimately imports radix-ui for Dialog is
// that the import names Dialog and nothing else.
for (const [label, src] of [
  ['AuthorsDialog.tsx', AUTHORS_SRC],
  ['CategoriesDialog.tsx', CATEGORIES_SRC],
] as const) {
  eq(
    `${label} takes only Dialog from radix-ui`,
    [...stripComments(src).matchAll(/import \{([^}]*)\} from 'radix-ui';/g)].map((m) =>
      m[1].trim(),
    ),
    ['Dialog'],
  );
}

// The footer sits OUTSIDE the scroller and therefore outside the <form>, so the
// Save button has to name the form it submits. Counted in a pair: an id with no
// button is a dead Save, and a button naming an id nothing carries is the same
// bug from the other end.
{
  const code = stripComments(AUTHORS_SRC);
  ok('the author form id is a module-level constant', /^const FORM_ID = '[a-z-]+';$/m.test(code));
  eq(
    'and the pinned footer submit names it, exactly once each way',
    [occurrences(code, 'id={FORM_ID}'), occurrences(code, 'form={FORM_ID}')],
    [1, 1],
  );
}

// Neither dialog hand-rolls a scroller: GlassDialog owns it, and its ONE rule
// is read from GlassDialog's own source rather than restated. `flex: 1 1 0%`
// zeroes the basis, and Content is `max-h-full` rather than `h-full`, so there
// is no free space to grow back from and the body collapses to nothing.
{
  const scroller = region(
    stripComments(GLASSDIALOG_SRC),
    'ref={scrollerRef}',
    '{children}',
    "GlassDialog's scroller",
  );
  ok('the dialog scroller carries no flex-1', !scroller.includes('flex-1'));
  ok('it shrinks against the pinned slots instead', scroller.includes('min-h-0 overflow-y-auto'));
  for (const [label, src] of [
    ['AuthorsDialog.tsx', AUTHORS_SRC],
    ['CategoriesDialog.tsx', CATEGORIES_SRC],
  ] as const) {
    eq(`${label} opens no scroller of its own`, occurrences(stripComments(src), 'overflow-y-auto'), 0);
    // As JSX props rather than as substrings: `xheader={` contains `header={`,
    // and an assertion a typo satisfies is not an assertion. Over the
    // COMMENT-STRIPPED source for the same reason, or a JSDoc line naming the
    // slot would satisfy it on its own.
    const bare = stripComments(src);
    ok(
      `${label} uses the pinned header and footer slots`,
      /\n\s+header=\{/.test(bare) && /\n\s+footer=\{/.test(bare),
    );
  }
}

// The byline link is a PRIVILEGE change, not a copy edit: `bylineColumn` in
// _actions/blogTaxonomy.ts lets only an owner or a superadmin name `user_id`.
// Rendering the picker to anybody else would be a control the server refuses,
// and sending `null` instead of `undefined` would CLEAR a link on every save
// by somebody who was never shown it.
{
  const authors = stripComments(AUTHORS_SRC);
  ok('the account picker renders only under the same gate', authors.includes('{canLinkAccount && ('));
  ok(
    'and an ungated save leaves the column unnamed rather than clearing it',
    authors.includes("canLinkAccount ? (userId === '' ? null : userId) : undefined"),
  );
  const page = stripComments(BLOGS_PAGE_SRC);
  ok('the page reads the accounts only for that viewer', page.includes('profile.superadmin ? listBylineAccounts()'));
  ok('and hands the same flag to the dialog', page.includes('canLinkAccount={profile.superadmin}'));
}

// A Blob URL through <Img>/<ImgClient> renders the Perseus wordmark, because
// `resolveImageSrc` swaps anything outside /images/ for the placeholder. So an
// uploaded photo draws the studio logo where the face should be, which looks
// exactly like a bug and is one. Both renderers are read off the source rather
// than assumed present.
{
  const authors = stripComments(AUTHORS_SRC);
  eq('an uploaded photo goes through MediaImage wherever it is drawn', occurrences(authors, '<MediaImage'), 2);
  eq(
    'and every ImgClient is handed a static /images path, never an uploaded one',
    [...authors.matchAll(/<ImgClient[\s\S]*?src=\{([^}]+)\}/g)].map((m) => m[1]),
    ['author.imageStaticPath', 'staticPath'],
  );
}

// A slug is immutable after creation and the doors refuse a change with a
// sentence. An edit therefore re-sends the STORED slug: binding the field
// instead would turn every rename attempt into a refusal on a control the
// screen offered.
ok(
  'an author edit re-sends the stored slug',
  stripComments(AUTHORS_SRC).includes('slug: editing ? editing.slug : values.slug'),
);
ok(
  'and a category edit sends the row’s own',
  stripComments(CATEGORIES_SRC).includes('slug: category.slug'),
);

// The SEO pair is the one thing on this screen a writer otherwise meets as a
// refusal somewhere else: `categoryReady` in _actions/blogPosts.ts will not
// publish a post into a category missing either half, and `branding` is the
// live row carrying neither. Stated under the pair in BOTH forms, or the add
// form quietly creates the next one.
eq('both category forms state the publish rule under the SEO pair', occurrences(CATEGORIES_SRC, '<SeoNote'), 2);
ok(
  'and the sentence names publishing rather than SEO in the abstract',
  CATEGORIES_SRC.includes('until both of these are filled in'),
);

// Delete is offered only when NOTHING points at the row, and "nothing" spans
// both tables: `blog_posts` and `blog_post_revisions` each carry the foreign
// key with ON DELETE RESTRICT. Gating on the posts alone would offer a Delete
// on an author reassigned away from every live post, whose earlier versions
// still name them, and the door would refuse it.
for (const [label, src] of [
  ['AuthorsDialog.tsx', AUTHORS_SRC],
  ['CategoriesDialog.tsx', CATEGORIES_SRC],
] as const) {
  ok(
    `${label} counts the saved versions as well as the posts`,
    /usage\.posts > 0 \|\|[\w. ]{0,20}usage\.revisions > 0/.test(stripComments(src)),
  );
  // And the number is PRINTED, through the two composers, rather than
  // pluralised in JSX. `blogUsageCount` is the row's readout and
  // `blogUsageSentence` the explanation; a dialog that re-derived either would
  // be free to add the two numbers, which is the one rule all three share.
  const bare = stripComments(src);
  ok(
    `${label} prints the count through blogUsageCount and explains it through blogUsageSentence`,
    bare.includes('blogUsageCount(') && bare.includes('blogUsageSentence('),
  );
  eq(
    `${label} re-derives neither the count nor its plural`,
    [/post\$\{/.test(bare), /post\{/.test(bare), bare.includes('saved version')],
    [false, false, false],
  );
}

// AND THE NUMBERS ARE TEXT, not a tooltip. A `title` on a DISABLED button fires
// no mouse events in any browser and cannot be reached on a touch device at
// all, so it carries nothing: an author with no posts and twelve saved versions
// read "0 posts" beside a greyed-out Delete with the reason nowhere on screen.
// The lookbehind is what makes this mean something: it excludes `title={...}`
// and `${...}` inside a template literal, so only a JSX child position counts,
// and the ConfirmDialog's own description (reachable only once the row is
// already deletable) cannot stand in for the line in the editor.
const asJsxText = (fn: string) => new RegExp(`(?<![=$])\\{${fn}\\(`);
ok('the authors roster prints the count on the row', asJsxText('blogUsageCount').test(stripComments(AUTHORS_SRC)));
ok(
  'and the editor states what points at the author, in the form itself',
  asJsxText('blogUsageSentence').test(stripComments(AUTHORS_SRC)),
);
ok('the category rows print theirs too', asJsxText('blogUsageCount').test(stripComments(CATEGORIES_SRC)));

// ═══════════════════════════════════════════════════════════════════════════
// 14. The editor's schema IS the renderer's schema
// ═══════════════════════════════════════════════════════════════════════════
// The whole safety net for step 2's writing surface. The public renderer is
// proven against the live site by the rendering-parity snapshot, so the only
// question left is whether the EDITOR can produce something it did not render.
// Every way it can is silent at the keyboard and loud on save, or worse, quiet
// on both:
//
//  - A WIDENED SCHEMA. `@tiptap/extension-link` is installed (StarterKit
//    depends on it) and declares `target`, `rel` and `class` with defaults
//    that `getJSON()` materialises, so composing it into the editor produces
//    documents the strict zod refuses with an opaque path error on every save.
//    `blogBody.ts`'s own comment names that exact drift, and this section is
//    the only thing standing between it and a writer who cannot save.
//  - A MENU THAT INSERTS AN UNPLACEABLE NODE. `step`, `pros` and `cons` have
//    NO `group`: they are reachable only by name from inside `howTo` and
//    `prosCons`. A row offering a bare one produces a document ProseMirror
//    cannot place, and the writer meets it as a failure on a block they did
//    not think they had added.
//  - AN EDITOR IN THE SHARED CHUNK. Turbopack merges every eagerly referenced
//    client module into one chunk group that every route loads, so a single
//    static import of the canvas puts ProseMirror on every admin page.
//
// The schema comparison is a NORMALISED PROJECTION rather than a deep equality
// over the raw specs, and that is deliberate in both directions. Tiptap's
// `getSchemaByResolvedExtensions` cleans null fields out of a spec, so today
// Gapcursor's injected `allowGapCursor` happens to vanish and a raw compare
// would pass; a version that stops cleaning would make a raw compare fail for
// ever, and a test that always fails gets loosened rather than fixed. In the
// other direction the projection is what lets task 16 add `renderHTML` and
// `parseHTML` (which land on the spec as `toDOM`/`parseDOM`) without touching
// anything this compares.
//
// Every assertion below was mutation-tested.

const editorSchema = getSchema(BLOG_EDITOR_EXTENSIONS);

const NO_DEFAULT = '(no default)';
/** `[name, default]` pairs, sorted, with "declared as undefined" kept apart
 *  from "not declared": conflating them would let an attribute lose its
 *  default and still read as equal. */
const attrPairs = (attrs: Record<string, { default?: unknown }> | undefined) =>
  Object.entries(attrs ?? {})
    .map(([name, spec]): [string, string] => [
      name,
      'default' in spec ? (JSON.stringify(spec.default) ?? 'undefined') : NO_DEFAULT,
    ])
    .sort((a, b) => a[0].localeCompare(b[0]));

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

/**
 * What must be identical: everything that decides which DOCUMENTS are valid.
 *
 * Not `toDOM`/`parseDOM` (task 16 adds those on the editor side alone, and the
 * server renderer has no use for them) and not the plugin-level fields, which
 * are behaviour rather than vocabulary.
 */
const projectSchema = (schema: Schema) => ({
  nodes: Object.entries(schema.nodes)
    .map(([name, type]) => ({
      name,
      content: type.spec.content ?? null,
      marks: type.spec.marks ?? null,
      group: type.spec.group ?? null,
      inline: type.spec.inline === true,
      atom: type.spec.atom === true,
      defining: type.spec.defining === true,
      attrs: attrPairs(type.spec.attrs),
    }))
    .sort(byName),
  marks: Object.entries(schema.marks)
    .map(([name, type]) => ({
      name,
      // `inclusive` defaults to true in ProseMirror, so the absent key and an
      // explicit `true` are the same mark and must project the same.
      inclusive: type.spec.inclusive !== false,
      excludes: type.spec.excludes ?? null,
      group: type.spec.group ?? null,
      attrs: attrPairs(type.spec.attrs),
    }))
    .sort(byName),
});

// Fixture guards. An empty projection would make the comparison below trivially
// true, which is the shape of a check that proves nothing.
ok('the editor schema has the nodes to compare (fixture guard)', Object.keys(editorSchema.nodes).length >= 20);
ok('and the marks (fixture guard)', Object.keys(editorSchema.marks).length === 6);

eq(
  'the schema the EDITOR composes equals the schema the RENDERER validates against',
  projectSchema(editorSchema),
  projectSchema(blogSchema),
);

// The named half of the same guarantee, stated separately so a failure says
// WHAT appeared rather than dumping two projections: an extension list that
// grew a node or a mark is the loudest form of this drift.
eq(
  'and neither side has a node or a mark the other does not',
  [Object.keys(editorSchema.nodes).sort(), Object.keys(editorSchema.marks).sort()],
  [Object.keys(blogSchema.nodes).sort(), Object.keys(blogSchema.marks).sort()],
);

// The ORDER of the two lists, which the projection above deliberately sorts
// away so its diffs stay readable. Node and mark order is RANK, and rank is
// load-bearing: `blogBody.ts` gives the `link` mark `priority: 1000` so it
// ranks first, which is what makes `**[x](y)**` render `<strong><a>` the way
// remark did and the parity snapshot recorded.
//
// THE TWO LINES BELOW GUARD DIFFERENT THINGS, and it is worth being exact
// about which, because the obvious reading of the first is wrong. Both schemas
// are built from `EXTENSIONS` and Tiptap's `sortExtensions` is stable, and the
// seven editor-only extensions appended to that list contribute no node and no
// mark. So changing the CANONICAL priority in `blogBody.ts` moves both sides
// identically and the comparison stays green (verified by mutation).
//
//  - The `eq` catches the EDITOR list drifting from the canonical one: an
//    appended or reordered entry, or a priority set inside the editor's own
//    `.extend()`. That is real drift and nothing else here sees it.
//  - The `ok` is what actually guards the rank itself. A canonical reorder
//    changes the nesting on every public page, and it is invisible to any
//    editor-versus-renderer comparison precisely because it moves both.
eq(
  'and the editor list is in the same ORDER as the canonical one',
  [
    Object.keys(editorSchema.nodes),
    Object.values(editorSchema.marks).map((type) => [type.name, type.rank]),
  ],
  [
    Object.keys(blogSchema.nodes),
    Object.values(blogSchema.marks).map((type) => [type.name, type.rank]),
  ],
);
ok('and the link mark still ranks first, which decides how nested marks render', editorSchema.marks.link.rank === 0);

// ── The clipboard ───────────────────────────────────────────────────────────
// Tiptap gives a node a `toDOM` only when its extension defines `renderHTML`,
// and the eight custom nodes in `blogBody.ts` define none, so ProseMirror's
// clipboard serializer had no entry for them and THREW on any selection
// containing one. Copying a paragraph that happens to sit beside a figure is
// an ordinary thing to do. Task 16 closed it by adding `renderHTML` and
// `parseHTML` in the EDITOR's `.extend()` (`blogEditorExtensions.ts`), never
// in the shared vocabulary.
//
// Asserted as the exact gap rather than as "fromSchema does not throw", which
// would be vacuous: prosemirror-model's `gatherToDOM` FILTERS nodes without a
// `toDOM` instead of refusing them, so `fromSchema` cannot throw for any
// schema and a check on it could never go red. This one can, in both
// directions.
const serializerGap = (() => {
  try {
    const serializer = DOMSerializer.fromSchema(editorSchema);
    return Object.keys(editorSchema.nodes)
      .filter((name) => !(name in serializer.nodes))
      .sort();
  } catch (error) {
    return [`DOMSerializer.fromSchema threw: ${error instanceof Error ? error.message : String(error)}`];
  }
})();
eq(
  'every node has a clipboard serializer',
  serializerGap,
  // `doc` belongs in the expected set on its own account and always will: the
  // top node is never serialised as an element in any ProseMirror schema, so
  // it has no `toDOM` and never needs one.
  ['doc'],
);

// The two halves, and WHICH schema carries them. The renderer must stay
// clean: the public page renders through `@tiptap/static-renderer`, which
// reads a node mapping and never a DOM spec, so a `toDOM` there would be a
// change to the canonical vocabulary made for one consumer's benefit.
eq(
  'the editor schema gives all eight a toDOM and a parseDOM',
  CUSTOM_NODE_NAMES.filter(
    (name) =>
      typeof editorSchema.nodes[name].spec.toDOM !== 'function' ||
      !Array.isArray(editorSchema.nodes[name].spec.parseDOM),
  ),
  [],
);
eq(
  'and the RENDERER schema still gives them neither',
  CUSTOM_NODE_NAMES.filter(
    (name) =>
      blogSchema.nodes[name].spec.toDOM !== undefined ||
      blogSchema.nodes[name].spec.parseDOM !== undefined,
  ),
  [],
);

// The codec table is the round trip's vocabulary, and a drift either way is
// silent. An attribute the schema declares and the table forgets simply stops
// crossing the clipboard; one the table declares and the schema does not is
// written to the DOM and thrown away on parse.
eq(
  'every custom node is in the codec table, and nothing else is',
  Object.keys(BLOG_NODE_ATTR_CODECS).sort(),
  [...CUSTOM_NODE_NAMES].sort(),
);
for (const name of CUSTOM_NODE_NAMES) {
  eq(
    `the ${name} codecs cover exactly its schema attributes`,
    Object.keys(BLOG_NODE_ATTR_CODECS[name]).sort(),
    Object.keys(blogSchema.nodes[name].spec.attrs ?? {}).sort(),
  );
}
// Every DOM attribute is `data-` prefixed, and that is a correctness rule
// rather than a style one. Tiptap's `injectExtensionAttributesToParseRule`
// wraps our `getAttrs` and merges ITS OWN parse of each attribute OVER the
// result, reading `element.getAttribute(<the attribute's own name>)`. A codec
// writing `title` or `id` or `width` would therefore be re-read and coerced by
// `fromString` behind our back, and `title` on a div is also a tooltip.
eq(
  'every clipboard attribute is data-prefixed, so Tiptap own parse cannot overwrite it',
  Object.entries(BLOG_NODE_ATTR_CODECS).flatMap(([node, codecs]) =>
    Object.values(codecs)
      .map((codec) => codec.attr)
      .filter((attr) => !attr.startsWith('data-'))
      .map((attr) => `${node}.${attr}`),
  ),
  [],
);

// ── The round trip, which is what proves the clipboard is safe ──────────────
// A faithful model of ONE element's attribute surface, and the honest limit of
// this check: `setAttribute` stringifies, an absent attribute reads back null,
// and prosemirror's `renderSpec` never sets a null-valued attribute. What it
// does NOT model is the browser's HTML text layer (serialising the element to
// markup and parsing it back), because there is no DOM in plain node and
// `@tiptap/core`'s own `generateHTML`/`generateJSON` both reach for
// `window.DOMParser`. Attribute escaping is the browser's job and is not
// something this code can get wrong; the coercions below are, which is why
// they are what gets pinned.
const stubElement = (attrs: Record<string, string>) => ({
  getAttribute: (name: string) => (name in attrs ? String(attrs[name]) : null),
});

/** The other half of the same model: the four methods prosemirror's own
 *  `renderSpec` calls on a document. Ten lines, and worth them, because they
 *  let the REAL serializer run: it is what skips a null-valued attribute,
 *  stringifies the rest, and reports the CONTENT HOLE. Reading the spec array
 *  by hand instead would have missed a missing hole entirely, which is how a
 *  how-to loses every step on copy while all its attributes round-trip. */
const stubEl = (tag: string) => {
  const attrs: Record<string, string> = {};
  const children: unknown[] = [];
  return {
    nodeType: 1,
    tagName: tag.toUpperCase(),
    attrs,
    children,
    setAttribute: (name: string, value: unknown) => void (attrs[name] = String(value)),
    setAttributeNS: (_ns: string, name: string, value: unknown) =>
      void (attrs[name] = String(value)),
    appendChild: (child: unknown) => child,
  };
};
const stubDocument = {
  createElement: stubEl,
  createElementNS: (_ns: string, tag: string) => stubEl(tag),
  createTextNode: (text: string) => ({ nodeType: 3, text }),
};

/** One node through the real `DOMSerializer.renderSpec`. Never a throw: an
 *  assertion that aborts this script takes the thousand after it with it, so
 *  every reach into a spec here is guarded. */
const renderSpecOf = (node: PMNode) => {
  const spec = editorSchema.nodes[node.type.name].spec;
  if (typeof spec.toDOM !== 'function') return { tag: '(no toDOM)', attrs: {}, hole: false };
  const out = DOMSerializer.renderSpec(stubDocument as never, spec.toDOM(node)) as {
    dom: { tagName: string; attrs: Record<string, string> };
    contentDOM?: unknown;
  };
  return {
    tag: out.dom.tagName.toLowerCase(),
    attrs: out.dom.attrs,
    hole: out.contentDOM !== undefined,
  };
};

const renderedAttrs = (node: PMNode): Record<string, string> => renderSpecOf(node).attrs;

/** One node's attributes read back off a stub element carrying whatever its
 *  own `parseDOM` rule is given. `'no rule'` rather than a throw for the same
 *  reason. */
const parseAttrs = (name: string, attrs: Record<string, string>): unknown => {
  const rule = (editorSchema.nodes[name].spec.parseDOM ?? [])[0] as
    | { getAttrs?: (el: never) => unknown }
    | undefined;
  return typeof rule?.getAttrs === 'function' ? rule.getAttrs(stubElement(attrs) as never) : 'no rule';
};

/** One node through its OWN `toDOM` and its OWN `parseDOM[0].getAttrs`. */
const roundTripAttrs = (node: PMNode): Record<string, unknown> | false => {
  const spec = editorSchema.nodes[node.type.name].spec;
  const rule = (spec.parseDOM ?? [])[0] as { getAttrs?: (el: never) => unknown } | undefined;
  if (typeof spec.toDOM !== 'function' || typeof rule?.getAttrs !== 'function') {
    throw new Error(`${node.type.name} has no clipboard spec`);
  }
  return parseAttrs(node.type.name, renderedAttrs(node)) as Record<string, unknown> | false;
};

/** The whole document back through the clipboard's own two halves. Custom
 *  nodes go through `toDOM`/`parseDOM`; everything else is library code the
 *  parity snapshot already proves, so it is carried through unchanged. */
const roundTripNode = (node: PMNode): JSONContent => {
  const json = node.toJSON() as JSONContent;
  const content: JSONContent[] = [];
  node.forEach((child) => void content.push(roundTripNode(child)));
  if (content.length > 0) json.content = content;
  if ((CUSTOM_NODE_NAMES as readonly string[]).includes(node.type.name)) {
    const attrs = roundTripAttrs(node);
    if (attrs === false) throw new Error(`the parse rule refused a ${node.type.name}`);
    // An attribute the codec left off the element comes back absent, and the
    // schema's own default fills it. That is the point: a default is spelled
    // once, in `blogBody.ts`, and never restated in a codec.
    if (Object.keys(attrs).length > 0) json.attrs = attrs;
    else delete json.attrs;
  }
  return json;
};

{
  // Every custom node, with every attribute carrying a NON-DEFAULT value
  // wherever the zod layer allows one: a fixture built from defaults would
  // round-trip through a codec that did nothing at all.
  const withEverything: BlogDoc = {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Beside a figure.' }] },
      {
        type: 'figure',
        attrs: {
          image: { type: 'media', ...MEDIA },
          alt: 'A "quoted" alt & an ampersand',
          caption: 'Under the picture',
          credit: 'Perseus',
          size: 'wide',
          width: 1600,
          height: 900,
          priority: true,
        },
      },
      { type: 'figure', attrs: { image: { type: 'static', src: '/images/blogs/a.avif' }, alt: 'Static' } },
      {
        type: 'youtube',
        attrs: {
          id: 'dQw4w9WgXcQ',
          title: 'A title',
          description: 'A description',
          uploadDate: '2026-08-01',
          external: false,
        },
      },
      { type: 'youtube', attrs: { id: 'dQw4w9WgXcQ' } },
      { type: 'instagram', attrs: { id: 'AbC_123-x', type: 'reel', caption: true } },
      {
        type: 'howTo',
        attrs: { title: 'How to shoot it', totalTime: 'PT90M' },
        content: [
          {
            type: 'step',
            attrs: { title: 'Set up' },
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Tripod.' }] }],
          },
          {
            type: 'step',
            attrs: { title: 'Roll' },
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Record.' }] }],
          },
        ],
      },
      {
        type: 'prosCons',
        attrs: { title: 'Two ways' },
        content: [
          { type: 'pros', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Cheap.' }] }] },
          { type: 'cons', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Slow.' }] }] },
        ],
      },
    ],
  };

  const before = validateBlogBody(withEverything);
  ok('the round-trip fixture is a valid document to begin with (fixture guard)', before.ok);
  if (before.ok) {
    // Fixture guard on the fixture's REACH: a doc missing one of the eight
    // would make the comparison below true about seven nodes and silent about
    // the one that broke.
    const seen = new Set<string>();
    const walk = (n: JSONContent) => {
      seen.add(String(n.type));
      (n.content ?? []).forEach(walk);
    };
    walk(before.doc);
    eq(
      'and it carries all eight custom nodes (fixture guard)',
      CUSTOM_NODE_NAMES.filter((name) => !seen.has(name)),
      [],
    );

    const copied = (() => {
      try {
        const pm = PMNode.fromJSON(editorSchema, before.doc);
        const out: JSONContent[] = [];
        pm.forEach((child) => void out.push(roundTripNode(child)));
        const after = validateBlogBody({ type: 'doc', content: out });
        return after.ok ? after.doc : after.problems;
      } catch (error) {
        return `round trip threw: ${error instanceof Error ? error.message : String(error)}`;
      }
    })();
    eq('a document holding every custom node survives the clipboard unchanged', copied, before.doc);
  }
}

// The codecs decode FOREIGN text: anything on the clipboard reaches them, not
// only what this editor wrote. Every value the zod layer would then refuse has
// to be dropped here instead, because a decoded `1200.5` is a document that
// refuses to save with an error naming a node the writer pasted rather than
// typed. Asserted directly rather than through the round trip, which can only
// ever feed the codecs what `toAttr` already wrote.
eq(
  'a width the schema could not take is dropped rather than decoded',
  ['1600', '12.5', 'abc', '', '  ', '1e3', '0x10'].map((raw) => {
    const parsed = parseAttrs('figure', {
      'data-image': JSON.stringify({ type: 'static', src: '/images/a.avif' }),
      'data-alt': 'x',
      'data-width': raw,
    });
    return parsed === false || typeof parsed === 'string'
      ? parsed
      : ((parsed as Record<string, unknown>).width ?? null);
  }),
  [1600, null, null, null, null, 1000, 16],
);

// The trap the brief names, asserted directly. `figure.image` is an OBJECT and
// is `rendered: false` in the schema precisely so nothing writes
// "[object Object]" into a DOM attribute; the codec puts it in `data-image` as
// JSON instead. Without that a copied figure comes back with `image: null`,
// and the strict zod refuses the WHOLE document on the next save with an error
// naming a node the writer never touched.
{
  const figure = editorSchema.nodes.figure.create({
    image: { type: 'media', ...MEDIA },
    alt: 'A figure',
  });
  const attrs = renderedAttrs(figure);
  eq(
    'no figure attribute is ever written as [object Object]',
    Object.values(attrs).filter((value) => String(value).includes('[object')),
    [],
  );
  ok('the image rides data-image', typeof attrs['data-image'] === 'string');
  eq(
    'and it is the whole image, as JSON',
    (() => {
      try {
        return JSON.parse(attrs['data-image'] ?? '');
      } catch {
        return `not JSON: ${attrs['data-image']}`;
      }
    })(),
    { type: 'media', ...MEDIA },
  );
  // And NOTHING ELSE is written. `renderHTML` deliberately ignores the
  // `HTMLAttributes` Tiptap hands it, which is the default rendering of every
  // attribute the extension declares; spreading that in would put `alt`,
  // `caption`, `size` and the rest on the element under their own names, where
  // Tiptap's own parse re-reads and coerces them behind the codecs' back, and
  // would put `image` there too the moment somebody drops its `rendered:
  // false`. The exact set is the assertion.
  eq(
    'a figure writes exactly the attributes the codecs decided and no others',
    Object.keys(attrs).sort(),
    ['data-alt', 'data-blog-node', 'data-image', 'data-priority', 'data-size'],
  );
  // A figure whose image did not survive is DROPPED rather than pasted
  // broken: the rule returns false, ProseMirror reads that as "no match", and
  // nothing is inserted. A missing block is visible; an unsavable document is
  // not, and its error names a node nobody added.
  eq(
    'a figure with no image, or an unreadable one, is refused rather than pasted broken',
    [
      parseAttrs('figure', { 'data-alt': 'x' }),
      parseAttrs('figure', { 'data-image': 'not json' }),
      parseAttrs('figure', { 'data-image': '"a string"' }),
      parseAttrs('figure', { 'data-image': '[1,2]' }),
    ],
    [false, false, false, false],
  );
  for (const name of ['youtube', 'instagram'] as const) {
    eq(`and a ${name} with no id is refused too`, parseAttrs(name, {}), false);
  }

  // THE SCHEMA-LEGAL NULL, both ends, because nothing else covered the render
  // half. `figure.image` defaults to null in `blogBody.ts`, so a figure with
  // no image is a legal ProseMirror node even though `imageSourceSchema`
  // refuses it, and this is what the two halves do with one:
  //
  //  - `toAttr` returns null for a null image, so NO `data-image` is written.
  //    The alternative is the four letters "null" in the attribute, which is
  //    the mistake `text()`'s own comment warns about and which would decode
  //    to a different thing again.
  //  - the parse rule then refuses, because `image` is required.
  //
  // The refusal is deliberate and is the smaller loss. A figure with a null
  // image can never be SAVED, so pasting one carries an unsavable node into a
  // document that was fine, and every autosave after it fails with an error
  // naming a node the writer pasted rather than typed. Dropping the block is
  // visible; an unsavable document is not. Pinned so a future change cannot
  // flip it in either direction without saying so.
  {
    const empty = editorSchema.nodes.figure.create({ image: null, alt: 'half built' });
    const rendered = renderedAttrs(empty);
    eq(
      'a figure with a null image writes no data-image, and pasting one is refused',
      [Object.keys(rendered).sort(), parseAttrs('figure', rendered)],
      [['data-alt', 'data-blog-node', 'data-priority', 'data-size'], false],
    );
  }
}

// The two halves have to AGREE, and nothing else here would catch them
// drifting: a `toDOM` emitting one tag while `parseDOM` selects another parses
// as a plain container, which silently keeps the CONTENT and loses the node.
{
  const selectorParts = /^([a-z]+)\[([a-z-]+)="([A-Za-z]+)"\]$/;
  for (const name of CUSTOM_NODE_NAMES) {
    const spec = editorSchema.nodes[name].spec;
    const filled = editorSchema.nodes[name].createAndFill();
    ok(`the ${name} fixture node could be built (fixture guard)`, filled !== null);
    if (!filled) continue;
    const rendered = renderSpecOf(filled);
    const tag = String(((spec.parseDOM ?? [])[0] as { tag?: string } | undefined)?.tag);
    const match = selectorParts.exec(tag);
    // The matcher only understands `tag[attr="value"]`, so a selector of any
    // other shape must fail here rather than pass unexamined.
    ok(`the ${name} parse selector is a shape this check can read`, match !== null);
    if (match) {
      eq(
        `the ${name} toDOM output satisfies its own parse selector`,
        [rendered.tag, rendered.attrs[match[2]]],
        [match[1], match[3]],
      );
    }
    // THE CONTENT HOLE, which is the one thing about a `toDOM` that the
    // attribute round trip above cannot see. A container rendering
    // `['div', attrs]` with no `0` serialises its attributes perfectly and
    // drops every child: copy a how-to and paste back an empty how-to. A leaf
    // declaring one is the mirror error, and prosemirror refuses to serialise
    // a leaf with a content hole at all.
    eq(
      `the ${name} rendering has a content hole exactly when it can hold content`,
      rendered.hole,
      !editorSchema.nodes[name].isLeaf,
    );
  }
}

// ── The node views ──────────────────────────────────────────────────────────
// They are applied in `BodyEditor` rather than in the leaf, because they are
// React and the leaf is imported by this script. So they cannot be run here;
// what CAN be pinned is that all eight exist, that each rides an `.extend()`
// of the entry already in the list (never a second extension of the same
// name), and that none of them touches anything schema-shaped, which is the
// one way a node view could invalidate the identity assertion above.
{
  const VIEWS_SRC = readRepoFile('../src/components/Admin/blogs/editor/nodeviews/index.ts');
  ok('read the node view map (drift guard)', VIEWS_SRC.length > 500);
  const code = stripComments(VIEWS_SRC);
  const declared = [...code.matchAll(/^\s{2}(\w+): view\(/gm)].map((match) => match[1]);
  eq('every custom node has a node view, and nothing else does', declared.sort(), [...CUSTOM_NODE_NAMES].sort());
  eq(
    'a node view rides .extend and adds addNodeView and nothing else',
    [
      /\.extend\(\{\s*addNodeView\(\)\s*\{/.test(code),
      // Anything below would land on the node SPEC and break the identity
      // assertion, which compares the schema built from the leaf and would
      // never see it.
      ...['addAttributes', 'renderHTML', 'parseHTML', 'content:', 'group:', 'atom:', 'addExtensions'].map(
        (field) => code.includes(field),
      ),
    ],
    [true, false, false, false, false, false, false, false],
  );
  // `step`, `pros` and `cons` have NO group: they exist only inside their
  // parent, so no node view may offer a way to create one standing alone.
  eq(
    'no node view inserts a node',
    ['insertContent', 'setNode(', 'BLOG_BLOCK_ITEMS', 'runBlogBlock'].filter((needle) =>
      code.includes(needle),
    ),
    [],
  );

  // AN OPTIONAL TEXT FIELD IS COERCED AT ITS COMMIT POINT, NEVER ON KEYSTROKE.
  // `'' -> null` inside an `onChange` makes a LEADING SPACE impossible: the
  // first space trims to empty, becomes null, and the controlled input
  // swallows it, so a caption can never begin with one and the field reads as
  // broken. It is invisible in every other check here, because the stored
  // document is perfectly valid either way. `FigureDialog` trims at submit;
  // the node view trims on blur, which is the same moment.
  const FIGURE_CODE = stripComments(
    readRepoFile('../src/components/Admin/blogs/editor/nodeviews/Figure.tsx'),
  );
  ok('read the figure node view (drift guard)', FIGURE_CODE.length > 1000);
  eq(
    'the figure controls coerce on blur, never on every keystroke',
    [
      [...FIGURE_CODE.matchAll(/onChange=\{[^}]*\}/g)].filter((match) => match[0].includes('trim(')),
      occurrences(FIGURE_CODE, 'onBlur='),
    ],
    [[], 3],
  );
}

// ── overrideByName: the door that cannot append ─────────────────────────────
// Two extensions with one name is a schema conflict, which is why the editor
// (and task 16's node views) replace entries rather than adding them. Both
// refusals are asserted as refusals: an override nobody applied looks exactly
// like a feature nobody wrote, and the schema comparison above would still
// pass.
{
  const replaced = overrideByName(EXTENSIONS, { link: (extension) => extension });
  eq('overrideByName replaces in place, never appends', replaced.length, EXTENSIONS.length);
  eq('and keeps the order', replaced.map((extension) => extension.name), EXTENSIONS.map((extension) => extension.name));
  ok(
    'it THROWS on a name that is not in the list',
    refuses(() => overrideByName(EXTENSIONS, { nosuchmark: (extension) => extension })),
  );
  ok(
    'and on an override that renames what it replaces',
    refuses(() =>
      overrideByName(EXTENSIONS, { link: (extension) => (extension as Mark).extend({ name: 'renamed' }) }),
    ),
  );
}

// ── What the menus can insert ───────────────────────────────────────────────
// Run through the REAL validator, one structure at a time, so a template that
// could not be saved fails here rather than under somebody's cursor.

const BLOCK_INSERTS = BLOG_BLOCK_ITEMS.filter(
  (item): item is BlogBlockItem & { action: { kind: 'insert'; content: JSONContent } } =>
    item.action.kind === 'insert',
);
ok('found the insertable structures (fixture guard)', BLOCK_INSERTS.length >= 3);

for (const item of BLOCK_INSERTS) {
  const result = validateBlogBody({ type: 'doc', content: [item.action.content] });
  eq(
    `the "${item.label}" block is a document the validator accepts`,
    result.ok ? [] : result.problems,
    [],
  );
  // The rule underneath it: a top-level insert must be a `block`. `step`,
  // `pros` and `cons` have no group at all, so this is what refuses a menu row
  // offering one on its own.
  const type = String(item.action.content.type);
  eq(
    `and "${item.label}" inserts a node the doc can hold directly`,
    blogSchema.nodes[type]?.spec.group ?? null,
    'block',
  );
}
// Stated positively too, because the two structures that hold the grouped
// nodes are the whole reason this vocabulary is data rather than commands.
eq(
  'the how-to carries a step and the pros and cons carries both halves',
  BLOCK_INSERTS.filter((item) => ['howTo', 'prosCons'].includes(item.id)).map((item) => [
    item.id,
    (item.action.content.content ?? []).map((child) => child.type),
  ]),
  [
    ['howTo', ['step']],
    ['prosCons', ['pros', 'cons']],
  ],
);

// The three DIALOG blocks, under the same sweep. They used to be exempt from
// it, because their JSON was written inline in `BodyEditor` rather than as a
// template here, so the section's claim covered eleven of fourteen menu
// entries and quietly left out the one carrying the trickiest shape in the
// vocabulary: a figure's nested `image`. They are builders rather than
// constants only because a dialog collects their values first; what they
// return is validated exactly like the rest.
{
  const built: [string, JSONContent][] = [
    ['YouTube video', youtubeBlock({ id: 'dQw4w9WgXcQ', external: true })],
    ['YouTube video (ours)', youtubeBlock({ id: 'dQw4w9WgXcQ', external: false })],
    ['Instagram post', instagramBlock({ id: 'AbC_123-x', type: 'reel' })],
    [
      'Image',
      figureBlock({ media: MEDIA, alt: 'Two camera operators', caption: 'On set', credit: 'Perseus' }),
    ],
    // A figure with nothing optional filled in, which is what the dialog
    // produces when the writer types only the required description.
    ['Image (bare)', figureBlock({ media: MEDIA, alt: 'A picture', caption: null, credit: null })],
  ];
  ok('found the dialog-built structures (fixture guard)', built.length === 5);
  for (const [label, content] of built) {
    const result = validateBlogBody({ type: 'doc', content: [content] });
    eq(`the "${label}" dialog builds a document the validator accepts`, result.ok ? [] : result.problems, []);
    eq(
      `and "${label}" builds a node the doc can hold directly`,
      blogSchema.nodes[String(content.type)]?.spec.group ?? null,
      'block',
    );
  }
  // Every dialog in the closed union has a builder, so a fourth added later
  // cannot go back to inline JSON without this going red.
  eq(
    'every dialog block has a builder under the sweep',
    [...BLOG_BLOCK_DIALOGS].sort(),
    [...new Set(built.map(([, content]) => String(content.type) === 'figure' ? 'image' : String(content.type)))].sort(),
  );
}

eq(
  'every block id is unique',
  BLOG_BLOCK_ITEMS.length,
  new Set(BLOG_BLOCK_ITEMS.map((item) => item.id)).size,
);
eq(
  'every command names one of the closed set',
  BLOG_BLOCK_ITEMS.filter((item) => item.action.kind === 'command')
    .map((item) => (item.action as { command: string }).command)
    .filter((command) => !BLOG_BLOCK_COMMANDS.includes(command as never)),
  [],
);
eq(
  'and every dialog does',
  BLOG_BLOCK_ITEMS.filter((item) => item.action.kind === 'dialog')
    .map((item) => (item.action as { dialog: string }).dialog)
    .filter((dialog) => !BLOG_BLOCK_DIALOGS.includes(dialog as never)),
  [],
);
// The filter WIDENS on an empty query, the `searchAllTokens` rule: a bare `/`
// that collapsed to nothing would look broken rather than empty.
eq('a bare slash offers the whole vocabulary', filterBlogBlocks('').length, BLOG_BLOCK_ITEMS.length);
eq('a keyword finds its block', filterBlogBlocks('reel').map((item) => item.id), ['instagram']);
eq('and a word in no keyword finds none', filterBlogBlocks('zzq'), []);

// ── The editor's own source ─────────────────────────────────────────────────

const EXT_SRC = readRepoFile('../src/lib/blogEditorExtensions.ts');
const BLOCKS_SRC = readRepoFile('../src/lib/blogEditorBlocks.ts');
const BODY_EDITOR_SRC = readRepoFile('../src/components/Admin/blogs/editor/BodyEditor.tsx');
const LAZY_SRC = readRepoFile('../src/components/Admin/blogs/editor/BodyEditorLazy.tsx');
const BLOCKRUN_SRC = readRepoFile('../src/components/Admin/blogs/editor/blockRun.ts');
const TOOLBAR_SRC = readRepoFile('../src/components/Admin/blogs/editor/EditorToolbar.tsx');
const ARTICLEBODY_SRC = readRepoFile('../src/components/Blogs/post/ArticleBody.tsx');

ok('read the editor extension leaf (drift guard)', EXT_SRC.length > 2000);
ok('read the block vocabulary (drift guard)', BLOCKS_SRC.length > 2000);
ok('read BodyEditor (drift guard)', BODY_EDITOR_SRC.length > 2000);
ok('read BodyEditorLazy (drift guard)', LAZY_SRC.length > 500);
ok('read blockRun (drift guard)', BLOCKRUN_SRC.length > 500);
ok('read the toolbar (drift guard)', TOOLBAR_SRC.length > 2000);

const EXT_CODE = stripComments(EXT_SRC);
const BODY_EDITOR_CODE = stripComments(BODY_EDITOR_SRC);

// The trap `blogBody.ts` names by hand. Asserted on the IMPORT rather than on
// the schema alone, because the schema comparison above would catch the
// attributes while saying nothing about which mistake produced them.
eq(
  'the editor never composes Tiptap own Link extension',
  [
    EXT_CODE.includes('@tiptap/extension-link'),
    BODY_EDITOR_CODE.includes('@tiptap/extension-link'),
  ],
  [false, false],
);
// Nor autolink or link-on-paste, which mint hrefs that never passed safeHref.
eq(
  'and turns on no automatic linking',
  [/\bautolink\b/i.test(EXT_CODE), /linkOnPaste/i.test(EXT_CODE)],
  [false, false],
);

// `safeHref` inside the COMMAND, not only in the dialog: the command is the
// door every caller reaches, and the dialog's copy is a message rather than a
// control.
{
  // Sliced from `addCommands` rather than from the name, because the name's
  // FIRST occurrence is in the `declare module` block above it, where a
  // signature says nothing about what the command does.
  const setLink = stripComments(
    region(EXT_SRC, 'addCommands() {', 'addKeyboardShortcuts() {', 'the link commands'),
  );
  ok('setBlogLink runs the href through safeHref before marking it', setLink.includes('safeHref('));
  ok('and refuses rather than marking when it is not safe', /=== null\s*\n?\s*\?\s*false/.test(setLink));
}

// AND THE COMMAND IS NOT THE ONLY WAY AN HREF CAN REACH A DOCUMENT, which is
// the half the comment above `setBlogLink` used to claim it was.
// `insertContent` takes a JSON node and a JSON node may carry marks, so a
// caller can hand-write `marks: [{ type: 'link', attrs: { href } }]` and route
// around the guard entirely. `applyLink`'s no-selection branch did, and was
// safe only because `LinkDialog` happened to pass the `safeHref` OUTPUT rather
// than what was typed, which nothing asserted.
//
// Two assertions, because either alone leaves a way through: the gate must be
// in `applyLink` itself (a refused href must change nothing, since
// `chain().run()` dispatches its transaction even when a command in it
// returned false, so a late refusal would still leave the words behind), and
// no `link` mark may be built by hand anywhere in the file.
{
  const applyLink = stripComments(
    region(BODY_EDITOR_SRC, 'function applyLink(', 'function insertEmbed(', 'applyLink'),
  );
  ok('applyLink gates on safeHref before it writes anything', applyLink.includes('safeHref(href) === null'));
  ok('and applies the mark through setBlogLink on both branches', occurrences(applyLink, 'setBlogLink(') === 2);
  // `BODY_EDITOR_CODE` is `stripComments(BODY_EDITOR_SRC)`, declared above, so
  // the comment two paragraphs up that spells `marks: [{ type: 'link' }]` out
  // in prose does not trip this. Named here because the variable's own name
  // does not say so, and a reader checking the raw-source-slice trap this plan
  // has been bitten by would otherwise have to go and look.
  eq(
    'no link mark is ever built by hand in BodyEditor',
    [/type:\s*'link'/.test(BODY_EDITOR_CODE), /marks:\s*\[/.test(BODY_EDITOR_CODE)],
    [false, false],
  );
}

// The node views are attached through the door that cannot append: two
// extensions named `figure` is a schema conflict, and a spread beside the
// composed list is how that happens.
eq(
  'BodyEditor attaches the node views through overrideByName, in the one call it already makes',
  [BODY_EDITOR_CODE.includes('...BLOG_NODE_VIEWS'), occurrences(BODY_EDITOR_CODE, 'overrideByName(')],
  [true, 1],
);

// The three dialog paths build their nodes through the shared vocabulary, so
// the validator sweep above is a claim about what this file actually inserts
// rather than about three constants nobody uses.
eq(
  'and it inserts the dialog blocks through the builders rather than inline JSON',
  [
    BODY_EDITOR_CODE.includes('youtubeBlock('),
    BODY_EDITOR_CODE.includes('instagramBlock('),
    BODY_EDITOR_CODE.includes('figureBlock('),
    /type:\s*'(youtube|instagram|figure)'/.test(BODY_EDITOR_CODE),
  ],
  [true, true, true, false],
);

// The editor's list IS the checked list. A spread would let an entry be
// appended beside the composed ones, and the schema comparison above reads
// `BLOG_EDITOR_EXTENSIONS`, so an appended node would never be compared.
eq(
  'BodyEditor composes through overrideByName and never spreads the list',
  [
    BODY_EDITOR_CODE.includes('overrideByName(BLOG_EDITOR_EXTENSIONS'),
    BODY_EDITOR_CODE.includes('...BLOG_EDITOR_EXTENSIONS'),
  ],
  [true, false],
);

// The prose class lands on the ProseMirror ROOT. Its selectors are
// direct-child (`[&>h2]`), so on a wrapper div none of them would match and
// the canvas would silently stop looking like the article.
ok(
  'ARTICLE_BODY_CLASS is applied through editorProps.attributes.class',
  /editorProps:\s*\{\s*attributes:\s*\{\s*class:\s*cn\(\s*ARTICLE_BODY_CLASS/.test(BODY_EDITOR_CODE),
);
// One string, two surfaces. The public page reads the same leaf rather than
// declaring its own copy.
eq(
  'and the public article reads the same leaf rather than declaring the string',
  [
    ARTICLEBODY_SRC.includes("from '@/lib/articleBodyClass'"),
    /export const ARTICLE_BODY_CLASS/.test(ARTICLEBODY_SRC),
  ],
  [true, false],
);

// The lazy door. `ssr: false` is what keeps a hydration mismatch impossible
// (useEditor renders nothing on the server) and the import out of the RSC
// graph.
ok('BodyEditorLazy loads the canvas with ssr disabled', /ssr:\s*false/.test(stripComments(LAZY_SRC)));

// THE CHUNK RULE, asserted over the whole tree rather than trusted. One eager
// import anywhere puts ProseMirror in the chunk group every admin route loads.
{
  const importers = readdirSync(new URL('../src/', import.meta.url), { recursive: true })
    .map((entry) => String(entry))
    .filter((entry) => /\.(ts|tsx)$/.test(entry))
    .filter((entry) => {
      const source = readFileSync(new URL(`../src/${entry}`, import.meta.url), 'utf8');
      return /(from|import)\s*\(?\s*['"][^'"]*editor\/BodyEditor['"]/.test(source);
    })
    .sort();
  ok('the tree scan found files to read (fixture guard)', importers.length > 0);
  eq(
    'only BodyEditorLazy reaches BodyEditor, and it does so dynamically',
    importers,
    ['components/Admin/blogs/editor/BodyEditorLazy.tsx'],
  );
}

// The `/` menu and the toolbar run the SAME vocabulary through the SAME door,
// so a block cannot behave differently depending on which control added it.
{
  const toolBlocks = region(TOOLBAR_SRC, 'const TOOL_BLOCKS', '];', 'TOOL_BLOCKS');
  const ids = [...toolBlocks.matchAll(/id: '([^']+)'/g)].map((match) => match[1]);
  ok('found the toolbar block ids (fixture guard)', ids.length >= 10);
  eq(
    'every toolbar block is an entry of the one vocabulary',
    ids.filter((id) => !BLOG_BLOCK_ITEMS.some((item) => item.id === id)),
    [],
  );
  eq(
    'and both controls apply it through runBlogBlock',
    [TOOLBAR_SRC.includes('runBlogBlock('), BODY_EDITOR_SRC.includes('runBlogBlock(')],
    [true, true],
  );
}
// The switch is exhaustive at runtime as well as at the type level: a `never`
// arm is compile-time only, and this file runs the shipped source.
eq(
  'runBlogBlock has a case for every command in the vocabulary',
  BLOG_BLOCK_COMMANDS.filter((command) => !BLOCKRUN_SRC.includes(`case '${command}':`)),
  [],
);

// ── Member-visible copy carries no em dash ──────────────────────────────────
// The same sweep the doors get, over the surface a writer reads all day.
//
// It READS THE DIRECTORY rather than a list of filenames, and the difference
// is not tidiness: a hand-written list covers the files that existed when
// somebody wrote it, so `blockRun.ts`, `editorBox.ts`, `BodyEditorLazy.tsx`
// and every node view added later sat outside the sweep while it looked
// complete. The two leaves live in `src/lib/` and are named explicitly for the
// same reason the actions file is: their labels and hints ARE the menu.
{
  const editorDir = new URL('../src/components/Admin/blogs/editor/', import.meta.url);
  const editorFiles = readdirSync(editorDir, { recursive: true })
    .map((entry) => String(entry))
    .filter((entry) => /\.tsx?$/.test(entry))
    .sort();
  // A directory read that came back short would make every assertion below
  // trivially true, which is the shape of a check that proves nothing.
  ok('the editor directory read found its files (fixture guard)', editorFiles.length >= 12);
  ok(
    'and it reached the node views (fixture guard)',
    editorFiles.filter((entry) => entry.startsWith('nodeviews/')).length >= 8,
  );

  // And it scans the WHOLE stripped source rather than only the string
  // literals, which is the form the rest of this file uses. Mutation testing
  // is what found the difference: an em dash written into a node view's JSX
  // TEXT (`<span>Step-by-step</span>`) is not a string literal at all, and
  // neither is a double-quoted JSX attribute, since `literals` reads `'…'` and
  // backticks only. Both are member-visible copy, and the editor directory is
  // the first place in this feature where most of the copy is JSX.
  for (const [label, code] of [
    ['blogEditorBlocks.ts', stripComments(BLOCKS_SRC)],
    ['blogEditorExtensions.ts', EXT_CODE],
    ...editorFiles.map(
      (entry) =>
        [entry, stripComments(readRepoFile(`../src/components/Admin/blogs/editor/${entry}`))] as const,
    ),
  ] as const) {
    eq(
      `no em dash anywhere in ${label} outside its comments`,
      [...code.matchAll(/.{0,30}—.{0,30}/g)].map((match) => match[0]),
      [],
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 13. The editor's own decisions (src/lib/blogEditorFields.ts)
// ═══════════════════════════════════════════════════════════════════════════
// The writing screen is a client entry this script cannot import, so every
// decision it makes that could be silently wrong was moved into that leaf
// (the `taskCalendar.ts` / `digestEmail.ts` arrangement). Six of them, and
// each fails in its own quiet way:
//
//  - `buildPostFields` maps a form's `''` back onto a nullable column. Miss
//    one and either the save is refused (the two path shapes) or both
//    fingerprints move for a change nobody made, which republishes a
//    freshness signal and pings IndexNow for 38 unchanged URLs.
//  - `compactPostLists` drops the rows nobody typed into. Without it a writer
//    who clicks "Add FAQ" and types one space has every autosave refused
//    while they are still thinking.
//  - `clampDayMinutes` bounds a picked time by the day's REAL length. Section
//    10 pinned that 23:00 on the 23-hour spring-forward day is really the
//    next day and said outright that whatever offers a time picker has to
//    bound it. This is that bound, and without it a scheduled post goes live
//    a day late, once a year.
//  - `nextSlugFollow` must never re-arm. A writer who typed an address and
//    kept editing the title would otherwise watch it rewrite itself.
//  - `blogEditorActions` is derived from `transitionProblem`, so the bar can
//    never offer a move the state leaf refuses.
//  - `inspectorPaneFor` decides which pane a refused field lives in, which on
//    a phone is the difference between a message that points somewhere and
//    one that just says no.

// ---- The form fixture -----------------------------------------------------
// Built from POST rather than written out, so a field added to the payload is
// a type error here rather than an untested column. Nullable columns are held
// as the editor holds them: `''`.
const FORM: BlogEditorValues = {
  slug: POST.slug,
  title: POST.title,
  description: POST.description,
  categorySlug: POST.categorySlug,
  authorSlug: POST.authorSlug,
  serviceSlug: '',
  heroStaticPath: HERO_PATH,
  heroMedia: null,
  heroAlt: POST.heroAlt,
  heroCaption: '',
  body: realBody as BlogDoc,
  keyTakeaways: ['a'],
  faqs: [{ question: 'q', answer: 'a' }],
  sources: [{ title: 's', href: 'https://a.b/c' }],
  entities: [{ name: 'n', sameAs: ['https://www.wikidata.org/wiki/Q1'], primary: true }],
  relatedSlugs: ['y'],
  seoTitle: POST.seoTitle,
  seoDescription: POST.seoDescription,
  canonicalOverride: '',
  ogTitle: POST.ogTitle,
  ogDescription: POST.ogDescription,
  ogImageStaticPath: '',
  ogImageMedia: null,
  twitterCard: 'summary_large_image',
  robotsIndex: true,
  robotsFollow: true,
  robotsExtra: {},
  focusKeywords: ['k'],
  emitLegacyMetaKeywords: false,
  llmsInclude: true,
};

// ---- buildPostFields ------------------------------------------------------
// The whole point of the function, asserted against the door it feeds: the
// payload the form produces must be a payload BOTH doors accept. A `''` left
// on `heroStaticPath` is refused by the path regex, so this is not a
// hypothetical.
ok('the form fixture builds a payload the draft door accepts', blogDraftSchema.safeParse(buildPostFields(FORM)).success);
ok('and one the publish door accepts (fixture guard)', blogPublishSchema.safeParse(buildPostFields(FORM)).success);

// Every nullable column, empty in the form, must arrive as null. Written as a
// sweep so a nullable column added later has to be added here to pass.
eq(
  'every empty nullable field becomes null, never an empty string',
  (() => {
    const built = buildPostFields({
      ...FORM,
      serviceSlug: '',
      heroStaticPath: '',
      heroCaption: '',
      canonicalOverride: '',
      ogImageStaticPath: '',
    }) as Record<string, unknown>;
    return ['serviceSlug', 'heroStaticPath', 'heroCaption', 'canonicalOverride', 'ogImageStaticPath']
      .filter((key) => built[key] !== null);
  })(),
  [],
);
// A field holding only spaces is empty too: the draft door refuses a
// whitespace-only value on anything with a minimum, and a whitespace-only
// path or URL is malformed whatever the minimum.
eq(
  'a whitespace-only nullable field is also null',
  buildPostFields({ ...FORM, heroCaption: '   ' }).heroCaption,
  null,
);
// And a value that IS there survives, trimmed. (Without this the assertion
// above would pass on a function that returned null for everything.)
eq(
  'a filled nullable field survives, trimmed',
  buildPostFields({ ...FORM, heroCaption: '  Under the picture  ' }).heroCaption,
  'Under the picture',
);
eq(
  'an empty robotsExtra becomes null, the value all 38 imported rows carry',
  buildPostFields({ ...FORM, robotsExtra: {} }).robotsExtra,
  null,
);
eq(
  'and a non-empty one is passed through whole',
  buildPostFields({ ...FORM, robotsExtra: { noarchive: true } }).robotsExtra,
  { noarchive: true },
);
// The snapshot the editor compares for equality is `JSON.stringify` of this
// object, so the KEY ORDER is part of the contract: the same values in a
// different order do not compare equal, and every save would look dirty.
eq(
  'the payload key order is fixed',
  Object.keys(buildPostFields(FORM)).join(','),
  'slug,title,description,categorySlug,authorSlug,serviceSlug,heroStaticPath,heroMedia,heroAlt,heroCaption,keyTakeaways,faqs,sources,entities,relatedSlugs,seoTitle,seoDescription,canonicalOverride,ogTitle,ogDescription,ogImageStaticPath,ogImageMedia,twitterCard,robotsIndex,robotsFollow,robotsExtra,focusKeywords,emitLegacyMetaKeywords,llmsInclude,body',
);
// Twice over the same form is byte-identical, which is what makes an unchanged
// document read as saved rather than as one more autosave every 1.5 seconds.
eq(
  'the same form builds the same bytes twice',
  JSON.stringify(buildPostFields(FORM)) === JSON.stringify(buildPostFields(FORM)),
  true,
);
// `customSchema` has no editor and survives every save by never being named.
// The payload is `.strict()`-parsed, so naming it would be a refusal rather
// than a silent overwrite, but the absence is the mechanism and is asserted.
ok('the payload never carries customSchema', !('customSchema' in buildPostFields(FORM)));

// ---- compactPostLists -----------------------------------------------------
// The asymmetry IS the function: an entirely blank row is an affordance, a
// half-filled one is incomplete data the publish door is right to refuse.
{
  const messy = compactPostLists({
    keyTakeaways: ['real', '', '   '],
    focusKeywords: ['  ', 'seo'],
    faqs: [
      { question: 'q', answer: 'a' },
      { question: '', answer: '' },
      { question: ' ', answer: '\t' },
      { question: 'half', answer: '' },
    ],
    sources: [
      { title: 't', href: 'https://a.b' },
      { title: '', href: '' },
      { title: 'half', href: '' },
    ],
    entities: [
      { name: 'n', sameAs: ['https://a.b', ''], primary: true },
      { name: '', sameAs: ['', '  '], primary: false },
      { name: 'named but unlinked', sameAs: [''], primary: false },
    ],
  });
  eq('a blank takeaway is dropped and a real one kept', messy.keyTakeaways, ['real']);
  eq('a blank keyword is dropped', messy.focusKeywords, ['seo']);
  eq(
    'an entirely blank FAQ is dropped and a HALF-filled one survives',
    messy.faqs,
    [
      { question: 'q', answer: 'a' },
      { question: 'half', answer: '' },
    ],
  );
  eq(
    'the same rule for a source',
    messy.sources,
    [
      { title: 't', href: 'https://a.b' },
      { title: 'half', href: '' },
    ],
  );
  eq(
    'an entity drops its blank links, and a named-but-unlinked one survives',
    messy.entities,
    [
      { name: 'n', sameAs: ['https://a.b'], primary: true },
      { name: 'named but unlinked', sameAs: [], primary: false },
    ],
  );
}
// The refusal the drop exists to prevent, stated as the schema's own answer:
// the DRAFT door refuses a whitespace-only array item, which is why an empty
// row can never be sent.
ok(
  'the draft door really refuses a whitespace-only takeaway (fixture guard)',
  !blogDraftSchema.safeParse({ ...POST, keyTakeaways: [' '] }).success,
);
ok(
  'and a whitespace-only FAQ question',
  !blogDraftSchema.safeParse({ ...POST, faqs: [{ question: ' ', answer: 'a' }] }).success,
);
// A trailing blank row is exactly what a writer leaves behind, and the payload
// built from it is accepted.
ok(
  'a form carrying one empty row of everything still builds an acceptable payload',
  blogDraftSchema.safeParse(
    buildPostFields({
      ...FORM,
      keyTakeaways: [...FORM.keyTakeaways, ''],
      focusKeywords: [...FORM.focusKeywords, ''],
      faqs: [...FORM.faqs, { question: '', answer: '' }],
      sources: [...FORM.sources, { title: '', href: '' }],
      entities: [...FORM.entities, { name: '', sameAs: [''], primary: false }],
    }),
  ).success,
);

// ---- The schedule's minute bound ------------------------------------------
// SPRING and FALL are the two Vancouver transition days section 10 already
// pins. The lengths are asserted first, or every clamp below would be a
// statement about a 1440-minute day.
eq('a spring-forward day is 1380 minutes long', dayLengthMinutes(STUDIO_TZ, SPRING), 1380);
eq('a fall-back day is 1500', dayLengthMinutes(STUDIO_TZ, FALL), 1500);
eq('an ordinary day is 1440', dayLengthMinutes(STUDIO_TZ, '2026-06-15'), 1440);
eq('and Tehran, which has no DST, is 1440 on both of those days', [
  dayLengthMinutes(TEHRAN, SPRING),
  dayLengthMinutes(TEHRAN, FALL),
], [1440, 1440]);

// THE REGRESSION, in one line: 23:00 on the short day is pulled back to the
// last minute the day really has.
eq('23:00 on the spring-forward day clamps to 22:59', clampDayMinutes(STUDIO_TZ, SPRING, 23 * 60), 1379);
eq('the same 23:00 on an ordinary day is untouched', clampDayMinutes(STUDIO_TZ, '2026-06-15', 23 * 60), 1380);
eq('and on the 25-hour day a picker could not even reach the end', clampDayMinutes(STUDIO_TZ, FALL, 23 * 60), 1380);
eq('a negative minute floors at midnight', clampDayMinutes(STUDIO_TZ, SPRING, -30), 0);
eq('and a value that is not a number does too', clampDayMinutes(STUDIO_TZ, SPRING, Number.NaN), 0);

// The property that matters, swept: a scheduled post fires on the day it was
// scheduled for, every minute of every one of the three days, in both zones.
{
  let escaped = 0;
  let sweptPicks = 0;
  for (const tz of [STUDIO_TZ, TEHRAN]) {
    for (const key of [SPRING, FALL, '2026-06-15']) {
      // 0 to 1439 is what a native <input type="time"> can produce, whatever
      // the day's real length is, which is exactly the input the clamp exists
      // to survive.
      for (let m = 0; m < 1440; m += 5) {
        sweptPicks++;
        if (studioDayFor(scheduleInstant(tz, key, m)) !== dayKeyIn(STUDIO_TZ, scheduleInstant(tz, key, m))) escaped++;
        if (dayKeyIn(tz, scheduleInstant(tz, key, m)) !== key) escaped++;
      }
    }
  }
  eq('the clamp sweep really ran', sweptPicks, 2 * 3 * 288);
  eq('no pickable time escapes the day it was picked on', escaped, 0);
}
// And the UNCLAMPED helper still escapes, which is what proves the sweep above
// is testing the clamp rather than a property `dayTimeIn` already had.
ok(
  'the raw helper does escape, so the sweep is not vacuous',
  dayKeyIn(STUDIO_TZ, dayTimeIn(STUDIO_TZ, SPRING, 23 * 60)) !== SPRING,
);

// The readout's whole reason: a morning time picked in Tehran is the PREVIOUS
// day on the studio's clock, which is the day the public blog would print.
eq(
  'a Tehran writer picking 09:00 lands on the previous Vancouver day',
  studioDayFor(scheduleInstant(TEHRAN, '2026-06-15', 9 * 60)),
  '2026-06-14',
);
eq(
  'while a Vancouver writer picking 09:00 stays on the day they picked',
  studioDayFor(scheduleInstant(STUDIO_TZ, '2026-06-15', 9 * 60)),
  '2026-06-15',
);

// The two time-field converters. `null` rather than a coerced number is what
// keeps a half-typed value from jumping the stored minute to midnight.
eq('540 renders as 09:00', minutesToTimeValue(540), '09:00');
eq('0 renders as 00:00', minutesToTimeValue(0), '00:00');
eq('1439 renders as 23:59', minutesToTimeValue(1439), '23:59');
eq('09:00 parses back to 540', timeValueToMinutes('09:00'), 540);
eq(
  'and every minute of a day round-trips',
  (() => {
    for (let m = 0; m < 1440; m++) {
      if (timeValueToMinutes(minutesToTimeValue(m)) !== m) return m;
    }
    return -1;
  })(),
  -1,
);
eq(
  'a malformed time is refused rather than coerced',
  ['', '9:00', '24:00', '12:60', '0900', 'ab:cd'].map((v) => timeValueToMinutes(v)),
  [null, null, null, null, null, null],
);

// ---- The slug follow ------------------------------------------------------
// Armed only while the slug is still the generated placeholder AND the post is
// not locked. Both halves, because either one alone would rewrite an address
// somebody chose or one the door then refuses.
eq('a placeholder slug on an unlocked post arms the follow', slugFollowArms({ slug: newDraftSlug(() => 'abcdef12'), slugLocked: false }), 'armed');
eq('a chosen slug does not', slugFollowArms({ slug: 'a-real-slug', slugLocked: false }), 'off');
eq('and neither does a placeholder on a locked post', slugFollowArms({ slug: newDraftSlug(() => 'abcdef12'), slugLocked: true }), 'off');

// The transition table, swept. `off` is ABSORBING: that is the "never
// re-arms" rule, and writing it as a sweep is what forces an event added
// later through the decision rather than letting it inherit one.
{
  const states: SlugFollow[] = ['armed', 'off'];
  const events: SlugFollowEvent[] = ['title-edited', 'slug-edited', 'published'];
  let sweptFollow = 0;
  for (const state of states) {
    for (const event of events) {
      sweptFollow++;
      const want: SlugFollow = state === 'off' ? 'off' : event === 'title-edited' ? 'armed' : 'off';
      eq(`slug follow ${state} + ${event} -> ${want}`, nextSlugFollow(state, event), want);
    }
  }
  eq('the slug-follow sweep covered every pair', sweptFollow, states.length * events.length);

  // The property the sweep implies, stated outright over every sequence of
  // three events: once anything but a title edit has happened, no amount of
  // typing in the title brings the follow back.
  let reArmed = 0;
  let sequences = 0;
  for (const a of events) {
    for (const b of events) {
      for (const c of events) {
        sequences++;
        const sequence = [a, b, c];
        const end = sequence.reduce<SlugFollow>((state, event) => nextSlugFollow(state, event), 'armed');
        if (sequence.some((event) => event !== 'title-edited') && end !== 'off') reArmed++;
      }
    }
  }
  eq('every three-event sequence was walked', sequences, events.length ** 3);
  eq('and none of them re-armed the follow', reArmed, 0);
  eq(
    'while three title edits in a row leave it armed (so the sweep is not vacuous)',
    (['title-edited', 'title-edited', 'title-edited'] as SlugFollowEvent[]).reduce<SlugFollow>(
      (state, event) => nextSlugFollow(state, event),
      'armed',
    ),
    'armed',
  );
}

// What the follow actually does with a title, which is where its three
// refusals live. Each one is a different way the address could be corrupted,
// and none of them shows on screen: the field simply holds a value the door
// then refuses.
{
  const armed = { slug: 'draft-abcdef12', follow: 'armed' as SlugFollow, slugLocked: false };
  eq('an armed follow takes the candidate', nextSlug(armed, 'a-real-title'), 'a-real-title');
  eq('a follow that is off keeps the slug', nextSlug({ ...armed, follow: 'off' }, 'a-real-title'), 'draft-abcdef12');
  eq('a locked post keeps it whatever the state says', nextSlug({ ...armed, slugLocked: true }, 'a-real-title'), 'draft-abcdef12');
  // Clearing the title slugifies to '', which no door accepts. The placeholder
  // stays rather than every later autosave being refused on a field nobody
  // touched.
  eq('an empty candidate keeps the placeholder', nextSlug(armed, ''), 'draft-abcdef12');
  ok(
    'and the placeholder it keeps is one the door would take (fixture guard)',
    blogSlugSchema.safeParse(nextSlug(armed, '')).success,
  );
}

// ---- What the bar offers --------------------------------------------------
// Swept over every status x both histories and compared against
// `transitionProblem` INDEPENDENTLY, so the derivation cannot drift from the
// leaf the database's CHECK constraints stand behind.
{
  let sweptActions = 0;
  for (const status of BLOG_POST_STATUSES) {
    for (const everPublished of [false, true]) {
      sweptActions++;
      const history = { everPublished };
      const actions = blogEditorActions(status, history);
      const can = (to: BlogPostStatus) => transitionProblem(status, to, history) === null;
      eq(`${status}/${everPublished}: publish offered iff the move is allowed`, actions.publish, can('published'));
      eq(`${status}/${everPublished}: schedule offered iff the move is allowed`, actions.schedule, can('scheduled'));
      eq(`${status}/${everPublished}: unpublish offered iff the move is allowed`, actions.unpublish, can('archived'));
      eq(`${status}/${everPublished}: trash offered iff the move is allowed`, actions.trash, can('trash'));
      // The three that are not transitions carry their own condition.
      eq(`${status}/${everPublished}: reschedule only on a scheduled post`, actions.reschedule, status === 'scheduled');
      eq(`${status}/${everPublished}: unschedule only on a scheduled post`, actions.unschedule, status === 'scheduled');
      eq(`${status}/${everPublished}: the date may be amended only on a live post`, actions.amendDate, status === 'published');
      eq(`${status}/${everPublished}: restore only from the bin`, actions.restore, status === 'trash');
      eq(`${status}/${everPublished}: saving is refused only in the bin`, actions.save, status !== 'trash');
    }
  }
  eq('the action sweep covered every status x history', sweptActions, BLOG_POST_STATUSES.length * 2);
}
// Purge is deliberately ABSENT from the editor: it is the one irreversible act
// in this domain and stays on the list, behind its own confirm, on a row
// somebody has already binned.
ok(
  'the editor offers no purge',
  !('purge' in blogEditorActions('trash', { everPublished: false })),
);

// The primary button: one action, one label, returned as a pair so a button
// cannot say Update and open the schedule fields.
eq('a draft publishes', primaryAction('draft'), { action: 'publish', label: 'Publish' });
eq('an archived post publishes again', primaryAction('archived'), { action: 'publish', label: 'Publish' });
eq('a live post updates', primaryAction('published'), { action: 'update', label: 'Update' });
eq('a scheduled post moves its schedule', primaryAction('scheduled'), { action: 'reschedule', label: 'Schedule' });
eq('and a binned post has no primary action at all', primaryAction('trash'), null);
// The coupling the bar depends on: it renders the primary button only when
// `actions.publish` is true, so a status with a primary and no publish would
// compute a button nobody could press.
eq(
  'every status with a primary action can also reach the publish door',
  BLOG_POST_STATUSES.filter(
    (status) =>
      primaryAction(status) !== null &&
      !blogEditorActions(status, { everPublished: true }).publish,
  ),
  [],
);
// The bar draws the primary button only when the flag for the action it FIRES
// is set, and the pairing is a map rather than a condition in the bar. The bar
// used to gate every primary on `publish`, which is right for two of the three
// and right for the third only because `scheduled -> published` happens to be
// allowed: forbidding that later would have removed the Schedule button from
// every scheduled post with nothing red.
eq(
  'the gate map covers every primary action, and nothing else',
  Object.keys(PRIMARY_ACTION_GATE).sort(),
  ['publish', 'reschedule', 'update'],
);
eq(
  'and every status whose primary the bar draws may really take that move',
  BLOG_POST_STATUSES.filter((status) => {
    const primary = primaryAction(status);
    if (primary === null) return false;
    return !blogEditorActions(status, { everPublished: true })[PRIMARY_ACTION_GATE[primary.action]];
  }),
  [],
);
// The one that would have caught the bug: a scheduled post's primary is gated
// on `reschedule`, NOT on `publish`.
eq('a scheduled post is gated on rescheduling', PRIMARY_ACTION_GATE.reschedule, 'reschedule');

// The label and the action are a BIJECTION, which is the property the pair
// exists to hold. Two statuses may share a label (a draft and an archived post
// both say Publish and both publish), but one word must never open two
// different dialogs, and one dialog must never wear two words.
{
  const pairs = BLOG_POST_STATUSES.map((status) => primaryAction(status)).filter(
    (pair): pair is NonNullable<ReturnType<typeof primaryAction>> => pair !== null,
  );
  ok('the primary sweep found pairs (fixture guard)', pairs.length === BLOG_POST_STATUSES.length - 1);
  eq(
    'no label opens two different dialogs',
    [...new Set(pairs.map((p) => p.label))].filter(
      (label) => new Set(pairs.filter((p) => p.label === label).map((p) => p.action)).size !== 1,
    ),
    [],
  );
  eq(
    'and no dialog is reached by two different words',
    [...new Set(pairs.map((p) => p.action))].filter(
      (action) => new Set(pairs.filter((p) => p.action === action).map((p) => p.label)).size !== 1,
    ),
    [],
  );
  ok('no primary label carries an em dash', pairs.every((pair) => !pair.label.includes('—')));
}

// ---- Where a refused field lives ------------------------------------------
// Every field the draft door accepts must be claimed by a pane, or a refusal
// names a control the writer is never shown.
{
  const shape = Object.keys(blogDraftSchema.shape);
  ok('read the draft schema shape (fixture guard)', shape.length >= 25);
  eq(
    'every field the door accepts is claimed by a pane',
    shape.filter((field) => !['post', 'seo', 'canvas'].includes(inspectorPaneFor(field))),
    [],
  );
  // The canvas set is the one that has to be right: RULING 31 put the hero's
  // image, description and caption on the canvas with `HeroField`, not in the
  // Post pane, and this is where that decision is written down.
  eq(
    'the canvas owns the title, the body and the whole hero',
    shape.filter((field) => inspectorPaneFor(field) === 'canvas').sort(),
    ['body', 'heroAlt', 'heroCaption', 'heroMedia', 'heroStaticPath', 'title'],
  );
  eq(
    'the SEO pane owns exactly the search and social fields',
    shape.filter((field) => inspectorPaneFor(field) === 'seo').sort(),
    [
      'canonicalOverride',
      'emitLegacyMetaKeywords',
      'focusKeywords',
      'ogDescription',
      'ogImageMedia',
      'ogImageStaticPath',
      'ogTitle',
      'robotsExtra',
      'robotsFollow',
      'robotsIndex',
      'seoDescription',
      'seoTitle',
      'twitterCard',
    ],
  );
  // A per-entry failure is keyed `faqs.2.answer` by flattenBlogIssues, so the
  // FIRST segment is what decides.
  eq('a per-entry key resolves by its first segment', inspectorPaneFor('faqs.2.answer'), 'post');
  eq('and so does a robots key', inspectorPaneFor('robotsExtra.max-snippet'), 'seo');
  // Anything unrecognised falls to the Post pane rather than throwing: a wrong
  // tab costs a glance, and `_form` is not a field at all.
  eq('an unknown key falls to the Post pane', inspectorPaneFor('_form'), 'post');
}

// ---- The word-count notice ------------------------------------------------
// Said once, on the first save of an imported post, because the editor's
// formula is not the importer's and the difference moves the visible byline.
//
// THE IMPORTED GATE IS THE HALF THAT MATTERS, and it is the defect the review
// found: `previousWordCount` is the working row's count read immediately
// before the write, so ANY edit at all moves it. Without the gate a writer
// adding one sentence to a mature post gets a twelve-second toast about an
// import formula, on a post that was never imported, in every session.
eq('a post the editor has already written to says nothing', describeWordCountChange(1438, 1214, false), null);
eq('nor does a brand-new post, whose count moves from nothing', describeWordCountChange(0, 900, false), null);
eq('nothing is said when the count did not move', describeWordCountChange(1438, 1438, true), null);
{
  const down = describeWordCountChange(1438, 1214, true) ?? '';
  ok('a drop names both numbers', down.includes('1,438') && down.includes('1,214'));
  ok('and says which way it went', down.includes('down') && !down.includes(' up '));
  ok('a rise says the other', (describeWordCountChange(100, 200, true) ?? '').includes('up'));
  ok('the sentence carries no em dash', !down.includes('—'));
  ok('and it explains what the editor counts', down.toLowerCase().includes('faq'));
}

// ---- The word-count readout -----------------------------------------------
// It states the STORED count, which is the number the byline is derived from,
// and says so while there is unsaved work rather than letting a stale figure
// read as current.
eq('the readout names the count and the reading time', wordCountLine(1214, false), '1,214 words, about 7 min read.');
eq('one word is singular', wordCountLine(1, false), '1 word, about 1 min read.');
eq('an empty post still reads as a minute', wordCountLine(0, false), '0 words, about 1 min read.');
ok('and it says when the figure is not current', wordCountLine(1214, true).includes('at the last save'));
ok('while a saved post says nothing of the sort', !wordCountLine(1214, false).includes('at the last save'));
ok('no em dash in the readout', !wordCountLine(1214, true).includes('—'));

// ---- Whether the stored count is still the importer's ---------------------
// The fold over the provenance row. Both halves matter and the imported one is
// the half that is easy to drop: a post created in the editor has no revisions
// at all until its first explicit Save, so `edited !== true` is true of it too.
// The `--db` half below runs the real SQL that fills this row.
const PROVENANCE = { imported: true, edited: false, importWordCount: 1438, workingWordCount: 1438 };
eq('imported, unedited, and the count still the one it wrote', isLegacyWordCount(PROVENANCE), true);
eq('one editor revision anywhere, and it is not', isLegacyWordCount({ ...PROVENANCE, edited: true }), false);
eq('a post made in the editor was never imported', isLegacyWordCount({ ...PROVENANCE, imported: false }), false);
// THE THIRD READING. `saveDraft` writes no revision, so the two flags above
// survive any number of autosaves: without this a writer could type, get the
// notice, leave without an explicit save, reload, type one more word and get
// the same twelve-second toast for a two-word delta between two numbers that
// are both already the editor's. An autosave moves the working row's count and
// leaves the import revision's alone.
eq(
  'once an autosave has moved the working count, the notice is spent',
  isLegacyWordCount({ ...PROVENANCE, workingWordCount: 1214 }),
  false,
);
// `bool_or` over an empty set is NULL, and the join returns no row at all for
// a post with no revisions: a brand-new draft, whose count moves from nothing
// on its first save.
eq('no revisions at all is not the importer\'s either', isLegacyWordCount({ imported: null, edited: null, importWordCount: null, workingWordCount: null }), false);
eq('and neither is a post that is not there', isLegacyWordCount(undefined), false);
// Two nulls are not equal to each other. Without the explicit null test a post
// with revisions but no IMPORT one would read as legacy the moment its working
// count was also null, which is a comparison nothing else would refuse.
eq(
  'a null import count never matches, even against another null',
  isLegacyWordCount({ imported: true, edited: false, importWordCount: null, workingWordCount: null }),
  false,
);

// ---- The snippet preview --------------------------------------------------
eq('a short title is shown whole', snippetClamp('Short enough', 60), 'Short enough');
eq('and it is trimmed', snippetClamp('  padded  ', 60), 'padded');
{
  const long = 'x'.repeat(120);
  const cut = snippetClamp(long, 60);
  ok('a long one is cut to the target', cut.length <= 61);
  ok('and says it was cut', cut.endsWith('…'));
  ok('the clamp does not change the real length anywhere', long.length === 120);
}

// ---- The save indicator ---------------------------------------------------
{
  const labels = Object.values(BLOG_SAVE_STATE_LABELS);
  eq('there are four save states', labels.length, 4);
  eq('each has its own words', new Set(labels).size, 4);
  ok('and none carries an em dash', labels.every((label) => !label.includes('—')));
}

// ---- The editor screen's own source ---------------------------------------
// A DIRECTORY READ rather than a list of filenames, the reason section 11's
// sweep gives: a hand-written list covers the files that existed when somebody
// wrote it, and the next component added to this screen would sit outside a
// sweep that still looked complete. The `editor/` subtree has its own sweep
// above, so this one is the top level plus the two route files and the leaf.
{
  const screenDir = new URL('../src/components/Admin/blogs/', import.meta.url);
  const screenFiles = readdirSync(screenDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  ok('the blogs component directory read found its files (fixture guard)', screenFiles.length >= 12);
  ok(
    'and it reached the editor screen itself (fixture guard)',
    screenFiles.includes('PostEditor.tsx') && screenFiles.includes('EditorTopBar.tsx'),
  );

  const EDITOR_SCREEN: ReadonlyArray<readonly [string, string]> = [
    ...screenFiles.map(
      (name) => [name, readRepoFile(`../src/components/Admin/blogs/${name}`)] as const,
    ),
    ['lib/blogEditorFields.ts', readRepoFile('../src/lib/blogEditorFields.ts')],
    ['blogs/[id]/page.tsx', readRepoFile('../src/app/(admin)/admin/(protected)/blogs/[id]/page.tsx')],
    ['blogs/[id]/loading.tsx', readRepoFile('../src/app/(admin)/admin/(protected)/blogs/[id]/loading.tsx')],
    ['blogs/new/page.tsx', readRepoFile('../src/app/(admin)/admin/(protected)/blogs/new/page.tsx')],
  ];

  for (const [label, src] of EDITOR_SCREEN) {
    ok(`read ${label} (drift guard)`, src.length > 100);
  }

  // The copy rule. Scanned over the whole stripped source rather than string
  // literals only, for section 11's reason: an em dash written into JSX TEXT
  // is not a string literal at all, and this screen is mostly JSX.
  for (const [label, src] of EDITOR_SCREEN) {
    eq(
      `no em dash in ${label} outside its comments`,
      [...stripComments(src).replace(EMPTY_CELL_GLYPH, '').matchAll(/.{0,30}—.{0,30}/g)].map(
        (match) => match[0],
      ),
      [],
    );
  }

  // THE BUNDLE RULE, and it is the one thing on this screen that would cost
  // every visitor rather than every writer. `@/lib/blogBody` builds the whole
  // Tiptap document schema at module scope and `@/lib/blogPostSchema` imports
  // it; Turbopack merges every EAGERLY referenced client module into one
  // shared chunk group that all 86 routes load. So a value import from either
  // one, anywhere the editor page reaches synchronously, puts ProseMirror in
  // front of the marketing site.
  //
  // NOTHING on this screen may hold one. The only place in the feature that
  // reaches `blogBody` is the `editor/` subtree, which has its own sweep and
  // is reached only through `BodyEditorLazy` (pinned by the tree scan in
  // section 11 and by the single-boundary assertion below).
  const valueImportsFrom = (src: string, specifier: string): boolean =>
    [...stripComments(src).matchAll(/import\s+([\s\S]*?)from\s+'([^']+)'/g)].some(
      ([, clause, from]) => from === specifier && !/^type\s/.test(clause.trim()),
    );

  for (const specifier of ['@/lib/blogBody', '@/lib/blogPostSchema']) {
    eq(
      `nothing on the editor screen value-imports ${specifier}`,
      EDITOR_SCREEN.filter(([, src]) => valueImportsFrom(src, specifier)).map(([label]) => label),
      [],
    );
  }
  // The guard's own guard: the detector must SEE a value import, or the
  // assertion above passes on a function that always answers false.
  ok(
    'the import detector really sees a value import (fixture guard)',
    valueImportsFrom("import { wordCount } from '@/lib/blogBody';", '@/lib/blogBody'),
  );
  ok(
    'and does not mistake a type-only one for it',
    !valueImportsFrom("import type { BlogDoc } from '@/lib/blogBody';", '@/lib/blogBody'),
  );

  // ONE lazy boundary onto that module, not two, and the difference was
  // measured rather than reasoned about. A second `dynamic()` import reaching
  // `blogBody` (the obvious way to render a live word count) made Turbopack
  // emit a SECOND 522,111-byte ProseMirror chunk beside the body editor's, both
  // listed in this route's react-loadable-manifest. So the counter reads the
  // number the save door returns instead, and this is what keeps it that way.
  //
  // It matches the `import(` CALL EXPRESSION rather than a `dynamic(...)`
  // wrapper around it, and that widening came out of mutation testing: the
  // narrow form only saw a boundary opened through a local binding literally
  // named `dynamic`, so `import dyn from 'next/dynamic'` (or a bare
  // `await import(...)`, which costs the same chunk) walked straight past it.
  // A static `import x from '…'` cannot match, because the paren has to follow
  // the keyword immediately.
  const LAZY_EDITOR_IMPORT = /import\(\s*['"][^'"]*(blogBody|blogs\/editor\/)/;
  eq(
    'exactly one file in the whole tree opens a lazy boundary onto the editor chunk',
    readdirSync(new URL('../src/', import.meta.url), { recursive: true })
      .map((entry) => String(entry))
      .filter((entry) => /\.(ts|tsx)$/.test(entry))
      .filter((entry) =>
        LAZY_EDITOR_IMPORT.test(readFileSync(new URL(`../src/${entry}`, import.meta.url), 'utf8')),
      )
      .sort(),
    ['components/Admin/blogs/editor/BodyEditorLazy.tsx'],
  );
  // The detector's own guard: a static import must NOT read as a lazy one, or
  // the assertion above would name every file that mentions the module.
  eq(
    'the lazy-import detector tells a dynamic import from a static one',
    [
      LAZY_EDITOR_IMPORT.test("const X = dynamic(() => import('@/lib/blogBody'));"),
      LAZY_EDITOR_IMPORT.test("const X = dyn(() => import('@/lib/blogBody'));"),
      LAZY_EDITOR_IMPORT.test("await import('@/components/Admin/blogs/editor/BodyEditor');"),
      LAZY_EDITOR_IMPORT.test("import { wordCount } from '@/lib/blogBody';"),
    ],
    [true, true, true, false],
  );

  // The canvas skeleton is drawn twice, by `BodyEditorLazy` while the editor
  // chunk loads and by `BlogEditorSkeleton` while the page does, and the two
  // must be the same height or the article column steps twice on the way in.
  // Both take the boxes from `editorBox.ts`; neither may hold the literal. The
  // review caught exactly this copy after the block's own comment claimed
  // otherwise.
  for (const [label, src] of [
    ['AdminSkeletons.tsx', SKELETONS_SRC],
    ['BodyEditorLazy.tsx', LAZY_SRC],
  ] as const) {
    eq(
      `${label} imports the canvas skeleton boxes rather than copying them`,
      [editorSkeletonLine, editorSkeletonToolbar].filter((box) => src.includes(box)),
      [],
    );
  }
  // The guard's own guard, and it tests USAGE rather than mention: a dead
  // import would satisfy a substring check while a near-miss literal drew a
  // different box, and an unused import is only a lint WARNING in this repo.
  // Both tokens have to reach a className, through `cn(` or directly.
  const drawsWith = (src: string, token: string) =>
    new RegExp(`(?:cn\\(\\s*${token}\\b|className=\\{${token}\\})`).test(src);
  eq(
    'and both files really RENDER those boxes rather than just importing them',
    [
      drawsWith(LAZY_SRC, 'editorSkeletonLine'),
      drawsWith(LAZY_SRC, 'editorSkeletonToolbar'),
      drawsWith(SKELETONS_SRC, 'editorSkeletonLine'),
      drawsWith(SKELETONS_SRC, 'editorSkeletonToolbar'),
      // A mention that is not a render must NOT satisfy it.
      drawsWith("import { editorSkeletonLine } from 'x';", 'editorSkeletonLine'),
    ],
    [true, true, true, true, false],
  );

  // THE CALL SITE, not just the parameter. The suite already pins the fold,
  // the SQL and the fact that `describeWordCountChange` takes a gate; none of
  // that notices the editor passing a literal `true` for it, which reinstates
  // the whole defect (the notice back on every ordinary edit to every post)
  // with the suite green. Found by mutation testing, which is the reason this
  // branch does it.
  {
    const editor = stripComments(readRepoFile('../src/components/Admin/blogs/PostEditor.tsx'));
    const calls = [...editor.matchAll(/describeWordCountChange\(([\s\S]*?)\)/g)].map((m) => m[1]);
    eq('the editor calls describeWordCountChange exactly once (fixture guard)', calls.length, 1);
    ok(
      'and it passes the server-derived flag, never a literal',
      calls[0]?.includes('post.wordCountIsLegacy') === true,
    );

    // Minor D's fix, the same class: the amend dialog seeds its day when it
    // OPENS, from the current props. Seeded once at mount instead, a post
    // published during the session opens the field blank under a sentence
    // stating the day the post says.
    const amend = region(editor, 'const openAmend', '};', 'openAmend');
    ok('the amend dialog seeds its day from the current props when it opens', amend.includes('post.publishedDayKey'));
    // Exactly one CALL, and it is the one inside `openAmend`. The dialog's own
    // field passes the setter by reference (`onChange={setAmendDay}`), which is
    // the writer typing rather than the screen seeding, so it is not a call.
    eq('the day is seeded from exactly one place', [...editor.matchAll(/setAmendDay\(/g)].length, 1);
    ok('and that place is the opener', amend.includes('setAmendDay('));
    eq('the day is not captured at mount', occurrences(editor, "useState(post.publishedDayKey)"), 0);
  }

  // No screen may build a `Date` in the browser: every instant the editor
  // renders is a finished string resolved once on the server, and the two
  // date controls take a day key and a minute. The one exception is the PAGE,
  // which is the server component that resolves "today" for them.
  for (const [label, src] of EDITOR_SCREEN) {
    if (label === 'blogs/[id]/page.tsx') continue;
    eq(`${label} constructs no Date in the browser`, occurrences(stripComments(src), 'new Date('), 0);
  }

  // And no success path refreshes the router. Every blog door revalidates
  // `/admin` itself, so the fresh tree already rides back on the action's own
  // response; refreshing again is roughly ten more Neon round trips for a
  // render we have.
  //
  // Matched on the CALL, `.refresh(` on any identifier, not on the literal
  // `router.refresh(` this started as. The review proved the narrow form with
  // a real defect: `const nav = useRouter()` then `nav.refresh()` on the ok
  // branch, and the whole check stayed green. Nothing on this screen calls
  // `.refresh(` on anything, so the broad form costs no exception, and the
  // `useRouter` IMPORT is deliberately not banned: `router.push` is a
  // legitimate thing for this screen to need.
  for (const [label, src] of EDITOR_SCREEN) {
    eq(
      `${label} never calls .refresh() on anything`,
      [...stripComments(src).matchAll(/\.refresh\s*\(/g)].length,
      0,
    );
  }
  // The detector's own guard: it must see the aliased call, or the sweep above
  // passes on a regex that matches nothing.
  eq(
    'the refresh detector sees an aliased call as well as the plain one',
    [
      /\.refresh\s*\(/.test('router.refresh();'),
      /\.refresh\s*\(/.test('const nav = useRouter(); nav.refresh();'),
      /\.refresh\s*\(/.test('const x = 1;'),
    ],
    [true, true, false],
  );
}

// The route that MINTS a post is a GET, so nothing may prefetch it: a prefetch
// on hover would be a draft row per hover. The list's own button calls the
// action directly rather than linking, which is what makes that true today.
{
  const NEW_PAGE = readRepoFile('../src/app/(admin)/admin/(protected)/blogs/new/page.tsx');
  ok('the new-post route calls createPost', NEW_PAGE.includes('createPost('));
  ok('and gates itself on the blogs area', NEW_PAGE.includes("requireArea('blogs'"));
  eq(
    'nothing in the tree LINKS to /admin/blogs/new without disabling prefetch',
    readdirSync(new URL('../src/', import.meta.url), { recursive: true })
      .map((entry) => String(entry))
      .filter((entry) => /\.tsx$/.test(entry))
      .filter((entry) => {
        const source = stripComments(
          readFileSync(new URL(`../src/${entry}`, import.meta.url), 'utf8'),
        );
        // A <Link href="/admin/blogs/new"> without prefetch={false} beside it.
        return [...source.matchAll(/<Link[\s\S]{0,400}?\/admin\/blogs\/new[\s\S]{0,400}?>/g)].some(
          (match) => !match[0].includes('prefetch={false}'),
        );
      })
      .sort(),
    [],
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// 15. The two read surfaces: the draft preview and the version history
// ═══════════════════════════════════════════════════════════════════════════
// Neither of these screens writes anything, which is exactly why their
// mistakes are quiet. Five of them, and not one shows on screen:
//
//  - The `?revision=` key. `getDraftPost` reads a missing key as "show the
//    working row", so a link that spells it `?rev=` does not 404 and does not
//    warn: it renders the current draft under a URL claiming to name a saved
//    version, and the writer proofreads the wrong text.
//  - A reason the pgEnum carries and the leaf does not. The leaf cannot
//    value-import the schema, so the two can drift, and what a member meets is
//    a chip reading `undefined`.
//  - `canRestoreRevision` disagreeing with the door behind it, in either
//    direction: a button whose only outcome is a refusal, or a move nobody is
//    offered.
//  - The preview page's PLACEMENT. Outside `(protected)` is what lets it wear
//    the marketing chrome, and it is also what takes `requireArea` off the
//    layout and puts it on the page. Delete that one call and every signed-in
//    account can read every unpublished draft, with nothing failing.
//  - A `layout.tsx` or a `loading.tsx` under `(admin)/admin/blogs/`. The first
//    would apply to this one branch and silently diverge from the protected
//    pages beside it; the second commits a 200 shell before the page runs,
//    which turns an unknown id into a soft 404 instead of a real one.

const PREVIEW_PAGE_PATH = '../src/app/(admin)/admin/blogs/[id]/preview/page.tsx';
const PREVIEW_SRC = readRepoFile(PREVIEW_PAGE_PATH);
const REVISIONS_PAGE_SRC = readRepoFile(
  '../src/app/(admin)/admin/(protected)/blogs/[id]/revisions/page.tsx',
);
const REVISIONS_TABLE_SRC = readRepoFile('../src/components/Admin/blogs/RevisionsTable.tsx');
const ARTICLE_PAGE_SRC = readRepoFile('../src/components/Blogs/post/ArticlePage.tsx');

// Fail loudly rather than passing vacuously: an empty read would make every
// "contains" assertion below trivially false and every "does not contain" one
// trivially true.
ok('read the preview route (drift guard)', PREVIEW_SRC.length > 1000);
ok('read the revisions route (drift guard)', REVISIONS_PAGE_SRC.length > 1000);
ok('read RevisionsTable.tsx (drift guard)', REVISIONS_TABLE_SRC.length > 1000);
ok('read ArticlePage.tsx (drift guard)', ARTICLE_PAGE_SRC.length > 5000);

const PREVIEW_CODE = stripComments(PREVIEW_SRC);
const REVISIONS_PAGE_CODE = stripComments(REVISIONS_PAGE_SRC);
const REVISIONS_TABLE_CODE = stripComments(REVISIONS_TABLE_SRC);
const ARTICLE_PAGE_CODE = stripComments(ARTICLE_PAGE_SRC);

// ---- 15.1 the revision vocabulary matches the database --------------------
// Section 1's assertion, for the other enum. The leaf cannot value-import
// src/db/schema.ts, so nothing in the app would notice the two drifting: a
// reason the enum has and the leaf does not is a row whose chip renders
// `undefined`, and one the leaf has and the enum does not is a chip no row can
// ever carry.

eq(
  'BLOG_REVISION_REASONS equals the blog_revision_reason pgEnum, same order',
  [...BLOG_REVISION_REASONS],
  [...blogRevisionReason.enumValues],
);

eq(
  'every reason has a label, and none of them is the raw slug',
  BLOG_REVISION_REASONS.filter((reason) => {
    const label = BLOG_REVISION_REASON_LABELS[reason];
    return typeof label !== 'string' || label.trim() === '' || label === reason;
  }),
  [],
);

// Two reasons reading the same word is a chip that answers nothing: the whole
// point of the column is telling a publish apart from a save.
eq(
  'no two reasons share a label',
  new Set(Object.values(BLOG_REVISION_REASON_LABELS)).size,
  BLOG_REVISION_REASONS.length,
);

// ---- 15.2 at most one marker per row --------------------------------------
// The post's two pointers are separate columns, so the TYPE admits a row both
// of them name. No door produces one today, but a total function has to answer
// for it, and two contradictory chips on one line is not an answer.

eq('a row nothing points at gets no marker', revisionMarker({ isPublished: false, isPending: false }), null);
eq('the live one is marked published', revisionMarker({ isPublished: true, isPending: false }), 'published');
eq('the queued one is marked pending', revisionMarker({ isPublished: false, isPending: true }), 'pending');
eq(
  'and published wins when both pointers name it',
  revisionMarker({ isPublished: true, isPending: true }),
  'published',
);

eq(
  'both markers have a label, and the two are different words',
  [
    BLOG_REVISION_MARKER_LABELS.published.trim() !== '',
    BLOG_REVISION_MARKER_LABELS.pending.trim() !== '',
    BLOG_REVISION_MARKER_LABELS.published !== BLOG_REVISION_MARKER_LABELS.pending,
  ],
  [true, true, true],
);

// ---- 15.2b the cap, and what it owes ---------------------------------------
// Nothing ever deletes a revision, so this is the one list in the feature that
// grows monotonically. A cap that does not state its remainder can pass for the
// whole history, which is the `foldLineCap` / `foldCellChips` rule: on a page
// whose entire job is "what has this post been", a silent truncation is a
// wrong answer rather than a short one.
{
  const rows = Array.from({ length: 7 }, (_, i) => i);
  eq('under the cap, everything shows and nothing is hidden', foldRevisionList(rows, 10), {
    shown: rows,
    hidden: 0,
  });
  eq('exactly at the cap, still nothing hidden', foldRevisionList(rows, 7), { shown: rows, hidden: 0 });
  eq('over it, the NEWEST survive and the remainder is stated', foldRevisionList(rows, 3), {
    shown: [0, 1, 2],
    hidden: 4,
  });
  // The reconciliation itself, swept, because it is the only property the
  // remainder line is worth anything for.
  eq(
    'shown + hidden always equals the whole list',
    Array.from({ length: 12 }, (_, cap) => {
      const { shown, hidden } = foldRevisionList(rows, cap);
      return shown.length + hidden === rows.length;
    }).filter((held) => !held).length,
    0,
  );
  eq('a zero cap hides everything rather than throwing', foldRevisionList(rows, 0), {
    shown: [],
    hidden: 7,
  });
  eq('an empty history folds to nothing at all', foldRevisionList([], 5), { shown: [], hidden: 0 });
  ok('and the real cap is a number a post can actually reach', BLOG_REVISION_LIST_CAP > 0);
}

// ---- 15.3 canRestoreRevision mirrors the door -----------------------------
// Swept over the whole status vocabulary rather than written as two literals,
// so a sixth status is forced through the decision instead of inheriting one.

for (const status of BLOG_POST_STATUSES) {
  eq(
    `canRestoreRevision(${status}) matches the door's own refusal`,
    canRestoreRevision(status),
    status !== 'trash',
  );
}

// And the other half of "mirrors": the door itself is read, so widening its
// refusal without widening the leaf fails HERE rather than shipping a button
// whose only outcome is a sentence saying it should not have been offered.
// (The `check-menu-trigger.mts` arrangement, which reads Radix's own source.)
{
  const restoreDoor = region(
    ACTIONS_SRC,
    'export async function restoreRevision(',
    "// ── The editor's internal-link picker",
    'the restoreRevision door',
  );
  eq(
    'restoreRevision refuses exactly one status, and it is trash',
    linesWith(stripComments(restoreDoor), 'row.status ===').map((line) => line.trim()),
    ["if (row.status === 'trash') {"],
  );
}

// ---- 15.4 the preview URL, which is the silent one ------------------------

eq('the query key is `revision`', BLOG_PREVIEW_REVISION_PARAM, 'revision');
eq('the bare preview path', blogPreviewHref('p1'), '/admin/blogs/p1/preview');
eq(
  'and pinned to a version',
  blogPreviewHref('p1', 'r1'),
  '/admin/blogs/p1/preview?revision=r1',
);
// An EMPTY id must not produce a dangling `?revision=`. getDraftPost reads that
// as "no revision given" and shows the working row, so the URL would claim to
// name a version it is not showing.
for (const [label, value] of [
  ['an empty revision id', ''],
  ['a null one', null],
  ['an absent one', undefined],
] as const) {
  eq(`${label} yields the bare path`, blogPreviewHref('p1', value), '/admin/blogs/p1/preview');
}
eq('the version history path', blogRevisionsHref('p1'), '/admin/blogs/p1/revisions');

// The page reads the key through the constant, so a link and the page that
// answers it cannot spell it differently.
ok(
  'the preview page reads the key through the constant',
  PREVIEW_CODE.includes('sp[BLOG_PREVIEW_REVISION_PARAM]'),
);
eq(
  "and never reaches for a 'revision' literal of its own",
  literals(PREVIEW_CODE).filter((s) => s === "'revision'"),
  [],
);

// Nothing in the tree builds either path by hand any more. A hand-built one is
// not an error anywhere: it renders, and the mistake only shows as the wrong
// article under the right URL.
//
// TWO SPELLINGS, because the first version of this only caught the template
// literal and `'/admin/blogs/' + post.id + '/preview'` walked straight past it,
// leaving the assertion claiming more than it held. The first arm is the
// interpolated form (`${...}` carries no quote, so the character class holds);
// the second is a quoted suffix, which is what concatenation and `.concat` and
// a `join('/')` all end up emitting.
const HAND_SPELLED_PATH =
  /\/admin\/blogs\/[^'"`\n]*\/(?:preview|revisions)|(['"`])\/(?:preview|revisions)\1/;
eq(
  'no file spells the preview or revisions path by hand',
  readdirSync(new URL('../src/', import.meta.url), { recursive: true })
    .map((entry) => String(entry))
    .filter((entry) => /\.tsx?$/.test(entry))
    // The leaf is where they ARE spelled, so it is the one exemption.
    .filter((entry) => entry !== 'lib/blogFields.ts')
    .filter((entry) =>
      HAND_SPELLED_PATH.test(
        stripComments(readFileSync(new URL(`../src/${entry}`, import.meta.url), 'utf8')),
      ),
    )
    .sort(),
  [],
);
// The regex is the thing under test here, so it is exercised on both shapes
// rather than trusted. A sweep that matches nothing looks exactly like a tree
// with nothing to find.
eq(
  'and that sweep catches both spellings (fixture guard)',
  [
    'href={`/admin/blogs/${post.id}/preview`}',
    "href={'/admin/blogs/' + post.id + '/preview'}",
    'href={`/admin/blogs/${id}/revisions`}',
    "const p = '/revisions';",
    'href={blogPreviewHref(post.id)}',
    'href={`/admin/blogs/${post.id}`}',
  ].map((sample) => HAND_SPELLED_PATH.test(sample)),
  [true, true, true, true, false, false],
);

// ---- 15.5 where the preview route sits ------------------------------------
// The placement IS the feature, and every part of it is invisible when wrong.

{
  const adminBlogsDir = new URL('../src/app/(admin)/admin/blogs/', import.meta.url);
  const files = readdirSync(adminBlogsDir, { recursive: true })
    .map((entry) => String(entry))
    .filter((entry) => /\.tsx?$/.test(entry))
    .sort();
  // A directory read that came back short would make the two refusals below
  // trivially true, which is the shape of a check that proves nothing.
  eq('the preview route is the only file in (admin)/admin/blogs', files, [
    '[id]/preview/page.tsx',
  ]);
  eq(
    'so there is no layout.tsx and no loading.tsx under it',
    files.filter((entry) => /(^|\/)(layout|loading)\.tsx$/.test(entry)),
    [],
  );
}

// The authorization boundary. src/proxy.ts only checks that a session cookie
// EXISTS, and the preview page is outside `(protected)`, so its one call is
// the only thing between a member with no blogs grant and every unpublished
// draft.
//
// THE `await` IS PART OF THE ASSERTION, and asserting the call alone was a
// real hole rather than a style point. `requireArea` refuses by THROWING
// `redirect()`, so an un-awaited call throws inside a detached promise: React
// never attributes it to the component, the render completes, and the draft is
// served to somebody the gate refused. Nothing else in the repo would notice —
// `next build` type-checks a floating promise happily, and eslint.config.mjs
// enables no type-aware rules, so `no-floating-promises` is not in play. The
// mutation that found this dropped one word and left the check ALL PASS.
//
// Matched as the WHOLE call rather than a substring, so this also pins that
// there is exactly one gate per file, on the right area, with the right
// fallback. The revisions page is here too: it sits inside `(protected)`, so
// its layout is a second boundary, but a page that re-gates is the house rule
// and a page that stops is a change nobody would see.
//
// A QUOTED look-alike is dropped before the match, and that is not fussiness:
// a source-text assertion reads text rather than behaviour, so without this a
// decoy string spelling the call would satisfy it after the real call had been
// deleted, which is the one arrangement that turns this pin into a comment.
// With the strip, both arrangements answer correctly: a decoy BESIDE a real
// gate passes (the gate is there and works, and a stray string is not a
// defect), and a decoy INSTEAD OF one fails. Only literals containing
// `requireArea` are removed, because the real call's own `'blogs'` and
// `'/admin'` are string literals too.
//
// WHAT IT STILL CANNOT SEE is whether the call RUNS: a gate inside a branch
// that never executes reads identically here. Nothing in this file can answer
// that, and nothing tries to. The HTTP suite is what covers it, by asking the
// running page for a draft as an account holding no blogs grant.
// One arm per delimiter, because a class excluding ALL THREE quote characters
// cannot span the real call's own `'blogs'` inside a double-quoted decoy, which
// is exactly the shape a mutation used.
const QUOTED_GATE =
  /'[^'\n]*requireArea[^'\n]*'|"[^"\n]*requireArea[^"\n]*"|`[^`]{0,200}requireArea[^`]{0,200}`/g;
const withoutQuotedGates = (code: string) => code.replace(QUOTED_GATE, '""');
for (const [label, code] of [
  ['the preview route', PREVIEW_CODE],
  ['the revisions route', REVISIONS_PAGE_CODE],
] as const) {
  eq(
    `${label} gates itself on the blogs area, and AWAITS the gate`,
    [...withoutQuotedGates(code).matchAll(/(?:await\s+)?requireArea\([^)]*\)/g)].map((m) =>
      m[0].replace(/\s+/g, ' '),
    ),
    ["await requireArea('blogs', '/admin')"],
  );
}
ok(
  'and renders at request time',
  PREVIEW_CODE.includes("export const dynamic = 'force-dynamic'"),
);
ok(
  "and sets its own title, since it inherits the admin layout's template",
  /title:\s*'Preview'/.test(PREVIEW_CODE),
);
ok('and 404s an unknown post or a foreign revision', PREVIEW_CODE.includes('notFound()'));

// The chrome is the REAL chrome. A second rendering of the Navbar and Footer
// would be the first thing to drift from the page it is previewing, which is
// the one promise this route makes.
for (const needle of [
  "from '@/components/Navbar'",
  "from '@/components/Footer'",
  "from '@/components/Blogs/post/ArticlePage'",
]) {
  ok(`the preview page imports ${needle}`, PREVIEW_SRC.includes(needle));
}
eq(
  'and never through the @/components barrel',
  linesWith(PREVIEW_CODE, "from '@/components'"),
  [],
);

// ---- 15.6 what `preview` turns off, and the related heading ---------------
// Both controls lie on an unpublished post: a vote is accepted by the button
// and discarded by the action (`publishedSlugExists`), and every share URL
// points at an address that 404s until the post is published.
for (const control of ['ArticleFeedback', 'ShareBlogs']) {
  ok(
    `${control} is gated on !preview`,
    new RegExp(`!preview\\s*&&\\s*(\\(\\s*)?<${control}`).test(
      ARTICLE_PAGE_CODE.replace(/\s+/g, ' '),
    ),
  );
}
ok('and the preview route passes the flag', /<ArticlePage[^>]*\spreview\b/.test(PREVIEW_CODE));

// The related section reads ONE resolved flag. `selectBlogCards` filters an
// unknown forced slug out and its `curated ?? …` fallback only fires when the
// list was empty to begin with, so a curation whose every entry has since been
// purged comes back as `[]` and used to render "a curated set of articles
// chosen to extend the ideas in this piece" above an empty grid.
{
  const heading = stripComments(
    region(
      ARTICLE_PAGE_SRC,
      'seperatorTitle="Related Articles"',
      '<BlogPost posts={related}',
      'the related-reads heading',
    ),
  );
  eq(
    'the related heading asks nothing about what was REQUESTED',
    linesWith(heading, 'relatedSlugs'),
    [],
  );
  eq(
    'and the title, the accent and the description all read the resolved flag',
    linesWith(heading, 'curatedRelated').length,
    3,
  );
}
ok(
  'which is false when the CURATED read resolved to nothing',
  ARTICLE_PAGE_CODE.includes('view.relatedSlugs.length > 0 && curatedCards.length > 0'),
);

// And what a curation that resolved to nothing falls back TO. Rendering nothing
// there would throw away four internal links on a public page precisely when
// the category has two dozen posts to offer, so the page reads the category
// instead. Two ways in, and only the first is repairable at the data layer:
// unpublishing a curated target leaves the join row while dropping the post
// from `listPublishedSummaries`, and hard-deleting one cascades the join row
// away while the referrer's FROZEN published snapshot keeps naming the dead
// slug until somebody republishes it.
{
  const flat = ARTICLE_PAGE_CODE.replace(/\s+/g, ' ');
  eq(
    'selectBlogCards is called twice: the curated read, then the category fallback',
    [...ARTICLE_PAGE_CODE.matchAll(/selectBlogCards\(/g)].length,
    2,
  );
  ok(
    'and the fallback fires on the CURATED read coming back empty',
    flat.includes('view.relatedSlugs.length > 0 && curatedCards.length === 0'),
  );
  ok(
    'asking for the category rather than the curated slugs again',
    /curatedCards\.length === 0 \? await selectBlogCards\(\{ categorySlug: view\.category\.slug/.test(flat),
  );
  // The backstop. `BlogPost` renders "No related posts found for this blog."
  // over an empty list, so a heading offering more of them above that sentence
  // is one section contradicting itself. Today the fallback makes an empty list
  // take a category holding only this post; the editor makes that a single form
  // away.
  ok(
    'the whole section is dropped when even the fallback found nothing',
    flat.includes('{related.length > 0 && ( <section'),
  );
}

// ---- 15.7 member-visible copy carries no em dash --------------------------
// The same sweep the doors and the editor get, over the two screens this task
// added. Scanned over the whole stripped source rather than the literals
// alone, because most of the copy here is JSX text.
//
// The house rule exempts one thing, and the revisions table uses it: the lone
// `—` empty-value glyph in a table cell, which is a spreadsheet convention
// rather than prose (`cadOrDash`, `?? '—'`). It is stripped by SHAPE, so a
// glyph standing alone as an element's whole text is exempt and an em dash
// anywhere inside a sentence is not.
const withoutEmptyGlyph = (code: string) => code.replace(/>\s*—\s*</g, '><');
//
// `RevisionsTable.tsx` is deliberately NOT in this list: section 13's sweep
// reads the whole `Admin/blogs/` directory, so it joined that one the moment
// the file existed, which is the entire point of reading a directory instead
// of a list. The two ROUTE files and ArticlePage.tsx are outside it.
for (const [label, code] of [
  ['the preview route', PREVIEW_CODE],
  ['the revisions route', REVISIONS_PAGE_CODE],
  ['ArticlePage.tsx', ARTICLE_PAGE_CODE],
] as const) {
  eq(
    `no em dash anywhere in ${label} outside its comments`,
    [...withoutEmptyGlyph(code).matchAll(/.{0,30}—.{0,30}/g)].map((match) => match[0]),
    [],
  );
}

// ---- 15.8 the history screen states only what it was told -----------------
// A revision can exist that no pointer names and no completed save produced:
// every door inserts the row before it claims the version and deletes it again
// when it loses that race, so a crash in the gap leaves an orphan. Numbers can
// therefore have gaps and the newest row is not necessarily the working copy.
ok(
  "the numeral a row prints is the version's own number",
  REVISIONS_TABLE_CODE.includes('#{item.number}'),
);
eq(
  'and the list is walked without a positional index at all',
  [...REVISIONS_TABLE_CODE.matchAll(/items\.map\(\(([^)]*)\)/g)].map((m) => m[1].trim()),
  ['item'],
);
// The no-router.refresh() rule is section 13's, and its directory sweep already
// reaches this file, so it is not restated here.
// A capped list states its remainder WITH THE NUMBER, or the cut passes for the
// whole. The rule `foldLineCap` states on a money screen holds here for the
// same reason: "and some older ones" is not a fact anybody can act on.
{
  const flat = REVISIONS_TABLE_CODE.replace(/\s+/g, ' ');
  ok('the table renders a remainder line at all', flat.includes('{hidden > 0 && ('));
  ok('and that line carries the count', /\{hidden\} older/.test(flat));
  ok('beside how many it did show', flat.includes('Showing the newest {items.length}.'));
}

// And the page really uses it. The fold and the remainder line were both
// pinned above, and the mutation that cut the page's own call to
// `foldRevisionList` still left the check green: a correct fold nobody calls is
// an uncapped list with a cap-shaped comment.
ok(
  'the revisions page caps through the shared fold',
  /const \{ shown, hidden \} = foldRevisionList\(revisions\)/.test(REVISIONS_PAGE_CODE),
);
ok('and maps the CAPPED rows rather than all of them', REVISIONS_PAGE_CODE.includes('shown.map((rev)'));
ok('handing the remainder down to the table', /hidden=\{hidden\}/.test(REVISIONS_PAGE_CODE));

// The empty state names WHY a version gets written, so it has to name every
// reason a writer can actually cause. `import` is the one exception: nothing
// anybody does in the editor produces it, and a post with an empty history has
// certainly not been imported. Read out of the reason LABELS rather than typed
// again, so a seventh reason is a failure here instead of a sentence that
// quietly stopped being the whole list.
{
  const emptyState = region(
    REVISIONS_TABLE_SRC,
    '<EmptyState',
    '/>',
    'the revisions empty state',
  );
  // WHOLE WORDS, because `published` is a substring of `unpublished`: with a
  // plain `includes`, deleting ", published," from the sentence while keeping
  // "unpublished" left this green. Exactly the bug `wordHits` was written for,
  // and it was written twenty lines from here for the other half of it.
  eq(
    'the empty state names every reason a writer can cause',
    BLOG_REVISION_REASONS.filter(
      (reason) =>
        reason !== 'import' &&
        wordHits(emptyState, BLOG_REVISION_REASON_LABELS[reason].toLowerCase()) === 0,
    ),
    [],
  );
  ok('and says autosave is not one of them', emptyState.includes('Autosave writes none'));
}

// The screen and its skeleton quote ONE definition of every box. This file
// exists because a skeleton is only worth having if each row is the height of
// the row it stands in for, and the way that stops being true is a hand-copied
// class string on one side: the first version of this skeleton inlined the
// controls cell and came out short by its `mt-2` on a phone, six rows deep.
{
  const SKELETON_SRC = readRepoFile('../src/components/Admin/skeletons/AdminSkeletons.tsx');
  const BOX_SRC = readRepoFile('../src/components/Admin/blogs/postBox.ts');
  ok('read AdminSkeletons.tsx (drift guard)', SKELETON_SRC.length > 2000);
  const boxTokens = [...BOX_SRC.matchAll(/^export const (revision[A-Za-z]+)/gm)].map((m) => m[1]);
  ok('postBox exports the revision row tokens (fixture guard)', boxTokens.length >= 8);
  // TWO occurrences, not one, and word-bounded, and both halves of that were
  // found by mutation testing rather than reasoned out. `includes(token)` was
  // satisfied by the IMPORT LINE alone, so inlining a class string over the
  // token's one use left the check green with the now-unused import still
  // sitting at the top (eslint only warns on that, so nothing else notices).
  // And a bare substring test let `revisionChip` be satisfied by
  // `revisionChipCell`, which is a different box: `wordHits`, above, is where
  // that rule now lives for everything in this file.
  for (const [label, code] of [
    ['RevisionsTable.tsx', REVISIONS_TABLE_CODE],
    ['BlogRevisionsSkeleton', stripComments(SKELETON_SRC)],
  ] as const) {
    eq(
      `${label} imports every revision box token AND applies it`,
      boxTokens.filter((token) => wordHits(code, token) < 2),
      [],
    );
  }

  // THE RESPONSIVE SHAPE, compared row against row.
  //
  // The token sweeps above cannot see this, because `hidden text-xs lg:block`
  // and `lg:hidden` are not tokens: they are the three columns that vanish on a
  // phone and the meta line that replaces them. Deleting all three wrappers
  // from the skeleton, or its phone meta line, left every other assertion here
  // green while putting the desktop shape on a 360px screen, which is the exact
  // drift this whole file exists to prevent.
  //
  // Counted rather than listed, and compared BOTH ways: the skeleton is only
  // right if it hides as many things as the row hides and shows as many as the
  // row shows. The fixture guard is what stops it passing on two empty regions.
  const rowRegion = region(
    REVISIONS_TABLE_SRC,
    '{items.map((item) => (',
    '</ul>',
    'the version row',
  );
  const skeletonRegion = region(
    SKELETON_SRC,
    '{Array.from({ length: 6 }).map((_, i) => (',
    '</ul>',
    'the version row skeleton',
  );
  for (const responsive of ['lg:block', 'lg:hidden'] as const) {
    const inRow = occurrences(stripComments(rowRegion), responsive);
    ok(`the version row really carries ${responsive} (fixture guard)`, inRow > 0);
    eq(
      `the skeleton hides and shows the same cells as the row (${responsive})`,
      occurrences(stripComments(skeletonRegion), responsive),
      inRow,
    );
  }

  // And the other direction, which is the rule these files actually exist for:
  // no COPY of a token's class string may sit beside the token. The "applies
  // it" test above cannot see that, because inlining one of two uses leaves the
  // other one satisfying it, which a mutation proved.
  //
  // Only the DISTINCTIVE values are swept. `revisionRowShell` is
  // `'flex items-center'`, a string half the dashboard writes for its own
  // reasons, and asserting on it would fail on innocent code in a file that
  // holds twenty other surfaces' skeletons.
  const boxValues = [...BOX_SRC.matchAll(/^export const revision[A-Za-z]+ =\s*\n?\s*'([^']{25,})';/gm)].map(
    (m) => m[1],
  );
  ok('found the distinctive box values to sweep (fixture guard)', boxValues.length >= 4);
  for (const [label, code] of [
    ['RevisionsTable.tsx', REVISIONS_TABLE_CODE],
    ['AdminSkeletons.tsx', stripComments(SKELETON_SRC)],
  ] as const) {
    eq(
      `${label} carries no hand-copy of a revision box value`,
      boxValues.filter((value) => code.includes(value)),
      [],
    );
  }
}

// Both dates are resolved on the SERVER in the viewer's own zone. A formatter
// with no zone resolves to the runtime's, which is UTC on Vercel.
eq(
  'the revisions page formats every date through the zoned helpers',
  linesWith(REVISIONS_PAGE_CODE, 'Intl.DateTimeFormat').concat(
    linesWith(REVISIONS_PAGE_CODE, 'toLocaleDateString'),
    linesWith(REVISIONS_TABLE_CODE, 'new Date('),
  ),
  [],
);
// Section 13's directory sweep reaches this file, so the em-dash rule itself
// is not restated. What section 15 owns is the EXEMPTION: the table is the
// place that uses the empty-value glyph, and it must stay a lone glyph in a
// cell rather than becoming a dash inside a sentence.
eq(
  'the table carries no em dash outside the empty-value glyph',
  [...withoutEmptyGlyph(REVISIONS_TABLE_CODE).matchAll(/.{0,30}—.{0,30}/g)].map((m) => m[0]),
  [],
);
eq(
  'and that glyph stands alone in a cell, exactly once',
  (REVISIONS_TABLE_CODE.match(/<span aria-hidden="true">—<\/span>/g) ?? []).length,
  1,
);
ok(
  "and in the viewer's own zone",
  REVISIONS_PAGE_CODE.includes('viewerZone()') &&
    REVISIONS_PAGE_CODE.includes('formatDateTime(tz,') &&
    REVISIONS_PAGE_CODE.includes('formatRelative(tz,'),
);

// ═══════════════════════════════════════════════════════════════════════════
// 12. The real statements, against Neon (--db)
// ═══════════════════════════════════════════════════════════════════════════
// Everything above pins a DECISION. This half pins STATEMENTS, and it is the
// only thing that can: every write door in this feature is either a
// `'use server'` action (which needs a session and cannot be imported by a
// script) or a cron route, so `src/db/blogStatements.ts` and the two
// predicate modules are guard-free precisely to be reachable from here.
// Asserting a hand-copied SQL twin instead would be asserting a copy of the
// code, which this repo deletes.
//
// SAFETY. This database is production, preview AND local development at once,
// so every row created below carries a `zz-check-` slug (or name) and the
// whole block runs inside a try whose finally sweeps them and then COUNTS what
// is left. Nothing here ever touches a row it did not create: every write is
// by a fixture id, and every sweep is scoped by the prefix.

if (!process.argv.includes('--db')) {
  console.log(
    fails === 0
      ? '\nALL PASS  (pure checks; add --db with --env-file=.env.local for the Postgres round trip)'
      : `\n${fails} FAILED`,
  );
  process.exit(fails === 0 ? 0 : 1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

const PREFIX = 'zz-check-';
const slugOf = (name: string) => `${PREFIX}${name}`;

/**
 * The sweep UNHOOKS before it deletes, which is belt to the braces rather than
 * ceremony: a `scheduled` fixture points at its own revision, and
 * `pending_revision_id` is ON DELETE SET NULL under a CHECK that forbids a
 * scheduled row without one. Clearing the four publication columns first (to a
 * combination all four CHECKs accept) means the sweep can never be the thing
 * that fails, whatever state an assertion left a fixture in.
 */
const sweep = async () => {
  await db
    .update(blogPosts)
    .set({
      status: 'draft',
      publishAt: null,
      pendingRevisionId: null,
      publishedRevisionId: null,
      trashedAt: null,
    })
    .where(like(blogPosts.slug, `${PREFIX}%`));
  await db.delete(blogPosts).where(like(blogPosts.slug, `${PREFIX}%`));
  await db.delete(blogEntities).where(like(blogEntities.name, `${PREFIX}%`));
  await db.delete(blogAuthors).where(like(blogAuthors.slug, `${PREFIX}%`));
  await db.delete(blogCategories).where(like(blogCategories.slug, `${PREFIX}%`));
};

/** The SQLSTATE and constraint of a refused write. `pgCode` already walks the
 *  cause chain (drizzle wraps the driver error, so `.code` on the throw itself
 *  is always undefined); the constraint name needs the same walk, and it is
 *  the half that says WHICH rule refused. */
const refusal = (error: unknown): { code?: string; constraint?: string } => {
  const code = pgCode(error);
  for (let cur = error; typeof cur === 'object' && cur !== null; cur = (cur as { cause?: unknown }).cause) {
    const { constraint } = cur as { constraint?: unknown };
    if (typeof constraint === 'string') return { code, constraint };
  }
  return { code };
};

/**
 * Roll a pooled client back before it is returned, on EVERY path.
 *
 * `release()` does not reset transaction state, so a throw between a `begin`
 * and its `commit` hands an OPEN TRANSACTION back to the pool. The sweep in
 * the outer `finally` could then run inside it and be undone by `pool.end()`,
 * printing a green "no zz-check- fixtures remain" over rows that really
 * survive in the corpus — the exact failure this file's whole safety design
 * exists to prevent. A rollback with no transaction in progress is a notice,
 * not an error, so this is safe to call after a successful commit too.
 */
const rollbackQuietly = async (conn: { query: (text: string) => Promise<unknown> }) => {
  try {
    await conn.query('rollback');
  } catch {
    /* no transaction in progress */
  }
};

/** Run `fn` and report what refused it, or `null` when nothing did. */
const refused = async (fn: () => Promise<unknown>): Promise<{ code?: string; constraint?: string } | null> => {
  try {
    await fn();
    return null;
  } catch (error) {
    return refusal(error);
  }
};

/**
 * How many scheduled posts exist that are NOT ours.
 *
 * `publishDuePostRows` is the cron's PRODUCTION statement: its WHERE carries no
 * fixture predicate, correctly, because the cron has to publish every due
 * schedule. Filtering its RETURNED rows scopes the read and not the write, so
 * block 12.4 runs it inside a transaction that is ALWAYS rolled back. This
 * count, taken before anything is seeded and again after the sweep, is the
 * standing tripwire behind that: if the statement ever escaped its transaction
 * it would flip every due real schedule to published, and the number would
 * drop. It reads 0 today only because production has no editor yet and so
 * nothing can be scheduled; the day that changes is the day it starts biting.
 */
const foreignScheduled = async () => {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(blogPosts)
    .where(and(eqCol(blogPosts.status, 'scheduled'), notLike(blogPosts.slug, `${PREFIX}%`)));
  return Number(rows[0]?.n ?? 0);
};

/**
 * One numbered block, guarded. A seed helper reports by THROWING (a refused
 * insert is not something later assertions in that block can be read through),
 * and without this one such throw would skip every block after it, turning one
 * broken fixture into a run that proves nothing. Counted as a failure, named,
 * and the next block still runs.
 */
const block = async (label: string, body: () => Promise<void>) => {
  try {
    await body();
  } catch (error) {
    fails++;
    console.log(
      `FAIL  db: ${label} threw  ${error instanceof Error ? `${error.message} | ${JSON.stringify(refusal(error))}` : String(error)}`,
    );
  }
};

const foreignScheduledBefore = await foreignScheduled();

try {
  await sweep();

  // ── Taxonomy fixtures ────────────────────────────────────────────────────
  // The names are deliberately unlike anything in the real corpus, because
  // the search assertions below query by them.
  const [authorA] = await db
    .insert(blogAuthors)
    .values({ slug: slugOf('author'), name: 'Zenobia Quillfeather', role: 'r', bio: 'b', sortIndex: 9001 })
    .returning();
  const [authorB] = await db
    .insert(blogAuthors)
    .values({ slug: slugOf('author-2'), name: 'Yusuf Brambleton', role: 'r', bio: 'b', sortIndex: 9002 })
    .returning();
  const [catA] = await db
    .insert(blogCategories)
    .values({ slug: slugOf('cat'), title: 'Zeppelin Quarterly', sortIndex: 9001 })
    .returning();
  const [catB] = await db
    .insert(blogCategories)
    .values({ slug: slugOf('cat-2'), title: 'Xylophone Weekly', sortIndex: 9002 })
    .returning();

  const DAY = '2026-03-09';
  const dayInstant = dayNoonIn(STUDIO_TZ, DAY);
  const OLD_DAY = '2025-11-02';
  const oldInstant = dayNoonIn(STUDIO_TZ, OLD_DAY);

  const snapshotFor = (slug: string, title: string, publishedAt: string | null): BlogRevisionSnapshot => ({
    slug,
    title,
    description: 'd',
    categorySlug: catA.slug,
    authorSlug: authorA.slug,
    serviceSlug: null,
    hero: { staticPath: '/images/blogs/production/x.avif', media: null, alt: 'a', caption: null },
    body: EMPTY_BLOG_DOC,
    bodyText: '',
    wordCount: 0,
    keyTakeaways: [],
    faqs: [],
    sources: [],
    entities: [],
    relatedSlugs: [],
    seo: {
      title: 't', description: 'd', canonicalOverride: null, ogTitle: 't', ogDescription: 'd',
      ogImage: null, twitterCard: 'summary_large_image', robotsIndex: true, robotsFollow: true,
      robotsExtra: null, focusKeywords: [], emitLegacyMetaKeywords: false,
    },
    customSchema: null,
    llmsInclude: true,
    publishedAt,
    contentModifiedAt: null,
  });

  /** A draft through the REAL insert door, then the REAL save door to give it
   *  a title: `insertDraftPost` deliberately writes empty strings. */
  const newDraft = async (name: string, title: string, extra: BlogWorkingUpdate = {}) => {
    const created = await insertDraftPost(db, { slug: slugOf(name), categoryId: catA.id, authorId: authorA.id });
    if (!created) throw new Error(`fixture ${name} was refused by insertDraftPost`);
    const version = await updateWorkingCopy(db, created.id, created.version, { title, description: 'd', ...extra });
    if (version === null) throw new Error(`fixture ${name} lost its own version guard`);
    return { id: created.id, slug: slugOf(name), version };
  };

  /** `insertRevision` against a CHOSEN connection, so the forced race below can
   *  hold two open transactions. Everything else uses `newRevision`. */
  const newRevisionOn = (on: BlogDb, postId: string, slug: string, title: string, publishedAt: Date | null = null) =>
    insertRevision(on, {
      postId,
      reason: 'publish',
      slug,
      title,
      categoryId: catA.id,
      authorId: authorA.id,
      publishedAt,
      contentModifiedAt: null,
      robotsIndex: true,
      llmsInclude: true,
      wordCount: 0,
      snapshot: snapshotFor(slug, title, publishedAt?.toISOString() ?? null),
      actorId: null,
      actorName: 'ZZ-CHECK',
    });

  const newRevision = (postId: string, slug: string, title: string, publishedAt: Date | null) =>
    newRevisionOn(db, postId, slug, title, publishedAt);

  const readPost = async (id: string) => {
    const [row] = await db.select().from(blogPosts).where(eqCol(blogPosts.id, id)).limit(1);
    return row ?? null;
  };

  // ── 12.1 The version guard actually guards ───────────────────────────────
  // TWO updates carrying the SAME version. Asserting that one update works
  // proves nothing at all: the tempting vacuous version of this test passes
  // against a statement with no version predicate in it.
  await block('the version guard', async () => {
      const post = await newDraft('version-guard', 'Version guard fixture');
      const first = await updateWorkingCopy(db, post.id, post.version, { title: 'first writer' });
      const second = await updateWorkingCopy(db, post.id, post.version, { title: 'second writer' });
      eq('db: the first save on a version reports the NEW version', first, post.version + 1);
      eq('db: a second save on the SAME version reports null', second, null);
      eq('db: and the loser wrote nothing', (await readPost(post.id))?.title, 'first writer');
      // The winner's own next save still works, so the guard is a race loser's
      // refusal rather than a row that has been locked shut.
      eq('db: the winner can save again on the version it was handed', await updateWorkingCopy(db, post.id, first!, { title: 'third' }), post.version + 2);
  });

  // ── 12.2 Revision numbering survives concurrency ─────────────────────────
  // Fired with Promise.all against a Pool, so the two statements are on two
  // connections and genuinely race. A serial pair CANNOT collide (the inline
  // subquery sees the first row), which is what makes the sequential version
  // of this test vacuous.
  await block('revision numbering under concurrency', async () => {
      const post = await newDraft('rev-race', 'Revision race fixture');
      await newRevision(post.id, post.slug, 'rev 1', null);
      let retries = 0;
      // The caller's retry-once path, verbatim: the number comes from an inline
      // `coalesce(max(number),0)+1`, so exactly one of two racers may lose the
      // (post_id, number) UNIQUE index with a 23505 and must simply try again.
      const insertWithRetry = async (title: string) => {
        try {
          return await newRevision(post.id, post.slug, title, null);
        } catch (error) {
          if (!isUniqueViolation(error)) throw error;
          retries++;
          return newRevision(post.id, post.slug, title, null);
        }
      };
      const [a, b] = await Promise.all([insertWithRetry('rev A'), insertWithRetry('rev B')]);
      const numbers = (
        await db.select({ n: blogPostRevisions.number }).from(blogPostRevisions).where(eqCol(blogPostRevisions.postId, post.id))
      ).map((r) => r.n).sort((x, y) => x - y);
      eq('db: two concurrent insertRevision calls leave N+1 and N+2, no gap', numbers, [1, 2, 3]);
      eq('db: and the two callers were handed different numbers', [a.number, b.number].sort((x, y) => x - y), [2, 3]);

      console.log(`      (23505 retries taken by the Promise.all pair this run: ${retries})`);
      // The mechanism the retry exists for, asserted deterministically rather
      // than left to the race: the UNIQUE index is what refuses the loser.
      const dup = await refused(() =>
        db.insert(blogPostRevisions).values({
          postId: post.id, number: 1, reason: 'save', slug: post.slug, title: 'dup',
          categoryId: catA.id, authorId: authorA.id, publishedAt: null, contentModifiedAt: null,
          wordCount: 0, snapshot: snapshotFor(post.slug, 'dup', null), actorName: 'ZZ-CHECK',
        }),
      );
      eq('db: a duplicate (post_id, number) is refused with 23505', dup?.constraint, 'blog_post_revisions_post_number');
      // deleteRevision is the lost-race unwind; prove it removes exactly one.
      await deleteRevision(db, b.id);
      eq('db: deleteRevision removes exactly the revision it names', (await db.select().from(blogPostRevisions).where(eqCol(blogPostRevisions.postId, post.id))).length, 2);
  });

  // The retry above is real code the Promise.all pair almost never reaches:
  // each statement is its own implicit transaction, so the second one's
  // subquery usually reads a snapshot taken after the first committed and no
  // 23505 ever fires (measured: zero retries on every run of this file so
  // far). An assertion that only ever sees the happy arm is the vacuous kind
  // this repo deletes, so the collision is FORCED here: two connections hold
  // two OPEN transactions, both subqueries read the same `max(number)`, and
  // the loser blocks on the UNIQUE index until the winner commits.
  await block('the forced revision collision', async () => {
      const post = await newDraft('rev-forced', 'Forced revision race');
      await newRevision(post.id, post.slug, 'rev 1', null);
      const winnerConn = await pool.connect();
      const loserConn = await pool.connect();
      let blockObserved = false;
      let loserCode: string | undefined;
      let retryNumber = 0;
      let retries = 0;
      try {
        const winnerDb = drizzle(winnerConn, { schema });
        const loserDb = drizzle(loserConn, { schema });
        await winnerConn.query('begin');
        await newRevisionOn(winnerDb, post.id, post.slug, 'race winner'); // number 2, uncommitted
        await loserConn.query('begin');
        // Deliberately NOT awaited: this statement has to be in flight and
        // queued behind the winner's index entry before the winner commits.
        const blocked = newRevisionOn(loserDb, post.id, post.slug, 'race loser');
        blocked.catch(() => {}); // awaited below; this only stops an unhandled rejection while it is in flight
        // Polls a REAL condition (Postgres saying that backend is waiting on a
        // lock) rather than sleeping a guessed number of milliseconds, which is
        // how a concurrency test quietly stops being one. Bounded, and the wait
        // is asserted, so a run that never blocks fails here instead of passing
        // through the arm it meant to test.
        for (let i = 0; i < 100 && !blockObserved; i++) {
          const waiting = await db.execute<{ n: number }>(
            sql`select count(*)::int as n from pg_stat_activity where wait_event_type = 'Lock' and query ilike '%blog_post_revisions%'`,
          );
          blockObserved = Number(waiting.rows[0]?.n ?? 0) > 0;
          if (!blockObserved) await new Promise((resolve) => setTimeout(resolve, 100));
        }
        await winnerConn.query('commit');
        // The caller's retry-once path, mirroring `insertRevisionOnce` in
        // _actions/blogPosts.ts (a 'use server' module this script cannot
        // import), and COUNTED. Counting is the whole point of this arm: the
        // resulting numbers are the same whether a collision happened or not, so
        // without `retries` the block stays green against a version that never
        // collides at all and the retry is exercised rather than pinned.
        try {
          retryNumber = (await blocked).number;
        } catch (error) {
          if (!isUniqueViolation(error)) throw error;
          retries++;
          loserCode = pgCode(error);
          // A failed statement aborts its transaction, so the retry needs a
          // fresh one. The real caller holds no transaction and simply calls
          // again; only the number matters, and it is RECOMPUTED, which is what
          // lands it after the winner instead of reusing the one it lost with.
          await loserConn.query('rollback');
          await loserConn.query('begin');
          retryNumber = (await newRevisionOn(loserDb, post.id, post.slug, 'race loser, retried')).number;
        }
        await loserConn.query('commit');
      } finally {
        // Rolled back BEFORE release on every path, including a throw between a
        // begin and its commit: see rollbackQuietly.
        await rollbackQuietly(winnerConn);
        await rollbackQuietly(loserConn);
        winnerConn.release();
        loserConn.release();
      }
      ok('db: the second insert really did queue behind the first', blockObserved);
      eq('db: the loser of a genuine race is refused with 23505', loserCode, '23505');
      eq('db: and the caller retried EXACTLY once', retries, 1);
      eq('db: and its retry lands on the NEXT number, not the one it lost with', retryNumber, 3);
      const history = (
        await db.select({ n: blogPostRevisions.number }).from(blogPostRevisions).where(eqCol(blogPostRevisions.postId, post.id))
      ).map((r) => r.n).sort((x, y) => x - y);
      eq('db: leaving a history with no gap and no duplicate', history, [1, 2, 3]);
  });

  // ── 12.3 The publish instant lands in all three places ───────────────────
  // Read back through toSummary's RULE (`revision.published_at ?? created_at`),
  // never off blog_posts: a publish that stamps the post row and leaves the
  // revision null renders the post dated its creation day while sorting it by
  // its publish date, and reading blog_posts.published_at here would report
  // that broken state as a success.
  await block('the publish instant, custom_schema and the preview', async () => {
      const post = await newDraft('publish-day', 'Publish day fixture');
      const rev = await newRevision(post.id, post.slug, 'Publish day fixture', dayInstant);
      const next = await publishPostRow(db, post.id, post.version, { revisionId: rev.id, publishedAt: dayInstant, columns: {} });
      eq('db: publishPostRow reports the new version', next, post.version + 1);
      const [published] = await selectPublishedPost(db, post.slug);
      ok('db: the published predicate now returns it', published !== undefined);
      const readDay = dayKeyIn(STUDIO_TZ, published.revision.publishedAt ?? published.createdAt);
      eq('db: the day read the way the store reads it is the intended day', readDay, DAY);
      eq('db: and the snapshot carries the same instant', published.revision.snapshot.publishedAt, dayInstant.toISOString());
      const row = await readPost(post.id);
      eq('db: blog_posts.published_at agrees with the revision', row?.publishedAt?.toISOString(), dayInstant.toISOString());
      eq('db: the pointer names the revision that was published', row?.publishedRevisionId, rev.id);
      eq('db: publishing clears both halves of any schedule', [row?.publishAt, row?.pendingRevisionId], [null, null]);

      // ── 12.5 published_at survives unpublish and republish ────────────────
      // The coalesce is one keystroke from being an overwrite, and the caller
      // here passes a DIFFERENT instant on purpose: that is the stale-read race
      // the coalesce exists to make this statement right through.
      const archivedVersion = await unpublishPostRow(db, post.id, next!);
      eq('db: unpublish reports a version', archivedVersion, post.version + 2);
      const archived = await readPost(post.id);
      eq('db: unpublish moves ONLY the status', [archived?.status, archived?.publishedAt?.toISOString(), archived?.publishedRevisionId], ['archived', dayInstant.toISOString(), rev.id]);
      // The return is CHECKED, not discarded: a republish that matched no row is
      // a no-op, and a no-op leaves published_at at the seeded instant, which is
      // exactly what the next assertion is looking for. Without this the whole
      // coalesce claim passes against a statement that never ran.
      const republishedVersion = await publishPostRow(db, post.id, archivedVersion!, { revisionId: rev.id, publishedAt: new Date(), columns: {} });
      ok('db: the republish really ran', republishedVersion !== null);
      const republished = await readPost(post.id);
      eq('db: republishing preserves the ORIGINAL published_at', republished?.publishedAt?.toISOString(), dayInstant.toISOString());

      // ── 12.9 custom_schema survives a save ───────────────────────────────
      // Nothing in the live corpus carries one, so it has to be seeded. This is
      // the only way to see the "no .set() ever names the column" mechanism
      // working; the type-level half of it is asserted in the pure section.
      const CUSTOM = { '@context': 'https://schema.org', '@type': 'FAQPage', zzCheck: true };
      await db.update(blogPosts).set({ customSchema: CUSTOM }).where(eqCol(blogPosts.id, post.id));
      const beforeSave = await readPost(post.id);
      const savedVersion = await updateWorkingCopy(db, post.id, beforeSave!.version, {
        title: 'Publish day fixture, edited', description: 'edited', bodyText: 'x', wordCount: 1,
      });
      ok('db: the save door reported a version', savedVersion !== null);
      const afterSave = await readPost(post.id);
      // Field by field, NOT a JSON.stringify compare: Postgres does not promise
      // jsonb key order back out of the column (the same fact the fingerprint
      // sortKeys guard exists for), and this row really does come back reordered.
      const stored = afterSave?.customSchema as Record<string, unknown> | null;
      eq(
        'db: custom_schema survives saveDraft untouched',
        [stored?.['@context'], stored?.['@type'], stored?.zzCheck, Object.keys(stored ?? {}).sort()],
        ['https://schema.org', 'FAQPage', true, ['@context', '@type', 'zzCheck']],
      );
      eq('db: and the save really did write the columns it names', afterSave?.title, 'Publish day fixture, edited');

      // ── 12.10 the preview read equals the public read, and the draft path ──
      // getDraftPost and getPublishedPost both end in the same pure `toPublished`
      // shaping (blogStore.ts is server-only, so it cannot be imported here);
      // what can differ is the ROW each selector hands it, and that is the half
      // with SQL in it. selectPostForPreview joins category and author on the
      // WORKING row while selectPublishedPost joins the REVISION's, so this
      // asserts the two agree field for field on a published post.
      // No `set({ status: 'published' })` here: the republish above already left
      // it published, and forcing it would mask a republish that did nothing.
      const [pub] = await selectPublishedPost(db, post.slug);
      const [prev] = await selectPostForPreview(db, post.id, rev.id);
      ok('db: the preview selector answers for a published post', prev !== undefined);
      const asPublishedRow = {
        id: prev.post.id, slug: prev.post.slug, legacyId: prev.post.legacyId, createdAt: prev.post.createdAt,
        revision: prev.revision, category: prev.category, author: prev.author,
      };
      eq('db: the preview row equals the public row, field for field', asPublishedRow, pub);
  });

  // A draft with ZERO revisions is the most common preview there is
  // (createPost writes none and autosave writes none), and it is exactly what
  // a revision-JOIN implementation would 404.
  await block('the zero-revision preview', async () => {
      const post = await newDraft('preview-virgin', 'Never saved a revision');
      eq('db: the fixture really has no revisions', (await db.select().from(blogPostRevisions).where(eqCol(blogPostRevisions.postId, post.id))).length, 0);
      const rows = await selectPostForPreview(db, post.id);
      eq('db: a draft with zero revisions still returns one preview row', rows.length, 1);
      eq('db: and it comes back with no revision, for the working-row path', rows[0]?.revision, null);
      // ── 12.11 an empty ?revision= means "no revision given" ───────────────
      // getDraftPost normalises `revisionId || undefined`; selectPostForPreview
      // reads a falsy id the same way. Guarded as a malformed uuid instead, this
      // URL would 404; passed through to Postgres it would throw 22P02.
      const empty = await selectPostForPreview(db, post.id, '');
      eq('db: an empty revision id takes the working-row path rather than throwing', [empty.length, empty[0]?.revision ?? null], [1, null]);
  });

  // ── 12.11 a foreign revision id is refused ───────────────────────────────
  // Post A's preview asked for with post B's revision must return NO ROW, so
  // the caller 404s. Silently falling back to A's newest revision would render
  // a different document than the URL asked for, which is worse than a miss.
  await block('the foreign revision id', async () => {
      const a = await newDraft('foreign-a', 'Foreign revision A');
      const b = await newDraft('foreign-b', 'Foreign revision B');
      const aRev = await newRevision(a.id, a.slug, 'A rev', null);
      const bRev = await newRevision(b.id, b.slug, 'B rev', null);
      eq('db: a revision belonging to another post returns no row', (await selectPostForPreview(db, a.id, bRev.id)).length, 0);
      eq('db: and the post its own revision names still answers', (await selectPostForPreview(db, a.id, aRev.id)).length, 1);
      eq('db: an unknown revision id returns no row either', (await selectPostForPreview(db, a.id, '00000000-0000-4000-8000-000000000000')).length, 0);
  });

  // ── 12.6 all three CHECK constraints refuse a bad row ────────────────────
  // Each illegal state, then the LEGAL form of the same row, so a constraint
  // that refuses everything cannot pass this as a success.
  await block('the CHECK constraints', async () => {
      const holder = await newDraft('check-holder', 'CHECK fixture');
      const holderRev = await newRevision(holder.id, holder.slug, 'CHECK rev', dayInstant);
      const base = (name: string) => ({
        slug: slugOf(name), title: `ZZ ${name}`, description: 'd', categoryId: catA.id, authorId: authorA.id,
        heroAlt: 'a', body: EMPTY_BLOG_DOC, bodyText: '', wordCount: 0,
        seoTitle: 't', seoDescription: 'd', ogTitle: 't', ogDescription: 'd',
      });
      const future = new Date(Date.now() + 86_400_000);

      const noStamp = await refused(() => db.insert(blogPosts).values({ ...base('chk-pub'), status: 'published', publishedAt: null }));
      eq('db: published with no published_at is refused', [noStamp?.code, noStamp?.constraint], ['23514', 'blog_posts_published_stamp']);
      eq('db: and the legal form of the same row is accepted', await refused(() => db.insert(blogPosts).values({ ...base('chk-pub'), status: 'published', publishedAt: dayInstant })), null);

      const noWhen = await refused(() => db.insert(blogPosts).values({ ...base('chk-when'), status: 'scheduled', publishAt: null, pendingRevisionId: holderRev.id }));
      eq('db: scheduled with no publish_at is refused', [noWhen?.code, noWhen?.constraint], ['23514', 'blog_posts_schedule_stamp']);

      const noWhat = await refused(() => db.insert(blogPosts).values({ ...base('chk-what'), status: 'scheduled', publishAt: future, pendingRevisionId: null }));
      eq('db: scheduled with no pending_revision_id is refused', [noWhat?.code, noWhat?.constraint], ['23514', 'blog_posts_schedule_stamp']);

      eq('db: and a schedule carrying BOTH halves is accepted', await refused(() => db.insert(blogPosts).values({ ...base('chk-both'), status: 'scheduled', publishAt: future, pendingRevisionId: holderRev.id })), null);

      const strayPending = await refused(() => db.insert(blogPosts).values({ ...base('chk-stray'), status: 'draft', pendingRevisionId: holderRev.id }));
      eq('db: a pending pointer outside `scheduled` is refused', [strayPending?.code, strayPending?.constraint], ['23514', 'blog_posts_pending_only_scheduled']);
      eq('db: the same draft with no pending pointer is accepted', await refused(() => db.insert(blogPosts).values({ ...base('chk-stray'), status: 'draft', pendingRevisionId: null })), null);

      const noTrashStamp = await refused(() => db.insert(blogPosts).values({ ...base('chk-trash'), status: 'trash', trashedAt: null }));
      eq('db: trash with no trashed_at is refused', [noTrashStamp?.code, noTrashStamp?.constraint], ['23514', 'blog_posts_trash_stamp']);
  });

  // ── 12.4 / 12.7 the cron statement, and what trash does to a schedule ────
  await block('the cron statement and the trashed schedule', async () => {
      // Due: fires. Future: must not. Rescheduled: already carries a
      // published_at from an earlier life, which is the row the coalesce exists
      // for (a bare `publish_at` would silently re-date it).
      const due = await newDraft('cron-due', 'Cron due fixture');
      const dueRev = await newRevision(due.id, due.slug, 'Cron due fixture', dayInstant);
      const later = await schedulePostRow(db, due.id, due.version, { revisionId: dueRev.id, publishAt: dayInstant, columns: {} });
      eq('db: schedulePostRow reports a version', later, due.version + 1);
      const scheduled = await readPost(due.id);
      eq('db: a scheduled row carries both halves and no published_at', [scheduled?.status, scheduled?.publishAt?.toISOString(), scheduled?.pendingRevisionId, scheduled?.publishedAt], ['scheduled', dayInstant.toISOString(), dueRev.id, null]);

      const future = await newDraft('cron-future', 'Cron future fixture');
      const futureRev = await newRevision(future.id, future.slug, 'Cron future fixture', null);
      const futureAt = new Date(Date.now() + 30 * 86_400_000);
      await schedulePostRow(db, future.id, future.version, { revisionId: futureRev.id, publishAt: futureAt, columns: {} });

      const again = await newDraft('cron-again', 'Cron reschedule fixture');
      const againRev = await newRevision(again.id, again.slug, 'Cron reschedule fixture', oldInstant);
      await schedulePostRow(db, again.id, again.version, { revisionId: againRev.id, publishAt: dayInstant, columns: {} });
      // A scheduled row that HAS been published before. All four CHECKs accept
      // it, and it is the only shape in which the coalesce is observable.
      await db.update(blogPosts).set({ publishedAt: oldInstant }).where(eqCol(blogPosts.id, again.id));

      const binned = await newDraft('cron-binned', 'Cron binned fixture');
      const binnedRev = await newRevision(binned.id, binned.slug, 'Cron binned fixture', dayInstant);
      const binnedScheduled = await schedulePostRow(db, binned.id, binned.version, { revisionId: binnedRev.id, publishAt: dayInstant, columns: {} });
      const trashedAt = new Date();
      eq('db: trashPostRow reports a version', await trashPostRow(db, binned.id, binnedScheduled!, trashedAt), binned.version + 2);
      const bin = await readPost(binned.id);
      eq('db: trashing a scheduled post clears the whole schedule in one statement', [bin?.status, bin?.trashedAt !== null, bin?.publishAt, bin?.pendingRevisionId], ['trash', true, null, null]);

      // ── The cron statement runs INSIDE A TRANSACTION THAT IS ALWAYS ROLLED
      // BACK, and that is a safety requirement rather than tidiness. Every other
      // write in this file names a fixture id or the `zz-check-` prefix;
      // `publishDuePostRows` is the one that cannot, because it is the cron's
      // production statement and its WHERE is `status = 'scheduled' AND
      // publish_at <= now AND pending_revision_id IS NOT NULL` — no fixture
      // predicate, correctly, since the cron must publish every due schedule.
      // Filtering its RETURNED rows would scope the READ, not the write. Run on
      // the shared connection it would, the day a real post is scheduled,
      // publish it for good: version bumped, schedule cleared, date stamped,
      // and with no updateTag behind it so the site would not even show it. A
      // transaction makes that structurally impossible rather than merely
      // unasserted. The two assertions below are the alarm beside the
      // guarantee: run 1's answer is split into ours and everything else, and
      // the remainder must be EMPTY — a foreign row consumed by run 1 is
      // invisible to a prefix filter, which is exactly the hole a filtered
      // answer leaves. `foreignScheduled` either side of the whole run is the
      // third layer.
      const cronConn = await pool.connect();
      try {
        const cronDb = drizzle(cronConn, { schema });
        const readIn = async (id: string) => {
          const [row] = await cronDb.select().from(blogPosts).where(eqCol(blogPosts.id, id)).limit(1);
          return row ?? null;
        };
        await cronConn.query('begin');
        const now = new Date();
        // Captured UNFILTERED, and split. The RETURNING is the statement's own
        // account of every row it changed, so the remainder below is the only
        // thing that can see a real post this run consumed: prefix-filtering
        // before looking discards exactly the evidence the label claims.
        const firstRunRows = await publishDuePostRows(cronDb, now);
        const firstRun = firstRunRows.map((r) => r.slug);
        eq('db: the cron publishes exactly the due schedules', firstRun.filter((slug) => slug.startsWith(PREFIX)).sort(), [due.slug, again.slug].sort());
        eq('db: and it touched nothing else at all', firstRun.filter((slug) => !slug.startsWith(PREFIX)), []);
        // The widened RETURNING, against the real database. Postgres returns
        // the NEW row, so `published_revision_id` here is the revision this
        // statement just promoted and `pending_revision_id` is already gone —
        // which is the whole reason the cron can build a public reference with
        // a real fingerprint instead of a placeholder. Asserted as PAIRS so a
        // statement returning the right ids against the wrong slugs fails.
        eq(
          'db: and each returned row names the revision it just promoted',
          firstRunRows.filter((r) => r.slug.startsWith(PREFIX)).map((r) => [r.slug, r.publishedRevisionId]).sort(),
          [[due.slug, dueRev.id], [again.slug, againRev.id]].sort(),
        );
        const flipped = await readIn(due.id);
        eq('db: the due post is published, pointer moved, schedule cleared', [flipped?.status, flipped?.publishedRevisionId, flipped?.pendingRevisionId, flipped?.publishAt], ['published', dueRev.id, null, null]);
        eq('db: and it is dated the instant it was scheduled for, not the run time', flipped?.publishedAt?.toISOString(), dayInstant.toISOString());
        eq('db: a post that had been published before keeps its ORIGINAL date', (await readIn(again.id))?.publishedAt?.toISOString(), oldInstant.toISOString());
        const untouched = await readIn(future.id);
        eq('db: a schedule in the future is untouched', [untouched?.status, untouched?.publishAt?.toISOString(), untouched?.pendingRevisionId], ['scheduled', futureAt.toISOString(), futureRev.id]);
        eq('db: and the binned post is not picked up', (await readIn(binned.id))?.status, 'trash');

        // Vercel documents duplicate cron invocations, so a second run is the
        // realistic case rather than an edge one. Its answer is checked whole,
        // for the reason run 1's is: a second run must move NOTHING, ours or
        // anybody's.
        const secondRun = await publishDuePostRows(cronDb, new Date());
        eq('db: a second run reports zero rows', secondRun.length, 0);
        eq('db: and published_at did not move', (await readIn(due.id))?.publishedAt?.toISOString(), dayInstant.toISOString());
      } finally {
        await rollbackQuietly(cronConn);
        cronConn.release();
      }
      // Rolled back, so the fixtures are scheduled again. The sweep unhooks
      // before it deletes, so that costs it nothing.
      eq('db: the rollback really did undo the flip', (await readPost(due.id))?.status, 'scheduled');
  });

  // ── 12.8 purge is ONE delete, and it cascades ────────────────────────────
  // `published_revision_id` is ON DELETE RESTRICT while the revisions cascade
  // from the post, so this is the assertion that proves the single-statement
  // ordering is possible at all rather than throwing for every post that was
  // ever published.
  await block('the purge cascade', async () => {
      const victim = await newDraft('purge-victim', 'Purge victim');
      const other = await newDraft('purge-other', 'Purge referrer');
      const rev1 = await newRevision(victim.id, victim.slug, 'v1', dayInstant);
      await newRevision(victim.id, victim.slug, 'v2', null);
      await replaceRelated(db, other.id, [victim.slug]);
      await replaceEntities(db, victim.id, [{ name: `${PREFIX}entity`, sameAs: ['https://example.com/zz'], primary: true }]);
      await db.update(blogPosts).set({ status: 'trash', trashedAt: new Date(), publishedRevisionId: rev1.id, publishedAt: dayInstant }).where(eqCol(blogPosts.id, victim.id));

      eq('db: purgePostRow refuses a post that is not in the bin', await purgePostRow(db, other.id), false);
      eq('db: and that post is still there', (await readPost(other.id)) !== null, true);
      eq('db: purgePostRow deletes a trashed post that still points at a revision', await purgePostRow(db, victim.id), true);
      eq('db: the post row is gone', await readPost(victim.id), null);
      eq('db: its revisions cascaded', (await db.select().from(blogPostRevisions).where(eqCol(blogPostRevisions.postId, victim.id))).length, 0);
      eq('db: its related links cascaded', (await db.select().from(blogPostRelated).where(eqCol(blogPostRelated.relatedPostId, victim.id))).length, 0);
      eq('db: its entity links cascaded', (await db.select().from(blogPostEntities).where(eqCol(blogPostEntities.postId, victim.id))).length, 0);
      // The shared vocabulary row is NOT the post's to delete: another post may
      // still name it.
      eq('db: but the shared entity row survives', (await db.select().from(blogEntities).where(eqCol(blogEntities.name, `${PREFIX}entity`))).length, 1);
      eq('db: and the referring post survives', (await readPost(other.id)) !== null, true);
  });

  // ── 12.12 / 12.13 the list WHERE: search reach, and `all` excludes trash ──
  // The REAL clause from src/db/blogAdminPredicates.ts, over the two joins it
  // documents as its precondition. Only the fixtures are read back, and the
  // negative cases are what stop that filter from hiding a predicate that
  // matched everything.
  await block('the list WHERE', async () => {
      await newDraft('search-post', 'Vancouver Realtors Video Playbook');
      const elsewhere = await insertDraftPost(db, { slug: slugOf('search-other'), categoryId: catB.id, authorId: authorB.id });
      if (!elsewhere) throw new Error('fixture search-other was refused');
      await updateWorkingCopy(db, elsewhere.id, elsewhere.version, { title: 'Unrelated Playbook', description: 'd' });
      const binned = await newDraft('search-binned', 'Binned Playbook');
      await trashPostRow(db, binned.id, binned.version, new Date());

      const listed = async (params: Partial<BlogListParams>) => {
        const p: BlogListParams = { status: 'all', q: '', author: '', category: '', sort: 'updated', page: 1, ...params };
        const rows = await db
          .select({ slug: blogPosts.slug })
          .from(blogPosts)
          .innerJoin(blogCategories, eqCol(blogCategories.id, blogPosts.categoryId))
          .innerJoin(blogAuthors, eqCol(blogAuthors.id, blogPosts.authorId))
          .where(adminPostsWhere(p))
          .orderBy(...adminPostsOrder(p.sort));
        return rows.map((r) => r.slug).filter((s) => s.startsWith(PREFIX)).sort();
      };

      eq('db: q finds a post by a word in its TITLE', await listed({ q: 'realtors' }), [slugOf('search-post')]);
      eq('db: q finds a post by its AUTHOR name', (await listed({ q: 'quillfeather' })).includes(slugOf('search-post')), true);
      eq('db: q finds a post by its CATEGORY title', (await listed({ q: 'zeppelin' })).includes(slugOf('search-post')), true);
      // The whole reason the tokenizer exists: one `%q%` wrap cannot match two
      // words living in DIFFERENT fields, and this is not a typo.
      eq('db: two words in two different fields still match', await listed({ q: 'quillfeather realtors' }), [slugOf('search-post')]);
      eq('db: a word in the title and one in the category title match', await listed({ q: 'zeppelin playbook' }), [slugOf('search-post')]);
      // ANDed, so an extra word nothing carries narrows to nothing. Without this
      // the assertions above would pass against a predicate matching everything.
      eq('db: a token nothing carries returns nothing', await listed({ q: 'realtors zzzznotaword' }), []);
      eq('db: an empty q widens rather than collapsing', (await listed({})).includes(slugOf('search-post')), true);

      // `all` is "everything but the bin", applied in SQL rather than in the UI.
      const all = await listed({});
      eq('db: the `all` tab excludes trash', all.includes(slugOf('search-binned')), false);
      ok('db: while still returning the live fixtures', all.includes(slugOf('search-post')) && all.includes(slugOf('search-other')));
      // Stated as membership rather than equality: other blocks above leave their
      // own binned fixtures behind, and an assertion that had to know about them
      // would break every time one was added.
      const trash = await listed({ status: 'trash' });
      eq(
        'db: the `trash` tab returns the binned post and nothing live',
        [trash.includes(slugOf('search-binned')), trash.includes(slugOf('search-post')), trash.includes(slugOf('search-other'))],
        [true, false, false],
      );
      eq('db: and the two tabs are disjoint', all.filter((slug) => trash.includes(slug)), []);
      eq('db: the author facet narrows to that author', await listed({ author: authorB.slug }), [slugOf('search-other')]);
      eq('db: the category facet narrows to that category', await listed({ category: catB.slug }), [slugOf('search-other')]);
  });

  // ── 13.1 the tab badges are the count of the rows behind them ───────────
  // The REAL statement from src/db/blogAdminPredicates.ts, the same one
  // `statusCounts` runs. The pure half can only pin the FOLD; the number a
  // member reads is a fold over a WINDOW, and a window counted over the corpus
  // renders "Published 38" above three rows without anything on screen saying
  // which half is wrong. Every fixture below carries one nonsense word, so the
  // facet reaches exactly them and the identity is exact rather than
  // approximate.
  await block('the tab badges', async () => {
      const TOKEN = 'Badgewick';
      await newDraft('badge-draft-a', `${TOKEN} Draft One`);
      await newDraft('badge-draft-b', `${TOKEN} Draft Two`);
      const live = await newDraft('badge-live', `${TOKEN} Live`);
      const gone = await newDraft('badge-binned', `${TOKEN} Binned`);
      await db
        .update(blogPosts)
        .set({ status: 'published', publishedAt: dayInstant })
        .where(eqCol(blogPosts.id, live.id));
      await trashPostRow(db, gone.id, gone.version, new Date());

      type Facets = Pick<BlogListParams, 'q' | 'author' | 'category'>;
      const NONE: Facets = { q: '', author: '', category: '' };

      const badges = async (facets: Facets): Promise<Record<BlogPostStatus, number>> => {
        const out: Record<BlogPostStatus, number> = {
          draft: 0, scheduled: 0, published: 0, archived: 0, trash: 0,
        };
        for (const row of await selectStatusCounts(db, facets)) out[row.status] = row.n;
        return out;
      };
      /** The rows the LIST would return for one tab under the same facets. */
      const listed = async (status: BlogListStatus, facets: Facets): Promise<number> => {
        const rows = await db
          .select({ slug: blogPosts.slug })
          .from(blogPosts)
          .innerJoin(blogCategories, eqCol(blogCategories.id, blogPosts.categoryId))
          .innerJoin(blogAuthors, eqCol(blogAuthors.id, blogPosts.authorId))
          .where(adminPostsWhere({ ...facets, status }));
        return rows.length;
      };

      const filtered = { ...NONE, q: TOKEN };
      eq(
        'db: the badges split the fixtures by status',
        await badges(filtered),
        { draft: 2, scheduled: 0, published: 1, archived: 0, trash: 1 },
      );

      // The identity the whole thing exists for, per tab.
      const counts = await badges(filtered);
      for (const status of BLOG_POST_STATUSES) {
        eq(
          `db: the ${status} badge equals the rows that tab returns`,
          counts[status],
          await listed(status, filtered),
        );
      }
      eq(
        'db: and the all badge equals the rows the all tab returns',
        blogTabCount('all', counts),
        await listed('all', filtered),
      );
      eq('db: which is the three non-binned fixtures', blogTabCount('all', counts), 3);

      // Without the facet the badge counts the whole corpus, which is exactly
      // the number that must NOT be shown over a filtered list. This is the
      // assertion that goes red if the window is dropped.
      const corpus = await badges(NONE);
      ok(
        'db: the same badge over no filter is strictly larger',
        corpus.published > counts.published && corpus.draft > counts.draft,
        `corpus=${corpus.published}/${corpus.draft} filtered=${counts.published}/${counts.draft}`,
      );

      // The author facet reaches the counts too, not just the search.
      eq(
        'db: the author facet narrows the badges',
        await badges({ ...filtered, author: authorB.slug }),
        { draft: 0, scheduled: 0, published: 0, archived: 0, trash: 0 },
      );
      eq(
        'db: while the fixtures own author leaves them alone',
        await badges({ ...filtered, author: authorA.slug }),
        counts,
      );
      eq(
        'db: a facet matching nothing zeroes every badge',
        await badges({ ...NONE, q: 'zzzznotaword' }),
        { draft: 0, scheduled: 0, published: 0, archived: 0, trash: 0 },
      );
  });

  // ── 17.1 whether a post's stored word count is still the importer's ──────
  // The gate on the editor's one-time word-count notice, and the SQL behind it
  // is the importer's own skip rule read from the other end. Wrong in either
  // direction it is silent: too loose and every ordinary edit to every post
  // pops a toast about an import formula, too tight and the 38 imported posts
  // change their visible reading time with nothing said.
  {
    const provenance = async (postId: string) => (await selectImportProvenance(db, postId))[0];
    // The REAL fold, not a twin of it: a hand-copied `imported && !edited` here
    // could not see a change to `isLegacyWordCount`, which is the "asserting a
    // copy of the code" shape this file warns about elsewhere.
    const legacy = async (postId: string) => isLegacyWordCount(await provenance(postId));

    const LEGACY_WORDS = 1438;
    const importRevision = (postId: string, name: string, words: number) =>
      insertRevision(db, {
        postId, reason: 'import', slug: slugOf(name), title: 'Imported',
        categoryId: catA.id, authorId: authorA.id, publishedAt: null,
        contentModifiedAt: null, robotsIndex: true, llmsInclude: true, wordCount: words,
        snapshot: snapshotFor(slugOf(name), 'Imported', null),
        actorId: null, actorName: 'ZZ-CHECK',
      });

    // A post created in the editor has NO revisions at all until its first
    // explicit save. It still answers, and this is the assertion that says so:
    // there is no GROUP BY, so the query is a scalar aggregate and Postgres
    // returns exactly one row however empty the join was, with every column
    // NULL. Reading that as "no row" would have made the fold's `undefined`
    // branch the one under test instead of its `imported !== true` branch.
    const fresh = await newDraft('provenance-fresh', 'Fresh');
    eq('db: a post with no revisions answers one all-null row', await provenance(fresh.id), {
      imported: null,
      edited: null,
      importWordCount: null,
      workingWordCount: null,
    });
    ok('db: and its count is NOT the importer\'s', !(await legacy(fresh.id)));

    const imported = await newDraft('provenance-imported', 'Imported', { wordCount: LEGACY_WORDS });
    await importRevision(imported.id, 'provenance-imported', LEGACY_WORDS);
    eq('db: an import-only history reads imported, unedited, and both counts equal', await provenance(imported.id), {
      imported: true,
      edited: false,
      importWordCount: LEGACY_WORDS,
      workingWordCount: LEGACY_WORDS,
    });
    ok('db: so its stored count IS still the importer\'s', await legacy(imported.id));

    // THE AUTOSAVE CASE, and it is the one the flags alone cannot see:
    // `saveDraft` writes no revision, so both flags still say "imported and
    // untouched" while the working count has already moved to the editor's.
    // Through the REAL working-copy door, so this is what an autosave does.
    const afterAutosave = await updateWorkingCopy(db, imported.id, imported.version, { wordCount: 1214 });
    ok('db: the autosave landed (fixture guard)', afterAutosave !== null);
    eq('db: the flags are unmoved by an autosave', {
      imported: (await provenance(imported.id))?.imported,
      edited: (await provenance(imported.id))?.edited,
    }, { imported: true, edited: false });
    eq('db: but the two counts have diverged', await provenance(imported.id), {
      imported: true, edited: false, importWordCount: LEGACY_WORDS, workingWordCount: 1214,
    });
    ok('db: so the notice is spent, without any explicit save', !(await legacy(imported.id)));

    // One editor save anywhere in the history, and the edited half closes it
    // permanently. This is the exact predicate scripts/import-blogs.mts skips
    // on. Asserted on a SEPARATE post whose counts still match, so it is the
    // edited half doing the work rather than the divergence above.
    const republished = await newDraft('provenance-edited', 'Edited', { wordCount: LEGACY_WORDS });
    await importRevision(republished.id, 'provenance-edited', LEGACY_WORDS);
    ok('db: it starts out as the importer\'s (fixture guard)', await legacy(republished.id));
    // The save revision records a HIGHER count than the import one, which is
    // the ordinary case: somebody expanded the article. That is what makes the
    // `filter (where reason = 'import')` visible at all, and mutation testing
    // is what found it: without a fixture where the two maxima differ, dropping
    // the filter is indistinguishable from keeping it.
    await insertRevision(db, {
      postId: republished.id, reason: 'save', slug: slugOf('provenance-edited'),
      title: 'Edited here', categoryId: catA.id, authorId: authorA.id, publishedAt: null,
      contentModifiedAt: null, robotsIndex: true, llmsInclude: true, wordCount: 2000,
      snapshot: snapshotFor(slugOf('provenance-edited'), 'Edited here', null),
      actorId: null, actorName: 'ZZ-CHECK',
    });
    eq('db: one non-import revision flips the edited half', (await provenance(republished.id))?.edited, true);
    eq(
      'db: and importWordCount stays the IMPORT revisions\' figure, not the newer save\'s',
      await provenance(republished.id),
      { imported: true, edited: true, importWordCount: LEGACY_WORDS, workingWordCount: LEGACY_WORDS },
    );
    ok('db: and the count stops being the importer\'s, for good', !(await legacy(republished.id)));
    // Why the filter cannot change the ANSWER today, stated rather than left
    // to be rediscovered: the fold refuses on `edited` before it ever compares
    // the counts, so the two maxima can only differ on a post it has already
    // said no to. The filter is what keeps the column meaning what its name
    // says, so relaxing that guard later cannot silently make it lie.
    ok('db: the fold refuses on the edited half before the counts matter',
      !isLegacyWordCount({ imported: true, edited: true, importWordCount: 1, workingWordCount: 1 }));

    // A post the editor made and saved: revisions, none of them an import.
    const madeHere = await newDraft('provenance-made', 'Made here');
    await newRevision(madeHere.id, slugOf('provenance-made'), 'Made here', null);
    eq('db: a post made in the editor was never imported', (await provenance(madeHere.id))?.imported, false);
    ok('db: so it never gets the notice either', !(await legacy(madeHere.id)));
  }

  // ── 12.14 the RESTRICT behind the taxonomy delete refusals ───────────────
  // `countPostsForAuthor` counts posts AND revisions because BOTH tables carry
  // an author_id with ON DELETE RESTRICT. This is the state that proves the
  // revisions half is not decorative: every post reassigned, and the delete
  // still refused because a revision remembers the byline.
  await block('the taxonomy RESTRICT', async () => {
      // Its own author and category, used by nothing else in this run, so "no
      // working row names it any more" is a fact about the whole table rather
      // than about the fixtures that happen to be left.
      const [authorC] = await db
        .insert(blogAuthors)
        .values({ slug: slugOf('author-3'), name: 'Wilhelmina Fernsby', role: 'r', bio: 'b', sortIndex: 9003 })
        .returning();
      const [catC] = await db
        .insert(blogCategories)
        .values({ slug: slugOf('cat-3'), title: 'Vellum Monthly', sortIndex: 9003 })
        .returning();
      const created = await insertDraftPost(db, { slug: slugOf('restrict-post'), categoryId: catC.id, authorId: authorC.id });
      if (!created) throw new Error('fixture restrict-post was refused');
      await insertRevision(db, {
        postId: created.id, reason: 'save', slug: slugOf('restrict-post'), title: 'Restrict fixture',
        categoryId: catC.id, authorId: authorC.id, publishedAt: null, contentModifiedAt: null,
        robotsIndex: true, llmsInclude: true, wordCount: 0,
        snapshot: snapshotFor(slugOf('restrict-post'), 'Restrict fixture', null),
        actorId: null, actorName: 'ZZ-CHECK',
      });
      // Every POST reassigned; only the revision still remembers the byline.
      await db.update(blogPosts).set({ authorId: authorA.id, categoryId: catA.id }).where(eqCol(blogPosts.id, created.id));
      eq('db: no working row names that author any more', (await db.select().from(blogPosts).where(eqCol(blogPosts.authorId, authorC.id))).length, 0);
      eq('db: nor that category', (await db.select().from(blogPosts).where(eqCol(blogPosts.categoryId, catC.id))).length, 0);
      const authorGone = await refused(() => db.delete(blogAuthors).where(eqCol(blogAuthors.id, authorC.id)));
      eq('db: deleting an author a REVISION still names is refused', authorGone?.code, '23503');
      const catGone = await refused(() => db.delete(blogCategories).where(eqCol(blogCategories.id, catC.id)));
      eq('db: deleting a category a REVISION still names is refused', catGone?.code, '23503');
  });
} catch (error) {
  fails++;
  console.log(`FAIL  db: the block threw  ${error instanceof Error ? `${error.message} | ${JSON.stringify(refusal(error))}` : String(error)}`);
} finally {
  // Each step guarded on its own. A throw inside a `finally` escapes as an
  // unhandled rejection, which would take the zero-fixtures proof, `pool.end()`
  // and the summary line with it — a run that swept nothing and said nothing.
  try {
    await sweep();
  } catch (error) {
    fails++;
    console.log(`FAIL  db: the sweep threw, so fixtures may remain  ${error instanceof Error ? error.message : String(error)}`);
  }
  try {
    // The proof that this run left the real corpus exactly as it found it. A
    // fixture that survives a failed assertion is a row in the production blog.
    const left = await db.select({ slug: blogPosts.slug }).from(blogPosts).where(like(blogPosts.slug, `${PREFIX}%`));
    const strayAuthors = await db.select({ slug: blogAuthors.slug }).from(blogAuthors).where(like(blogAuthors.slug, `${PREFIX}%`));
    const strayCats = await db.select({ slug: blogCategories.slug }).from(blogCategories).where(like(blogCategories.slug, `${PREFIX}%`));
    const strayEntities = await db.select({ name: blogEntities.name }).from(blogEntities).where(like(blogEntities.name, `${PREFIX}%`));
    eq('db: no zz-check- fixtures remain (posts, authors, categories, entities)', [left.length, strayAuthors.length, strayCats.length, strayEntities.length], [0, 0, 0, 0]);
    // The other half of the safety claim: nothing that was NOT ours moved.
    // Only `publishDuePostRows` could have done it, and it ran inside a
    // rolled-back transaction; this is what would notice if it ever did not.
    eq('db: no scheduled post outside the fixtures moved', await foreignScheduled(), foreignScheduledBefore);
  } catch (error) {
    fails++;
    console.log(`FAIL  db: could not verify the sweep  ${error instanceof Error ? error.message : String(error)}`);
  }
  await pool.end().catch(() => {});
}

console.log(fails === 0 ? '\nALL PASS  (pure + db)' : `\n${fails} FAILED`);
process.exit(fails === 0 ? 0 : 1);
