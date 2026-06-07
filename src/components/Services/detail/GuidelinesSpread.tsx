'use client';

import { motion } from 'motion/react';
import { LuCheck, LuX } from 'react-icons/lu';

import type { BrandingServiceContent } from '../types';

type Guidelines = NonNullable<BrandingServiceContent['guidelines']>;

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = { once: true, margin: '-80px' } as const;

const page = (i: number) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: VIEWPORT,
  transition: { duration: 0.5, ease: EASE, delay: i * 0.1 },
});

const Tab = ({ index, label }: { index: string; label: string }) => (
  <div className="flex items-center justify-between px-4 pt-3.5">
    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-current opacity-50">
      {label}
    </span>
    <span className="font-mono text-[10px] tabular-nums text-current opacity-40">
      {index}
    </span>
  </div>
);

/**
 * Brand Guidelines signature — a four-page document spread (cover → color → type
 * → usage) that shows the guidelines *as pages*, not a bulleted list. The cover
 * is an ink page; the rest are light, each on a 3:4 book proportion with a mono
 * section tab. Pages rise in on scroll. Pure studio tokens, reusing the brand
 * palette/type data so it matches the specimen hero on the same page.
 */
const GuidelinesSpread = ({
  monogram,
  wordmark,
  palette,
  typeSpecimen,
}: Guidelines) => {
  const display = typeSpecimen[0];
  const body = typeSpecimen[1] ?? typeSpecimen[0];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
      {/* 01 — Cover (ink) */}
      <motion.div
        className="flex aspect-3/4 flex-col rounded-2xl bg-black text-white ring-1 ring-inset ring-white/10"
        {...page(0)}
      >
        <Tab index="01" label="Cover" />
        <div className="flex flex-1 flex-col items-center justify-center">
          <span className="text-6xl font-semibold leading-none tracking-tighter">
            {monogram}
          </span>
          <span className="mt-3 text-sm font-semibold tracking-tight">
            {wordmark}
          </span>
          <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.24em] text-white/45">
            Brand guidelines
          </span>
        </div>
      </motion.div>

      {/* 02 — Color */}
      <motion.div
        className="flex aspect-3/4 flex-col rounded-2xl bg-background-contrast text-black ring-1 ring-inset ring-black/10"
        {...page(1)}
      >
        <Tab index="02" label="Color" />
        <div className="grid flex-1 grid-cols-2 gap-2 p-4">
          {palette.slice(0, 4).map((s) => (
            <div key={s.name} className="flex flex-col">
              <div
                className="flex-1 rounded-md ring-1 ring-inset ring-black/10"
                style={{ backgroundColor: s.hex }}
              />
              <span className="mt-1.5 truncate font-mono text-[9px] uppercase tracking-[0.1em] text-black/55">
                {s.name}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* 03 — Type */}
      <motion.div
        className="flex aspect-3/4 flex-col rounded-2xl bg-background-contrast text-black ring-1 ring-inset ring-black/10"
        {...page(2)}
      >
        <Tab index="03" label="Type" />
        <div className="flex flex-1 flex-col justify-center gap-3 p-4">
          <div>
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-black/40">
              {display?.label}
            </span>
            <p className="mt-1 text-xl font-semibold leading-tight tracking-tighter">
              {display?.sample}
            </p>
          </div>
          <div className="border-t border-black/10 pt-3">
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-black/40">
              {body?.label}
            </span>
            <p className="mt-1 text-[11px] leading-snug text-black/60">
              {body?.sample}
            </p>
          </div>
        </div>
      </motion.div>

      {/* 04 — Usage (do / don't) */}
      <motion.div
        className="flex aspect-3/4 flex-col rounded-2xl bg-background-contrast text-black ring-1 ring-inset ring-black/10"
        {...page(3)}
      >
        <Tab index="04" label="Usage" />
        <div className="grid flex-1 grid-rows-2 gap-2 p-4">
          <div className="relative grid place-items-center rounded-md ring-1 ring-inset ring-black/10">
            <span className="text-2xl font-semibold tracking-tighter">
              {monogram}
            </span>
            <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-black text-white">
              <LuCheck aria-hidden className="size-2.5" />
            </span>
          </div>
          <div className="relative grid place-items-center overflow-hidden rounded-md ring-1 ring-inset ring-black/10">
            <span className="text-2xl font-semibold tracking-tighter opacity-40 [transform:skewX(-14deg)_scaleY(1.25)]">
              {monogram}
            </span>
            <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-black/15 text-black/60">
              <LuX aria-hidden className="size-2.5" />
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default GuidelinesSpread;
