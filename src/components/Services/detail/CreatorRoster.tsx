'use client';

import { motion } from 'motion/react';

import Img from '../../Img';
import type { SocialServiceContent } from '../types';

type Roster = NonNullable<SocialServiceContent['roster']>;

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = { once: true, margin: '-80px' } as const;

/**
 * Influencer signature — a vetted-creator roster beside a collaboration funnel.
 *
 * The roster is an editorial hairline grid (avatars + reach/engagement), not
 * floating cards; cells stagger in on scroll. The funnel sits in a contrast
 * panel, its bars tapering to width on scroll-in so the "many sourced → few
 * shipped" story is shown. All studio tokens — mono captions, hairline seams,
 * ink monograms — so it reads native inside the social template.
 */
const CreatorRoster = ({ creators, funnel }: Roster) => (
  <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:gap-8">
    {/* ───── Roster grid ───── */}
    <div className="grid border-t border-black/10 sm:grid-cols-2">
      {creators.map((c, i) => (
        <motion.div
          key={c.handle}
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT}
          transition={{ duration: 0.45, ease: EASE, delay: i * 0.07 }}
          className={[
            'flex items-center gap-4 border-b border-black/10 py-5 sm:px-5',
            i % 2 === 0 ? 'sm:border-r sm:border-black/10 sm:pl-0' : '',
          ].join(' ')}
        >
          {c.imageUrl ? (
            <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-black">
              <Img
                src={c.imageUrl}
                alt={c.handle}
                fill
                sizes="48px"
                className="rounded-none object-cover"
              />
            </div>
          ) : (
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-black text-base font-semibold text-white">
              {c.handle.replace(/^@/, '').charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold tracking-tight text-black/85">
              {c.handle}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/40">
              {c.niche}
            </p>
            <p className="mt-1.5 text-[13px] tabular-nums tracking-tight text-black/60">
              {c.followers}
              <span className="px-1.5 text-black/25">·</span>
              {c.engagement}
            </p>
          </div>
        </motion.div>
      ))}
    </div>

    {/* ───── Collaboration funnel ───── */}
    {funnel && funnel.length > 0 && (
      <div className="flex flex-col rounded-3xl bg-background-contrast p-6 sm:p-8">
        <span className="eyebrow text-[10px] text-black/45">
          Collaboration pipeline
        </span>
        <div className="mt-7 flex flex-1 flex-col justify-center gap-4">
          {funnel.map((stage, i) => (
            <div key={stage.label}>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium tracking-tight text-black/75">
                  {stage.label}
                </span>
                <span className="font-mono text-[13px] tabular-nums text-black/55">
                  {stage.value}
                </span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-black/5">
                <motion.div
                  className="h-full rounded-full bg-black"
                  initial={{ width: 0 }}
                  whileInView={{ width: `${stage.width}%` }}
                  viewport={VIEWPORT}
                  transition={{
                    duration: 0.9,
                    ease: EASE,
                    delay: 0.15 + i * 0.12,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-7 text-xs leading-relaxed text-black/45">
          We over-source and vet hard, so the creators who actually post are the
          ones who fit — and the content gets reused across paid and organic.
        </p>
      </div>
    )}
  </div>
);

export default CreatorRoster;
