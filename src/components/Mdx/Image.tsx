import { ImageKit } from '../';
import { toImageKitPath } from '@/utils/imagekit';
import type { ComponentProps } from 'react';

type Size = 'narrow' | 'default' | 'wide';

interface ImageOwnProps {
  caption?: string;
  credit?: string;
  size?: Size;
  priority?: boolean;
}

type ImageProps = ImageOwnProps &
  Omit<ComponentProps<'img'>, 'src' | 'width' | 'height'> & {
    src?: string;
    width?: number | string;
    height?: number | string;
  };

const sizeClass: Record<Size, string> = {
  narrow: 'max-w-[540px]',
  default: '',
  wide: 'max-w-[820px]',
};

// Markdown authors can encode dims in the title: ![alt](src "1200x630")
function parseSize(title?: string) {
  if (!title) return null;
  const m = title.match(/(\d+)\s*x\s*(\d+)/i);
  if (!m) return null;
  return { width: Number(m[1]), height: Number(m[2]) };
}

const toNum = (v: number | string | undefined) =>
  typeof v === 'number' ? v : v ? Number(v) || undefined : undefined;

export default function Image(props: ImageProps) {
  const {
    src = '',
    alt = '',
    caption,
    credit,
    size = 'default',
    priority = false,
    width,
    height,
    title,
    className,
  } = props;

  if (!src) return null;

  // Dimensions can come from explicit props or from the markdown title attr.
  const fromTitle = parseSize(title ?? undefined);
  const w = toNum(width) ?? fromTitle?.width;
  const h = toNum(height) ?? fromTitle?.height;

  const ikPath = toImageKitPath(src);
  const hasDims = Boolean(w && h);

  // Showcase mode: render <figure>+<figcaption> + wrapper styling.
  // Triggered by any prop that signals deliberate showcase usage.
  const showcase = Boolean(caption || credit || size !== 'default' || priority);

  const image = ikPath ? (
    hasDims ? (
      <ImageKit
        src={ikPath}
        alt={alt}
        width={w}
        height={h}
        priority={priority}
        sizes="(max-width: 768px) 100vw, 720px"
        className={showcase ? 'h-auto w-full' : className}
      />
    ) : (
      <span className="relative block w-full aspect-video">
        <ImageKit
          src={ikPath}
          alt={alt}
          fill
          priority={priority}
          sizes={showcase ? '(max-width: 768px) 100vw, 720px' : '100vw'}
          className={showcase ? 'object-cover' : className ?? 'object-cover'}
        />
      </span>
    )
  ) : (
    <img
      src={src}
      alt={alt}
      loading={priority ? undefined : 'lazy'}
      decoding="async"
      className={showcase ? 'block h-auto w-full' : className}
    />
  );

  if (!showcase) return image;

  return (
    <figure className={`my-10 mx-auto w-full ${sizeClass[size]}`}>
      <div className="overflow-hidden rounded-2xl">{image}</div>
      {(caption || credit) && (
        <figcaption className="mt-3 flex flex-col gap-1 px-1 text-xs leading-xs text-black/60 text-center">
          {caption && <span className="text-black/80">{caption}</span>}
          {credit && (
            <span className="uppercase tracking-[0.14em] text-black/50">
              {credit}
            </span>
          )}
        </figcaption>
      )}
    </figure>
  );
}
