import type { ImageLoaderProps } from 'next/image';
import { RUNGS, isLaddered, variantPath } from '@/lib/imageVariants';

// Custom next/image loader. next/image calls this once per candidate width (from
// `deviceSizes`/`imageSizes` in next.config.ts) to assemble a `srcset`; we map each width
// to a pre-generated static AVIF variant — or the native original for the largest bucket
// and for excluded marks. The optimizer is never involved: these URLs are plain static
// files served from the edge CDN. `quality` is ignored (variants are pre-encoded).
//
// The width buckets must stay aligned with next.config's `deviceSizes: [384, 640, 960, 1280]`
// and `imageSizes: [256]`: 256/384 → -384, 640 → -640, 960 → -960, 1280 → native.
const LARGEST_RUNG = RUNGS[RUNGS.length - 1];

export default function imageLoader({ src, width }: ImageLoaderProps): string {
  if (!isLaddered(src)) return src;
  if (width > LARGEST_RUNG) return src; // native original is the top of the ladder
  const rung = RUNGS.find((r) => width <= r) ?? LARGEST_RUNG;
  return variantPath(src, rung);
}
