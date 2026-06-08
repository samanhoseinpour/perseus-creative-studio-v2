'use client';

import { motion, useReducedMotion, type Variants } from 'motion/react';
import { LuArrowUpRight } from 'react-icons/lu';

import type { MarketingMetric, MarketingSnapshot } from '../types';
import { useCountUp } from './useCountUp';

const EASE = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.12 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

/**
 * Marketing hero "wow panel" — a *live* performance dashboard, not a static
 * snapshot. KPI figures count up on mount (degrading cleanly for non-numeric
 * values like "Top 3"), positive metrics carry an up-trend chip, and the CSS bar
 * chart is replaced by an SVG area/line that draws on with a landing end-dot and
 * faint gridlines. Keeps the Marketing silhouette: an inverted black panel of
 * numbers. Studio tokens; one orchestrated mount reveal.
 */
const MarketingSnapshotHero = ({
  title,
  metrics,
  trend,
  trendLabel,
}: MarketingSnapshot) => (
  <motion.div
    variants={container}
    initial="hidden"
    animate="show"
    className="relative overflow-hidden rounded-3xl bg-black p-7 text-white ring-1 ring-inset ring-white/10 sm:p-9"
  >
    {/* Header — title + a live pulse */}
    <motion.div variants={item} className="flex items-center justify-between">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">
        {title}
      </span>
      <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-white/60" />
          <span className="relative inline-flex size-1.5 rounded-full bg-white" />
        </span>
        Live
      </span>
    </motion.div>

    {/* KPI tiles */}
    <div className="mt-6 grid grid-cols-2 gap-3">
      {metrics.map((m) => (
        <motion.div key={m.label} variants={item}>
          <Metric {...m} />
        </motion.div>
      ))}
    </div>

    {/* Growth chart */}
    <motion.div variants={item} className="mt-7 border-t border-white/10 pt-6">
      <Chart trend={trend} />
      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
        {trendLabel}
      </p>
    </motion.div>
  </motion.div>
);

const Metric = ({ value, label, caption }: MarketingMetric) => {
  const display = useCountUp(value);
  const up = value.trim().startsWith('+');

  return (
    <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-inset ring-white/10">
      <div className="flex items-start justify-between gap-2">
        <p className="text-3xl font-semibold leading-none tracking-tighter tabular-nums sm:text-4xl">
          {display}
        </p>
        {up && (
          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-white/10 text-white/70">
            <LuArrowUpRight aria-hidden className="size-3" />
          </span>
        )}
      </div>
      <p className="mt-2.5 text-sm font-medium tracking-tight text-white/85">
        {label}
      </p>
      {caption && (
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-tight text-white/40">
          {caption}
        </p>
      )}
    </div>
  );
};

const W = 300;
const H = 112;
const PAD = 12;

const Chart = ({ trend }: { trend: number[] }) => {
  const reduce = useReducedMotion();
  const max = Math.max(...trend, 1);
  const denom = Math.max(trend.length - 1, 1);

  const pts = trend.map((v, i) => ({
    x: (i / denom) * W,
    y: PAD + (1 - v / max) * (H - PAD * 2),
  }));
  const line = pts
    .map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;
  const last = pts[pts.length - 1];

  return (
    <div className="relative h-28 w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="size-full"
        aria-hidden
      >
        <defs>
          <linearGradient id="msh-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity={0.18} />
            <stop offset="100%" stopColor="white" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Gridlines */}
        {[0.25, 0.5, 0.75].map((g) => {
          const y = PAD + g * (H - PAD * 2);
          return (
            <line
              key={g}
              x1={0}
              x2={W}
              y1={y}
              y2={y}
              stroke="white"
              strokeOpacity={0.08}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}

        <motion.path
          d={area}
          fill="url(#msh-area)"
          initial={reduce ? false : { opacity: 0 }}
          animate={reduce ? undefined : { opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        />
        <motion.path
          d={line}
          fill="none"
          stroke="white"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={reduce ? false : { pathLength: 0 }}
          animate={reduce ? undefined : { pathLength: 1 }}
          transition={{ duration: 1.1, ease: EASE, delay: 0.25 }}
        />
      </svg>

      {/* Landing end-dot (HTML, so it stays circular under non-uniform scale) */}
      <motion.span
        className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white ring-4 ring-white/15"
        style={{ left: `${(last.x / W) * 100}%`, top: `${(last.y / H) * 100}%` }}
        initial={reduce ? false : { opacity: 0, scale: 0 }}
        animate={reduce ? undefined : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: EASE, delay: 1.25 }}
      />
    </div>
  );
};

export default MarketingSnapshotHero;
