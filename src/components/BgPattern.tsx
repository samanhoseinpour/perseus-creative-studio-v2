'use client';

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
        'pointer-events-none fixed inset-0 -z-10 flex h-full w-full items-center justify-between',
        className,
      )}
      style={{
        WebkitMaskImage:
          'radial-gradient(ellipse 70% 80% at 50% 0%, #000 80%, transparent 100%)',
        maskImage:
          'radial-gradient(ellipse 70% 80% at 50% 0%, #000 80%, transparent 100%)',
      }}
    >
      {Array.from({ length: isMobile ? 8 : 18 }).map((_, index) => (
        <div
          key={index}
          className="h-full w-10 bg-linear-to-l from-transparent to-muted/60"
        />
      ))}
    </div>
  );
};

export default BgPattern;
