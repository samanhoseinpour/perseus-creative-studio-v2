'use client';

import { useRef } from 'react';
import { motion, useScroll, useSpring } from 'motion/react';

import type { ServiceProcessStep } from '../types';

/**
 * Vertical build timeline whose connector line fills with scroll progress. A
 * faint full-height track sits behind ink-on-background nodes; an overlaid line
 * scales from the top as the section moves through the viewport.
 */
const BuildTimeline = ({ steps }: { steps: ServiceProcessStep[] }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 70%', 'end 55%'],
  });
  const scaleY = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.5,
  });

  return (
    <div ref={ref} className="relative">
      {/* Faint track + scroll-driven fill, centered on the node column */}
      <div
        aria-hidden
        className="absolute left-6 top-6 bottom-6 w-px -translate-x-1/2 bg-black/10"
      />
      <motion.div
        aria-hidden
        style={{ scaleY, x: '-50%' }}
        className="absolute left-6 top-6 bottom-6 w-px origin-top bg-black"
      />

      <ol className="relative">
        {steps.map((s, i) => {
          const isLast = i === steps.length - 1;
          return (
            <li
              key={s.step}
              className="grid grid-cols-[auto_1fr] gap-6 sm:gap-10"
            >
              <div className="flex justify-center">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-background font-mono text-sm tabular-nums text-black ring-1 ring-inset ring-black/15">
                  {s.step}
                </span>
              </div>

              <div className={isLast ? 'pt-2.5 pb-0' : 'pt-2.5 pb-10'}>
                <h3 className="text-lg font-semibold tracking-tight sm:text-xl">
                  {s.title}
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-black/60">
                  {s.description}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default BuildTimeline;
