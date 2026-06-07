'use client';

import { motion } from 'motion/react';

import type { SocialServiceContent } from '../types';

type Pillars = NonNullable<SocialServiceContent['pillars']>;

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = { once: true, margin: '-80px' } as const;

/** Greyscale shades so pillars read apart without leaving the monochrome theme. */
const SHADE = ['bg-black', 'bg-black/65', 'bg-black/40', 'bg-black/20', 'bg-black/10'];

/**
 * Social Strategy signature — a content-pillar map. A single stacked "content
 * mix" bar shows each pillar's share of the calendar (segments grow on scroll),
 * then an editorial grid details each pillar's intent and formats. Pure studio
 * tokens — greyscale segment shades keep it monochrome, mono captions and
 * hairline seams match the rest of the social template.
 */
const PillarMap = ({ items }: Pillars) => (
  <div>
    {/* Content-mix bar */}
    <div className="flex h-12 w-full overflow-hidden rounded-xl ring-1 ring-inset ring-black/10">
      {items.map((p, i) => (
        <motion.div
          key={p.name}
          className={`${SHADE[i % SHADE.length]} grid place-items-center`}
          initial={{ width: 0 }}
          whileInView={{ width: `${p.mix}%` }}
          viewport={VIEWPORT}
          transition={{ duration: 0.8, ease: EASE, delay: 0.1 + i * 0.1 }}
        >
          <span
            className={`font-mono text-[10px] tabular-nums ${
              i < 2 ? 'text-white/90' : 'text-black/55'
            }`}
          >
            {p.mix}%
          </span>
        </motion.div>
      ))}
    </div>

    {/* Pillar detail grid */}
    <div className="mt-8 grid border-t border-black/10 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((p, i) => (
        <div
          key={p.name}
          className={[
            'border-b border-black/10 py-6 sm:px-5',
            i % 2 === 0 ? 'sm:border-r sm:border-black/10 sm:pl-0' : '',
            'lg:border-r lg:border-black/10 lg:last:border-r-0 lg:first:pl-0',
          ].join(' ')}
        >
          <div className="flex items-center gap-2.5">
            <span
              className={`size-2.5 rounded-full ${SHADE[i % SHADE.length]} ring-1 ring-inset ring-black/10`}
            />
            <h3 className="text-base font-semibold tracking-tight">{p.name}</h3>
          </div>
          <p className="mt-2.5 text-sm leading-relaxed text-black/60">
            {p.intent}
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {p.formats.map((f) => (
              <span
                key={f}
                className="rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-black/55 ring-1 ring-inset ring-black/15"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default PillarMap;
