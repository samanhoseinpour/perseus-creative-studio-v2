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
// Server-only guard: importing this module from any client component would put
// the whole base64 map back into the shared client chunk on every route.
// Client components render <ImgClient blur={...}> with a value a server parent
// looked up via blurFor().
import 'server-only';
import blurMap from './imageBlur.generated.json';
import { resolveImageSrc } from '@/utils/images';

const BLUR = blurMap as Record<string, string>;

export const blurDataUrl = (src: string): string | undefined => BLUR[src];

/** Resolve + look up in one step — for server components threading a blur
 *  value down to a client `<ImgClient>` (the map is keyed by resolved src). */
export const blurFor = (src: string): string | undefined =>
  blurDataUrl(resolveImageSrc(src));
