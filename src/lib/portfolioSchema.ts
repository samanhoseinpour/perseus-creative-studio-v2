/**
 * Validation for the /admin portfolio forms (clients + projects + media
 * uploads + embeds). Shared by the client forms (instant field errors) and
 * the `_actions/{clients,projects}.ts` server actions (the authoritative
 * parse) — the usersSchema.ts split. Never import from public-page code:
 * zod stays out of the marketing chunks (contact's async chunk and the admin
 * area are its only homes).
 */
import { z } from 'zod';

import {
  CLIENT_BIO_MAX,
  CLIENT_LOGO_DISC_OPTIONS,
  CLIENT_NAME_MAX,
  extractYouTubeId,
  normalizeInstagramUrl,
  PORTFOLIO_SLUG_MAX,
  PORTFOLIO_SLUG_RE,
  PROJECT_CATEGORY_SLUGS,
  PROJECT_DESCRIPTION_MAX,
  PROJECT_IMAGE_FULL_MAX,
  PROJECT_INDUSTRY_MAX,
  PROJECT_LOCATION_MAX,
  PROJECT_MEDIA_ALT_MAX,
  PROJECT_SERVICE_TAGS,
  PROJECT_SERVICES_MAX,
  PROJECT_STAT_FOOTNOTE_MAX,
  PROJECT_STAT_LABEL_MAX,
  PROJECT_STAT_VALUE_MAX,
  PROJECT_STATS_MAX,
  PROJECT_SUMMARY_MAX,
  PROJECT_TESTIMONIAL_MAX,
  PROJECT_TITLE_MAX,
  PROJECT_VISIBILITY_SLUGS,
  PROJECT_YEAR_RE,
} from '@/lib/portfolioFields';

/**
 * Zod error → { fieldPath: firstMessage } for the forms' per-field slots
 * (pathless issues land under `_form`). Local twin of contactSchema's
 * flattenIssues so the admin client chunk never pulls the 400-line contact
 * module for one helper.
 */
export function flattenPortfolioIssues(
  error: z.ZodError,
): Record<string, string> {
  const issues: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form';
    if (!(key in issues)) issues[key] = issue.message;
  }
  return issues;
}

/** Empty string → undefined, else trimmed text under a cap. */
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `Keep ${label} under ${max} characters.`)
    .optional()
    .transform((v) => (v ? v : undefined));

/**
 * Optional link, protocol-confined to http(s) — bare `z.url()` accepts
 * `javascript:`/`data:` schemes (the contactSchema convention; these values
 * render as hrefs on public pages).
 */
const optionalHttpUrl = z
  .string()
  .trim()
  .transform((v) => (v === '' ? undefined : v))
  .pipe(
    z
      .url({ error: 'Enter a full link (e.g. https://…).', protocol: /^https?$/i })
      .max(300, 'Keep the link under 300 characters.')
      .optional(),
  );

const slugSchema = z
  .string()
  .trim()
  .min(2, 'Enter a slug.')
  .max(PORTFOLIO_SLUG_MAX, `Keep the slug under ${PORTFOLIO_SLUG_MAX} characters.`)
  .regex(PORTFOLIO_SLUG_RE, 'Lowercase letters, numbers, and dashes only.');

export const clientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter the client's name.")
    .max(CLIENT_NAME_MAX, `Keep the name under ${CLIENT_NAME_MAX} characters.`),
  slug: slugSchema,
  industry: optionalText(PROJECT_INDUSTRY_MAX, 'the industry'),
  location: optionalText(PROJECT_LOCATION_MAX, 'the location'),
  websiteUrl: optionalHttpUrl,
  instagram: optionalHttpUrl,
  bio: optionalText(CLIENT_BIO_MAX, 'the bio'),
  // The logo-wall block (the client's only visibility knob): membership,
  // the home-rail flag, the coin face, and an optional explicit rail order —
  // blank keeps the current slot on edit / appends on join.
  marquee: z.boolean().default(false),
  marqueeFeatured: z.boolean().default(false),
  logoDisc: z.enum(CLIENT_LOGO_DISC_OPTIONS).default('none'),
  marqueeSort: z
    .number({ error: 'Enter a whole number.' })
    .int('Enter a whole number.')
    .min(0, 'Use zero or a positive number.')
    .max(1_000_000, 'Keep the order under 1,000,000.')
    .optional(),
});

export type ClientInput = z.infer<typeof clientSchema>;

