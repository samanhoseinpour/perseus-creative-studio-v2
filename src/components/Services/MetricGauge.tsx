'use client';

import { motion } from 'motion/react';

import type { WebsiteScore } from './types';

interface MetricGaugeProps {
  label: string;
  caption?: string;
  before: WebsiteScore;
  after: WebsiteScore;
}

const R = 52;
const CIRCUMFERENCE = 2 * Math.PI * R;

const offsetFor = (gauge: number) =>
  CIRCUMFERENCE * (1 - Math.min(Math.max(gauge, 0), 100) / 100);

/** Lighthouse colour banding: red < 50, amber 50–89, green 90+. */
const bandFor = (gauge: number) => {
  if (gauge >= 90) return { stroke: '#0cce6b', glow: 'rgba(12,206,107,0.45)' };
  if (gauge >= 50) return { stroke: '#ffa400', glow: 'rgba(255,164,0,0.40)' };
  return { stroke: '#ff4e42', glow: 'rgba(255,78,66,0.40)' };
};

/**
 * Animated radial gauge for the Websites outcomes dashboard. On scroll-in the
 * ring sweeps from the "before" score up to the optimized "after" score, its
 * colour shifting through Lighthouse's red → amber → green bands — a literal
 * before/after of the rebuild. Built for the inverted (ink) band.
 */
const MetricGauge = ({ label, caption, before, after }: MetricGaugeProps) => {
  const beforeBand = bandFor(before.gauge);
  const afterBand = bandFor(after.gauge);

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative size-36 sm:size-40">
        <svg viewBox="0 0 120 120" className="size-full -rotate-90">
          <circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            strokeWidth="6"
            className="stroke-white/10"
          />
          <motion.circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            style={{ filter: `drop-shadow(0 0 6px ${afterBand.glow})` }}
            initial={{
              strokeDashoffset: offsetFor(before.gauge),
              stroke: beforeBand.stroke,
            }}
            whileInView={{
              strokeDashoffset: offsetFor(after.gauge),
              stroke: afterBand.stroke,
            }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <motion.span
            className="text-3xl font-semibold tracking-tighter tabular-nums sm:text-4xl"
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            {after.value}
          </motion.span>
        </div>
      </div>

      <p className="mt-5 text-sm font-medium tracking-tight text-white/85">
        {label}
      </p>
      {caption && (
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">
          {caption}
        </p>
      )}

      {/* before → after readout */}
      <p className="mt-3 flex items-center gap-2 font-mono text-[11px] tabular-nums">
        <span
          className="line-through decoration-from-font opacity-90"
          style={{ color: beforeBand.stroke }}
        >
          {before.value}
        </span>
        <span className="text-white/30">→</span>
        <span style={{ color: afterBand.stroke }}>{after.value}</span>
      </p>
    </div>
  );
};

export default MetricGauge;
