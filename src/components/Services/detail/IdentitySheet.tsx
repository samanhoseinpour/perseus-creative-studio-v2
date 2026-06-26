'use client';

import { motion } from 'motion/react';

import type { BrandingServiceContent } from '../types';

type Identity = NonNullable<BrandingServiceContent['identitySheet']>;

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = { once: true, margin: '-80px' } as const;

const tile = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: VIEWPORT,
  transition: { duration: 0.5, ease: EASE, delay: i * 0.1 },
});

const GRID = {
  backgroundImage:
    'linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)',
  backgroundSize: '22px 22px',
};

const TileLabel = ({ children }: { children: string }) => (
  <span className="eyebrow text-[10px] text-black/45">
    {children}
  </span>
);

/**
 * Logo signature — an "identity spec sheet". Four demo tiles (construction grid,
 * lockups, reversibility, scale) prove the mark is a built system, not a drawing,
 * using only the monogram + wordmark. An editorial hairline grid with mono tile
 * labels; tiles rise in on scroll. Pure studio tokens — extends the specimen
 * hero rather than introducing new chrome.
 */
const IdentitySheet = ({
  monogram,
  wordmark,
  inkHex = '#141414',
  boneHex = '#F5F2EC',
  accentHex,
}: Identity) => (
  <div className="grid overflow-hidden rounded-3xl border border-black/10 sm:grid-cols-2">
    {/* ───── Construction grid ───── */}
    <motion.div
      className="border-b border-black/10 p-6 sm:border-r sm:p-8"
      {...tile(0)}
    >
      <TileLabel>Construction</TileLabel>
      <div
        className="relative mt-5 grid aspect-4/3 place-items-center overflow-hidden rounded-xl"
        style={GRID}
      >
        <span className="absolute inset-[18%] rounded-md border border-dashed border-black/25" />
        <span className="font-semibold leading-none tracking-tighter text-black [font-size:clamp(3rem,12vw,6rem)]">
          {monogram}
        </span>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-black/50">
        Drawn on a grid with protected clearspace, so the mark holds its
        proportions everywhere it’s placed.
      </p>
    </motion.div>

    {/* ───── Lockups ───── */}
    <motion.div className="border-b border-black/10 p-6 sm:p-8" {...tile(1)}>
      <TileLabel>Lockups</TileLabel>
      <div className="mt-5 grid aspect-4/3 grid-rows-3 divide-y divide-black/10 overflow-hidden rounded-xl bg-background-contrast">
        {/* Monogram only */}
        <div className="flex items-center justify-center">
          <span className="text-3xl font-semibold tracking-tighter text-black">
            {monogram}
          </span>
        </div>
        {/* Horizontal lockup */}
        <div className="flex items-center justify-center gap-3">
          <span className="text-2xl font-semibold tracking-tighter text-black">
            {monogram}
          </span>
          <span className="h-7 w-px bg-black/15" />
          <span className="text-lg font-semibold tracking-tight text-black">
            {wordmark}
          </span>
        </div>
        {/* Stacked lockup */}
        <div className="flex flex-col items-center justify-center leading-none">
          <span className="text-xl font-semibold tracking-tighter text-black">
            {monogram}
          </span>
          <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.3em] text-black/55">
            {wordmark}
          </span>
        </div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-black/50">
        Primary, horizontal, and stacked — a lockup for every space.
      </p>
    </motion.div>

    {/* ───── Reversibility ───── */}
    <motion.div
      className="border-b border-black/10 p-6 sm:border-b-0 sm:border-r sm:p-8"
      {...tile(2)}
    >
      <TileLabel>One color, any surface</TileLabel>
      <div className="mt-5 grid aspect-[2.4/1] grid-cols-3 gap-3">
        <div
          className="grid place-items-center rounded-xl"
          style={{ backgroundColor: inkHex }}
        >
          <span
            className="text-3xl font-semibold tracking-tighter"
            style={{ color: boneHex }}
          >
            {monogram}
          </span>
        </div>
        <div
          className="grid place-items-center rounded-xl"
          style={{ backgroundColor: boneHex }}
        >
          <span
            className="text-3xl font-semibold tracking-tighter"
            style={{ color: inkHex }}
          >
            {monogram}
          </span>
        </div>
        <div
          className="grid place-items-center rounded-xl"
          style={{ backgroundColor: accentHex ?? inkHex }}
        >
          <span
            className="text-3xl font-semibold tracking-tighter"
            style={{ color: boneHex }}
          >
            {monogram}
          </span>
        </div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-black/50">
        Reversible and single-color safe — it works on ink, on light, and on
        brand color without losing the mark.
      </p>
    </motion.div>

    {/* ───── Scale ───── */}
    <motion.div className="p-6 sm:p-8" {...tile(3)}>
      <TileLabel>Scale</TileLabel>
      <div className="mt-5 grid aspect-[2.4/1] place-items-center rounded-xl bg-background-contrast">
        <div className="flex items-end gap-6 text-black">
          <span className="text-5xl font-semibold leading-none tracking-tighter">
            {monogram}
          </span>
          <span className="text-3xl font-semibold leading-none tracking-tighter">
            {monogram}
          </span>
          <span className="text-xl font-semibold leading-none tracking-tighter">
            {monogram}
          </span>
          <span className="text-sm font-semibold leading-none tracking-tighter">
            {monogram}
          </span>
        </div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-black/50">
        Legible from a billboard down to a 16px favicon — tested at every size
        before handoff.
      </p>
    </motion.div>
  </div>
);

export default IdentitySheet;
