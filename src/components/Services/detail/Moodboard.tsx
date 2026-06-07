import ImageKit from '../../ImageKit';
import type { BrandingServiceContent } from '../types';

type Moodboard = NonNullable<BrandingServiceContent['moodboard']>;

const SPAN = {
  square: 'col-span-1 row-span-1',
  wide: 'col-span-2 row-span-1',
  tall: 'col-span-1 row-span-2',
} as const;

/**
 * Creative Direction signature — an asymmetric moodboard collage. Image tiles
 * and ink "keyword" tiles share a grid with varied spans, so the section feels
 * art-directed rather than gridded. Static (server component). Studio tokens —
 * ink keyword tiles, hairline rings, mono captions.
 */
const Moodboard = ({ tiles }: Moodboard) => (
  <div className="grid auto-rows-[110px] grid-flow-dense grid-cols-2 gap-3 sm:auto-rows-[150px] sm:grid-cols-4">
    {tiles.map((t, i) => (
      <div
        key={i}
        className={`${SPAN[t.span ?? 'square']} overflow-hidden rounded-2xl ring-1 ring-inset ring-black/10`}
      >
        {t.imageUrl ? (
          <div className="relative size-full bg-black">
            <ImageKit
              src={t.imageUrl}
              alt={t.imageAlt ?? ''}
              fill
              sizes="(min-width: 640px) 360px, 50vw"
              className="rounded-none object-cover"
            />
            {t.label && (
              <>
                <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-scrim/60 to-transparent" />
                <span className="absolute bottom-3 left-3 font-mono text-[10px] uppercase tracking-[0.18em] text-on-media/90">
                  {t.label}
                </span>
              </>
            )}
          </div>
        ) : (
          <div className="flex size-full items-center justify-center bg-black p-4 text-center">
            <span className="text-lg font-semibold tracking-tighter text-white sm:text-xl">
              {t.label}
            </span>
          </div>
        )}
      </div>
    ))}
  </div>
);

export default Moodboard;
