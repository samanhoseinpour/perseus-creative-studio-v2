/**
 * Shared constants + pre-checks for the /admin portfolio surface (clients &
 * projects). Deliberately zod-free and client-safe, mirroring ticketFields.ts:
 * the forms import this for labels, vocabularies, and instant pre-checks,
 * while authoritative validation lives in src/lib/portfolioSchema.ts,
 * imported only by the server actions.
 *
 * Image handling reuses the ticket-screenshot machinery wholesale (same
 * accepted formats, same magic-byte sniff, same 15 MB pick / 4 MB upload
 * split) — only the reduce targets differ: project images become a
 * multi-rung set (reduceProjectImage), client logos a 512px contained fit.
 */
import {
  MAX_SCREENSHOT_BYTES,
  MAX_SCREENSHOT_INPUT_BYTES,
  SCREENSHOT_ACCEPT,
  SCREENSHOT_MIME,
} from '@/lib/ticketFields';
import { RUNGS } from '@/lib/imageVariants';

// ── Category / visibility vocabularies ─────────────────────────────────────
// Mirrors the pgEnums in src/db/schema.ts (projectCategory /
// contentVisibility) — keep the two lists in sync; the enum is the DB gate,
// this is the UI + zod vocabulary. Also mirrors PROJECT_CATEGORIES' keys in
// src/constants/projects.ts (a category needs code-defined chrome anyway).

export const PROJECT_CATEGORY_SLUGS = [
  'production',
  'websites',
  'digital-marketing',
  'social',
  'branding',
] as const;

export type ProjectCategoryField = (typeof PROJECT_CATEGORY_SLUGS)[number];

export const PROJECT_CATEGORY_LABELS: Record<ProjectCategoryField, string> = {
  production: 'Production',
  websites: 'Websites',
  'digital-marketing': 'Digital Marketing',
  social: 'Social',
  branding: 'Branding',
};

export const PROJECT_VISIBILITY_SLUGS = ['public', 'unlisted', 'draft'] as const;

export type ProjectVisibilityField = (typeof PROJECT_VISIBILITY_SLUGS)[number];

export const PROJECT_VISIBILITY_LABELS: Record<ProjectVisibilityField, string> =
  {
    public: 'Public',
    unlisted: 'Unlisted',
    draft: 'Draft',
  };

/** One-line explanation per visibility state, shown under the form control. */
export const PROJECT_VISIBILITY_HELP: Record<ProjectVisibilityField, string> = {
  public: 'Listed everywhere and indexed by search engines.',
  unlisted: 'Reachable by link only — not listed, not indexed, not in the sitemap.',
  draft: 'Not on the site at all. Only visible here.',
};

// ── Client logo-wall (Partners marquee) vocabulary ──────────────────────────
// Clients have no visibility state — their public surface is the logo
// marquee (About wall + the home page's featured rail) plus the name/mark on
// project case files.

export const CLIENT_LOGO_DISC_OPTIONS = ['none', 'light', 'dark'] as const;

export type ClientLogoDiscField = (typeof CLIENT_LOGO_DISC_OPTIONS)[number];

export const CLIENT_LOGO_DISC_LABELS: Record<ClientLogoDiscField, string> = {
  none: 'None',
  light: 'Light face',
  dark: 'Dark face',
};

/** Shown under the coin-face chips in the client dialog. */
export const CLIENT_LOGO_DISC_HELP =
  'Coin face behind a transparent wordmark: Light rescues dark ink in dark mode, Dark rescues white ink in light mode. Leave None for opaque marks — a face bleeds a faint ring at the clipped edge.';

/** Shown under the logo-wall toggle in the client dialog. */
export const CLIENT_MARQUEE_HELP =
  'Shows the logo in the client marquee on the About page. Featured clients also ride the home page’s “Selected Clients” rail.';

// ── Services vocabulary ─────────────────────────────────────────────────────
// The card tag chips are load-bearing strings: the category filter rails, the
// tag→icon lookups (src/utils/projectFilterIcons), and getServiceProjects'
// service matching all key on exact labels. The form offers this controlled
// list instead of free text; extending it is a one-line change here (plus a
// SERVICE_PROJECT_LABELS entry in projectsStore when a service page should
// pick the new tag up).
export const PROJECT_SERVICE_TAGS = [
  'Videography',
  'Photography',
  'Matterport',
  'Floor Plan',
  'Web Development',
  'Website Redesign',
  'E-Commerce',
  'Website Maintenance',
  'Meta Ads',
  'Social Media',
  'Branding',
] as const;

export const PROJECT_SERVICES_MAX = 12;

// ── Outcome highlights ("By the numbers" on the detail page) ────────────────
export const PROJECT_STATS_MAX = 5;
export const PROJECT_STAT_LABEL_MAX = 60;
export const PROJECT_STAT_VALUE_MAX = 24;
export const PROJECT_STAT_FOOTNOTE_MAX = 200;

// ── Field length caps (shared client + zod) ─────────────────────────────────
export const PROJECT_TITLE_MAX = 140;
export const PORTFOLIO_SLUG_MAX = 120;
export const PROJECT_INDUSTRY_MAX = 80;
export const PROJECT_LOCATION_MAX = 120;
export const PROJECT_SUMMARY_MAX = 400;
export const PROJECT_DESCRIPTION_MAX = 8000;
export const PROJECT_TESTIMONIAL_MAX = 1000;
export const PROJECT_MEDIA_ALT_MAX = 300;
export const CLIENT_NAME_MAX = 120;
export const CLIENT_BIO_MAX = 3000;

