'use client';

import { motion, type Variants } from 'motion/react';

import type { BrandIdentitySpecimen } from '../types';

const EASE = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

type Props = BrandIdentitySpecimen & { categoryTitle?: string };

/**
 * Branding hero "wow panel" — an identity card, not a spec list. An oversized
 * monogram bleeds off the panel as an architectural ground; the lockup sits sharp
 * on top; the palette renders as a single color-field spectrum (segments wipe in
 * on mount) with name·hex beneath; and the type sample becomes a real display/
 * body pairing. Keeps the Branding silhouette (an inverted specimen panel).
 * Studio tokens; one orchestrated mount reveal.
 */
const BrandSpecimenHero = ({
  monogram,
  wordmark,
  caption,
  palette,
  typeSpecimen,
  categoryTitle = 'Brand system',
}: Props) => {
  const display = typeSpecimen[0];
  const body = typeSpecimen[1] ?? typeSpecimen[0];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="relative overflow-hidden rounded-3xl bg-black p-7 text-white sm:p-9"
    >
      {/* Architectural monogram ground — bleeds off the bottom-right corner */}
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-16 -right-6 select-none text-[13rem] font-semibold leading-none tracking-tighter text-white/[0.05] sm:text-[15rem]"
      >
        {monogram}
      </span>

      <div className="relative">
        {/* Header */}
        <motion.div
          variants={item}
          className="flex items-center justify-between"
        >
          <span className="eyebrow text-[10px] text-white/45">
            Identity / Specimen
          </span>
          <span className="eyebrow text-[10px] text-white/45">
            {categoryTitle}
          </span>
        </motion.div>

        {/* Lockup */}
        <motion.div variants={item} className="mt-9 flex items-end gap-5">
          <span className="text-7xl font-semibold leading-none tracking-tighter sm:text-8xl">
            {monogram}
          </span>
          <div className="pb-1">
            <p className="text-xl font-semibold tracking-tight">{wordmark}</p>
            <p className="mt-1 max-w-[14rem] text-sm leading-snug text-white/55">
              {caption}
            </p>
          </div>
        </motion.div>

        {/* Palette spectrum */}
        <motion.div
          variants={item}
          className="mt-9 border-t border-white/10 pt-6"
        >
          <span className="eyebrow text-[10px] text-white/45">
            Palette
          </span>
          <div className="mt-3 flex h-14 overflow-hidden rounded-xl">
            {palette.map((swatch, i) => (
              <motion.span
                key={swatch.name}
                className="flex-1 origin-left"
                style={{ backgroundColor: swatch.hex }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{
                  duration: 0.6,
                  ease: EASE,
                  delay: 0.45 + i * 0.08,
                }}
              />
            ))}
          </div>
          <div className="mt-2.5 flex gap-2">
            {palette.map((swatch) => (
              <div key={swatch.name} className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-medium tracking-tight text-white/80">
                  {swatch.name}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-tight text-white/40">
                  {swatch.hex}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Type pairing */}
        <motion.div
          variants={item}
          className="mt-7 border-t border-white/10 pt-6"
        >
          <span className="eyebrow text-[10px] text-white/45">
            Type
          </span>
          <div className="mt-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
              {display?.label}
            </span>
            <p className="mt-1 text-2xl font-semibold leading-tight tracking-tighter sm:text-3xl">
              {display?.sample}
            </p>
          </div>
          <div className="mt-4 border-t border-white/10 pt-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
              {body?.label}
            </span>
            <p className="mt-1 text-sm leading-relaxed text-white/65">
              {body?.sample}
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default BrandSpecimenHero;
