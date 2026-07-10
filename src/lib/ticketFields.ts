/**
 * Shared constants for the admin bug tickets (form fields, labels, screenshot
 * limits). Deliberately zod-free: the client form imports this for labels and
 * pre-checks, and zod must stay out of the admin client chunks — authoritative
 * validation lives in src/lib/ticketSchema.ts, imported only by the server
 * action (same split as authSchema.ts vs the auth server config).
 */
import { ADMIN_ROUTES } from './adminNav';

export const TICKET_STATUS_SLUGS = ['open', 'pending', 'closed'] as const;
export type TicketStatusSlug = (typeof TICKET_STATUS_SLUGS)[number];

export const TICKET_STATUS_LABELS: Record<TicketStatusSlug, string> = {
  open: 'Open',
  pending: 'Pending',
  closed: 'Closed',
};

export const TICKET_SEVERITY_SLUGS = ['low', 'medium', 'high'] as const;
export type TicketSeveritySlug = (typeof TICKET_SEVERITY_SLUGS)[number];

export const TICKET_SEVERITY_LABELS: Record<TicketSeveritySlug, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

/**
 * Where in the admin panel the issue was seen — derived from the nav's route
 * map (src/lib/adminNav.ts), so a NEW admin section automatically becomes a
 * pickable area with no edit here. Stored as plain text (like
 * contact_submissions.referral_source): no enum, no migration, and old rows
 * keep their raw slug even if a route is renamed (ticketAreaLabel falls back
 * to the raw slug).
 */
export type TicketArea = { slug: string; label: string };

const OTHER_AREA: TicketArea = { slug: 'other', label: 'Somewhere else' };

const AREA_ROUTES = ADMIN_ROUTES.map((route) => ({
  slug:
    route.href === '/admin' ? 'overview' : route.href.slice('/admin/'.length),
  label: route.label,
  privileged: !!route.privileged,
}));

/**
 * Every area, privileged routes included — the server-side allow-list
 * (ticketSchema) and the label resolver. A privileged admin CAN file against
 * /admin/database, and an old row naming it must still render its label.
 */
export const TICKET_AREAS: TicketArea[] = [
  ...AREA_ROUTES.map(({ slug, label }) => ({ slug, label })),
  OTHER_AREA,
];

export const TICKET_AREA_SLUGS: string[] = TICKET_AREAS.map((a) => a.slug);

/**
 * The pickable areas for one viewer. Non-privileged admins never see the
 * privileged-only routes (Database) — the sidebar and ⌘K palette scrub them,
 * and offering a chip for a page they can't open would both leak the surface
 * and invite a bug report they can't have observed. Resolve this on the
 * server (page has the session) and pass the result into the client form.
 */
export function ticketAreasFor(privileged: boolean): TicketArea[] {
  return [
    ...AREA_ROUTES.filter((r) => privileged || !r.privileged).map(
      ({ slug, label }) => ({ slug, label }),
    ),
    OTHER_AREA,
  ];
}

const AREA_LABELS = new Map(TICKET_AREAS.map((a) => [a.slug, a.label]));

/** Display label for a stored area slug; raw-slug fallback for retired routes. */
export function ticketAreaLabel(slug: string): string {
  return AREA_LABELS.get(slug) ?? slug;
}

export const TICKET_TITLE_MAX = 120;
export const TICKET_DESCRIPTION_MAX = 5000;

/**
 * Upload cap for the screenshot that actually posts to the server action
 * (Vercel's hard body ceiling is 4.5 MB). The client reduces first, so this
 * is a backstop, enforced server-side via screenshotProblem.
 */
export const MAX_SCREENSHOT_BYTES = 4 * 1024 * 1024;

/**
 * Pick-time cap. Inputs may be much larger than the upload cap because the
 * client downscales/re-encodes them (src/lib/reduceScreenshot.ts) before
 * upload — only the reduced file travels.
 */
export const MAX_SCREENSHOT_INPUT_BYTES = 15 * 1024 * 1024;

