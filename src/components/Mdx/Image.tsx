import Img from '@/components/Img';
import { resolveImageSrc } from '@/utils/images';
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

  // External hotlinks pass through untouched; everything else resolves to a
  // self-hosted /images asset (or the shared placeholder until one exists).
  const isExternal = /^https?:\/\//i.test(src) || src.startsWith('//');
  const resolved = isExternal ? src : resolveImageSrc(src);
  const hasDims = Boolean(w && h);

  // Showcase mode: render <figure>+<figcaption> + wrapper styling.
  // Triggered by any prop that signals deliberate showcase usage.
  const showcase = Boolean(caption || credit || size !== 'default' || priority);

  // With explicit dimensions a self-hosted image goes through next/image for
  // build-time optimization. Without them — typical for MDX `<Image>` embeds
  // where the author doesn't know the asset's pixel size — fall back to a plain
  // `<img>`: next/image's `fill` mode would force a fixed-ratio container and
  // crop with `object-cover`, which is destructive for infographics,
  // screenshots, or any asset that isn't 16:9. Authors who want full
  // optimization should pass explicit width/height. External hotlinks always
  // render as a plain `<img>` (unoptimized, never swapped for the placeholder).
  const image =
    !isExternal && hasDims ? (
      <Img
        src={resolved}
        alt={alt}
        width={w}
        height={h}
        priority={priority}
        sizes="(max-width: 768px) 100vw, 720px"
        className={showcase ? 'h-auto w-full' : className}
      />
    ) : (
      <img
        src={resolved}
        alt={alt}
        loading={priority ? undefined : 'lazy'}
        decoding="async"
        className={
          showcase
            ? 'block h-auto w-full'
            : (className ?? 'block h-auto w-full rounded-lg')
        }
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
