import { BorderBeam, Img } from '@/components';
import { BLOG_AUTHORS, type BlogPost } from '@/constants/blogs';
import { PERSEUS_LOGO } from '@/constants';
import { getCategoryIcon } from '@/utils/categoryIcon';
import Link from 'next/link';
import {
  LuCalendar as Calendar,
  LuFlame as Flame,
  LuSparkles as Sparkles,
} from 'react-icons/lu';

// Two-tier recency badge thresholds. Mirrors the windows the filter chips use
// in BlogPost — a post reads "Hot" for its first 2 days, "New" through day 7.
const HOT_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;
const FRESH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

type Recency = 'hot' | 'fresh' | null;

function getRecency(datetime: string, now: number): Recency {
  const t = Date.parse(datetime);
  if (!Number.isFinite(t)) return null;
  const age = now - t;
  if (age < HOT_WINDOW_MS) return 'hot';
  if (age < FRESH_WINDOW_MS) return 'fresh';
  return null;
}

const RECENCY_BADGE = {
  hot: { Icon: Flame, label: 'Hot', iconColor: 'text-amber-400' },
  fresh: { Icon: Sparkles, label: 'New', iconColor: 'text-emerald-400' },
} as const;

// `sizes` for the four-up listing grid. The journal shelf passes its own value
// to match its peeking card basis.
const DEFAULT_IMAGE_SIZES =
  '(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw';

type BlogCardProps = {
  post: BlogPost;
  // Render the hero image with `priority` (preload + eager) so it can be the LCP
  // candidate. Used for the very first card on /blogs; leave false elsewhere.
  priority?: boolean;
  // Render the hero image with `loading="eager"` (not lazy) for the rest of the
  // above-the-fold first row on /blogs. Those equal-sized cards can win the LCP
  // race on wide viewports, and a lazy image winning is what trips Next's
  // lazy-LCP dev warning — `loading="eager"` is exactly what that warning tells
  // you to add. `priority` stays reserved for the single first card (the LCP),
  // per Next's guidance. Ignored when `priority` is set (priority implies eager).
  eager?: boolean;
  // Builds the href for the category chip. Defaults to the canonical blog-list
  // filter; BlogPost passes its own filter-aware builder so the chip preserves
  // the active category on /blogs.
  categoryHref?: (slug: string) => string;
  // next/image `sizes`. Defaults to the listing-grid value.
  imageSizes?: string;
};

/**
 * The blog listing card — image + recency badge, meta row, title/excerpt, and
 * author. Presentational and source-of-truth for the card's markup: shared by
 * the `/blogs` grid (`BlogPost`) and the homepage/project "From the Blog" shelf
 * (`JournalShelf`) so the two can never drift apart.
 */
const BlogCard = ({
  post,
  priority = false,
  eager = false,
  categoryHref = (slug) => `/blogs?category=${slug}`,
  imageSizes = DEFAULT_IMAGE_SIZES,
}: BlogCardProps) => {
  const recency = getRecency(post.datetime, Date.now());
  const badge = recency ? RECENCY_BADGE[recency] : null;
  const cardAuthor = BLOG_AUTHORS[post.authorSlug];
  const CategoryIcon = getCategoryIcon(post.category.slug);

  return (
    <article className="flex h-full flex-col items-start justify-start rounded-2xl backdrop-blur-2xl bg-background-contrast">
      <div className="relative w-full aspect-video sm:aspect-2/1 lg:aspect-3/2 rounded-2xl">
        <Link href={post.href} className="relative block h-full w-full">
          <Img
            alt={post.imageAlt}
            src={post.imageUrl}
            fill
            sizes={imageSizes}
            priority={priority}
            loading={eager ? 'eager' : 'lazy'}
            className="rounded-2xl object-cover bg-background-contrast-black"
          />
        </Link>
        {badge && (
          <div
            aria-label={`${badge.label} post`}
            className="pointer-events-none absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-background-contrast-black px-3 py-1 text-[9px] leading-none text-on-media"
          >
            <badge.Icon
              className={`h-3 w-3 ${badge.iconColor}`}
              aria-hidden="true"
            />
            {badge.label}
          </div>
        )}
      </div>

      <div className="max-w-xl flex min-h-0 flex-1 flex-col px-4 py-6">
        <div className="flex items-center gap-x-4 text-[11px] sm:text-[10px]">
          <span className="inline-flex items-center gap-1 text-black">
            <Calendar className="h-3 w-3 opacity-60" aria-hidden="true" />
            <time dateTime={post.datetime} className="text-black">
              {post.date}
            </time>
          </span>

          <Link
            href={categoryHref(post.category.slug)}
            className="relative z-10 inline-flex items-center gap-1.5 rounded-full bg-black/10 px-3 py-1 text-black transition-colors hover:bg-black/20"
          >
            <CategoryIcon className="h-3 w-3 opacity-60" aria-hidden="true" />
            <span className="leading-none">{post.category.title}</span>
          </Link>
        </div>

        <div className="group relative">
          <h2 className="mt-3 line-clamp-2 text-base leading-sm font-semibold text-black sm:text-sm">
            <Link href={post.href}>
              <span className="absolute inset-0" />
              {post.title}
            </Link>
          </h2>
          <p className="mt-5 line-clamp-3 text-sm leading-xs text-black/70 sm:text-xs">
            {post.description}
          </p>
        </div>

        <div className="relative mt-auto pt-6 flex items-center gap-x-3">
          <div className="h-8 w-8 rounded-full overflow-hidden bg-background shrink-0">
            <Img
              alt={`${cardAuthor.name} avatar`}
              src={cardAuthor.imageUrl}
              width={40}
              height={40}
              // The Perseus author avatar is the monochrome black logo; invert
              // it in dark mode so it stays visible.
              className={`h-full w-full p-0.5 ${
                cardAuthor.imageUrl === PERSEUS_LOGO
                  ? 'object-contain dark:invert'
                  : 'object-cover'
              }`}
            />
          </div>

          <div>
            <p className="font-semibold text-black text-xs sm:text-[11px]">
              <Link href={cardAuthor.href}>
                <span className="absolute inset-0" />
                {cardAuthor.name}
              </Link>
            </p>
            <p className="text-black/70 text-[11px] sm:text-[10px]">{cardAuthor.role}</p>
          </div>
        </div>
      </div>

      <BorderBeam duration={12} size={200} />
    </article>
  );
};

export default BlogCard;
