'use client';

import { motion } from 'motion/react';

import type { BrandingServiceContent } from '../types';

type Positioning = NonNullable<BrandingServiceContent['positioningMap']>;

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = { once: true, margin: '-80px' } as const;

/**
 * Brand Strategy signature — a 2×2 perceptual map. Competitors plot as faint
 * dots; the brand plots as an ink dot that pops in last with its label, so the
 * white space you own is obvious. Axis labels sit on all four sides. Studio
 * tokens — hairline quadrant, mono axis captions, ink accent.
 */
const PositioningMap = ({ xAxis, yAxis, points }: Positioning) => (
  <div className="mx-auto max-w-2xl">
    {/* Top axis label */}
    <p className="mb-3 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-black/45">
      {yAxis[1]}
    </p>

    <div className="flex items-center gap-3">
      {/* Left axis label */}
      <span className="[writing-mode:vertical-rl] rotate-180 font-mono text-[10px] uppercase tracking-[0.2em] text-black/45">
        {xAxis[0]}
      </span>

      {/* Plot */}
      <div className="relative aspect-square flex-1 rounded-2xl bg-background-contrast ring-1 ring-inset ring-black/10">
        {/* Quadrant axes */}
        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-black/10" />
        <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-black/10" />

        {points.map((p, i) => (
          <motion.div
            key={p.label}
            className="absolute -translate-x-1/2 translate-y-1/2"
            style={{ left: `${p.x}%`, bottom: `${p.y}%` }}
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={VIEWPORT}
            transition={{
              duration: 0.4,
              ease: EASE,
              delay: p.you ? 0.3 + points.length * 0.1 : 0.2 + i * 0.1,
            }}
          >
            {p.you ? (
              <div className="flex flex-col items-center">
                <span className="size-4 rounded-full bg-black ring-4 ring-black/10" />
                <span className="mt-1.5 whitespace-nowrap rounded-full bg-black px-2 py-0.5 text-[11px] font-semibold tracking-tight text-white">
                  {p.label}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <span className="size-2.5 rounded-full bg-black/25" />
                <span className="mt-1 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.1em] text-black/40">
                  {p.label}
                </span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Right axis label */}
      <span className="[writing-mode:vertical-rl] font-mono text-[10px] uppercase tracking-[0.2em] text-black/45">
        {xAxis[1]}
      </span>
    </div>

    {/* Bottom axis label */}
    <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-black/45">
      {yAxis[0]}
    </p>
  </div>
);

export default PositioningMap;
