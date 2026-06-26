'use client';

import { motion, useReducedMotion } from 'motion/react';

import type { ServiceIncludedItem } from '../types';

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = { once: true, margin: '-80px' } as const;

/** Decorative upward spark — a report carries a chart; no axis, no figures. */
const SPARK = [20, 28, 24, 38, 34, 50, 58, 74];

interface Props {
  cadence?: string;
  items: ServiceIncludedItem[];
}

/**
 * Marketing Reporting signature — a preview of the report a client receives, not
 * a bullet grid. A masthead with the cadence chip + a small draw-on sparkline,
 * then the line items as a document table of contents (index · title · dotted
 * leader · page no.). Light panel in studio tokens — deliberately a document, set
 * apart from the dark Levers console above it.
 */
const ReportingPreview = ({ cadence, items }: Props) => {
  const reduce = useReducedMotion();

  const W = 120;
  const H = 36;
  const max = Math.max(...SPARK);
  const pts = SPARK.map(
    (v, i) =>
      `${i ? 'L' : 'M'}${((i / (SPARK.length - 1)) * W).toFixed(1)},${(
        H -
        (v / max) * (H - 4) -
        2
      ).toFixed(1)}`,
  ).join(' ');

  return (
    <div className="overflow-hidden rounded-3xl bg-background-contrast">
      {/* Masthead */}
      <div className="flex items-end justify-between gap-6 border-b border-black/10 px-6 py-5 sm:px-9 sm:py-6">
        <div>
          {cadence && (
            <span className="inline-flex items-center gap-2 rounded-full bg-black/[0.04] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-black/55">
              <span className="size-1.5 rounded-full bg-black/40" />
              {cadence} report
            </span>
          )}
          <p className="mt-3 text-sm font-medium tracking-tight text-black/55">
            What lands in your inbox
          </p>
        </div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-9 w-28 shrink-0 text-black/70"
          fill="none"
          aria-hidden
        >
          <motion.path
            d={pts}
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduce ? false : { pathLength: 0 }}
            whileInView={reduce ? undefined : { pathLength: 1 }}
            viewport={VIEWPORT}
            transition={{ duration: 1, ease: EASE, delay: 0.2 }}
          />
        </svg>
      </div>

      {/* Contents — a report table of contents */}
      <ol className="px-6 sm:px-9">
        {items.map((item, i) => (
          <motion.li
            key={item.title}
            className="border-t border-black/10 py-5 first:border-t-0"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.4, ease: EASE, delay: i * 0.07 }}
          >
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-[11px] tabular-nums text-black/35">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-base font-semibold tracking-tight">
                {item.title}
              </span>
              <span className="mx-1 -translate-y-1 flex-1 border-b border-dotted border-black/20" />
              <span className="font-mono text-[11px] tabular-nums text-black/40">
                p.{String(i + 1).padStart(2, '0')}
              </span>
            </div>
            <p className="mt-1.5 pl-8 text-sm leading-relaxed text-black/60">
              {item.description}
            </p>
          </motion.li>
        ))}
      </ol>
    </div>
  );
};

export default ReportingPreview;
