/**
 * Validation for the post-level blog fields: everything that reaches a URL,
 * an attribute or a JSON-LD property and is NOT the body doc (blogBody.ts
 * owns that). The importer parses every record through this before any
 * write; step 2's actions will too. Never import from public-page code:
 * zod stays out of the marketing chunks.
 */
import { z } from 'zod';

import { PORTFOLIO_SLUG_MAX, PORTFOLIO_SLUG_RE, STATIC_IMAGE_PATH_RE } from '@/lib/portfolioFields';
import { safeHref } from '@/lib/safeHref';

/** Static segments under /blogs that shadow `[blog]` (the
 *  /admin/reports/internal precedent): a post with this slug would be listed
 *  everywhere and reachable nowhere. */
export const RESERVED_BLOG_SLUGS = ['authors'] as const;
/** Shared with clients and projects so the store's shape gate and this
 *  schema can never disagree. */
export const BLOG_SLUG_MAX = PORTFOLIO_SLUG_MAX;

const NO_CONTROL_RE = /[\u0000-\u001f\u007f]/;
const text = (max: number, min = 0) =>
  z.string().min(min).max(max).refine((s) => !NO_CONTROL_RE.test(s), 'control character');

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
 *  restricted; https only, parseable, no userinfo, no fragment. */
export const canonicalOverrideSchema = z
  .string()
  .max(2048)
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === 'https:' && !u.username && !u.password && !u.hash;
    } catch {
      return false;
    }
  }, 'https URL without credentials or a fragment');

const staticPath = z.string().regex(STATIC_IMAGE_PATH_RE, 'not a /images path');

export const blogPostFieldsSchema = z
  .object({
    slug: blogSlugSchema,
    title: text(300, 1),
    description: text(2000, 1),
    categorySlug: blogCategorySlugSchema,
    authorSlug: blogAuthorSlugSchema,
    serviceSlug: text(120).nullable(),
    heroStaticPath: staticPath.nullable(),
    heroAlt: text(300, 1),
    heroCaption: text(2000).nullable(),
    keyTakeaways: blogKeyTakeawaysSchema,
    faqs: blogFaqsSchema,
    sources: blogSourcesSchema,
    entities: blogEntitiesSchema,
    relatedSlugs: z.array(blogSlugSchema).max(12),
    seoTitle: text(300, 1),
    seoDescription: text(2000, 1),
    canonicalOverride: canonicalOverrideSchema.nullable(),
    ogTitle: text(300, 1),
    ogDescription: text(2000, 1),
    twitterCard: z.enum(['summary_large_image', 'summary']),
    robotsIndex: z.boolean(),
    robotsFollow: z.boolean(),
    focusKeywords: blogFocusKeywordsSchema,
    llmsInclude: z.boolean(),
  })
  .strict();

export type BlogPostFields = z.infer<typeof blogPostFieldsSchema>;

export const blogAuthorFieldsSchema = z
  .object({
    slug: blogAuthorSlugSchema,
    name: text(200, 1),
    kind: z.enum(['person', 'organization']),
    role: text(200, 1),
    bio: text(2000, 1),
    imageStaticPath: staticPath.nullable(),
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
