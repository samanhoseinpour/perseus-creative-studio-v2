'use client';

import { useEffect, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';

import { useLenis } from '@/utils/lenis';
import { cn } from '@/lib/utils';

// The navbar's canonical easing — the same curve the desktop mega-panels and the
// hamburger animate on, so every surface feels cut from the same cloth.
export const SHEET_EASE = [0.76, 0, 0.24, 1] as const;

/** Matches HamburgerButton's 600ms bar morph, so icon and sheet finish together. */
export const SHEET_DURATION = 0.6;

type MobileSheetProps = {
  /** Target of the opening button's `aria-controls`. */
  id: string;
  /** Announced as the dialog's accessible name. */
  label: string;
  /** Closes the sheet. Fired on Escape. */
  onClose: () => void;
  /**
   * Inset, z-index, background and breakpoint. The sheet only fixes itself to
   * `inset-x-0 bottom-0`; the caller owns where the top edge lands (under its
   * own header) and what the surface looks like.
   */
  className?: string;
  /** Pinned below the scroll stage — always reachable, never scrolled past. */
  footer?: ReactNode;
  /** Fills the `relative` scroll stage; position your panes against it. */
  children: ReactNode;
};

/**
 * The shared full-bleed mobile overlay: a sheet that rolls down from beneath a
 * header, locks the page behind it, and closes on Escape.
 *
 * Mount == open, so the parent owns the `<AnimatePresence>` and this component's
 * mount lifecycle doubles as the scroll-lock lifecycle. Used by the marketing
 * navbar ({@link ../components/MobileMenu}) and the admin sidebar.
 *
 * IMPORTANT: render this as a **sibling of** your header, never a child. A
 * `backdrop-filter` ancestor (every frosted header has one) becomes the
 * containing block for fixed-position descendants and would collapse the sheet
 * to the header's own box.
 */
const MobileSheet = ({
  id,
  label,
  onClose,
  className,
  footer,
  children,
}: MobileSheetProps) => {
  const reduceMotion = useReducedMotion();
  const lenis = useLenis();

  // Own the viewport while open: pause Lenis and lock the body so the page
  // behind the sheet can't scroll (kills iOS scroll-chaining too). `useLenis()`
  // returns undefined where no provider is mounted — which is every mobile
  // viewport, since SmartLenis is desktop-only — so the optional chaining is the
  // whole mobile story.
  useEffect(() => {
    lenis?.stop();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      lenis?.start();
      document.body.style.overflow = prev;
    };
  }, [lenis]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Return focus to whatever opened us (the hamburger) on close. Kept in its own
  // mount-scoped effect — folding it into the keydown effect above would refocus
  // the opener on every re-render, since `onClose` is typically an inline arrow.
  useEffect(() => {
    const opener = document.activeElement;
    return () => {
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);

  return (
    <motion.div
      // Open/close: a smooth top-down roll — the sheet is full-size but revealed
      // by a clip-path inset sweeping down from the header (GPU-composited, so it
      // stays smooth). Reduced motion gets a plain fade.
      initial={reduceMotion ? { opacity: 0 } : { clipPath: 'inset(0 0 100% 0)' }}
      animate={reduceMotion ? { opacity: 1 } : { clipPath: 'inset(0 0 0% 0)' }}
      exit={reduceMotion ? { opacity: 0 } : { clipPath: 'inset(0 0 100% 0)' }}
      transition={{
        duration: reduceMotion ? 0.2 : SHEET_DURATION,
        ease: SHEET_EASE,
      }}
      id={id}
      role="dialog"
      aria-label={label}
      className={cn('fixed inset-x-0 bottom-0 flex flex-col', className)}
    >
      {/* Screen stage — panes position absolutely within this clipped region. */}
      <div className="relative flex-1 overflow-hidden">{children}</div>
      {footer && <div className="shrink-0">{footer}</div>}
    </motion.div>
  );
};

export default MobileSheet;
