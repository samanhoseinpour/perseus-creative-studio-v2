/**
 * CLIENT-ONLY: browser-side image downscale/re-encode (createImageBitmap +
 * canvas) run before upload, mirroring the strategy of
 * scripts/optimize-images.mjs — downscale first, sane quality, never
 * enlarge — without sharp (server-only) or any new dependency. Never import
 * from server code; the `client-only` guard package isn't installed, so the
 * only importers must stay client components (the ticket form and the profile
 * photo form).
 *
 * The exports share one pipeline (the decode fallback, Safari silent-PNG
 * detection, and alpha scan are hard-won edge-case logic that must not fork):
 * `reduceScreenshot` fits inside 1600×1600, `reduceAvatar` cover-crops to a
 * centered square capped at 512 — an avatar renders in a circle, so storing a
 * panorama's off-center pixels only wastes bytes and drops the circle-visible
 * region below retina resolution — and `reduceImage` is the general contained
 * fit (client logos: 512, never cropped). `reduceProjectImage` is the
 * portfolio uploader: one decode fanned into the full master plus the
 * responsive width rungs and an LQIP blur, mirroring the static image
 * pipeline's pre-generated ladder for /admin-uploaded media.
 *
 * Contract (single-output reducers): NEVER throw and NEVER size-gate. Any
 * decode/encode failure (or a re-encode that isn't smaller) degrades to the
 * untouched original with `kept: true` — the "kept (no gain)" idiom from
 * scripts/reduce-images.mjs. (For reduceAvatar that passthrough may be
 * non-square; <AdminAvatar>'s object-cover circle renders it correctly
 * regardless.) The caller applies the MAX_*_BYTES gate afterward, so size
 * policy stays in ticketFields.ts/avatarFields.ts/portfolioFields.ts.
 * `reduceProjectImage` deviates deliberately: it resolves to null on failure
 * instead of passing the original through — a multi-megabyte unreduced
 * original is not acceptable public page media, so the form shows an error
 * rather than uploading it.
 */
import type { ScreenshotKind } from '@/lib/ticketFields';
import { AVATAR_MAX_DIMENSION } from '@/lib/avatarFields';

/** Matches scripts/optimize-images.mjs --max-dim. */
const MAX_DIMENSION = 1600;
// Canvas quality is 0..1 (≈ sharp's 0–100 scale).
const WEBP_QUALITY = 0.82;
const JPEG_QUALITY = 0.85;
// Decode guard: an RGBA raster is 4 bytes/px — 64 MP ≈ 256 MB, enough to kill
// a mobile Safari tab. The 15 MB input cap doesn't bound PIXELS for avif/webp.
const MAX_SOURCE_PIXELS = 64_000_000;

const EXT_BY_TYPE: Record<string, string | undefined> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

export interface ReducedScreenshot {
  /** File for form state — re-encoded, or the untouched original when kept. */
  file: File;
  originalBytes: number;
  /** true → no gain or not processable; the original passed through. */
  kept: boolean;
}

/** Ticket screenshots: fit inside 1600×1600, aspect preserved. */
export function reduceScreenshot(
  input: File,
  kind: ScreenshotKind,
): Promise<ReducedScreenshot> {
  return reduce(input, kind, { maxDimension: MAX_DIMENSION, coverSquare: false });
}

/** Profile photos: cover-crop to a centered square, at most 512×512. */
export function reduceAvatar(
  input: File,
  kind: ScreenshotKind,
): Promise<ReducedScreenshot> {
  return reduce(input, kind, {
    maxDimension: AVATAR_MAX_DIMENSION,
    coverSquare: true,
  });
}

/** General contained fit at a caller-chosen ceiling — client logos (512):
 *  a mark must never be cropped, so no coverSquare here. */
export function reduceImage(
  input: File,
  kind: ScreenshotKind,
  opts: { maxDimension: number },
): Promise<ReducedScreenshot> {
  return reduce(input, kind, {
    maxDimension: opts.maxDimension,
    coverSquare: false,
  });
}

