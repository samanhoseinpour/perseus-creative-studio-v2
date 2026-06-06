import Link from 'next/link';
import { LuChevronRight as ChevronRight, LuHouse as Home } from 'react-icons/lu';

export interface Crumb {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  crumbs: Crumb[];
  /**
   * Render light, for placing the trail over imagery/video (uses the fixed
   * on-media tokens instead of the flipping black ink). Defaults to false.
   */
  onMedia?: boolean;
}

/**
 * Shared breadcrumb trail, reused across the site (blog post, author pages,
 * service categories, …). Render inside a Container, or over a hero with
 * `onMedia`. The on-page complement to the BreadcrumbList JSON-LD those routes
 * emit.
 */
export default function Breadcrumb({
  crumbs,
  onMedia = false,
}: BreadcrumbProps) {
  const tone = onMedia
    ? {
        base: 'text-on-media/60',
        link: 'hover:text-on-media',
        current: 'text-on-media font-medium',
        chevron: 'text-on-media/40',
      }
    : {
        base: 'text-black/50',
        link: 'hover:text-black',
        current: 'text-black font-medium',
        chevron: 'text-black/30',
      };

  return (
    <nav aria-label="Breadcrumb" className="mb-5">
      <ol className={`flex items-center flex-wrap gap-1 text-xs ${tone.base}`}>
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li key={i} className="flex items-center gap-1">
              {i === 0 && <Home className="w-3 h-3 shrink-0" />}
              {crumb.href && !isLast ? (
                <Link
                  href={crumb.href}
                  className={`${tone.link} transition-colors duration-150 truncate max-w-[120px]`}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className={`truncate max-w-[200px] ${isLast ? tone.current : ''}`}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {crumb.label}
                </span>
              )}
              {!isLast && (
                <ChevronRight className={`w-3 h-3 shrink-0 ${tone.chevron}`} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
