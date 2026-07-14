'use client';
import { cn } from '@/utils/aceternity';
import {
  useMotionValue,
  animate,
  motion,
  useReducedMotion,
  type AnimationPlaybackControls,
} from 'motion/react';
import { useState, useEffect, useRef } from 'react';
import useMeasure from 'react-use-measure';

import { useActiveInView } from '@/hooks/useActiveInView';

export type InfiniteSliderProps = {
  children: React.ReactNode;
  gap?: number;
  speed?: number;
  speedOnHover?: number;
  direction?: 'horizontal' | 'vertical';
  reverse?: boolean;
  className?: string;
};

const InfiniteSlider = ({
  children,
  gap = 16,
  speed = 100,
  speedOnHover,
  direction = 'horizontal',
  reverse = false,
  className,
}: InfiniteSliderProps) => {
  const [currentSpeed, setCurrentSpeed] = useState(speed);
  const [ref, { width, height }] = useMeasure();
  const translation = useMotionValue(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [key, setKey] = useState(0);

  // `repeat: Infinity` with nothing gating it means this marquee keeps ticking
  // forever — scrolled out of view and in a background tab — and it ignored
  // prefers-reduced-motion entirely. Hold it against the same in-view + visible
  // pair the rest of the app's loops use.
  //
  // The gate pauses the LIVE animation rather than being a dependency of the
  // setup effect: re-running setup would rebuild the keyframes from `from`, so
  // the strip would visibly snap back to the start every time it re-entered the
  // viewport. Pausing keeps its position.
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useActiveInView(rootRef);
  const reduceMotion = useReducedMotion() ?? false;
  const paused = reduceMotion || !inView;

  const controlsRef = useRef<AnimationPlaybackControls | null>(null);
  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    let controls;
    const size = direction === 'horizontal' ? width : height;
    const contentSize = size + gap;
    const from = reverse ? -contentSize / 2 : 0;
    const to = reverse ? 0 : -contentSize / 2;

    const distanceToTravel = Math.abs(to - from);
    const duration = distanceToTravel / currentSpeed;

    if (isTransitioning) {
      const remainingDistance = Math.abs(translation.get() - to);
      const transitionDuration = remainingDistance / currentSpeed;

      controls = animate(translation, [translation.get(), to], {
        ease: 'linear',
        duration: transitionDuration,
        onComplete: () => {
          setIsTransitioning(false);
          setKey((prevKey) => prevKey + 1);
        },
      });
    } else {
      controls = animate(translation, [from, to], {
        ease: 'linear',
        duration: duration,
        repeat: Infinity,
        repeatType: 'loop',
        repeatDelay: 0,
        onRepeat: () => {
          translation.set(from);
        },
      });
    }

    // A fresh instance starts playing; honour the current gate immediately so a
    // re-measure while off-screen doesn't quietly restart the loop.
    controlsRef.current = controls ?? null;
    if (controls && pausedRef.current) controls.pause();

    return () => {
      controls?.stop();
      controlsRef.current = null;
    };
  }, [
    key,
    translation,
    currentSpeed,
    width,
    height,
    gap,
    isTransitioning,
    direction,
    reverse,
  ]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    if (paused) controls.pause();
    else controls.play();
  }, [paused]);

  const hoverProps = speedOnHover
    ? {
        onHoverStart: () => {
          setIsTransitioning(true);
          setCurrentSpeed(speedOnHover);
        },
        onHoverEnd: () => {
          setIsTransitioning(true);
          setCurrentSpeed(speed);
        },
      }
    : {};

  return (
    <div ref={rootRef} className={cn('overflow-hidden', className)}>
      <motion.div
        className="flex w-max"
        style={{
          ...(direction === 'horizontal'
            ? { x: translation }
            : { y: translation }),
          gap: `${gap}px`,
          flexDirection: direction === 'horizontal' ? 'row' : 'column',
        }}
        ref={ref}
        {...hoverProps}
      >
        {children}
        {children}
      </motion.div>
    </div>
  );
};
export default InfiniteSlider;
