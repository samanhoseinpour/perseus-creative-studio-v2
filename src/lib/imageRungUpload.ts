import 'server-only';

import { putPublic } from '@/lib/publicBlob';
import {
  MAX_PROJECT_IMAGE_PIXELS,
  MAX_PROJECT_UPLOAD_BYTES,
  PROJECT_IMAGE_BAD_TYPE,
  PROJECT_IMAGE_RUNGS,
  PROJECT_IMAGE_TOO_LARGE,
  projectImageProblem,
} from '@/lib/portfolioFields';
import {
  SCREENSHOT_MIME,
  sniffImageDimensions,
  sniffScreenshotKind,
  type ScreenshotKind,
} from '@/lib/ticketFields';

/**
 * The half of an image upload that is the same for every surface: read the
 * rung files out of one action body, gate them, and store the set in the
 * PUBLIC Blob store.
 *
 * It exists because `uploadProjectMedia` and `uploadBlogMedia` differ in
 * exactly one thing — where the bytes land — and every other step is a
 * security control that must not be re-derived per caller: the magic-byte
 * sniff (never the filename), the decoded-pixel gate against a decompression
 * bomb, the SUM cap against Vercel's 4.5 MB body ceiling, and the
 * `Promise.allSettled` fan-out that guarantees the cleanup ledger names every
 * pathname before a failure propagates. A second hand-written copy of that
 * list is how one of the two surfaces silently loses a gate.
 *
 * `server-only` for the reason `publicBlob.ts` is: this module spends the
 * public store's token.
 */

/** A rung's slot in one image's ladder: the master, or a width. */
export type RungLabel = 'full' | `w${number}`;
export type StoredRung = { url: string; pathname: string };
/** Sparse by design: a 700px source has only w384/w640. */
export type StoredRungs = Partial<Record<RungLabel, StoredRung>>;

/**
 * Per-rung rejections are THROWN (the upload batch is a Promise.allSettled, so
 * a return value can't short-circuit it) and caught by the caller's outer
 * catch. These messages are already field-level copy, so they pass through
 * verbatim instead of collapsing into a generic line. Add a message here
 * whenever `putImageRungs` learns to throw a new one.
 */
export const PASSTHROUGH_UPLOAD_ERRORS = new Set<string>([
  PROJECT_IMAGE_BAD_TYPE,
  PROJECT_IMAGE_TOO_LARGE,
]);

export type CollectedRungs =
  | { ok: true; files: { label: RungLabel; file: File }[] }
  | { ok: false; error: string };

/**
 * The rung files in one upload body: `full` is required, the width rungs are
 * sparse. Each file is shape-checked, then the SUM is checked against the
 * body ceiling (one action call carries the whole ladder).
 */
export function collectImageRungs(formData: FormData): CollectedRungs {
  const files: { label: RungLabel; file: File }[] = [];
  const full = formData.get('full');
  if (!(full instanceof File) || full.size === 0) {
    return { ok: false, error: 'Attach an image file.' };
  }
  files.push({ label: 'full', file: full });
  for (const width of PROJECT_IMAGE_RUNGS) {
    const rung = formData.get(`w${width}`);
    if (rung instanceof File && rung.size > 0) {
      files.push({ label: `w${width}`, file: rung });
    }
  }

  let totalBytes = 0;
  for (const { file } of files) {
    const problem = projectImageProblem(file);
    if (problem) return { ok: false, error: problem };
    totalBytes += file.size;
  }
  if (totalBytes > MAX_PROJECT_UPLOAD_BYTES) {
    return {
      ok: false,
      error: 'Image is still over 4 MB after optimizing. Try a smaller image.',
    };
  }
  return { ok: true, files };
}

/**
 * Upload every rung CONCURRENTLY; the sniff (not the filename) decides each
 * stored extension and content-type. The rungs are independent files —
 * `stored` is label-keyed and the `uploaded` cleanup list is order-insensitive
 * — so a serial loop would pay ~3 avoidable Blob API round trips per image.
 * allSettled (not all) so every put has finished before a failure propagates:
 * the caller's `del` then sees the complete pathname list and can't strand an
 * in-flight blob.
 *
 * `pathnameFor` is the ONLY thing a caller varies, and it is called with a
 * rung label from this module and a kind sniffed from the bytes, so neither
 * half of the filename it builds comes from user input. `putPublic`'s own
 * prefix assertion is the backstop under it.
 */
export async function putImageRungs(
  files: { label: RungLabel; file: File }[],
  pathnameFor: (rung: RungLabel, kind: ScreenshotKind) => string,
  uploaded: string[],
): Promise<StoredRungs> {
  const stored: StoredRungs = {};
  const rungResults = await Promise.allSettled(
    files.map(async ({ label, file }) => {
      const kind = await sniffScreenshotKind(file);
      // Thrown (not returned) so the batch fails fast; the caller's catch
      // maps these exact messages back to their specific error copy.
      if (!kind) throw new Error(PROJECT_IMAGE_BAD_TYPE);
      // Decompression-bomb gate, per rung: a direct action POST controls
      // every file in the body, not just the master, and these bytes render
      // raw to anonymous visitors (see MAX_PROJECT_IMAGE_PIXELS). The sum
      // cap in collectImageRungs bounds the cost of reading all ≤4 headers.
      const dims = await sniffImageDimensions(file, kind);
      if (!dims) throw new Error(PROJECT_IMAGE_BAD_TYPE);
      if (dims.width * dims.height > MAX_PROJECT_IMAGE_PIXELS) {
        throw new Error(PROJECT_IMAGE_TOO_LARGE);
      }
      const blob = await putPublic(pathnameFor(label, kind), file, {
        addRandomSuffix: true,
        contentType: SCREENSHOT_MIME[kind],
        cacheControlMaxAge: 31536000,
      });
      uploaded.push(blob.pathname);
      stored[label] = { url: blob.url, pathname: blob.pathname };
    }),
  );
  const failedRung = rungResults.find((r) => r.status === 'rejected');
  if (failedRung) throw failedRung.reason;
  return stored;
}
