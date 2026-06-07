'use client';

import { motion } from 'motion/react';
import { LuTrendingUp } from 'react-icons/lu';

import type { SocialServiceContent } from '../types';

type Insights = NonNullable<SocialServiceContent['insights']>;

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = { once: true, margin: '-80px' } as const;

/**
 * Reporting & Insights signature — a reporting board: KPI tiles, a growth chart
 * whose bars grow on scroll, and "what changed" highlights. Inverted (ink) panel
 * so it reads as a dashboard and stays distinct from the social template's light
 * sections. Studio tokens throughout.
 */
const InsightsBoard = ({
  metrics,
  trend,
  trendLabel,
  highlights,
}: Insights) => (
  <div className="overflow-hidden rounded-3xl bg-black p-7 text-white ring-1 ring-inset ring-white/10 sm:p-9 lg:p-10">
    <div className="flex items-center justify-between">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">
        Monthly report
      </span>
      <LuTrendingUp aria-hidden className="size-4 text-white/45" />
    </div>

    <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_1.1fr] lg:gap-10">
      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 self-start">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-2xl bg-white/5 p-4 ring-1 ring-inset ring-white/10"
          >
            <p className="text-2xl font-semibold leading-none tracking-tighter tabular-nums sm:text-3xl">
              {m.value}
            </p>
            <p className="mt-2.5 text-sm font-medium tracking-tight text-white/85">
              {m.label}
            </p>
            {m.caption && (
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-tight text-white/40">
                {m.caption}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Growth chart */}
      <div className="flex flex-col">
        <div className="flex h-40 flex-1 items-end gap-1.5 sm:h-48">
          {trend.map((h, i) => (
            <motion.div
              key={i}
              className={`flex-1 rounded-t-sm ${
                i === trend.length - 1 ? 'bg-white' : 'bg-white/20'
              }`}
              initial={{ height: 0 }}
              whileInView={{ height: `${h}%` }}
              viewport={VIEWPORT}
              transition={{ duration: 0.7, ease: EASE, delay: i * 0.06 }}
            />
          ))}
        </div>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
          {trendLabel}
        </p>
      </div>
    </div>

    {/* Highlights */}
    {highlights && highlights.length > 0 && (
      <dl className="mt-8 grid gap-px border-t border-white/10 pt-8 sm:grid-cols-3">
        {highlights.map((h) => (
          <div key={h.label}>
            <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
              {h.label}
            </dt>
            <dd className="mt-2 text-base font-semibold tracking-tight text-white/90">
              {h.value}
            </dd>
          </div>
        ))}
      </dl>
    )}
  </div>
);

export default InsightsBoard;
