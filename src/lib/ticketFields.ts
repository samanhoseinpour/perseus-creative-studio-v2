/**
 * Shared constants for the admin bug tickets (form fields, labels, screenshot
 * limits). Deliberately zod-free: the client form imports this for labels and
 * pre-checks, and zod must stay out of the admin client chunks — authoritative
 * validation lives in src/lib/ticketSchema.ts, imported only by the server
 * action (same split as authSchema.ts vs the auth server config).
 */
import { ADMIN_ROUTES, canSeeNavItem, type NavAccess } from './adminNav';

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
  route,
}));

/**
 * Every area, restricted routes included — the server-side allow-list
 * (ticketSchema) and the label resolver. A superadmin CAN file against
 * /admin/users, and an old row naming a route the viewer can't open must still
 * render its label.
 */
export const TICKET_AREAS: TicketArea[] = [
  ...AREA_ROUTES.map(({ slug, label }) => ({ slug, label })),
  OTHER_AREA,
];

export const TICKET_AREA_SLUGS: string[] = TICKET_AREAS.map((a) => a.slug);

/**
 * The pickable areas for one viewer — exactly the routes their sidebar and ⌘K
 * palette show (canSeeNavItem on their access profile). Offering a chip for a
 * page they can't open would both leak the surface and invite a bug report
 * they can't have observed. Resolve this on the server (page has the access
 * profile) and pass the result into the client form.
 */
