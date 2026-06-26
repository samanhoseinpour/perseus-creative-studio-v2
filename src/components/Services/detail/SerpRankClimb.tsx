'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'motion/react';
import { LuArrowUp, LuSearch } from 'react-icons/lu';

import type { MarketingServiceContent } from '../types';

type Serp = NonNullable<MarketingServiceContent['serp']>;

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * SEO signature — a faux Google SERP where the client's result climbs to #1.
 *
 * Results are authored in their *starting* order; on scroll-in the marked (`you`)
 * row reorders to the top and every row reflows via Framer Motion's `layout`
 * animation, so the climb is shown, not described. The client row carries a live
 * "from #N → #1" delta. Snippet copy is intentionally rendered as skeleton bars
 * (no fake competitor text). Built from the studio tokens — hairline rows, mono
 * captions, ink highlight — so it sits inside the marketing template natively.
 */
const SerpRankClimb = ({ query, results }: Serp) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-90px' });

  const startOrder = results;
  const youStartRank =
    startOrder.findIndex((r) => r.you) + 1 || startOrder.length;

  const [order, setOrder] = useState(startOrder);

  useEffect(() => {
    if (!inView) return;
    const t = setTimeout(() => {
      setOrder((prev) => {
        const you = prev.find((r) => r.you);
        if (!you) return prev;
        return [you, ...prev.filter((r) => !r.you)];
      });
    }, 700);
    return () => clearTimeout(t);
  }, [inView]);

  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-3xl bg-background-contrast"
    >
      {/* Search bar */}
      <div className="flex items-center gap-3 border-b border-black/10 px-5 py-4 sm:px-7">
        <LuSearch aria-hidden className="size-4 shrink-0 text-black/40" />
        <span className="flex-1 text-sm tracking-tight text-black/70">
          {query}
        </span>
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-black/35 sm:inline">
          Organic results
        </span>
      </div>

      {/* Results */}
      <ol className="flex flex-col px-3 py-2 sm:px-5">
        {order.map((r, i) => (
          <motion.li
            key={r.title}
            layout
            transition={{ duration: 0.7, ease: EASE }}
            className={
              r.you
                ? 'relative my-1 rounded-2xl bg-black px-4 py-4 text-white sm:px-5'
                : 'flex items-start gap-4 border-b border-black/8 px-1 py-4 last:border-b-0 sm:px-2'
            }
          >
            {r.you ? (
              <div className="flex items-start gap-4">
                <motion.span
                  layout="position"
                  className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-white font-mono text-sm font-semibold tabular-nums text-black"
                >
                  {i + 1}
                </motion.span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] tracking-tight text-white/55">
                      {r.url}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white/90">
                      <LuArrowUp aria-hidden className="size-3" />
                      {`#${youStartRank} → #${i + 1}`}
                    </span>
                  </div>
                  <p className="mt-1.5 text-base font-semibold tracking-tight">
                    {r.title}
                  </p>
                  <div className="mt-3 space-y-1.5">
                    <span className="block h-1.5 w-full rounded-full bg-white/15" />
                    <span className="block h-1.5 w-3/4 rounded-full bg-white/15" />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <span className="mt-0.5 w-5 shrink-0 font-mono text-sm tabular-nums text-black/30">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-[11px] tracking-tight text-black/40">
                    {r.url}
                  </span>
                  <p className="mt-1 text-sm font-medium tracking-tight text-black/70">
                    {r.title}
                  </p>
                  <div className="mt-2.5 space-y-1.5">
                    <span className="block h-1.5 w-full rounded-full bg-black/8" />
                    <span className="block h-1.5 w-2/3 rounded-full bg-black/8" />
                  </div>
                </div>
              </>
            )}
          </motion.li>
        ))}
      </ol>
    </div>
  );
};

export default SerpRankClimb;