export interface ReducedProjectImage {
  /** The ≤`fullMax` contained-fit master, with its pixel size (the aspect
   *  ratio next/image lays out from). */
  full: { file: File; width: number; height: number };
  /** Width-targeted renditions strictly narrower than the master — the same
   *  ladder the static pipeline pre-generates. Sparse by design: a 700px
   *  source gets only the 384/640 rungs. */
  rungs: { width: number; file: File }[];
  /** ~24px LQIP as a data URL (image/webp; Safari silently emits PNG — both
   *  are a few hundred bytes). */
  blurDataUrl: string;
  originalBytes: number;
}

/**
 * Portfolio uploads: ONE decode fanned into the full master + every rung +
 * the blur placeholder, so a gallery image gets srcset delivery and blur-up
 * with zero runtime transcode. Resolves null on any decode/encode failure
 * (see the header — no passthrough here).
 */
export async function reduceProjectImage(
  input: File,
  kind: ScreenshotKind,
  opts: { fullMax: number; rungWidths: readonly number[] },
): Promise<ReducedProjectImage | null> {
  let source: ImageBitmap | HTMLImageElement | null = null;
  let objectUrl: string | null = null;
  const canvas = document.createElement('canvas');
  try {
    ({ source, objectUrl } = await decode(input));
    const sourceWidth =
      source instanceof HTMLImageElement ? source.naturalWidth : source.width;
    const sourceHeight =
      source instanceof HTMLImageElement ? source.naturalHeight : source.height;
    if (
      !sourceWidth ||
      !sourceHeight ||
      sourceWidth * sourceHeight > MAX_SOURCE_PIXELS
    ) {
      return null;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingQuality = 'high';

    const base = input.name.replace(/\.[^.]+$/, '') || 'image';
    const src = source;

    /** Draw the source at `scale` and encode — shared by master and rungs. */
    const drawAndEncode = async (
      scale: number,
      suffix: string,
    ): Promise<File | null> => {
      canvas.width = Math.max(1, Math.round(sourceWidth * scale));
      canvas.height = Math.max(1, Math.round(sourceHeight * scale));
      ctx.drawImage(
        src,
        0,
        0,
        sourceWidth,
        sourceHeight,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      const blob = await encode(canvas, ctx, kind);
      const ext = blob && EXT_BY_TYPE[blob.type];
      if (!blob || !ext) return null;
      return new File([blob], `${base}${suffix}.${ext}`, {
        type: blob.type,
        lastModified: Date.now(),
      });
    };

    // Master: contained fit, never enlarged (same rule as the single-output
    // reducers) — its dimensions define the ladder's ceiling.
    const fullScale = Math.min(
      1,
      opts.fullMax / Math.max(sourceWidth, sourceHeight),
    );
    const fullWidth = Math.max(1, Math.round(sourceWidth * fullScale));
    const fullFile = await drawAndEncode(fullScale, '');
    if (!fullFile) return null;

    const rungs: { width: number; file: File }[] = [];
    for (const width of opts.rungWidths) {
      if (width >= fullWidth) continue; // never upscale into a rung
      const file = await drawAndEncode(width / sourceWidth, `-${width}`);
      // A failed rung isn't fatal — the renderer's loader falls through to
      // the next size up, ending at the master.
      if (file) rungs.push({ width, file });
    }

    // LQIP: a ≤24px draw, inlined as a data URL. toDataURL('image/webp') on
    // Safari silently encodes PNG — the strict server-side pattern accepts
    // webp/png/jpeg data URLs, all a few hundred bytes at this size.
    const blurScale = Math.min(1, 24 / sourceWidth);
    canvas.width = Math.max(1, Math.round(sourceWidth * blurScale));
    canvas.height = Math.max(1, Math.round(sourceHeight * blurScale));
    ctx.drawImage(
      src,
      0,
      0,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    const blurDataUrl = canvas.toDataURL('image/webp', 0.4);

    return {
      full: {
        file: fullFile,
        width: fullWidth,
        height: Math.max(1, Math.round(sourceHeight * fullScale)),
      },
      rungs,
      blurDataUrl,
      originalBytes: input.size,
    };
  } catch {
    return null;
  } finally {
    if (source instanceof ImageBitmap) source.close();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    canvas.width = 0;
    canvas.height = 0;
  }
}

async function reduce(
  input: File,
  kind: ScreenshotKind,
  opts: { maxDimension: number; coverSquare: boolean },
): Promise<ReducedScreenshot> {
  const original: ReducedScreenshot = {
    file: input,
    originalBytes: input.size,
    kept: true,
  };
  let source: ImageBitmap | HTMLImageElement | null = null;
  let objectUrl: string | null = null;
  const canvas = document.createElement('canvas');
  try {
    ({ source, objectUrl } = await decode(input));
    const sourceWidth =
      source instanceof HTMLImageElement ? source.naturalWidth : source.width;
    const sourceHeight =
      source instanceof HTMLImageElement ? source.naturalHeight : source.height;
    if (
      !sourceWidth ||
      !sourceHeight ||
      sourceWidth * sourceHeight > MAX_SOURCE_PIXELS
    ) {
      return original;
    }

    // Source rect: the whole image, or (coverSquare) its centered square —
    // the same region an object-cover circle displays, so what's stored is
    // exactly what renders.
    const side = Math.min(sourceWidth, sourceHeight);
    const sx = opts.coverSquare ? Math.round((sourceWidth - side) / 2) : 0;
    const sy = opts.coverSquare ? Math.round((sourceHeight - side) / 2) : 0;
    const sw = opts.coverSquare ? side : sourceWidth;
    const sh = opts.coverSquare ? side : sourceHeight;

    // Fit inside maxDimension², never enlarge (sharp: fit 'inside' +
    // withoutEnlargement).
    const scale = Math.min(1, opts.maxDimension / Math.max(sw, sh));
    canvas.width = Math.max(1, Math.round(sw * scale));
    canvas.height = Math.max(1, Math.round(sh * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return original;
    ctx.imageSmoothingQuality = 'high'; // Firefox ignores it; harmless
    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    const blob = await encode(canvas, ctx, kind);
    if (!blob || blob.size >= input.size) return original; // kept (no gain)

    // Extension + type must match the encoded bytes so the server re-sniff
    // (and the stored blob contentType) stay truthful.
    const ext = EXT_BY_TYPE[blob.type];
    if (!ext) return original;
    const base = input.name.replace(/\.[^.]+$/, '') || 'screenshot';
    return {
      file: new File([blob], `${base}.${ext}`, {
        type: blob.type,
        lastModified: Date.now(),
      }),
      originalBytes: input.size,
      kept: false,
    };
  } catch {
    return original;
  } finally {
    // Safari is slow to GC bitmap/canvas backing stores; free them eagerly so
    // repeated pick/remove cycles don't accumulate.
    if (source instanceof ImageBitmap) source.close();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    canvas.width = 0;
    canvas.height = 0;
  }
}

async function decode(file: File): Promise<{
  source: ImageBitmap | HTMLImageElement;
  objectUrl: string | null;
}> {
  try {
    // No options bag on purpose: EXIF orientation ('from-image') is the spec
    // default in every evergreen browser, and older WebKit REJECTED the call
    // when the bag held values it didn't implement.
    return { source: await createImageBitmap(file), objectUrl: null };
  } catch {
    // Fall back to the <img> pipeline (which also bakes EXIF orientation and
    // reports orientation-corrected naturalWidth/Height).
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.src = objectUrl;
    try {
      await img.decode();
      return { source: img, objectUrl };
    } catch (error) {
      URL.revokeObjectURL(objectUrl); // the caller's finally never sees this url
      throw error;
    }
  }
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

async function encode(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  kind: ScreenshotKind,
): Promise<Blob | null> {
  const webp = await toBlob(canvas, 'image/webp', WEBP_QUALITY);
  if (webp?.type === 'image/webp') return webp; // Chrome/Edge/Firefox
  // Safari has no WebP encoder — and per spec toBlob does NOT return null for
  // an unsupported type; it silently encodes PNG instead (null only signals
  // serialization failure). Detect via blob.type, then pick the best
  // Safari-native format: JPEG for opaque images, or the silent PNG
  // (downscaled, lossless, alpha intact) when transparency must survive.
  if (kind === 'jpg' || !hasAlpha(ctx, canvas.width, canvas.height)) {
    return toBlob(canvas, 'image/jpeg', JPEG_QUALITY);
  }
  return webp;
}

// One pass over the (≤1600²) downscaled raster — ms-scale, Safari path only.
function hasAlpha(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): boolean {
  const data = ctx.getImageData(0, 0, width, height).data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }
  return false;
}
