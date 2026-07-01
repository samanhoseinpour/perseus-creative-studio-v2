'use client';

import { useRef } from 'react';
import { cn } from '@/utils/aceternity';
import { motion, MotionStyle, Transition, useInView } from 'motion/react';

interface BorderBeamProps {
  /**
   * The size of the border beam.
   */
  size?: number;
  /**
   * The duration of the border beam.
   */
  duration?: number;
  /**
   * The delay of the border beam.
   */
  delay?: number;
  /**
   * The color of the border beam from.
   */
  colorFrom?: string;
  /**
   * The color of the border beam to.
   */
  colorTo?: string;
  /**
   * The motion transition of the border beam.
   */
  transition?: Transition;
  /**
   * The class name of the border beam.
   */
  className?: string;
  /**
   * The style of the border beam.
   */
  style?: React.CSSProperties;
  /**
   * Whether to reverse the animation direction.
   */
  reverse?: boolean;
  /**
   * The initial offset position (0-100).
   */
  initialOffset?: number;
  /**
   * The border width of the beam.
   */
  borderWidth?: number;
}

const BorderBeam = ({
  className,
  size = 50,
  delay = 0,
  duration = 6,
  colorFrom = 'var(--ink)',
  colorTo = 'var(--surface)',
  transition,
  style,
  reverse = false,
  initialOffset = 0,
  borderWidth = 1,
}: BorderBeamProps) => {
  // The beam is an infinite requestAnimationFrame loop. On a project or blog
  // grid most cards mount off-screen, so without this every one of them would
  // keep animating a beam nobody can see — steady main-thread cost the moment a
  // route commits. Gate it to on/near-screen; the `margin` pre-arms it before
  // the card scrolls into view so there's no visible start-up, and it falls back
  // to running (motion reports out-of-view until the observer's first tick).
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '300px' });

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute inset-0 rounded-[inherit] border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)] border-(length:--border-beam-width)"
      style={
        {
          '--border-beam-width': `${borderWidth}px`,
        } as React.CSSProperties
      }
    >
      <motion.div
        className={cn(
          'absolute aspect-square',
          'bg-linear-to-l from-(--color-from) via-(--color-to) to-transparent',
          className,
        )}
        style={
          {
            width: size,
            offsetPath: `rect(0 auto auto 0 round ${size}px)`,
            '--color-from': colorFrom,
            '--color-to': colorTo,
            ...style,
          } as MotionStyle
        }
        initial={{ offsetDistance: `${initialOffset}%` }}
        animate={
          inView
            ? {
                offsetDistance: reverse
                  ? [`${100 - initialOffset}%`, `${-initialOffset}%`]
                  : [`${initialOffset}%`, `${100 + initialOffset}%`],
              }
            : undefined
        }
        transition={
          inView
            ? {
                repeat: Infinity,
                ease: 'linear',
                duration,
                delay: -delay,
                ...transition,
              }
            : { duration: 0 }
        }
      />
    </div>
  );
};

export default BorderBeam;
