'use client';

import { useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from 'motion/react';
import { LuArrowUp as ArrowUp } from 'react-icons/lu';
import { useLenis } from '@/utils/lenis';
import Button from '@/components/Button';

// Reveal the control once the reader is ~one viewport in. 20% lands just past
// the first screen on a typical page — late enough not to nag, early enough to
// be useful before the user is deep in long blog/service pages.
const VISIBILITY_THRESHOLD = 0.2;

const ScrollToTop = () => {
  const lenis = useLenis();
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const [visible, setVisible] = useState(false);

  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    setVisible(value > VISIBILITY_THRESHOLD);
  });

  const handleClick = () => {
    if (lenis) {
      lenis.scrollTo(0, {
        duration: 1.2,
        easing: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
      });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed bottom-6 right-6 z-90"
          initial={
            prefersReducedMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.6, y: 12 }
          }
          animate={
            prefersReducedMotion
              ? { opacity: 1 }
              : { opacity: 1, scale: 1, y: 0 }
          }
          exit={
            prefersReducedMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.6, y: 12 }
          }
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <Button
            type="button"
            onClick={handleClick}
            shimmer={false}
            showIcon={false}
            aria-label="Scroll to top"
            title="Scroll to top"
            className="p-3.5 shadow-[0_8px_24px_-12px_rgba(20,20,20,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowUp
              className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5"
              aria-hidden="true"
            />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ScrollToTop;
