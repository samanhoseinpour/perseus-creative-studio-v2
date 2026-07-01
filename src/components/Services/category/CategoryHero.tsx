'use client';

import Link from 'next/link';
import {
  LuArrowDown as ArrowDown,
  LuCalendarCheck as CalendarCheck,
} from 'react-icons/lu';

import { Breadcrumb, Button } from '@/components';
import type { Crumb } from '@/components';
import { useLenis } from '@/utils/lenis';
import { CATEGORIES } from '@/constants/services';
import type { ServiceCategoryContent } from '../types';
import CategoryVisual, { isPhotoCategory } from '../visuals/CategoryVisual';

interface CategoryHeroProps {
  data: ServiceCategoryContent;
  crumbs: Crumb[];
}

// Order of the category set — drives the editorial index chip (e.g. 03 / 05).
const ORDER = Object.keys(CATEGORIES);

/**
 * Opening band for /services/[category]. Owns the page <h1> (the bento below
 * drops to <h2>). The "wow" is in the media treatment — a rounded cover panel
 * with the discipline's bespoke <CategoryVisual> behind a scrim and the
 * breadcrumb overlaid on-media — while the type stays on the site's existing
 * scale/tokens.
 */
const CategoryHero = ({ data, crumbs }: CategoryHeroProps) => {
  const lenis = useLenis();

  const position = ORDER.indexOf(data.slug) + 1;
  const count = data.services.length;

  const scrollToServices = () => {
    // Lenis is disabled on touch/small screens, so fall back to native
    // smooth scroll (keeping the same -96px header offset) when it's absent.
    if (lenis) {
      lenis.scrollTo('#services', { offset: -96 });
      return;
    }
    const target = document.getElementById('services');
    if (target) {
      const top = target.getBoundingClientRect().top + window.scrollY - 96;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <section className="px-6">
      <div
        className={`${
          isPhotoCategory(data.slug) ? 'media-pinned' : 'media-adaptive'
        } relative isolate mx-auto max-w-[1240px] overflow-hidden rounded-3xl`}
      >
        {/* Code-rendered category artwork + scrim */}
        <div className="absolute inset-0 -z-10">
          <CategoryVisual slug={data.slug} variant="hero" />
          <span
            aria-hidden
            className="absolute inset-0 bg-linear-to-t from-scrim/85 via-scrim/35 to-transparent"
          />
          <span
            aria-hidden
            className="absolute inset-0 bg-linear-to-r from-scrim/45 to-transparent"
          />
        </div>

        {/* Content */}
        <div className="flex min-h-[30rem] flex-col justify-between p-6 sm:min-h-[34rem] sm:p-9 lg:min-h-[40rem] lg:p-12">
          {/* Top: breadcrumb + index chip */}
          <div className="flex items-start justify-between gap-4">
            <div className="[&_nav]:mb-0">
              <Breadcrumb crumbs={crumbs} onMedia />
            </div>
            <span
              aria-hidden
              className="shrink-0 rounded-full bg-on-media/10 px-3 py-1.5 eyebrow text-[10px] text-on-media/80 backdrop-blur-sm"
            >
              {String(position).padStart(2, '0')} /{' '}
              {String(ORDER.length).padStart(2, '0')}
            </span>
          </div>

          {/* Bottom: editorial stack */}
          <div className="max-w-3xl">
            <p className="eyebrow text-[11px] text-on-media/70">
              {data.eyebrow}
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tighter text-on-media sm:text-5xl lg:text-6xl">
              {data.heroTitle}{' '}
              <span className="text-on-media/55">{data.heroTitleAccent}</span>
            </h1>
            <p className="mt-5 max-w-xl text-sm text-on-media/75 sm:text-base">
              {data.positioning}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href={data.cta.primaryHref}>
                <Button variant="primary" icon={CalendarCheck} className="w-full">
                  {data.cta.primaryLabel}
                </Button>
              </Link>
              <Button
                variant="secondary"
                icon={ArrowDown}
                onClick={scrollToServices}
                className="bg-white"
              >
                Explore the {count} services
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CategoryHero;
