import { LuLock } from 'react-icons/lu';

import ImageKit from '../../ImageKit';
import type { WebsiteServiceContent } from '../types';

type Responsive = NonNullable<WebsiteServiceContent['responsive']>;

/**
 * Website Design signature — "one design, every screen". The same page is shown
 * in a desktop browser frame, a tablet, and a phone, end-aligned on a shared
 * baseline and captioned with each breakpoint, so the section reads like a design
 * spec sheet rather than a generic device mockup. Reuses the studio browser-chrome
 * idiom + ink/contrast tokens.
 */
const ResponsiveShowcase = ({
  imageUrl,
  imageAlt,
  tabletImageUrl,
  mobileImageUrl,
  displayUrl,
  breakpoints,
}: Responsive) => {
  const [dLabel, tLabel, mLabel] = breakpoints ?? [
    'Desktop · 1440px',
    'Tablet · 768px',
    'Phone · 390px',
  ];
  const tablet = tabletImageUrl ?? imageUrl;
  const mobile = mobileImageUrl ?? imageUrl;

  return (
    <div className="flex flex-col items-end gap-6 sm:flex-row sm:gap-5 lg:gap-8">
      {/* ───── Desktop — browser-chrome frame ───── */}
      <figure className="w-full min-w-0 sm:flex-[1.7]">
        <div className="overflow-hidden rounded-2xl bg-background-contrast ring-1 ring-inset ring-black/10">
          <div className="flex items-center gap-3 border-b border-black/10 px-4 py-2.5">
            <div className="flex shrink-0 gap-1.5">
              <span className="size-2.5 rounded-full bg-black/15" />
              <span className="size-2.5 rounded-full bg-black/15" />
              <span className="size-2.5 rounded-full bg-black/15" />
            </div>
            {displayUrl && (
              <div className="ml-1 flex min-w-0 flex-1 items-center gap-2 rounded-md bg-black/4 px-3 py-1 ring-1 ring-inset ring-black/6">
                <LuLock aria-hidden className="size-3 shrink-0 text-black/40" />
                <span className="truncate font-mono text-[11px] tracking-tight text-black/50">
                  {displayUrl}
                </span>
              </div>
            )}
          </div>
          <div className="relative aspect-16/10 w-full bg-black">
            <ImageKit
              src={imageUrl}
              alt={imageAlt}
              fill
              sizes="(min-width: 1024px) 680px, 100vw"
              className="rounded-none object-cover object-top"
            />
          </div>
        </div>
        <figcaption className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-black/40">
          {dLabel}
        </figcaption>
      </figure>

      {/* ───── Tablet ───── */}
      <figure className="w-1/2 min-w-0 sm:w-auto sm:flex-[0.85]">
        <div className="rounded-[1.4rem] bg-background-contrast p-2 ring-1 ring-inset ring-black/10">
          <div className="relative aspect-3/4 w-full overflow-hidden rounded-xl bg-black">
            <ImageKit
              src={tablet}
              alt=""
              fill
              sizes="(min-width: 1024px) 280px, 50vw"
              className="rounded-none object-cover object-top"
            />
          </div>
        </div>
        <figcaption className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-black/40">
          {tLabel}
        </figcaption>
      </figure>

      {/* ───── Phone ───── */}
      <figure className="w-1/3 min-w-0 sm:w-auto sm:flex-[0.5]">
        <div className="rounded-[1.6rem] bg-background-contrast p-1.5 ring-1 ring-inset ring-black/10">
          <div className="relative aspect-9/19 w-full overflow-hidden rounded-[1.2rem] bg-black">
            <span className="absolute left-1/2 top-2 z-10 h-1 w-8 -translate-x-1/2 rounded-full bg-on-media/30" />
            <ImageKit
              src={mobile}
              alt=""
              fill
              sizes="(min-width: 1024px) 160px, 33vw"
              className="rounded-none object-cover object-top"
            />
          </div>
        </div>
        <figcaption className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-black/40">
          {mLabel}
        </figcaption>
      </figure>
    </div>
  );
};

export default ResponsiveShowcase;
