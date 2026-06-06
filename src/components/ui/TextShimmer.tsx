'use client';
import React, { useMemo, type JSX } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/utils/aceternity';

export type TextShimmerProps = {
  children: string;
  as?: React.ElementType;
  className?: string;
  duration?: number;
  spread?: number;
};

const TextShimmer = ({
  children,
  as: Component = 'h3',
  className,
  duration = 2,
  spread = 2,
}: TextShimmerProps) => {
  const MotionComponent = motion.create(
    Component as keyof JSX.IntrinsicElements,
  );

  const dynamicSpread = useMemo(() => {
    return children.length * spread;
  }, [children, spread]);

  return (
    <MotionComponent
      className={cn(
        'relative inline-block bg-size-[250%_100%,auto] bg-clip-text',
        // Base = resting ink, sweep = the opposite surface tone. Both are theme
        // tokens, so the shimmer reads correctly in light and dark.
        'text-transparent [--base-color:var(--ink)] [--base-gradient-color:var(--surface)]',
        '[background-repeat:no-repeat,padding-box] [--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--base-gradient-color),#0000_calc(50%+var(--spread)))]',
        className,
      )}
      initial={{ backgroundPosition: '100% center' }}
      animate={{ backgroundPosition: '0% center' }}
      transition={{
        repeat: Infinity,
        duration,
        ease: 'linear',
      }}
      style={
        {
          '--spread': `${dynamicSpread}px`,
          backgroundImage: `var(--bg), linear-gradient(var(--base-color), var(--base-color))`,
        } as React.CSSProperties
      }
    >
      {children}
    </MotionComponent>
  );
};

export const TextShimmerComponent = React.memo(TextShimmer);
export default TextShimmer;
