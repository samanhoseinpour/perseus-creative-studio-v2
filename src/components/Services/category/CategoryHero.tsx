'use client';

import Link from 'next/link';
import { LuArrowDown as ArrowDown } from 'react-icons/lu';

import { Breadcrumb, Button, ImageKit } from '@/components';
import type { Crumb } from '@/components';
import { useLenis } from '@/utils/lenis';
import { CATEGORIES } from '@/constants/services';
import type { ServiceCategoryContent } from '../types';

interface CategoryHeroProps {
  data: ServiceCategoryContent;
  crumbs: Crumb[];
}

// Order of the category set — drives the editorial index chip (e.g. 03 / 05).
const ORDER = Object.keys(CATEGORIES);

/**
 * Image-led opening band for /services/[category]. Owns the page <h1> (the
 * bento below drops to <h2>) and is the only place the category's cardImageUrl
 * is surfaced. The "wow" is in the media treatment — a rounded cover panel with
 * a scrim and the breadcrumb overlaid on-media — while the type stays on the
 * site's existing scale/tokens.
 */
const CategoryHero = ({ data, crumbs }: CategoryHeroProps) => {
  const lenis = useLenis();

  const position = ORDER.indexOf(data.slug) + 1;
  const count = data.services.length;

  const scrollToServices = () => {
    lenis?.scrollTo('#services', { offset: -96 });
  };

  return (
    <section className="px-6">
      <div className="relative isolate mx-auto max-w-[1240px] overflow-hidden rounded-3xl">
        {/* Cover image + scrim */}
        <div className="absolute inset-0 -z-10">
          <ImageKit
            src={data.cardImageUrl}
            alt={data.title}
            fill
            priority
            sizes="(min-width: 1240px) 1240px, 100vw"
            className="rounded-none object-cover"
          />
          <span
            aria-hidden
            className="absolute inset-0 bg-linear-to-t from-scrim/90 via-scrim/45 to-scrim/30"
          />
          <span
            aria-hidden
            className="absolute inset-0 bg-linear-to-r from-scrim/55 to-transparent"
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
              className="shrink-0 rounded-full bg-on-media/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-on-media/80 ring-1 ring-inset ring-on-media/20 backdrop-blur-sm"
            >
              {String(position).padStart(2, '0')} /{' '}
              {String(ORDER.length).padStart(2, '0')}
            </span>
          </div>

          {/* Bottom: editorial stack */}
          <div className="max-w-3xl">
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-on-media/70">
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
                <Button
                  variant="primary"
                  // background="var(--color-scrim)"
                  // shimmerColor="var(--color-on-media)"
                  // className="text-on-media"
                >
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