/**
 * Accepted screenshot formats. As with resumes, `File.type` comes from the
 * filename (and is often empty for drag-drops), so acceptance leans on
 * extension/MIME while the authoritative gate is the magic-byte sniff below,
 * run on both client (pick time) and server (defense in depth + the stored
 * extension/content-type source).
 */
export type ScreenshotKind = 'png' | 'jpg' | 'webp' | 'avif';

export const SCREENSHOT_MIME: Record<ScreenshotKind, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
};

/** `accept` attribute value for the screenshot file input. */
export const SCREENSHOT_ACCEPT = `.png,.jpg,.jpeg,.webp,.avif,${Object.values(
  SCREENSHOT_MIME,
).join(',')}`;

export const SCREENSHOT_BAD_TYPE =
  'Screenshot must be a PNG, JPEG, WebP, or AVIF image.';
const SCREENSHOT_EXT = /\.(png|jpe?g|webp|avif)$/i;
const MIME_SET = new Set<string>(Object.values(SCREENSHOT_MIME));

/** Type/extension pre-check shared by both size gates below. */
function screenshotTypeProblem(file: unknown): string | null {
  if (!(file instanceof File) || file.size === 0) {
    return 'Attach an image file (PNG, JPEG, WebP, or AVIF).';
  }
  const typeOk =
    file.type === ''
      ? SCREENSHOT_EXT.test(file.name)
      : MIME_SET.has(file.type) || SCREENSHOT_EXT.test(file.name);
  return typeOk ? null : SCREENSHOT_BAD_TYPE;
}

/**
 * UPLOAD gate (4 MB): what the server action checks, and what the client
 * re-checks on the reduced file. Returns a human-readable problem or null.
 */
export function screenshotProblem(file: unknown): string | null {
  const typeProblem = screenshotTypeProblem(file);
  if (typeProblem) return typeProblem;
  return (file as File).size > MAX_SCREENSHOT_BYTES
    ? 'Screenshot must be 4 MB or smaller.'
    : null;
}

/**
 * PICK gate (15 MB): what the client checks on the raw pick, before the
 * reduce step shrinks it to (usually far) under the upload cap.
 */
export function screenshotInputProblem(file: unknown): string | null {
  const typeProblem = screenshotTypeProblem(file);
  if (typeProblem) return typeProblem;
  return (file as File).size > MAX_SCREENSHOT_INPUT_BYTES
    ? 'Screenshot must be 15 MB or smaller.'
    : null;
}

/**
 * Magic-byte sniff — the authoritative content check (a renamed file can lie
 * in `File.type`, but won't carry the right signature). Returns the detected
 * kind, or null when the content matches none.
 */
export async function sniffScreenshotKind(
  file: File,
): Promise<ScreenshotKind | null> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const bytesAt = (offset: number, sig: number[]) =>
    head.length >= offset + sig.length &&
    sig.every((b, i) => head[offset + i] === b);

  // \x89PNG\r\n\x1a\n
  if (bytesAt(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'png';
  }
  // JPEG SOI marker
  if (bytesAt(0, [0xff, 0xd8, 0xff])) return 'jpg';
  // RIFF····WEBP
  if (bytesAt(0, [0x52, 0x49, 0x46, 0x46]) && bytesAt(8, [0x57, 0x45, 0x42, 0x50])) {
    return 'webp';
  }
  // ISO-BMFF: [0..3] is the ftyp box size (varies — never match on it), then
  // 'ftyp' + major brand 'avif' (still) or 'avis' (sequence). Deliberately
  // NOT matching 'mif1'/'heic' majors — a loose check would misclassify HEIC
  // (undecodable in most browsers) as a storable avif.
  if (
    bytesAt(4, [0x66, 0x74, 0x79, 0x70]) &&
    (bytesAt(8, [0x61, 0x76, 0x69, 0x66]) || bytesAt(8, [0x61, 0x76, 0x69, 0x73]))
  ) {
    return 'avif';
  }
  return null;
}
