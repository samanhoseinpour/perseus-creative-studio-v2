'use client';

import { motion } from 'motion/react';
import { LuTrendingUp } from 'react-icons/lu';

import type { MarketingServiceContent } from '../types';

type Funnel = NonNullable<MarketingServiceContent['funnel']>;

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = { once: true, margin: '-80px' } as const;

/**
 * CRO signature — a centered conversion funnel, before vs. after optimization.
 *
 * Each stage is a centered bar so the decreasing widths read as a funnel. The
 * "before" level is a persistent dashed outline; the ink "after" bar grows
 * outward from it on scroll (slow + staggered) so the lift opens up past the
 * outline instead of covering it. Studio tokens throughout; stays light to vary
 * from the marketing template's inverted snapshot/outcomes bands.
 */
const FunnelChart = ({ stages, uplift }: Funnel) => (
  <div className="rounded-3xl p-6 sm:p-8 lg:p-10">
    {/* Legend + uplift */}
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-[0.14em] text-black/45">
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-[3px] border border-dashed border-black/40" />
          Before
        </span>
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-[3px] bg-black" />
          After optimization
        </span>
      </div>
      {uplift && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white">
          <LuTrendingUp aria-hidden className="size-3" />
          {uplift}
        </span>
      )}
    </div>

    {/* Funnel */}
    <div className="mt-9 flex flex-col gap-3">
      {stages.map((s, i) => {
        const gain = Math.round((s.after - s.before) * 10) / 10;
        return (
          <div key={s.label}>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-sm font-medium tracking-tight text-black/75">
                {s.label}
              </span>
              <span className="flex items-baseline gap-2">
                {gain > 0 && (
                  <motion.span
                    className="font-mono text-[10px] uppercase tracking-[0.12em] text-black/40"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={VIEWPORT}
                    transition={{ duration: 0.4, delay: 0.6 + i * 0.14 }}
                  >
                    +{gain} pts
                  </motion.span>
                )}
                <span className="font-mono text-[13px] tabular-nums text-black/60">
                  {s.value}
                </span>
              </span>
            </div>

            <div className="relative h-12">
              {/* After — ink, grows outward from the before level */}
              <motion.div
                className="absolute left-1/2 top-0 h-full -translate-x-1/2 rounded-lg bg-black"
                initial={{ width: `${s.before}%` }}
                whileInView={{ width: `${s.after}%` }}
                viewport={VIEWPORT}
                transition={{ duration: 1.2, ease: EASE, delay: 0.2 + i * 0.14 }}
              />
              {/* Before — persistent dashed outline marker */}
              <div
                className="pointer-events-none absolute left-1/2 top-0 h-full -translate-x-1/2 rounded-lg border border-dashed border-on-media/45"
                style={{ width: `${s.before}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export default FunnelChart;
