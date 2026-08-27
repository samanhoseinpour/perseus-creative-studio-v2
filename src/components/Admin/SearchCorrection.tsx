import Link from 'next/link';
import { LuSearch } from 'react-icons/lu';

import { cn } from '@/lib/utils';

/**
 * The "showing results for…" line, shared by every /admin search surface.
 *
 * The grammar is Google's, and the order matters: the CORRECTED query is what
 * ran and what the rows below are, stated plainly; the original is offered
 * back as a link, never as the headline. A reader who really did mean the odd
 * spelling is one click from it, and a reader who mistyped never has to notice
 * that they did.
 *
 * A pure server component — it renders only when the caller already decided
 * there is something to say, which is the point of `correctIfEmpty` returning
 * null. There is no "no results, did you mean nothing" state to design.
 *
 * `searchInstead` is optional because the client-side rosters filter in the
 * browser and have no URL to hand back; there, the correction is applied to
 * live state and an href would be a lie.
 */
export default function SearchCorrection({
  corrected,
  original,
  searchInstead,
  onSearchInstead,
  className,
}: {
  corrected: string;
  original: string;
  /** Href that re-runs the ORIGINAL query, for surfaces backed by a URL. */
  searchInstead?: string;
  /** The same escape hatch for surfaces that filter in the browser. */
  onSearchInstead?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-baseline gap-x-2 gap-y-1 px-1 text-sm',
        className,
      )}
    >
      <LuSearch
        aria-hidden="true"
        className="size-3.5 shrink-0 translate-y-0.5 text-muted-foreground"
      />
      <span className="text-muted-foreground">
        Showing results for{' '}
        <span className="font-medium text-foreground">{corrected}</span>
      </span>
      {searchInstead ? (
        <Link
          href={searchInstead}
          className="text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
        >
          Search instead for {original}
        </Link>
      ) : (
        onSearchInstead
      )}
    </div>
  );
}
