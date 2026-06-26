import NextImage from 'next/image';
import { twMerge } from 'tailwind-merge';
import { resolveImageSrc } from '@/utils/images';
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
  return (
    <NextImage
      src={resolveImageSrc(src)}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? undefined : loading}
      priority={priority}
      sizes={sizes}
      fill={fill}
      quality={quality}
      draggable={false}
      className={twMerge('rounded-lg', className)}
    />
  );
};

export default Img;
