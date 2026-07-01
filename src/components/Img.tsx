import NextImage from 'next/image';
import { twMerge } from 'tailwind-merge';
import { resolveImageSrc } from '@/utils/images';
import { blurDataUrl } from '@/lib/imageBlur';
import { isLaddered } from '@/lib/imageVariants';
import { ImgProps } from '@/utils/types';

// Thin wrapper over next/image for all self-hosted imagery. Unmigrated slots
// resolve to the shared placeholder via resolveImageSrc, so call sites keep
// their existing src values until a real /images/... asset lands.
const Img = ({
  src,
  alt,
  width,
  height,
  loading = 'lazy',
  className,
  sizes,
  fill,
  priority,
  quality,
}: ImgProps) => {
  const resolved = resolveImageSrc(src);
  // LQIP blur-up: laddered content photos have a tiny base64 placeholder; logos/marks
  // and unmigrated slots don't, and fall back to no placeholder.
  const blur = blurDataUrl(resolved);
  // Tiny marks (logos, client logos, the placeholder) have no responsive variants, so
  // the loader returns their src unchanged at every width. Mark them unoptimized — it's
  // the truth (one static file, no srcset), and it silences next/image's dev warning
  // that the loader "does not implement width". Keyed on the loader's own predicate so
  // the two can't drift.
  const unoptimized = !isLaddered(resolved);
  return (
    <NextImage
      src={resolved}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? undefined : loading}
      priority={priority}
      // Next doesn't reliably derive fetchpriority from `priority` for these
      // custom-loader fill images, so set it explicitly on the LCP path.
      fetchPriority={priority ? 'high' : undefined}
      sizes={sizes}
      fill={fill}
      quality={quality}
      unoptimized={unoptimized}
      placeholder={blur ? 'blur' : 'empty'}
      blurDataURL={blur}
      draggable={false}
      className={twMerge('rounded-lg', className)}
    />
  );
};

export default Img;
