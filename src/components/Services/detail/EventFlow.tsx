'use client';

import { motion } from 'motion/react';
import { LuChevronRight } from 'react-icons/lu';

import type { MarketingServiceContent } from '../types';

type EventFlow = NonNullable<MarketingServiceContent['eventFlow']>;

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = { once: true, margin: '-80px' } as const;

/**
 * Tracking & Analytics signature — an event-flow diagram. A dataLayer push (ink
 * code node) feeds a pipeline that fans out to each destination tool, nodes
 * lighting up in sequence on scroll so the data's path is legible. Studio tokens
 * — ink code surface, hairline nodes, mono labels.
 */
const EventFlow = ({ code, pipeline, destinations }: EventFlow) => (
  <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8">
    {/* dataLayer push */}
    <div className="overflow-hidden rounded-2xl bg-black ring-1 ring-inset ring-white/10">
      <div className="border-b border-white/10 px-4 py-3">
        <span className="font-mono text-[11px] tracking-tight text-white/45">
          dataLayer.push()
        </span>
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-[12px] leading-relaxed text-white/80">
        <code>
          {code.map((line, i) => (
            <span key={i} className="block whitespace-pre">
              {line || ' '}
            </span>
          ))}
        </code>
      </pre>
    </div>

    {/* Pipeline → destinations */}
    <div className="flex flex-col justify-center gap-5">
      {/* Pipeline rail */}
      <div className="flex flex-wrap items-center gap-2">
        {pipeline.map((node, i) => (
          <motion.div
            key={node.label}
            className="flex items-center gap-2"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.4, ease: EASE, delay: i * 0.14 }}
          >
            <div className="rounded-xl bg-background-contrast px-3.5 py-2.5 ring-1 ring-inset ring-black/10">
              <p className="text-sm font-semibold tracking-tight text-black/85">
                {node.label}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-black/45">
                {node.detail}
              </p>
            </div>
            {i < pipeline.length - 1 && (
              <LuChevronRight aria-hidden className="size-4 text-black/30" />
            )}
          </motion.div>
        ))}
      </div>

      {/* Fan-out */}
      <div>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/40">
          Lands in
        </span>
        <div className="mt-3 flex flex-wrap gap-2">
          {destinations.map((d, i) => (
            <motion.span
              key={d}
              className="rounded-full bg-black px-3 py-1.5 text-xs font-medium tracking-tight text-white"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={VIEWPORT}
              transition={{
                duration: 0.35,
                ease: EASE,
                delay: pipeline.length * 0.14 + i * 0.08,
              }}
            >
              {d}
            </motion.span>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default EventFlow;
