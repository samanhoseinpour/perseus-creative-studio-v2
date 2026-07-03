import Link from 'next/link';
import { LuArrowLeft as ArrowLeft, LuArrowRight as ArrowRight } from 'react-icons/lu';
import { twMerge } from 'tailwind-merge';

import Button from '@/components/Button';
import Container from '@/components/ui/Container';

export interface PrevNextItem {
  href: string;
  title: string;
  /** Small uppercase eyebrow, e.g. "Previous in Production". */
  eyebrow: string;
}

interface PrevNextNavProps {
  prev?: PrevNextItem | null;
  next?: PrevNextItem | null;
  ariaLabel?: string;
  /** Applied to the wrapping <nav> (spacing). */
  className?: string;
}

/**
 * Shared prev/next pager. Originally inline on the blog post page; extracted so
 * the blog, service categories, and any future paged route share one component
 * instead of re-implementing the markup.
 */
const PrevNextNav = ({
  prev,
  next,
  ariaLabel = 'Pagination',
  className,
}: PrevNextNavProps) => {
  if (!prev && !next) return null;

  return (
    <nav aria-label={ariaLabel} className={twMerge('', className)}>
      <Container>
        <div className="grid gap-4 sm:grid-cols-2">
          {prev ? (
            <Link
              href={prev.href}
              rel="prev"
              className="group flex items-center gap-3 rounded-2xl bg-background-contrast p-5 transition-colors duration-500 hover:bg-black/10"
            >
              <Button
                type="button"
                variant="secondary"
                size="small"
                showIcon={false}
                className="pointer-events-none aspect-square h-10 w-10 shrink-0 rounded-full p-0 transition-transform duration-500 group-hover:-translate-x-0.5"
                tabIndex={-1}
                aria-hidden="true"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-black/60">
                  {prev.eyebrow}
                </p>
                <h3 className="mt-1 line-clamp-2 text-sm leading-sm font-semibold text-black">
                  {prev.title}
                </h3>
              </div>
            </Link>
          ) : (
            <span className="hidden sm:block" aria-hidden="true" />
          )}

          {next ? (
            <Link
              href={next.href}
              rel="next"
              className="group flex items-center justify-end gap-3 rounded-2xl bg-background-contrast p-5 transition-colors duration-500 hover:bg-black/10 sm:text-right"
            >
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-black/60">
                  {next.eyebrow}
                </p>
                <h3 className="mt-1 line-clamp-2 text-sm leading-sm font-semibold text-black">
                  {next.title}
                </h3>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="small"
                showIcon={false}
                className="pointer-events-none aspect-square h-10 w-10 shrink-0 rounded-full p-0 transition-transform duration-500 group-hover:translate-x-0.5"
                tabIndex={-1}
                aria-hidden="true"
              >
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
          ) : (
            <span className="hidden sm:block" aria-hidden="true" />
          )}
        </div>
      </Container>
    </nav>
  );
};

export default PrevNextNav;
