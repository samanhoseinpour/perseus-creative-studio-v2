/**
 * Shared constants for the admin bug tickets (form fields, labels, screenshot
 * limits). Deliberately zod-free: the client form imports this for labels and
 * pre-checks, and zod must stay out of the admin client chunks — authoritative
 * validation lives in src/lib/ticketSchema.ts, imported only by the server
 * action (same split as authSchema.ts vs the auth server config).
 */

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
 * Where in the admin panel the issue was seen. Stored as plain text (like
 * contact_submissions.referral_source), so adding an area later is a one-line
 * change here — no migration.
 */
export const TICKET_AREA_SLUGS = [
  'overview',
  'inquiries',
  'applications',
  'database',
  'profile',
  'other',
] as const;
export type TicketAreaSlug = (typeof TICKET_AREA_SLUGS)[number];

export const TICKET_AREA_LABELS: Record<TicketAreaSlug, string> = {
  overview: 'Overview',
  inquiries: 'Inquiries inbox',
  applications: 'Applications inbox',
  database: 'Database browser',
  profile: 'Profile',
  other: 'Somewhere else',
};

export const TICKET_TITLE_MAX = 120;
export const TICKET_DESCRIPTION_MAX = 5000;

/** Client cap for the screenshot upload; Vercel's hard body ceiling is 4.5 MB. */
export const MAX_SCREENSHOT_BYTES = 4 * 1024 * 1024;

/**
 * Accepted screenshot formats. As with resumes, `File.type` comes from the
 * filename (and is often empty for drag-drops), so acceptance leans on
 * extension/MIME while the authoritative gate is the magic-byte sniff below,
 * run on both client (pick time) and server (defense in depth + the stored
 * extension/content-type source).
 */
export type ScreenshotKind = 'png' | 'jpg' | 'webp';

export const SCREENSHOT_MIME: Record<ScreenshotKind, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
};

/** `accept` attribute value for the screenshot file input. */
export const SCREENSHOT_ACCEPT = `.png,.jpg,.jpeg,.webp,${Object.values(
  SCREENSHOT_MIME,
).join(',')}`;

const SCREENSHOT_BAD_TYPE = 'Screenshot must be a PNG, JPEG, or WebP image.';
const SCREENSHOT_EXT = /\.(png|jpe?g|webp)$/i;
const MIME_SET = new Set<string>(Object.values(SCREENSHOT_MIME));

/**
 * Cheap type/size pre-check for an attached screenshot (the attachment itself
 * is optional — only call this when a file was picked). Returns a
 * human-readable problem, or null when acceptable.
 */
export function screenshotProblem(file: unknown): string | null {
  if (!(file instanceof File) || file.size === 0) {
    return 'Attach an image file (PNG, JPEG, or WebP).';
  }
  const typeOk =
    file.type === ''
      ? SCREENSHOT_EXT.test(file.name)
      : MIME_SET.has(file.type) || SCREENSHOT_EXT.test(file.name);
  if (!typeOk) return SCREENSHOT_BAD_TYPE;
  if (file.size > MAX_SCREENSHOT_BYTES) {
    return 'Screenshot must be 4 MB or smaller.';
  }
  return null;
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
  return null;
}
