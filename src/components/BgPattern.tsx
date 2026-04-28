import { cn } from '@/lib/utils';

interface BgPattern6Props {
  className?: string;
}

const BgPattern = ({ className }: BgPattern6Props) => {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(to_right,var(--muted)_1px,transparent_1px),linear-gradient(to_bottom,var(--muted)_1px,transparent_1px)] bg-size-[32px_32px]',
        className,
      )}
      style={{
        WebkitMaskImage:
          'radial-gradient(ellipse 70% 60% at 50% 0%, #000 60%, transparent 100%)',
        maskImage:
          'radial-gradient(ellipse 70% 60% at 50% 0%, #000 60%, transparent 100%)',
      }}
    />
  );
};

export default BgPattern;
