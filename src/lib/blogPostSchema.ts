/**
 * Validation for the post-level blog fields: everything that reaches a URL,
 * an attribute or a JSON-LD property and is NOT the body doc (blogBody.ts
 * owns that). The importer parses every record through this before any
 * write; step 2's actions do too. Never import from public-page code:
 * zod stays out of the marketing chunks.
 *
 * THREE DOORS, and the split is the point:
 *
 *  - `blogPostFieldsSchema` is the strict base the importer has always used.
 *    Its field set is frozen at what the importer writes, which is also what
 *    keeps `custom_schema` and an author's uploaded photo safe: a `.strict()`
 *    object that never names a column cannot carry a value into a `.set()`.
 *  - `blogDraftSchema` is what autosave and Save accept. Every required
 *    non-empty string relaxes to allow `''`, because a draft is a
 *    half-written post by definition and refusing an empty title would fail
 *    autosave on the first keystroke of every new post. RELAXED MEANS
 *    EMPTY-ALLOWED, NOT SHAPE-FREE: every cap, every slug shape and every URL
 *    guard still binds, because the value is stored either way and step 4's
 *    inspectors read it back.
 *  - `blogPublishSchema` is the base plus the two refusals a per-field schema
 *    cannot express: a hero must be present (two independently nullable
 *    columns cannot say "at least one of these"), and the body must not be
 *    blank.
 *
 * `customSchema` appears in NEITHER of the two new schemas, deliberately. It
 * is a step-4 field, it survives a save by never being named in a payload or
 * a `.set()`, and a `.strict()` object that omits it is the mechanism. Do not
 * add it for completeness.
 */
import { z } from 'zod';

import { blogMediaSchema, bodyIsBlank } from '@/lib/blogBody';
import {
  ROBOTS_EXTRA_KEYS,
  ROBOTS_EXTRA_KINDS,
  ROBOTS_PREVIEW_VALUES,
  type RobotsExtraKey,
  type RobotsExtraKind,
} from '@/lib/blogFields';
import { PORTFOLIO_SLUG_MAX, PORTFOLIO_SLUG_RE, STATIC_IMAGE_PATH_RE } from '@/lib/portfolioFields';
import { safeHref } from '@/lib/safeHref';

/**
 * Zod error → { fieldPath: firstMessage } for the editor's per-field slots
 * (pathless issues land under `_form`). The exact shape careersSchema.ts's
 * flattenCareersIssues and portfolioSchema.ts's flattenPortfolioIssues
 * return, so the actions' `{ ok: false, error: 'validation', issues }` result
 * is one shape across the dashboard rather than a third one here.
 */
export function flattenBlogIssues(error: z.ZodError): Record<string, string> {
  const issues: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form';
    if (!(key in issues)) issues[key] = issue.message;
  }
  return issues;
}

/** Static segments under /blogs that shadow `[blog]` (the
 *  /admin/reports/internal precedent): a post with this slug would be listed
 *  everywhere and reachable nowhere. */
export const RESERVED_BLOG_SLUGS = ['authors'] as const;
/** Shared with clients and projects so the store's shape gate and this
 *  schema can never disagree. */
export const BLOG_SLUG_MAX = PORTFOLIO_SLUG_MAX;

const NO_CONTROL_RE = /[\u0000-\u001f\u007f]/;
/**
 * A required field means "a human filled this in", and `min(1)` does not say
 * that: a single space satisfies it. `blogPublishSchema` is now the gate
 * between a draft and a live article, so without the trim check `title: ' '`
 * publishes a post with a blank <title> and a blank <h1>, silently, one
 * keystroke away. careersSchema.ts has trimmed since it shipped.
 *
 * It REFUSES rather than trimming, and that is the one deliberate difference
 * from careers' `.trim().min()`: `.trim()` in zod is a TRANSFORM, so adopting
 * it here would change what the importer stores for all 38 posts and move
 * every snapshot hash. Refusing changes nothing that already parses.
 *
 * Only when `min > 0`. An optional field is allowed to be empty, and a space
 * typed into one is a value somebody chose, not a missing answer.
 */
