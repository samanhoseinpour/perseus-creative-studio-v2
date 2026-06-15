import { cn } from '@/lib/utils';

type ResultCountProps = {
  /** 1-based active page. */
  page: number;
  /** Items per page. */
  pageSize: number;
  /** Total items across all pages. */
  total: number;
  /** Singular noun, e.g. "post". */
  noun: string;
  /** Plural override; defaults to `${noun}s`. */
  nounPlural?: string;
  /** Wrapper spacing override (e.g. "mb-6"). */
  className?: string;
};

/**
 * "Showing X–Y of Z posts" — the shared paginated tally line used by the blog
 * hub, author archives, and project categories. Computes the visible range
 * from the active page so callers don't repeat the math.
 */
export default function ResultCount({
  page,
  pageSize,
  total,
  noun,
  nounPlural,
  className,
}: ResultCountProps) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <p
      aria-live="polite"
      className={cn(
        'text-xs leading-xs text-black/60 tabular-nums',
        className,
      )}
    >
      Showing{' '}
      <span className="font-medium text-black">
        {start}–{end}
      </span>{' '}
      of <span className="font-medium text-black">{total}</span>{' '}
      {total === 1 ? noun : (nounPlural ?? `${noun}s`)}
    </p>
  );
}
