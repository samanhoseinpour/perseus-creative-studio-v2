import { cn } from '@/lib/utils';

// Bespoke SVG star row with fractional fill — 4.9 renders four solid stars and
// one 90%-filled star (clipped overlay). Empty track uses the theme `foreground`
// token so it reads in light and dark; the fill defaults to Google gold.
const STAR_PATH =
  'M12 2.6l2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.6l-5.88 3.09 1.12-6.55L2.48 9.52l6.58-.96L12 2.6z';

type StarsProps = {
  value: number;
  max?: number;
  /** star side length in px */
  size?: number;
  className?: string;
  /** filled-star colour class; defaults to Google gold */
  fillClassName?: string;
};

const Stars = ({
  value,
  max = 5,
  size = 16,
  className,
  fillClassName = 'text-[#f5b301]',
}: StarsProps) => (
  <span
    role="img"
    aria-label={`Rated ${value} out of ${max}`}
    className={cn('inline-flex items-center gap-0.5', className)}
  >
    {Array.from({ length: max }).map((_, i) => {
      const fill = Math.max(0, Math.min(1, value - i));
      return (
        <span
          key={i}
          aria-hidden="true"
          className="relative inline-block shrink-0"
          style={{ width: size, height: size }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="absolute inset-0 h-full w-full text-foreground/15"
          >
            <path d={STAR_PATH} />
          </svg>
          {fill > 0 && (
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className={cn('h-full', fillClassName)}
                style={{ width: size, minWidth: size }}
              >
                <path d={STAR_PATH} />
              </svg>
            </span>
          )}
        </span>
      );
    })}
  </span>
);

export default Stars;
