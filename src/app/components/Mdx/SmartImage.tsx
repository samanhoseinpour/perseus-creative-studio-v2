import { ImageKit } from '../';
import type { ComponentProps } from 'react';

type ImgProps = ComponentProps<'img'>;

// Optional: allow authors to encode dimensions in the markdown title: "1200x630"
function parseSize(title?: string) {
  if (!title) return null;
  const m = title.match(/(\d+)\s*x\s*(\d+)/i);
  if (!m) return null;
  return { width: Number(m[1]), height: Number(m[2]) };
}

function isInternalSrc(src: string) {
  // public/ assets or same-site relative paths
  return src.startsWith('/') && !src.startsWith('//');
}

export default function SmartImage(props: ImgProps) {
  const { src = '', alt = '', title, className, ...rest } = props;

  // If it's not a string or no src, fall back to normal <img>
  if (typeof src !== 'string' || !src) return <img alt={alt} {...props} />;

  const size = parseSize(title ?? undefined);

  // INTERNAL: use ImageKit (optimized)
  if (isInternalSrc(src)) {
    // If we have dimensions, use them (best practice).
    if (size) {
      return (
        <ImageKit
          src={src}
          alt={alt}
          width={size.width}
          height={size.height}
          className={className}
        />
      );
    }

    // If no dimensions, still render but avoid breaking: use fill.
    // (You need a wrapper with relative positioning.)
    return (
      <span className="relative block w-full aspect-video">
        <ImageKit
          src={src}
          alt={alt}
          fill
          sizes="100vw"
          className={className ?? 'object-cover'}
        />
      </span>
    );
  }

  // EXTERNAL: simplest = keep a normal <img>
  // (No ImageKit remotePatterns config required)
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      {...rest}
    />
  );
}
