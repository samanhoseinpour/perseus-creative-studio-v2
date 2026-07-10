/**
 * CLIENT-ONLY: browser-side screenshot downscale/re-encode (createImageBitmap
 * + canvas) run before upload, mirroring the strategy of
 * scripts/optimize-images.mjs — downscale first, sane quality, never
 * enlarge — without sharp (server-only) or any new dependency. Never import
 * from server code; the `client-only` guard package isn't installed, so the
 * only importer must stay the ticket form's client components.
 *
 * Contract: NEVER throws and NEVER size-gates. Any decode/encode failure (or
 * a re-encode that isn't smaller) degrades to the untouched original with
 * `kept: true` — the "kept (no gain)" idiom from scripts/reduce-images.mjs.
 * The caller applies the MAX_SCREENSHOT_BYTES gate afterward, so size policy
 * stays in ticketFields.ts.
 */
import type { ScreenshotKind } from '@/lib/ticketFields';

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

export async function reduceScreenshot(
  input: File,
  kind: ScreenshotKind,
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

    // Fit inside 1600×1600, never enlarge (sharp: fit 'inside' +
    // withoutEnlargement).
    const scale = Math.min(1, MAX_DIMENSION / Math.max(sourceWidth, sourceHeight));
    canvas.width = Math.max(1, Math.round(sourceWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return original;
    ctx.imageSmoothingQuality = 'high'; // Firefox ignores it; harmless
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

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
