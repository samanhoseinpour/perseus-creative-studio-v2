'use client';

import { motion } from 'framer-motion';

import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface BgPatternProps {
  className?: string;
}

const BgPattern = ({ className }: BgPatternProps) => {
  const isMobile = useIsMobile();

  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none fixed 50 -z-10 flex h-full w-full items-center justify-between',
        className,
      )}
      style={{
        WebkitMaskImage:
          'radial-gradient(ellipse 80% 70% at 50% 50%, #000 40%, transparent 100%)',
        maskImage:
          'radial-gradient(ellipse 80% 70% at 50% 50%, #000 40%, transparent 100%)',
      }}
    >
      {Array.from({ length: isMobile ? 8 : 18 }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: index * 0.05 }}
          className="h-full w-10 bg-linear-to-l from-transparent to-muted/50"
        />
      ))}
    </div>
  );
};

export default BgPattern;
