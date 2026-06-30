import { IMAGE_PLACEHOLDER, SITE_URL } from '@/constants';

// The site serves images from public/images (self-hosted, optimized through
// next/image). Only paths under /images are treated as "ready"; every other
// value — bare legacy filenames, /logo-white.png, old CDN URLs — falls back to
// the shared placeholder until a real asset is dropped in and the constant is
// pointed at its /images/... path.
export const isReadyImage = (src?: string | null): boolean =>
  typeof src === 'string' && src.startsWith('/images/');

export const resolveImageSrc = (src?: string | null): string =>
  isReadyImage(src) ? (src as string) : IMAGE_PLACEHOLDER;

// Brand/platform marks live in shared/logos and are transparent, centred glyphs
// — they must sit contained on a tile, never be cropped full-bleed like a photo.
// Service-card surfaces switch to the logo-tile treatment when this is true.
export const isBrandLogo = (src?: string | null): boolean =>
  typeof src === 'string' && src.startsWith('/images/shared/logos/');

// Monochrome marks (a single near-black glyph on transparent) read on the light
// theme but vanish on the dark card ground, so they flip to white with
// `dark:invert`. Full-colour marks (Figma, React, Shopify, the Google set …)
// must NOT be inverted. Keyed by filename; extend when a new mono mark lands.
const MONO_LOGOS = new Set<string>([
  'shared-logos-nextjs.avif',
  'shared-logos-wordpress.avif',
]);

export const isMonoLogo = (src?: string | null): boolean =>
  MONO_LOGOS.has(src?.split('/').pop() ?? '');

// Absolute form for OG/social cards and JSON-LD image fields.
export const resolveImageUrl = (src?: string | null): string =>
  `${SITE_URL}${resolveImageSrc(src)}`;

// Client marks are supplied by clients as-is, so they're mixed-polarity. On the
// photo-dark project card three cases need different circular grounds, the rule
// being: never add a ground that clashes with the logo's own.
//  - Opaque art baked on its OWN dark ground (a light mark on solid black) reads
//    with NO disc — its dark ground becomes the circle, blends into the card,
//    and the bright mark floats. A disc here only mismatches that ground.
//  - A near-white mark on a TRANSPARENT ground needs a dark disc, or it washes
//    out over the card's brighter, blurred areas.
//  - Everything else — dark/colored ink, or any mark on a light/transparent
//    ground — needs a light disc to stay legible on the dark card. (No clash:
//    a transparent mark has no ground, and a light-ground mark matches a light
//    disc.)
// The sets below are the verified classification of the logos used on project
// cards (src/constants/projects.ts), from a mean-luminance audit plus a visual
// check of the transparent ones. Re-run that audit and extend them when a
// project introduces a new client mark.
export type ClientLogoDisc = 'none' | 'light' | 'dark';

const CLIENT_LOGOS_NO_DISC = new Set<string>([
  'shared-client-logos-obsidian.avif',
  'shared-client-logos-vitality.avif',
  'shared-client-logos-amin-meysami.avif',
  'shared-client-logos-cityscape-electrical.avif',
  'shared-client-logos-dunnsmenswear.avif',
  'shared-client-logos-phantompestsolutions.avif',
  'shared-client-logos-rocky-junkremoval.avif',
  'shared-client-logos-rocky.demolition.avif',
]);

const CLIENT_LOGOS_DARK_DISC = new Set<string>([
  'shared-client-logos-cartocci.avif',
  'shared-client-logos-dibawindows.avif',
]);

// The circular ground a client mark should sit on (see the note above).
export const clientLogoDisc = (src?: string | null): ClientLogoDisc => {
  const file = src?.split('/').pop();
  if (!file) return 'light';
  if (CLIENT_LOGOS_NO_DISC.has(file)) return 'none';
  if (CLIENT_LOGOS_DARK_DISC.has(file)) return 'dark';
  return 'light';
};