export function ticketAreasFor(access: NavAccess): TicketArea[] {
  return [
    ...AREA_ROUTES.filter((r) => canSeeNavItem(r.route, access)).map(
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
 * Decompression-bomb ceiling (total pixels), enforced server-side via
 * sniffImageDimensions. The byte cap alone doesn't bound decode cost — a
 * mostly-uniform sub-4 MB PNG can decode to gigapixels (~4 bytes of RAM per
 * pixel in every admin tab that renders it). 4096² ≈ 16.7 MP sits far above
 * any real reduced screenshot (the client caps the long edge at 1600px)
 * while bounding worst-case decode memory to ~67 MB RGBA.
 */
export const MAX_SCREENSHOT_PIXELS = 4096 * 4096;
export const SCREENSHOT_TOO_LARGE =
  'Screenshot dimensions are too large — attach a smaller image.';

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

export type ImageDimensions = { width: number; height: number };

/**
 * Header-derived pixel dimensions — the server half of the decompression-bomb
 * gate (see MAX_SCREENSHOT_PIXELS). The client reduce steps cap dimensions
 * honestly, but a direct action invocation skips them, so the actions
 * re-derive width/height here from the same bytes the sniff approved.
 * Returns null when the header doesn't parse as the sniffed kind — a file
 * whose signature matched but whose mandatory header is malformed is rejected
 * exactly like a failed sniff.
 */
export async function sniffImageDimensions(
  file: File,
  kind: ScreenshotKind,
): Promise<ImageDimensions | null> {
  const view = new DataView(await file.arrayBuffer());
  try {
    switch (kind) {
      case 'png':
        return pngDimensions(view);
      case 'jpg':
        return jpegDimensions(view);
      case 'webp':
        return webpDimensions(view);
      case 'avif':
        return avifDimensions(view);
    }
  } catch {
    // A truncated/hostile header walked past the buffer — unparseable.
    return null;
  }
}

const fourcc = (view: DataView, offset: number) =>
  String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  );

/** IHDR is PNG's mandatory first chunk — width/height sit at fixed offsets. */
function pngDimensions(view: DataView): ImageDimensions | null {
  if (fourcc(view, 12) !== 'IHDR') return null;
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

/** Walk the JPEG marker stream to the first SOFn frame header. */
function jpegDimensions(view: DataView): ImageDimensions | null {
  let offset = 2;
  while (offset + 2 <= view.byteLength) {
    if (view.getUint8(offset) !== 0xff) return null;
    const marker = view.getUint8(offset + 1);
    // Any number of 0xff fill bytes may pad before a marker.
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    // Standalone markers (TEM, RSTn) carry no length field.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    // Reached entropy-coded data / end without a frame header.
    if (marker === 0xda || marker === 0xd9) return null;
    const length = view.getUint16(offset + 2);
    if (length < 2) return null;
    const isSof =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    if (isSof) {
      // [len u16][precision u8][height u16][width u16]
      return {
        height: view.getUint16(offset + 5),
        width: view.getUint16(offset + 7),
      };
    }
    offset += 2 + length;
  }
  return null;
}

/** First RIFF chunk decides the flavor: VP8X canvas, VP8 lossy, VP8L lossless. */
function webpDimensions(view: DataView): ImageDimensions | null {
  const chunk = fourcc(view, 12);
  if (chunk === 'VP8X') {
    // Payload: 1 flags + 3 reserved, then (width-1) and (height-1) as u24 LE.
    const width =
      1 +
      (view.getUint8(24) | (view.getUint8(25) << 8) | (view.getUint8(26) << 16));
    const height =
      1 +
      (view.getUint8(27) | (view.getUint8(28) << 8) | (view.getUint8(29) << 16));
    return { width, height };
  }
  if (chunk === 'VP8 ') {
    // Lossy: 3-byte frame tag, 3-byte start code, then 14-bit u16 LE pair.
    if (
      view.getUint8(23) !== 0x9d ||
      view.getUint8(24) !== 0x01 ||
      view.getUint8(25) !== 0x2a
    ) {
      return null;
    }
    return {
      width: view.getUint16(26, true) & 0x3fff,
      height: view.getUint16(28, true) & 0x3fff,
    };
  }
  if (chunk === 'VP8L') {
    // Lossless: signature byte, then width-1 / height-1 as packed 14-bit LE.
    if (view.getUint8(20) !== 0x2f) return null;
    const bits = view.getUint32(21, true);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
}

/**
 * Find a direct child box of [start, end); returns its payload range. ISO-BMFF
 * boxes are [size u32][type 4cc] with size 1 → 64-bit largesize (high word
 * must be 0 to fit our ≤4 MB buffer) and size 0 → to-end-of-enclosure.
 */
function findBox(
  view: DataView,
  type: string,
  start: number,
  end: number,
): { offset: number; end: number } | null {
  let offset = start;
  while (offset + 8 <= end) {
    let size = view.getUint32(offset);
    const boxType = fourcc(view, offset + 4);
    let headerSize = 8;
    if (size === 1) {
      if (view.getUint32(offset + 8) !== 0) return null;
      size = view.getUint32(offset + 12);
      headerSize = 16;
    } else if (size === 0) {
      size = end - offset;
    }
    if (size < headerSize || offset + size > end) return null;
    if (boxType === type) {
      return { offset: offset + headerSize, end: offset + size };
    }
    offset += size;
  }
  return null;
}

/**
 * meta → iprp → ipco, then take the LARGEST ispe in the property container:
 * alpha/auxiliary images carry their own ispe, and the bomb gate must bound
 * the biggest plane, not whichever happens to be listed first.
 */
function avifDimensions(view: DataView): ImageDimensions | null {
  const meta = findBox(view, 'meta', 0, view.byteLength);
  if (!meta) return null;
  // meta is a FullBox: 4 version/flags bytes precede its children.
  const iprp = findBox(view, 'iprp', meta.offset + 4, meta.end);
  if (!iprp) return null;
  const ipco = findBox(view, 'ipco', iprp.offset, iprp.end);
  if (!ipco) return null;

  let largest: ImageDimensions | null = null;
  let offset = ipco.offset;
  while (offset + 8 <= ipco.end) {
    const ispe = findBox(view, 'ispe', offset, ipco.end);
    if (!ispe) break;
    // ispe is a FullBox: version/flags, then u32 width + u32 height.
    const dims = {
      width: view.getUint32(ispe.offset + 4),
      height: view.getUint32(ispe.offset + 8),
    };
    if (!largest || dims.width * dims.height > largest.width * largest.height) {
      largest = dims;
    }
    offset = ispe.end;
  }
  return largest;
}
