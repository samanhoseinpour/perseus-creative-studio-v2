// Blur-up / LQIP lookup.
//
// `imageBlur.generated.json` is produced by scripts/generate-image-variants.mjs (run via
// `npm run image-variants`): a map of `/images/...` path → tiny base64 WebP data URL. We
// hand that string to next/image as `blurDataURL` with `placeholder="blur"`, so it renders
// a scaled-up, heavily blurred preview and cross-fades to the real image on load — the
// Medium/Pinterest effect — with no runtime optimizer involved.
//
// Only laddered content photos get an entry (same rule as the responsive variants); brand
// marks, client logos, and the shared placeholder are excluded, so they resolve to
// `undefined` here and fall back to `placeholder="empty"`. Keyed by the resolved
// `/images/...` src, so call `blurDataUrl(resolveImageSrc(src))`.
import blurMap from './imageBlur.generated.json';

const BLUR = blurMap as Record<string, string>;

export const blurDataUrl = (src: string): string | undefined => BLUR[src];