const text = (max: number, min = 0) => {
  const base = z.string().min(min).max(max).refine((s) => !NO_CONTROL_RE.test(s), 'control character');
  return min > 0 ? base.refine((s) => s.trim() !== '', 'This cannot be only spaces.') : base;
};

const slug = z.string().max(BLOG_SLUG_MAX).regex(PORTFOLIO_SLUG_RE, 'lowercase kebab-case');

export const blogSlugSchema = slug.refine(
  (s) => !(RESERVED_BLOG_SLUGS as readonly string[]).includes(s),
  'reserved slug',
);
export const blogCategorySlugSchema = slug;
export const blogAuthorSlugSchema = slug;

/** Absolute http(s), through the one href guard. */
const absoluteHttp = z
  .string()
  .max(2048)
  .refine((h) => safeHref(h) !== null && /^https?:\/\//i.test(h), 'absolute http(s) URL');

export const blogSourcesSchema = z
  .array(
    z
      .object({
        title: text(300, 1),
        href: absoluteHttp,
        rel: z.enum(['nofollow', 'sponsored', 'ugc']).optional(),
      })
      .strict(),
  )
  .max(50);

export const blogEntitiesSchema = z
  .array(
    z
      .object({
        name: text(200, 1),
        sameAs: z.array(absoluteHttp).min(1).max(20),
        primary: z.boolean(),
      })
      .strict(),
  )
  .max(30);

export const blogFaqsSchema = z
  .array(z.object({ question: text(300, 1), answer: text(2000, 1) }).strict())
  .max(30);

export const blogKeyTakeawaysSchema = z.array(text(240, 1)).max(5);
export const blogFocusKeywordsSchema = z.array(text(80, 1)).max(30);

/** A cross-domain canonical is a legitimate expert use, so the host is not
 *  restricted; https only, parseable, no userinfo, no fragment.
 *
 *  The control-character guard runs BEFORE the parse and is the same rule
 *  every text field here has. It is not redundant with `new URL`: a C0
 *  control inside a path is percent-encoded rather than rejected, and this
 *  schema stores the RAW string, not `u.href` — so without it the one field
 *  that reaches `<link rel="canonical" href>` would be the only string in
 *  this module able to carry a control character into an attribute. */
export const canonicalOverrideSchema = z
  .string()
  .max(2048)
  .refine((v) => {
    if (NO_CONTROL_RE.test(v)) return false;
    try {
      const u = new URL(v);
      return u.protocol === 'https:' && !u.username && !u.password && !u.hash;
    } catch {
      return false;
    }
  }, 'https URL without control characters, credentials or a fragment');

const staticPath = z.string().regex(STATIC_IMAGE_PATH_RE, 'not a /images path');

/** `-1` is Google's documented "no limit" and `0` means none, so the floor is
 *  -1 rather than 0. The ceiling is a sanity bound rather than a documented
 *  one: `max-snippet` counts characters and `max-video-preview` counts
 *  seconds, and neither has a meaning ten thousand units in. */
const ROBOTS_INT_MIN = -1;
const ROBOTS_INT_MAX = 10_000;

/** No comma, and that is the whole reason these values are TYPED rather than
 *  free text: `robotsFor` in the post page spreads this object into both
 *  `robots` and `googleBot`, and Next joins the resolved entries with ', ',
 *  so `'-1, noindex'` in a string value injects a SECOND directive into
 *  <meta name="robots">. `new Date()` happily parses "December 17, 1995", so
 *  the comma has to be refused explicitly and not left to the date parser.
 *
 *  The control-character guard is load-bearing for the same reason and is
 *  not redundant with the parse: a TRAILING control character makes the date
 *  unparseable, but a LEADING one is skipped as whitespace, so `new Date()`
 *  accepts it and the byte would reach the meta tag. */
const robotsInstant = z
  .string()
  .max(64)
  .refine(
    (v) => !v.includes(',') && !NO_CONTROL_RE.test(v) && !Number.isNaN(new Date(v).getTime()),
    'Use an ISO date and time, such as 2026-12-31T23:59:59Z.',
  );

/**
 * The value type is pinned to `string | number | boolean` rather than left as
 * a bare `z.ZodType`, whose output is `unknown`. That is not tidiness: the
 * parsed object is stored in `blog_posts.robots_extra`, a
 * `Record<string, string | number | boolean>`, and an `unknown` output makes
 * the schema's own result unassignable to the column it exists to fill. The
 * write door then either fails to compile or reaches for a cast, and a cast
 * here would be asserting exactly what these four validators already prove.
 */
const ROBOTS_VALUE_SCHEMAS: Record<
  RobotsExtraKind,
  z.ZodType<string | number | boolean>
> = {
  int: z
    .number()
    .int()
    .min(ROBOTS_INT_MIN, `The lowest value is ${ROBOTS_INT_MIN}, which means no limit.`)
    .max(ROBOTS_INT_MAX, `The highest value is ${ROBOTS_INT_MAX}.`),
  bool: z.boolean(),
  preview: z.enum(ROBOTS_PREVIEW_VALUES),
  instant: robotsInstant,
};

/**
 * The extra robots directives, BUILT from blogFields.ts's vocabulary rather
 * than restated, so a key added to the leaf gets a validator for free and the
 * editor's toggles and this schema can never offer different keys.
 *
 * `.strict()` is load-bearing: an unknown key is REFUSED rather than stored,
 * because a key Next does not know is dropped silently at render, and a
 * stored directive that emits nothing is worse than a refused one.
 */
export const blogRobotsExtraSchema = z
  .object(
    Object.fromEntries(
      ROBOTS_EXTRA_KEYS.map((key) => [key, ROBOTS_VALUE_SCHEMAS[ROBOTS_EXTRA_KINDS[key]].optional()]),
    ) as {
      [K in RobotsExtraKey]: z.ZodOptional<z.ZodType<string | number | boolean>>;
    },
  )
  .strict();

/**
 * The body doc travels in the same payload as the fields, so a `.strict()`
 * object has to name it or it would refuse the very object the editor sends.
 * It is deliberately NOT validated here: `validateBlogBody` in blogBody.ts
 * owns the vocabulary, and a second partial copy of it in this file is
 * exactly the drift that "one door" rule exists to prevent. Optional, so a
 * caller that has already split the doc off can pass the fields alone; the
 * publish refinement reads an absent body as blank, which it is.
 */
const bodyDoc = z
  .object({ type: z.literal('doc'), content: z.array(z.unknown()).optional() })
  .strict();

/**
 * Every post field both doors carry, at the strictness the door asks for.
 * `min` is 1 for publish and 0 for a draft; ONE definition, so a cap, a slug
 * shape or a URL guard cannot bind on one door and not the other.
 */
const postShape = (min: 0 | 1) => ({
  slug: blogSlugSchema,
  title: text(300, min),
  description: text(2000, min),
  categorySlug: blogCategorySlugSchema,
  authorSlug: blogAuthorSlugSchema,
  serviceSlug: text(120).nullable(),
  heroStaticPath: staticPath.nullable(),
  heroAlt: text(300, min),
  heroCaption: text(2000).nullable(),
  keyTakeaways: blogKeyTakeawaysSchema,
  faqs: blogFaqsSchema,
  sources: blogSourcesSchema,
  entities: blogEntitiesSchema,
  relatedSlugs: z.array(blogSlugSchema).max(12),
  seoTitle: text(300, min),
  seoDescription: text(2000, min),
  canonicalOverride: canonicalOverrideSchema.nullable(),
  ogTitle: text(300, min),
  ogDescription: text(2000, min),
  twitterCard: z.enum(['summary_large_image', 'summary']),
  robotsIndex: z.boolean(),
  robotsFollow: z.boolean(),
  focusKeywords: blogFocusKeywordsSchema,
  llmsInclude: z.boolean(),
});

/**
 * What the editor writes and the importer never did. No string here relaxes
 * on a draft: two are media objects, one is a boolean, one is a typed
 * directive set, and `ogImageStaticPath` is a path shape where `''` is
 * malformed rather than half-written (its absence is spelled `null`).
 */
const editorFields = {
  heroMedia: blogMediaSchema.nullable(),
  ogImageStaticPath: staticPath.nullable(),
  ogImageMedia: blogMediaSchema.nullable(),
  emitLegacyMetaKeywords: z.boolean(),
  robotsExtra: blogRobotsExtraSchema.nullable(),
  body: bodyDoc.optional(),
};

/** The importer's door, unchanged: its field set is frozen at what the
 *  importer writes. Widening it would let a re-import carry an editor-owned
 *  column into its `.set()` and clobber what somebody typed. */
export const blogPostFieldsSchema = z.object(postShape(1)).strict();

export type BlogPostFields = z.infer<typeof blogPostFieldsSchema>;

/** Autosave and Save. Empty required strings allowed, every shape still
 *  enforced. */
export const blogDraftSchema = z.object({ ...postShape(0), ...editorFields }).strict();

export type BlogDraftFields = z.infer<typeof blogDraftSchema>;

/**
 * Publish and Schedule. The base strictness plus the two refusals no
 * per-field rule can make.
 *
 * The hero one is not a nicety: `toHero` in blogStore.ts turns a missing hero
 * into `{ type: 'static', src: '' }`, so a published article with neither
 * half set degrades its OG image to the Perseus wordmark placeholder with
 * nothing on any screen to say so.
 *
 * Each refinement carries a `path` so flattenBlogIssues keys it to the
 * control that owns it: HeroField writes `heroMedia`, and the editor writes
 * `body`.
 */
export const blogPublishSchema = z
  .object({ ...postShape(1), ...editorFields })
  .strict()
  .refine((v) => v.heroStaticPath !== null || v.heroMedia !== null, {
    path: ['heroMedia'],
    message: 'Add a hero image before publishing.',
  })
  .refine((v) => !bodyIsBlank(v.body), {
    path: ['body'],
    message: 'This post has no content yet. Write the article before publishing.',
  });

export type BlogPublishFields = z.infer<typeof blogPublishSchema>;

export const blogAuthorFieldsSchema = z
  .object({
    slug: blogAuthorSlugSchema,
    name: text(200, 1),
    kind: z.enum(['person', 'organization']),
    role: text(200, 1),
    bio: text(2000, 1),
    imageStaticPath: staticPath.nullable(),
    // An uploaded author photo (task 11), which until now had no validator at
    // all. OPTIONAL rather than nullable-and-required, and that is a
    // preservation mechanism rather than convenience: the importer builds its
    // author record through this schema and spreads the RESULT into an
    // `onConflictDoUpdate().set()`, so a required key would put
    // `image_media: null` into every re-import and wipe a photo somebody
    // uploaded. A key the importer never names is a column it cannot clobber,
    // which is the same reason `customSchema` is absent from the post doors.
    imageMedia: blogMediaSchema.nullable().optional(),
    ogImageStaticPath: staticPath.nullable(),
    sameAs: z.array(absoluteHttp).max(20),
    knowsAbout: z.array(text(120, 1)).max(40),
    tags: z.array(text(80, 1)).max(20),
    location: z
      .object({ locality: text(120, 1), region: text(120, 1), country: text(120, 1) })
      .strict()
      .nullable(),
    sortIndex: z.number().int().min(0),
  })
  .strict();

export type BlogAuthorFields = z.infer<typeof blogAuthorFieldsSchema>;

export const blogCategoryFieldsSchema = z
  .object({
    slug: blogCategorySlugSchema,
    title: text(120, 1),
    seoTitle: text(300).nullable(),
    seoDescription: text(2000).nullable(),
    sortIndex: z.number().int().min(0),
  })
  .strict();

export type BlogCategoryFields = z.infer<typeof blogCategoryFieldsSchema>;
