'use client';

import { motion } from 'motion/react';

import type { BrandingServiceContent } from '../types';

type Voice = NonNullable<BrandingServiceContent['voice']>;

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = { once: true, margin: '-80px' } as const;

/** Type scale for the message hierarchy (tagline → boilerplate). */
const SIZE = [
  'text-2xl sm:text-3xl font-semibold tracking-tighter',
  'text-lg font-medium tracking-tight',
  'text-sm leading-relaxed text-black/60',
];

/**
 * Brand Messaging signature — tone sliders + a message-hierarchy specimen. The
 * tone markers slide to their position on scroll (a brand "dialed in"); the
 * messaging column steps down from tagline to boilerplate. Studio tokens — track
 * rails, mono pole labels, ink marker.
 */
const VoiceScale = ({ tones, messaging }: Voice) => (
  <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
    {/* Tone sliders */}
    <div className="flex flex-col justify-center gap-7">
      {tones.map((t, i) => (
        <div key={`${t.left}-${t.right}`}>
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">
            <span>{t.left}</span>
            <span>{t.right}</span>
          </div>
          <div className="relative mt-2.5 h-1 rounded-full bg-black/10">
            <motion.span
              className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black ring-4 ring-black/10"
              initial={{ left: '50%' }}
              whileInView={{ left: `${t.position}%` }}
              viewport={VIEWPORT}
              transition={{ duration: 0.8, ease: EASE, delay: 0.1 + i * 0.12 }}
            />
          </div>
        </div>
      ))}
    </div>

    {/* Message hierarchy */}
    <div className="flex flex-col gap-5 border-t border-black/10 pt-8 lg:border-l lg:border-t-0 lg:pl-16 lg:pt-0">
      {messaging.map((m, i) => (
        <div key={m.label}>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/40">
            {m.label}
          </span>
          <p className={`mt-1.5 ${SIZE[i % SIZE.length]}`}>{m.text}</p>
        </div>
      ))}
    </div>
  </div>
);

export default VoiceScale;
