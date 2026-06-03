import Link from 'next/link';
import { LuChevronRight as ChevronRight, LuHouse as Home } from 'react-icons/lu';

export interface Crumb {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  crumbs: Crumb[];
}

/**
 * Shared breadcrumb trail, reused across the site (blog post, author pages,
 * service categories, …). Render inside a Container. The on-page complement to
 * the BreadcrumbList JSON-LD those routes emit.
 */
export default function Breadcrumb({ crumbs }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5">
      <ol className="flex items-center flex-wrap gap-1 text-xs text-black/50">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li key={i} className="flex items-center gap-1">
              {i === 0 && <Home className="w-3 h-3 shrink-0" />}
              {crumb.href && !isLast ? (
                <Link
                  href={crumb.href}
                  className="hover:text-black transition-colors duration-150 truncate max-w-[120px]"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className={`truncate max-w-[200px] ${isLast ? 'text-black font-medium' : ''}`}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {crumb.label}
                </span>
              )}
              {!isLast && (
                <ChevronRight className="w-3 h-3 shrink-0 text-black/30" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
