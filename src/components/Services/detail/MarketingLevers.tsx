'use client';

import { motion, useReducedMotion } from 'motion/react';

import type { ServiceIncludedItem } from '../types';

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = { once: true, margin: '-80px' } as const;

/** Decorative "set" positions (%) — a tuning rhythm, not a metric claim. */
const SET = [78, 90, 66, 84, 72, 88];

/**
 * Marketing Levers signature — an optimization console. Each work-area is a fader
 * on a dark board: a mono channel index, the lever name + what it does, and a
 * track whose handle sweeps to a "set" position on scroll. The positions are a
 * visual tuning rhythm (no numbers), so it reads as "the levers we pull" without
 * implying a fabricated figure. Inverted studio tokens — distinct from the lighter
 * report preview below it.
 */
const MarketingLevers = ({ items }: { items: ServiceIncludedItem[] }) => {
  const reduce = useReducedMotion();

  return (
    <div className="overflow-hidden rounded-3xl bg-black text-white ring-1 ring-inset ring-white/8">
      {/* Console header */}
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 sm:px-9">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">
          Optimization channels
        </span>
        <span className="hidden items-center gap-[34%] font-mono text-[10px] uppercase tracking-[0.18em] text-white/30 sm:flex sm:w-[clamp(120px,18vw,200px)]">
          <span>Lo</span>
          <span>Hi</span>
        </span>
      </div>

      <div className="px-6 sm:px-9">
        {items.map((item, i) => {
          const pos = SET[i % SET.length];
          return (
            <div
              key={item.title}
              className="grid gap-4 border-t border-white/10 py-6 first:border-t-0 sm:grid-cols-[auto_1fr_clamp(120px,18vw,200px)] sm:items-center sm:gap-8"
            >
              <span className="font-mono text-[11px] tabular-nums text-white/35">
                {String(i + 1).padStart(2, '0')}
              </span>

              <div className="min-w-0">
                <h3 className="text-base font-semibold tracking-tight sm:text-lg">
                  {item.title}
                </h3>
                <p className="mt-1.5 max-w-md text-sm leading-relaxed text-white/55">
                  {item.description}
                </p>
              </div>

              {/* Fader */}
              <div className="relative h-4">
                {/* Tick scale */}
                <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between">
                  {Array.from({ length: 9 }).map((_, t) => (
                    <span key={t} className="h-2 w-px bg-white/10" />
                  ))}
                </div>
                {/* Track */}
                <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/15" />
                {/* Filled portion */}
                <motion.span
                  className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-white"
                  initial={reduce ? false : { width: 0 }}
                  whileInView={reduce ? undefined : { width: `${pos}%` }}
                  viewport={VIEWPORT}
                  transition={{ duration: 0.9, ease: EASE, delay: 0.1 + i * 0.08 }}
                  style={reduce ? { width: `${pos}%` } : undefined}
                />
                {/* Handle */}
                <motion.span
                  className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_4px_rgba(255,255,255,0.12)]"
                  initial={reduce ? false : { left: 0 }}
                  whileInView={reduce ? undefined : { left: `${pos}%` }}
                  viewport={VIEWPORT}
                  transition={{ duration: 0.9, ease: EASE, delay: 0.1 + i * 0.08 }}
                  style={reduce ? { left: `${pos}%` } : undefined}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MarketingLevers;
