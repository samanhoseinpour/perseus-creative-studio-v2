'use client';

import { motion, useReducedMotion } from 'motion/react';

import type { ServiceIncludedItem } from '../types';

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = { once: true, margin: '-80px' } as const;

/**
 * Branding Deliverables signature — the contents page of a brand book, not a 2-col
 * grid. A "Brand book · Contents" masthead over chaptered rows: an oversized
 * chapter numeral, the deliverable title + note, and a § section marker. Extends
 * the specimen/guidelines language of the Branding template, and reads differently
 * from the Marketing report TOC. Studio tokens; rows rise in on scroll.
 */
const BrandDeliverables = ({ items }: { items: ServiceIncludedItem[] }) => {
  const reduce = useReducedMotion();

  return (
    <div className="overflow-hidden rounded-3xl">
      {/* Masthead */}
      <div className="flex items-center justify-between border-b border-black/10 px-6 py-4 sm:px-8">
        <span className="eyebrow text-[10px] text-black/45">
          Brand book · Contents
        </span>
        <span className="eyebrow text-[10px] text-black/40">
          {String(items.length).padStart(2, '0')} sections
        </span>
      </div>

      {/* Chapters */}
      <ol className="px-6 sm:px-8">
        {items.map((item, i) => (
          <motion.li
            key={item.title}
            className="flex items-baseline gap-5 border-t border-black/10 py-7 first:border-t-0 sm:gap-8"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.45, ease: EASE, delay: i * 0.08 }}
          >
            <span className="font-mono text-3xl font-semibold leading-none tracking-tighter tabular-nums text-black/[0.13] sm:text-4xl">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold tracking-tight">
                {item.title}
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-black/60">
                {item.description}
              </p>
            </div>
            <span className="mt-1 hidden shrink-0 self-start eyebrow text-[10px] text-black/35 sm:block">
              §{String(i + 1).padStart(2, '0')}
            </span>
          </motion.li>
        ))}
      </ol>
    </div>
  );
};

export default BrandDeliverables;
