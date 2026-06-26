'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

import type { ServiceStat } from '../types';
import { useCountUp } from './useCountUp';

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = { once: true, margin: '-80px' } as const;

/** Per-cell upward sparkline shapes (decorative growth motif, no axis/figures). */
const SPARKS = [
  [10, 18, 14, 28, 26, 42, 58],
  [12, 14, 24, 20, 36, 32, 54],
  [8, 16, 12, 26, 34, 30, 50],
  [14, 20, 18, 30, 28, 46, 62],
];

interface Props {
  heading: string;
  description: string;
  stats: ServiceStat[];
}

/**
 * Social Outcomes signature — an engagement-style impact panel, not a flat stat
 * row. Big figures count up as the band scrolls into view (real values render
 * server-side; the count-up swaps in on enter so there's no flash), each over a
 * draw-on growth sparkline, on a faint background trend for depth. Inverted band
 * keeps the outcomes silhouette but lifts it well past the shared dl. Studio
 * tokens; reduced-motion shows final state.
 */
const SocialOutcomes = ({ heading, description, stats }: Props) => {
  const reduce = useReducedMotion();
  const [started, setStarted] = useState(false);

  return (
    <motion.div
      onViewportEnter={() => setStarted(true)}
      viewport={VIEWPORT}
      className="relative overflow-hidden rounded-3xl bg-black text-white"
    >
      {/* Faint background trend for atmosphere */}
      <svg
        aria-hidden
        viewBox="0 0 600 200"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 w-full text-white/[0.05]"
      >
        <path
          d="M0,170 C90,150 150,120 220,128 C300,137 340,80 420,70 C500,60 540,30 600,18 L600,200 L0,200 Z"
          fill="currentColor"
        />
      </svg>

      <div className="relative p-8 sm:p-12 lg:p-14">
        <span className="eyebrow text-[10px] text-white/45">
          Impact
        </span>
        <h2 className="mt-6 max-w-2xl text-3xl font-semibold tracking-tighter sm:text-4xl">
          {heading}
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/60 sm:text-base">
          {description}
        </p>

        <dl className="mt-12 grid gap-3 sm:grid-cols-3 sm:gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={VIEWPORT}
              transition={{ duration: 0.5, ease: EASE, delay: i * 0.1 }}
              className="flex flex-col rounded-2xl bg-white/4 p-5 sm:p-6"
            >
              <dt className="text-2xl font-semibold leading-none tracking-tighter tabular-nums sm:text-3xl">
                {stat.prefix && (
                  <span className="text-white/40">{stat.prefix}</span>
                )}
                {started && !reduce ? (
                  <CountValue value={stat.value} />
                ) : (
                  stat.value
                )}
                {stat.suffix && (
                  <span className="text-white/40">{stat.suffix}</span>
                )}
              </dt>

              <Spark index={i} started={started} reduce={!!reduce} />

              <dd className="mt-4 text-sm leading-relaxed text-white/55">
                {stat.label}
              </dd>
            </motion.div>
          ))}
        </dl>
      </div>
    </motion.div>
  );
};

const CountValue = ({ value }: { value: string }) => <>{useCountUp(value)}</>;

const Spark = ({
  index,
  started,
  reduce,
}: {
  index: number;
  started: boolean;
  reduce: boolean;
}) => {
  const data = SPARKS[index % SPARKS.length];
  const W = 100;
  const H = 28;
  const max = Math.max(...data);
  const d = data
    .map(
      (v, i) =>
        `${i ? 'L' : 'M'}${((i / (data.length - 1)) * W).toFixed(1)},${(
          H -
          (v / max) * (H - 4) -
          2
        ).toFixed(1)}`,
    )
    .join(' ');

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="mt-5 h-7 w-full text-white/35"
      fill="none"
    >
      <motion.path
        d={d}
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        initial={reduce ? false : { pathLength: 0 }}
        animate={reduce ? undefined : { pathLength: started ? 1 : 0 }}
        transition={{ duration: 1, ease: EASE, delay: 0.2 + index * 0.1 }}
      />
    </svg>
  );
};

export default SocialOutcomes;
