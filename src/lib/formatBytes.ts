/**
 * The size vocabulary of the upload chips (ticket screenshot, profile photo).
 * Extracted from ScreenshotDropzone so both surfaces speak the same line.
 */

/** "2.4 MB" / "480 KB" — sub-KB sizes round up to 1 KB, never "0 KB". */
export function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * The before → after line for a reduceScreenshot/reduceAvatar result:
 * "2.4 MB → 480 KB · 80% smaller", or "480 KB · already optimized" when the
 * original passed through (kept) or the gain rounds to nothing.
 */
export function reducedSizeLine(
  finalBytes: number,
  originalBytes: number,
  kept: boolean,
): string {
  const pct = Math.round(100 * (1 - finalBytes / originalBytes));
  if (kept || pct < 1) return `${formatBytes(finalBytes)} · already optimized`;
  return `${formatBytes(originalBytes)} → ${formatBytes(finalBytes)} · ${pct}% smaller`;
}
