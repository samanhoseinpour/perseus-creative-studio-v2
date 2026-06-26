import Link from 'next/link';
import { LuX as X } from 'react-icons/lu';
import { cn } from '@/lib/utils';

type ClearFiltersProps = {
  /** Bare list path that drops all filter + page query state (e.g. '/blogs'). */
  href: string;
  /** 'pill' = subtle chip beside the result count; 'solid' = filled CTA for the
   *  empty state. */
  variant?: 'pill' | 'solid';
  label?: string;
  className?: string;
};

/**
 * The reset affordance for a URL-filtered index — a plain link styled to the
 * filter-pill system (not the CTA Button), so it sits naturally among the
 * category/service pills it clears. Shared by the projects category index
 * (CaseFileIndex) and the blog listing (BlogPost). `scroll={false}` keeps the
 * reader in place when the filtered grid swaps back to the full set.
 */
const ClearFilters = ({
  href,
  variant = 'pill',
  label = 'Clear filters',
  className,
}: ClearFiltersProps) => (
  <Link
    href={href}
    scroll={false}
    className={cn(
      'inline-flex shrink-0 items-center gap-1.5 rounded-full text-[10px] outline-none transition-colors',
      variant === 'pill'
        ? 'bg-black/10 px-3 py-1 text-black hover:bg-black/20'
        : 'bg-black px-4 py-2 text-white transition-opacity hover:opacity-85',
      className,
    )}
  >
    <X className="size-3" aria-hidden />
    {label}
  </Link>
);

export default ClearFilters;
