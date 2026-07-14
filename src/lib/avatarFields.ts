/**
 * Shared constants + pre-checks for the admin profile photo. Zod-free and
 * client-safe, mirroring ticketFields.ts's screenshot section: an avatar
 * accepts exactly the same image formats, so the accept list, MIME map, and
 * magic-byte sniff are reused from there — only the wording, the reduce
 * target (a 512px cover square instead of a 1600px fit), and the gate
 * messages differ. The authoritative content check stays the sniff
 * (sniffScreenshotKind), run on both client and server.
 */
import {
  MAX_SCREENSHOT_BYTES,
  MAX_SCREENSHOT_INPUT_BYTES,
  SCREENSHOT_ACCEPT,
  SCREENSHOT_MIME,
} from '@/lib/ticketFields';

/** `accept` attribute for the photo file input — same formats as screenshots. */
export const AVATAR_ACCEPT = SCREENSHOT_ACCEPT;

/**
 * Stored avatars are cover-cropped squares at most this wide (reduceAvatar).
 * 512px keeps the largest render (the 112px dialog preview at 3× DPR ≈ 336px)
 * comfortably sharp while staying a few tens of KB.
 */
export const AVATAR_MAX_DIMENSION = 512;

/** Upload gate — same Vercel 4.5 MB body-ceiling rationale as screenshots. */
export const MAX_AVATAR_BYTES = MAX_SCREENSHOT_BYTES;

/** Pick gate — inputs may be large because reduceAvatar shrinks them first. */
export const MAX_AVATAR_INPUT_BYTES = MAX_SCREENSHOT_INPUT_BYTES;

export const AVATAR_BAD_TYPE =
  'Photo must be a PNG, JPEG, WebP, or AVIF image.';

const AVATAR_EXT = /\.(png|jpe?g|webp|avif)$/i;
const MIME_SET = new Set<string>(Object.values(SCREENSHOT_MIME));

/**
 * Type/extension pre-check shared by both gates below — the avatar-worded
 * twin of ticketFields' screenshotTypeProblem (same leniency: `File.type` is
 * filename-derived and often empty, so acceptance leans on extension/MIME
 * while the sniff stays authoritative).
 */
function avatarTypeProblem(file: unknown): string | null {
  if (!(file instanceof File) || file.size === 0) {
    return 'Choose an image file (PNG, JPEG, WebP, or AVIF).';
  }
  const typeOk =
    file.type === ''
      ? AVATAR_EXT.test(file.name)
      : MIME_SET.has(file.type) || AVATAR_EXT.test(file.name);
  return typeOk ? null : AVATAR_BAD_TYPE;
}

/**
 * UPLOAD gate (4 MB): what the server action checks, and what the client
 * re-checks on the reduced file. Returns a human-readable problem or null.
 */
export function avatarProblem(file: unknown): string | null {
  const typeProblem = avatarTypeProblem(file);
  if (typeProblem) return typeProblem;
  return (file as File).size > MAX_AVATAR_BYTES
    ? 'Photo must be 4 MB or smaller.'
    : null;
}

/**
 * PICK gate (15 MB): what the client checks on the raw pick, before the
 * reduce step shrinks it to (usually far) under the upload cap.
 */
export function avatarInputProblem(file: unknown): string | null {
  const typeProblem = avatarTypeProblem(file);
  if (typeProblem) return typeProblem;
  return (file as File).size > MAX_AVATAR_INPUT_BYTES
    ? 'Photo must be 15 MB or smaller.'
    : null;
}
