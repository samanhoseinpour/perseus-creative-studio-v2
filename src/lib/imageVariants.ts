// Responsive AVIF variants — single source of truth.
//
// We pre-generate a few smaller widths per content image at build time
// (`scripts/generate-image-variants.mjs`) and serve them as static files through the
// custom next/image loader (`src/lib/imageLoader.ts`), so the browser gets a normal
// `srcset` with zero runtime optimization (no `/_next/image`, no transcode, no Vercel
// Image Optimization cost). This module is imported by the loader AND mirrored by the
// generator so the rung ladder and the "what gets variants" rule can never drift.

// Suffixed variant widths. The original file (native, ≤ ~1366px) is the largest entry.
export const RUNGS = [384, 640, 960] as const;

// `/images/a/b.avif` + 640 → `/images/a/b-640.avif` (suffix inserted before the extension,
// keeping the source extension so the loader and the generated file always agree).
export function variantPath(src: string, rung: number): string {
  const dot = src.lastIndexOf('.');
  return dot === -1
    ? `${src}-${rung}`
    : `${src.slice(0, dot)}-${rung}${src.slice(dot)}`;
}

// Brand/platform marks (`shared/logos`) and client marks (`shared/client-logos`) are tiny,
// transparent, and always rendered small — laddering them is pointless, so they (and the
// shared placeholder) are served as the single original. Everything else under /images is
// a content photo that gets variants. Anything not under /images (shouldn't happen —
// `resolveImageSrc` maps unknowns to the placeholder) is left untouched.
export function isLaddered(src: string): boolean {
  if (!src.startsWith('/images/')) return false;
  if (src.startsWith('/images/shared/logos/')) return false;
  if (src.startsWith('/images/shared/client-logos/')) return false;
  if (src === '/images/perseus-logo-black.avif') return false;
  return true;
}
