import NextImage from 'next/image';
import { twMerge } from 'tailwind-merge';
import { resolveImageSrc } from '@/utils/images';
import { isLaddered } from '@/lib/imageVariants';
import { ImgProps } from '@/utils/types';

// Client-graph twin of <Img> (src/components/Img.tsx): identical rendering,
// but the blur-up placeholder arrives as a prop instead of a module-level map
// lookup. Img imports the full imageBlur.generated.json — one base64 entry per
// site image — which is fine on the server (only the used strings reach the
// HTML) but ships the entire map in the shared client chunk on every route the
// moment a client component imports it. So: client components render
// <ImgClient> and receive `blur` from their server parent via blurFor()
// (src/lib/imageBlur.ts); server components keep using <Img> and get the
// lookup for free. Slots without a laddered content photo (logos, marks) have
// no blur entry today — pass nothing and the placeholder stays 'empty',
// exactly as <Img> behaves for them.
export type ImgClientProps = ImgProps & { blur?: string };

const ImgClient = ({
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
  blur,
}: ImgClientProps) => {
  const resolved = resolveImageSrc(src);
  // Same predicate as Img: marks without responsive variants are truthfully
  // unoptimized (one static file, no srcset).
  const unoptimized = !isLaddered(resolved);
  return (
    <NextImage
      src={resolved}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? undefined : loading}
      priority={priority}
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

export default ImgClient;
