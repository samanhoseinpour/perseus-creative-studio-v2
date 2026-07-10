'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'motion/react';
import { cn } from '@/utils/aceternity';
import { useIdleReady } from '@/hooks/useIdleReady';

const LayoutTextFlip = ({
  text = 'Build Amazing',
  words = ['Landing Pages', 'Component Blocks', 'Page Sections', '3D Shaders'],
  duration = 3000,
}: {
  text: string;
  words: string[];
  duration?: number;
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  // The flip clock only runs in view and after the page has gone idle — each
  // flip is an AnimatePresence popLayout + a layout-projection measure, and the
  // first two used to land inside the load trace. The visible animation is
  // unchanged; it just doesn't tick while nobody can see it.
  const ready = useIdleReady();
  const inView = useInView(rootRef);

  useEffect(() => {
    if (!ready || !inView) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % words.length);
    }, duration);

    return () => clearInterval(interval);
  }, [duration, words.length, ready, inView]);

  return (
    <div ref={rootRef} className="flex justify-start items-start gap-4 mb-2">
      <div className="flex justify-center items-center gap-2">
        {/* Plain span (no layoutId): a persistent single instance gains nothing
            from the shared-layout projection tree but paid a measure per flip. */}
        <span className="text-md leading-md font-semibold md:text-2xl md:leading-2xl text-black">
          {text}
        </span>

        <motion.span
          layout
          className="relative w-fit overflow-hidden rounded-md border border-transparent bg-black px-4 py-2 text-xl leading-xl md:text-3xl md:leading-3xl font-semibold tracking-tight text-white shadow-sm shadow-black/10 drop-shadow-lg"
        >
          <AnimatePresence mode="popLayout">
            <motion.span
              key={currentIndex}
              initial={{ y: -40, filter: 'blur(10px)' }}
              animate={{
                y: 0,
                filter: 'blur(0px)',
              }}
              exit={{ y: 50, filter: 'blur(10px)', opacity: 0 }}
              transition={{
                duration: 0.5,
              }}
              className={cn('inline-block whitespace-nowrap')}
            >
              {words[currentIndex]}
            </motion.span>
          </AnimatePresence>
        </motion.span>
      </div>
    </div>
  );
};

export default LayoutTextFlip;
