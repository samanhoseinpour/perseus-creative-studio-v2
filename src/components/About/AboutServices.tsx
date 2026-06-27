import Link from 'next/link';
import {
  LuArrowUpRight as ArrowUpRight,
  LuCompass as Compass,
} from 'react-icons/lu';

import { Button, Container, Heading } from '@/components';
import { ABOUT_SERVICES_HEADING } from '@/constants/about';
import { CATEGORIES } from '@/constants/services';
import { cn } from '@/lib/utils';
import CategoryVisual from '../Services/visuals/CategoryVisual';

/**
 * "What we do" for /about — a flat-file drawer of the five disciplines.
 *
 * Desktop: the categories stand side-by-side as closed spines (vertical mono
 * labels over each discipline's drawn <CategoryVisual> artwork). Hovering or
 * focusing a spine pulls it open — a pure-CSS flex-grow transition, no client
 * JS — compressing the others and revealing the positioning line, service
 * count, and link affordance. Mobile gets stacked media strips instead.
 *
 * Reads CATEGORIES directly (same pattern as ServicesCategories /
 * OtherCategories) so the section stays in sync as the registry evolves, and
 * gives /about durable internal links into every /services/[category] page.
 */
const categories = Object.values(CATEGORIES);

const AboutServices = () => {
  return (
    <section className="py-16">
      <Heading
        titleTag="h2"
        {...ABOUT_SERVICES_HEADING}
        containerStyle="mb-10"
      />

      <Container>
        {/* Desktop drawer — fixed-height row of spines; the hovered/focused
            one grows, the rest compress. The first discipline rests open so
            the section never reads as five blank bars: it yields (via the
            named `drawer` group) the moment any spine is hovered/focused,
            and its own hover rules win back with `!` when that spine is the
            first one itself. flex-grow is animatable, so the whole
            interaction stays CSS-only. */}
        <div className="media-adaptive group/drawer hidden h-[32rem] gap-2.5 lg:flex">
          {categories.map((c, i) => {
            const restsOpen = i === 0;
            return (
            <Link
              key={c.slug}
              href={`/services/${c.slug}`}
              className={cn(
                'group relative isolate basis-0 overflow-hidden rounded-3xl transition-[flex-grow] duration-700 ease-[cubic-bezier(0.76,0,0.24,1)] focus-visible:outline-2 focus-visible:outline-offset-2',
                restsOpen
                  ? 'grow-[2.7] group-hover/drawer:grow group-focus-within/drawer:grow hover:grow-[2.7]! focus-visible:grow-[2.7]!'
                  : 'grow hover:grow-[2.7] focus-visible:grow-[2.7]',
              )}
            >
              {/* Code-rendered category artwork + scrim */}
              <div className="absolute inset-0 -z-10">
                <CategoryVisual slug={c.slug} variant="card" />
              </div>
              <span
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-linear-to-t from-scrim/85 via-scrim/25 to-transparent"
              />

              {/* Closed spine — vertical label, fades out as the drawer opens */}
              <span
                aria-hidden="true"
                className={cn(
                  'absolute inset-x-0 top-6 flex justify-center transition-opacity duration-300',
                  restsOpen
                    ? 'opacity-0 group-hover/drawer:opacity-100 group-focus-within/drawer:opacity-100 group-hover:opacity-0! group-focus-visible:opacity-0!'
                    : 'group-hover:opacity-0 group-focus-visible:opacity-0',
                )}
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-on-media/70 [writing-mode:vertical-rl]">
                  {String(i + 1).padStart(2, '0')} — {c.title}
                </span>
              </span>

              {/* Open drawer — fades in after the spine has begun to widen.
                  min-w keeps the type from reflowing mid-transition; the
                  overflow-hidden link clips it while closed. */}
              <span
                className={cn(
                  'absolute inset-0 flex min-w-[19rem] flex-col justify-between p-6 transition-opacity',
                  restsOpen
                    ? 'opacity-100 duration-500 group-hover/drawer:opacity-0 group-hover/drawer:duration-200 group-focus-within/drawer:opacity-0 group-focus-within/drawer:duration-200 group-hover:opacity-100! group-hover:delay-200 group-hover:duration-500! group-focus-visible:opacity-100! group-focus-visible:delay-200'
                    : 'opacity-0 duration-200 group-hover:opacity-100 group-hover:delay-200 group-hover:duration-500 group-focus-visible:opacity-100 group-focus-visible:delay-200 group-focus-visible:duration-500',
                )}
              >
                <span className="flex items-start justify-between gap-4">
                  <span className="eyebrow text-[10px] text-on-media/75">
                    {c.eyebrow}
                  </span>
                  <span
                    aria-hidden="true"
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-on-media/10 text-on-media backdrop-blur-sm"
                  >
                    <ArrowUpRight className="size-4" />
                  </span>
                </span>

                <span>
                  <span className="block text-3xl font-semibold tracking-tight text-on-media">
                    {c.title}
                  </span>
                  <span className="mt-2 line-clamp-3 block max-w-[26rem] text-sm leading-snug text-on-media/70">
                    {c.positioning}
                  </span>
                  <span className="mt-5 block border-t border-on-media/15 pt-4 font-mono text-[10px] uppercase tracking-[0.15em] text-on-media/55">
                    <span className="text-sm tracking-normal text-on-media tabular-nums">
                      {c.services.length}
                    </span>{' '}
                    Services
                  </span>
                </span>
              </span>

              {/* Accessible name while the visual label is decorative */}
              <span className="sr-only">
                {c.title} — explore the service category
              </span>
            </Link>
            );
          })}
        </div>

        {/* Mobile / tablet — stacked media strips, no hover dependency */}
        <ul className="media-adaptive grid gap-2.5 sm:grid-cols-2 lg:hidden">
          {categories.map((c, i) => (
            <li key={c.slug}>
              <Link
                href={`/services/${c.slug}`}
                className="group relative isolate flex min-h-44 flex-col justify-between overflow-hidden rounded-3xl p-5"
              >
                <div className="absolute inset-0 -z-10">
                  <CategoryVisual slug={c.slug} variant="thumb" />
                </div>
                <span
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 bg-linear-to-t from-scrim/85 via-scrim/30 to-transparent"
                />

                <span className="flex items-start justify-between gap-4">
                  <span className="eyebrow text-[10px] text-on-media/70 tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span
                    aria-hidden="true"
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-on-media/10 text-on-media"
                  >
                    <ArrowUpRight className="size-3.5" />
                  </span>
                </span>

                <span>
                  <span className="block text-xl font-semibold tracking-tight text-on-media">
                    {c.title}
                  </span>
                  <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.15em] text-on-media/55">
                    {c.services.length} Services
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex justify-center">
          <Link href="/services">
            <Button variant="secondary" icon={Compass}>
              Explore all services
            </Button>
          </Link>
        </div>
      </Container>
    </section>
  );
};

export default AboutServices;
