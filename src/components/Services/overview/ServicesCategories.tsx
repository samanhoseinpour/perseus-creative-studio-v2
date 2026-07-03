'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useReducedMotion,
  type MotionStyle,
} from 'motion/react';
import { LuArrowUpRight as ArrowUpRight } from 'react-icons/lu';

import Container from '@/components/ui/Container';
import Heading from '@/components/Heading';
import CategoryVisual from '../visuals/CategoryVisual';

/** One row of the hub index — a slim projection derived server-side by
 *  app/services/page.tsx so this client section never imports the CATEGORIES
 *  registry (which would ship the whole services content DB as JS). */
export interface ServiceCategoryIndexItem {
  slug: string;
  title: string;
  eyebrow: string;
  serviceCount: number;
}

/**
 * Editorial hover-reveal index for the /services hub.
 *
 * The discipline sections further down the page each go deep on one category;
 * this section sits right under the hero and lets a visitor *see and pick* a
 * discipline first, linking into each /services/[category] landing page. Rows
 * arrive as a server-derived prop from CATEGORIES, so the index stays in sync
 * as categories are added or renamed.
 *
 * The "wow" is in the media treatment, not the type: hovering a row floats that
 * category's image near the cursor (spring-tracked) and dims the other rows.
 * On touch / small screens the float is gated off and each row shows an inline
 * thumbnail instead, so the section is fully usable without hover.
 */
const ServicesCategories = ({
  categories,
}: {
  categories: ServiceCategoryIndexItem[];
}) => {
  const prefersReduced = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Raw cursor position (relative to the list container) ...
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  // ... softened into a trailing follow. When reduced motion is requested we
  // make the spring effectively instant so the preview just snaps.
  const springConfig = prefersReduced
    ? { stiffness: 1000, damping: 100, mass: 0.1 }
    : { stiffness: 220, damping: 26, mass: 0.6 };
  const previewX = useSpring(cursorX, springConfig);
  const previewY = useSpring(cursorY, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    cursorX.set(e.clientX - rect.left);
    cursorY.set(e.clientY - rect.top);
  };

  const active = activeIndex !== null ? categories[activeIndex] : null;

  const previewStyle: MotionStyle = {
    x: previewX,
    y: previewY,
    translateX: '-50%',
    translateY: '-115%',
  };

  return (
    <section className="section-padding pt-16 sm:pt-24">
      <Heading
        titleTag="h2"
        seperatorTitle="Explore — Disciplines"
        eyebrowRight={`${categories.length} categories`}
        title="Five disciplines, one studio."
        titleAccent="Pick where you want to go deeper."
        description="Most projects touch more than one of these. Hover a discipline to preview it, then step into the work."
        containerStyle="mb-10 sm:mb-12"
      />

      <Container>
        <div
          className="relative"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setActiveIndex(null)}
        >
          {/* Cursor-tracked preview — desktop only, decorative. */}
          <motion.div
            aria-hidden
            style={previewStyle}
            initial={false}
            animate={{
              opacity: active ? 1 : 0,
              scale: active ? 1 : 0.92,
            }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="pointer-events-none absolute top-0 left-0 z-20 hidden w-72 md:block"
          >
            <div className="overflow-hidden rounded-2xl bg-white shadow-[0_30px_70px_-30px_rgba(20,20,20,0.55)]">
              <div className="media-adaptive relative aspect-4/3 w-full overflow-hidden">
                {active && (
                  <CategoryVisual
                    key={active.slug}
                    slug={active.slug}
                    variant="card"
                  />
                )}
                <span
                  aria-hidden
                  className="absolute inset-0 bg-linear-to-t from-scrim/45 to-transparent"
                />
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="eyebrow text-[10px] text-black/50">
                  {active?.eyebrow}
                </span>
                <span className="eyebrow text-[10px] text-black/40">
                  {active ? `${active.serviceCount} services` : ''}
                </span>
              </div>
            </div>
          </motion.div>

          {/* The index. */}
          <ul className="border-t border-black/10">
            {categories.map((c, i) => {
              const dimmed = activeIndex !== null && activeIndex !== i;
              return (
                <li key={c.slug} className="border-b border-black/10">
                  <Link
                    href={`/services/${c.slug}`}
                    onMouseEnter={() => setActiveIndex(i)}
                    onFocus={() => setActiveIndex(i)}
                    onBlur={() => setActiveIndex(null)}
                    className="group flex items-center gap-4 py-6 sm:gap-8 sm:py-8"
                  >
                    {/* Index number */}
                    <span
                      className={`shrink-0 eyebrow text-[11px] tabular-nums transition-colors duration-300 ${
                        dimmed ? 'text-black/25' : 'text-black/45'
                      }`}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>

                    {/* Title — slides right on hover, dims when another row is active */}
                    <span
                      className={`min-w-0 flex-1 text-2xl font-semibold tracking-tighter transition-all duration-300 ease-out group-hover:translate-x-1.5 sm:text-3xl lg:text-4xl ${
                        dimmed ? 'text-black/30' : 'text-black'
                      }`}
                    >
                      {c.title}
                    </span>

                    {/* Inline thumbnail — touch / small screens only */}
                    <span className="relative size-14 shrink-0 overflow-hidden rounded-xl sm:size-16 md:hidden">
                      <CategoryVisual slug={c.slug} variant="thumb" />
                    </span>

                    {/* Keyword eyebrow — desktop */}
                    <span
                      className={`hidden shrink-0 eyebrow text-[11px] transition-colors duration-300 md:block ${
                        dimmed ? 'text-black/25' : 'text-black/45'
                      }`}
                    >
                      {c.eyebrow}
                    </span>

                    {/* Arrow */}
                    <span
                      aria-hidden
                      className={`grid size-10 shrink-0 place-items-center rounded-full transition-all duration-300 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 ${
                        dimmed
                          ? 'text-black/30'
                          : 'text-black'
                      }`}
                    >
                      <ArrowUpRight className="size-4" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </Container>
    </section>
  );
};

export { ServicesCategories };
