import React from 'react';
import { cn } from '@/utils/aceternity';

export type TextShimmerProps = {
  children: string;
  as?: React.ElementType;
  className?: string;
  duration?: number;
  spread?: number;
};

/**
 * Decorative text sweep. Pure CSS: the `text-shimmer` keyframes in globals.css
 * animate background-position, so nothing ticks JavaScript per frame — the old
 * Framer Motion version ran a 60fps JS loop forever on every mounted instance
 * (home hero + the footer of every page). No 'use client' either: with motion
 * gone this renders on the server wherever its parent does.
 */
const TextShimmer = ({
  children,
  as: Component = 'h3',
  className,
  duration = 2,
  spread = 2,
}: TextShimmerProps) => {
  const dynamicSpread = children.length * spread;

  // `as` is an intrinsic tag in practice ('span', 'h3', …). Narrow to the
  // three props actually passed — the raw intrinsic-tag union can't type
  // `children` (void elements poison it with `never`).
  const Comp = Component as unknown as React.FC<{
    className?: string;
    style?: React.CSSProperties;
    children?: React.ReactNode;
  }>;

  return (
    <Comp
      className={cn(
        'relative inline-block bg-size-[250%_100%,auto] bg-clip-text',
        // Base = resting ink, sweep = the opposite surface tone. Both are theme
        // tokens, so the shimmer reads correctly in light and dark.
        'text-transparent [--base-color:var(--ink)] [--base-gradient-color:var(--surface)]',
        '[background-repeat:no-repeat,padding-box] [--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--base-gradient-color),#0000_calc(50%+var(--spread)))]',
        'motion-reduce:[animation:none]',
        className,
      )}
      style={
        {
          '--spread': `${dynamicSpread}px`,
          backgroundImage: `var(--bg), linear-gradient(var(--base-color), var(--base-color))`,
          animation: `text-shimmer ${duration}s linear infinite`,
        } as React.CSSProperties
      }
    >
      {children}
    </Comp>
  );
};

export const TextShimmerComponent = React.memo(TextShimmer);
export default TextShimmer;
