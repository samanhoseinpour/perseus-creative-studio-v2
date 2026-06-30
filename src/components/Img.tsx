import NextImage from 'next/image';
import { twMerge } from 'tailwind-merge';
import { resolveImageSrc } from '@/utils/images';
import { blurDataUrl } from '@/lib/imageBlur';
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
  return (
    <NextImage
      src={resolved}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? undefined : loading}
      priority={priority}
      sizes={sizes}
      fill={fill}
      quality={quality}
      placeholder={blur ? 'blur' : 'empty'}
      blurDataURL={blur}
      draggable={false}
      className={twMerge('rounded-lg', className)}
    />
  );
};

export default Img;
