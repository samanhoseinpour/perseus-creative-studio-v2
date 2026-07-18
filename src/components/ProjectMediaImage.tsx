'use client';

import { useMemo } from 'react';
import NextImage from 'next/image';
import { twMerge } from 'tailwind-merge';

import type { ProjectMediaVariants } from '@/components/Projects/types';

/**
 * Renderer for /admin-uploaded portfolio images (public Blob CDN): the
 * dynamic-content twin of <Img>. The global custom loader only understands
 * the static /images ladder — and <Img>'s resolveImageSrc would placeholder a
 * blob URL — so this maps next/image's requested width onto the rung set the
 * browser generated at upload time via a PER-INSTANCE loader. A function
 * can't cross the RSC boundary, which is why this is a client component;
 * server parents pass the serializable `variants` + `blurDataUrl` straight
 * from the DB row (trusted data — written only by the validated upload
 * action).
 *
 * Rung sets are sparse by design (a 700px source has only w384/w640): the
 * ladder falls through to the next size up, ending at the full master.
 */
export type ProjectMediaImageProps = {
  variants: ProjectMediaVariants;
  alt: string;
  blurDataUrl?: string | null;
  sizes?: string;
  fill?: boolean;
  priority?: boolean;
  loading?: 'lazy' | 'eager';
  /** Without `fill`, defaults to the master's pixel size (correct aspect). */
  width?: number;
  height?: number;
  className?: string;
};

const ProjectMediaImage = ({
  variants,
  alt,
  blurDataUrl,
  sizes,
  fill,
  priority,
  loading = 'lazy',
  width,
  height,
  className,
}: ProjectMediaImageProps) => {
  const ladder = useMemo(() => {
    const rungs: { width: number; url: string }[] = [];
    if (variants.w384) rungs.push({ width: 384, url: variants.w384.url });
    if (variants.w640) rungs.push({ width: 640, url: variants.w640.url });
    if (variants.w960) rungs.push({ width: 960, url: variants.w960.url });
    rungs.push({ width: variants.full.width, url: variants.full.url });
    return rungs;
  }, [variants]);

  return (
    <NextImage
      src={variants.full.url}
      alt={alt}
      loader={({ width: requested }) =>
        (ladder.find((rung) => requested <= rung.width) ?? ladder[ladder.length - 1])
          .url
      }
      width={fill ? undefined : (width ?? variants.full.width)}
      height={fill ? undefined : (height ?? variants.full.height)}
      loading={priority ? undefined : loading}
      priority={priority}
      // Same rationale as <Img>: Next doesn't reliably derive fetchpriority
      // from `priority` for custom-loader fill images.
      fetchPriority={priority ? 'high' : undefined}
      sizes={sizes}
      fill={fill}
      placeholder={blurDataUrl ? 'blur' : 'empty'}
      blurDataURL={blurDataUrl ?? undefined}
      draggable={false}
      className={twMerge('rounded-lg', className)}
    />
  );
};

export default ProjectMediaImage;
