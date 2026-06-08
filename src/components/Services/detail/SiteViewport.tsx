'use client';

import { useRef } from 'react';
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react';
import {
  LuArrowLeft,
  LuArrowRight,
  LuLock,
  LuPlus,
  LuRotateCw,
  LuX,
} from 'react-icons/lu';

import ImageKit from '../../ImageKit';

interface Props {
  imageUrl: string;
  imageAlt: string;
  displayUrl: string;
}

/**
 * Websites hero "wow panel" — a live browser, not a flat screenshot. Real tab
 * strip + nav toolbar chrome, and the (tall) screenshot parallax-scrolls inside
 * the viewport as the frame moves through the page, so the site reads as a living
 * page. Restrained — one scroll-linked transform, disabled under reduced motion.
 * Keeps the Websites silhouette (a browser frame). Studio tokens.
 */
const SiteViewport = ({ imageUrl, imageAlt, displayUrl }: Props) => {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '-26%']);

  const title = displayUrl.replace(/^www\./, '').split('/')[0];

  return (
    <div className="overflow-hidden rounded-2xl bg-background-contrast ring-1 ring-inset ring-black/10">
      {/* Tab strip */}
      <div className="flex items-center gap-2 border-b border-black/[0.07] bg-black/[0.02] px-4 pt-2.5 sm:px-5">
        <div className="flex shrink-0 gap-1.5 pb-2.5">
          <span className="size-2.5 rounded-full bg-black/15" />
          <span className="size-2.5 rounded-full bg-black/15" />
          <span className="size-2.5 rounded-full bg-black/15" />
        </div>
        <div className="ml-2 flex min-w-0 max-w-[16rem] flex-1 items-center gap-2 rounded-t-lg bg-background-contrast px-3 py-1.5 ring-1 ring-inset ring-black/[0.07]">
          <span className="size-2.5 shrink-0 rounded-[3px] bg-black" />
          <span className="min-w-0 flex-1 truncate text-[11px] tracking-tight text-black/65">
            {title}
          </span>
          <LuX aria-hidden className="size-3 shrink-0 text-black/30" />
        </div>
        <LuPlus aria-hidden className="size-3.5 shrink-0 text-black/30" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2.5 border-b border-black/10 px-4 py-2.5 sm:px-5">
        <div className="flex shrink-0 items-center gap-1.5 text-black/30">
          <LuArrowLeft aria-hidden className="size-4" />
          <LuArrowRight aria-hidden className="size-4 text-black/15" />
          <LuRotateCw aria-hidden className="size-3.5" />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md bg-black/4 px-3 py-1.5 ring-1 ring-inset ring-black/6">
          <LuLock aria-hidden className="size-3 shrink-0 text-black/40" />
          <span className="truncate font-mono text-[11px] tracking-tight text-black/50">
            {displayUrl}
          </span>
        </div>
      </div>

      {/* Viewport — tall screenshot parallaxes within the frame */}
      <div
        ref={ref}
        className="relative aspect-16/10 w-full overflow-hidden bg-black sm:aspect-2/1"
      >
        <motion.div
          style={{ y: reduce ? 0 : y }}
          className="absolute inset-x-0 top-0 h-[135%]"
        >
          <ImageKit
            src={imageUrl}
            alt={imageAlt}
            fill
            priority
            sizes="(min-width: 1280px) 1240px, 100vw"
            className="rounded-none object-cover object-top"
          />
        </motion.div>
      </div>
    </div>
  );
};

export default SiteViewport;
