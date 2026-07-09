'use client';

import { motion } from 'motion/react';

import { opacity } from '@/utils/animation';
import { cn } from '@/lib/utils';

type HamburgerButtonProps = {
  open: boolean;
  onToggle: () => void;
  /** `id` of the sheet this controls, for `aria-controls`. */
  controls: string;
  className?: string;
};

/**
 * The two-bar hamburger that morphs into an X, with its "Menu"/"Close" label
 * crossfading beneath. Shared by the marketing navbar and the admin sidebar so
 * the two toggles can't drift.
 *
 * The 600ms bar transition must track {@link ../components/MobileSheet SHEET_DURATION}
 * so the icon morph and the sheet finish together; they share the same easing.
 *
 * Deliberately not built on `Button.tsx` — the bar morph is a pseudo-element
 * animation that component can't express. It is still a real `<button>`.
 */
const HamburgerButton = ({
  open,
  onToggle,
  controls,
  className,
}: HamburgerButtonProps) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
      aria-label={open ? 'Close menu' : 'Open menu'}
      className={cn(
        'flex cursor-pointer items-center justify-center gap-2',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={`w-[22.5px] pointer-events-none relative ${
          open
            ? 'after:rotate-45 after:-top-px before:-rotate-45 before:top-px'
            : 'after:-top-1 before:top-1'
        } after:block after:h-0.5 after:w-full after:bg-foreground after:relative after:transition-all after:duration-[600ms] after:ease-[cubic-bezier(0.76,0,0.24,1)]
        before:block before:h-0.5 before:w-full before:bg-foreground before:relative before:transition-all before:duration-[600ms] before:ease-[cubic-bezier(0.76,0,0.24,1)]`}
      />
      <span
        aria-hidden="true"
        className="relative flex h-full items-center text-xs uppercase text-foreground"
      >
        <motion.span variants={opacity} animate={!open ? 'open' : 'closed'}>
          Menu
        </motion.span>
        <motion.span
          variants={opacity}
          animate={open ? 'open' : 'closed'}
          className="absolute opacity-0"
        >
          Close
        </motion.span>
      </span>
    </button>
  );
};

export default HamburgerButton;