export const projectSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, 'Enter a title.')
      .max(PROJECT_TITLE_MAX, `Keep the title under ${PROJECT_TITLE_MAX} characters.`),
    slug: slugSchema,
    category: z.enum(PROJECT_CATEGORY_SLUGS),
    clientId: z
      .string()
      .trim()
      .transform((v) => (v === '' ? undefined : v))
      .pipe(z.uuid({ error: 'Pick a client from the list.' }).optional()),
    clientName: optionalText(CLIENT_NAME_MAX, 'the client display name'),
    industry: z
      .string()
      .trim()
      .min(2, 'Enter the industry.')
      .max(
        PROJECT_INDUSTRY_MAX,
        `Keep the industry under ${PROJECT_INDUSTRY_MAX} characters.`,
      ),
    location: optionalText(PROJECT_LOCATION_MAX, 'the location'),
    year: z
      .string()
      .trim()
      .regex(PROJECT_YEAR_RE, 'Use a year like 2024, or a range like 2023–2024.'),
    summary: z
      .string()
      .trim()
      .min(10, 'Write the one-line card summary.')
      .max(
        PROJECT_SUMMARY_MAX,
        `Keep the summary under ${PROJECT_SUMMARY_MAX} characters.`,
      ),
    description: optionalText(PROJECT_DESCRIPTION_MAX, 'the case study'),
    services: z
      .array(z.enum(PROJECT_SERVICE_TAGS))
      .max(PROJECT_SERVICES_MAX)
      .default([]),
    externalUrl: optionalHttpUrl,
    // Outcome highlights: value is a free display string ("+48%", "3.1M").
    // The form filters fully-empty rows before parsing, so min(1) here only
    // fires on half-filled rows.
    stats: z
      .array(
        z.object({
          label: z
            .string()
            .trim()
            .min(1, 'Give the stat a label.')
            .max(
              PROJECT_STAT_LABEL_MAX,
              `Keep the label under ${PROJECT_STAT_LABEL_MAX} characters.`,
            ),
          value: z
            .string()
            .trim()
            .min(1, 'Enter the figure.')
            .max(
              PROJECT_STAT_VALUE_MAX,
              `Keep the figure under ${PROJECT_STAT_VALUE_MAX} characters.`,
            ),
          footnote: optionalText(PROJECT_STAT_FOOTNOTE_MAX, 'the footnote'),
        }),
      )
      .max(PROJECT_STATS_MAX, `Keep it to ${PROJECT_STATS_MAX} highlights.`)
      .default([]),
    testimonialQuote: optionalText(PROJECT_TESTIMONIAL_MAX, 'the testimonial'),
    testimonialName: optionalText(CLIENT_NAME_MAX, 'the name'),
    testimonialRole: optionalText(CLIENT_NAME_MAX, 'the role'),
    featured: z.boolean().default(false),
    visibility: z.enum(PROJECT_VISIBILITY_SLUGS),
  })
  // A card must have SOME client line: a linked entity or free display text.
  .refine((d) => d.clientId || d.clientName, {
    path: ['clientId'],
    error: 'Pick a client, or enter a display name below.',
  });

export type ProjectInput = z.infer<typeof projectSchema>;

/**
 * The LQIP the browser generated at upload time. Strict shape: this string is
 * inlined into next/image's blur style on public pages, so it must be
 * provably a small image data URL, never attacker-shaped markup. (webp on
 * Chromium/Firefox; Safari's canvas silently emits png.) Never relax this.
 */
export const BLUR_DATA_URL_RE =
  /^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/=]{1,4096}$/;

export const projectMediaUploadSchema = z.object({
  projectId: z.uuid(),
  slot: z.enum(['cover', 'gallery']),
  alt: optionalText(PROJECT_MEDIA_ALT_MAX, 'the alt text'),
  blur: z.string().regex(BLUR_DATA_URL_RE, 'Placeholder data looks wrong — re-pick the image.'),
  fullWidth: z.coerce.number().int().min(1).max(PROJECT_IMAGE_FULL_MAX),
  fullHeight: z.coerce.number().int().min(1).max(PROJECT_IMAGE_FULL_MAX),
});

export type ProjectMediaUploadInput = z.infer<typeof projectMediaUploadSchema>;

/** Embed input: whatever was pasted normalizes to the stored ref (bare
 *  YouTube id / canonical Instagram post URL) or fails with a field error. */
export const embedSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('youtube'),
    ref: z
      .string()
      .trim()
      .refine((v) => extractYouTubeId(v) !== null, {
        error: 'Paste a YouTube link (or the 11-character video id).',
      })
      .transform((v) => extractYouTubeId(v) as string),
  }),
  z.object({
    kind: z.literal('instagram'),
    ref: z
      .string()
      .trim()
      .refine((v) => normalizeInstagramUrl(v) !== null, {
        error: 'Paste an Instagram post, reel, or IGTV link.',
      })
      .transform((v) => normalizeInstagramUrl(v) as string),
  }),
]);

export type EmbedInput = z.infer<typeof embedSchema>;