/** Slug shape for both clients and projects: lowercase kebab, no edges. */
export const PORTFOLIO_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Year display string: "2024" or a "2023–2024" range (en-dash or hyphen).
 *  latestYear() needs a 4-digit year in there to sort the card at all. */
export const PROJECT_YEAR_RE = /^\d{4}(?:\s*[–-]\s*\d{4})?$/;

// ── Image slots ─────────────────────────────────────────────────────────────

/** `accept` attribute — same formats as screenshots/avatars. */
export const PROJECT_IMAGE_ACCEPT = SCREENSHOT_ACCEPT;

/**
 * The responsive rung ladder for uploaded project images: the static
 * pipeline's RUNGS (384/640/960, src/lib/imageVariants.ts) plus a ≤1600px
 * master — matching reduceScreenshot's MAX_DIMENSION and the largest render
 * on the detail page (~1192px container at 1.5× DPR).
 */
export const PROJECT_IMAGE_RUNGS = RUNGS;
export const PROJECT_IMAGE_FULL_MAX = 1600;

/** Uploaded client logos: contained fit (never crop a mark), same ceiling as
 *  avatars — logos render at ≤112px, so 512 is comfortably retina. */
export const CLIENT_LOGO_MAX_DIMENSION = 512;

/** Pick gate — inputs may be large; the browser reduce shrinks them first. */
export const MAX_PROJECT_IMAGE_INPUT_BYTES = MAX_SCREENSHOT_INPUT_BYTES;

/**
 * Upload gate on the SUM of one image's rung files in a single action call
 * (Vercel's hard body ceiling is 4.5 MB). A 1600px WebP photo plus its rungs
 * is typically well under 1 MB; the gate exists for Safari's lossless-PNG
 * alpha path, where a transparent full rung can balloon.
 */
export const MAX_PROJECT_UPLOAD_BYTES = MAX_SCREENSHOT_BYTES;

export const PROJECT_IMAGE_BAD_TYPE =
  'Image must be a PNG, JPEG, WebP, or AVIF file.';

const IMAGE_EXT = /\.(png|jpe?g|webp|avif)$/i;
const MIME_SET = new Set<string>(Object.values(SCREENSHOT_MIME));

/** Type/extension pre-check — the portfolio-worded twin of
 *  ticketFields' screenshotTypeProblem (the sniff stays authoritative). */
function imageTypeProblem(file: unknown): string | null {
  if (!(file instanceof File) || file.size === 0) {
    return 'Choose an image file (PNG, JPEG, WebP, or AVIF).';
  }
  const typeOk =
    file.type === ''
      ? IMAGE_EXT.test(file.name)
      : MIME_SET.has(file.type) || IMAGE_EXT.test(file.name);
  return typeOk ? null : PROJECT_IMAGE_BAD_TYPE;
}

/** PICK gate (15 MB) — checked on the raw pick, before the reduce step. */
export function projectImageInputProblem(file: unknown): string | null {
  const typeProblem = imageTypeProblem(file);
  if (typeProblem) return typeProblem;
  return (file as File).size > MAX_PROJECT_IMAGE_INPUT_BYTES
    ? 'Image must be 15 MB or smaller.'
    : null;
}

/** UPLOAD gate: per-file shape check for one reduced rung. The SUM check
 *  against MAX_PROJECT_UPLOAD_BYTES happens alongside (client + server). */
export function projectImageProblem(file: unknown): string | null {
  const typeProblem = imageTypeProblem(file);
  if (typeProblem) return typeProblem;
  return (file as File).size > MAX_PROJECT_UPLOAD_BYTES
    ? 'Image is still over 4 MB after optimizing — try a smaller image.'
    : null;
}

// ── Embeds ──────────────────────────────────────────────────────────────────

export const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

/**
 * Accepts what the COO will actually paste — a bare 11-char id, a watch URL,
 * a youtu.be short link, a /shorts/ or /embed/ path — and returns the bare id,
 * or null when nothing id-shaped is found. The zod schema stores ONLY the id.
 */
/** Parse a pasted URL leniently — retry with https:// when the protocol was
 *  left off (the common way a URL gets hand-copied). */
function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    try {
      return new URL(`https://${value}`);
    } catch {
      return null;
    }
  }
}

export function extractYouTubeId(input: string): string | null {
  const value = input.trim();
  if (YOUTUBE_ID_RE.test(value)) return value;
  {
    const url = parseUrl(value);
    if (!url) return null;
    if (!/(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(url.hostname)) return null;
    const candidate =
      url.searchParams.get('v') ??
      url.pathname.match(/\/(?:shorts|embed|live)\/([^/?]+)/)?.[1] ??
      (url.hostname.endsWith('youtu.be')
        ? url.pathname.slice(1).split('/')[0]
        : null);
    return candidate && YOUTUBE_ID_RE.test(candidate) ? candidate : null;
  }
}

/**
 * Canonicalize an Instagram post/reel URL to
 * `https://www.instagram.com/(p|reel|tv)/<id>/` — the shape the embed
 * component consumes. Null when the input isn't an Instagram post URL.
 */
export function normalizeInstagramUrl(input: string): string | null {
  const url = parseUrl(input.trim());
  if (!url || !/(^|\.)instagram\.com$/.test(url.hostname)) return null;
  const match = url.pathname.match(/\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return match ? `https://www.instagram.com/${match[1]}/${match[2]}/` : null;
}
