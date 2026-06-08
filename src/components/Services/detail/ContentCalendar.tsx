'use client';

import { motion, type Variants } from 'motion/react';

import type { SocialCadence } from '../types';

type Props = Pick<SocialCadence, 'week' | 'summary'>;

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = { once: true, margin: '-80px' } as const;

/** Monochrome shades, assigned per post-type so the calendar reads at a glance. */
const SHADE = [
  { bg: 'bg-black', text: 'text-white', dot: 'bg-white/70' },
  { bg: 'bg-black/65', text: 'text-white', dot: 'bg-white/60' },
  { bg: 'bg-black/40', text: 'text-white', dot: 'bg-white/55' },
  { bg: 'bg-black/[0.12]', text: 'text-black/70', dot: 'bg-black/40' },
  { bg: 'bg-black/[0.07]', text: 'text-black/60', dot: 'bg-black/30' },
] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
};
const chip: Variants = {
  hidden: { opacity: 0, scale: 0.85, y: 6 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.32, ease: EASE } },
};

/**
 * Social Cadence signature — a real weekly content calendar, not a flat strip.
 * Post types map to monochrome shades (with a legend); each day column stacks its
 * scheduled posts as shaded chips that drop in on scroll; rest days read as faint
 * dashed cells. Summary chips sit beneath. Reads like a scheduling tool (Later/
 * Buffer) in pure studio tokens — the feed/app silhouette of the Social template.
 */
const ContentCalendar = ({ week, summary }: Props) => {
  const types = Array.from(new Set(week.flatMap((d) => d.posts)));
  const shadeFor = (post: string) =>
    SHADE[Math.max(types.indexOf(post), 0) % SHADE.length];

  return (
    <div className="overflow-hidden rounded-3xl ring-1 ring-inset ring-black/10">
      {/* Header + legend */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-black/10 px-5 py-4 sm:px-7">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-black/45">
          This week
        </span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {types.map((t) => (
            <span
              key={t}
              className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-black/50"
            >
              <span className={`size-2.5 rounded-[3px] ${shadeFor(t).bg}`} />
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Calendar grid (horizontal scroll on small screens) */}
      <div className="overflow-x-auto px-3 py-3 [scrollbar-width:none] sm:px-5 sm:py-5 [&::-webkit-scrollbar]:hidden">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT}
          className="grid min-w-[680px] grid-cols-7 gap-2"
        >
          {week.map((day) => (
            <div
              key={day.day}
              className="flex flex-col rounded-2xl bg-black/[0.02] ring-1 ring-inset ring-black/[0.06]"
            >
              <div className="flex items-center justify-between border-b border-black/[0.07] px-3 py-2.5">
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-black/55">
                  {day.day}
                </span>
                {day.posts.length > 0 && (
                  <span className="font-mono text-[10px] tabular-nums text-black/30">
                    {String(day.posts.length).padStart(2, '0')}
                  </span>
                )}
              </div>

              <div className="flex min-h-[8.5rem] flex-col gap-1.5 p-2.5">
                {day.posts.length > 0 ? (
                  day.posts.map((post, pi) => {
                    const s = shadeFor(post);
                    return (
                      <motion.span
                        key={`${post}-${pi}`}
                        variants={chip}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-medium leading-tight tracking-tight ${s.bg} ${s.text}`}
                      >
                        <span
                          className={`size-1.5 shrink-0 rounded-full ${s.dot}`}
                        />
                        {post}
                      </motion.span>
                    );
                  })
                ) : (
                  <motion.span
                    variants={chip}
                    className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-black/12 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-black/25"
                  >
                    Rest
                  </motion.span>
                )}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Summary chips */}
      {summary.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-black/10 px-5 py-4 sm:px-7">
          {summary.map((s) => (
            <span
              key={s}
              className="rounded-full px-3 py-1.5 text-xs font-medium tracking-tight text-black/70 ring-1 ring-inset ring-black/15"
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContentCalendar;
