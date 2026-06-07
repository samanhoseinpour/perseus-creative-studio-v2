import Link from 'next/link';
import { LuArrowUpRight, LuCheck } from 'react-icons/lu';

import {
  Breadcrumb,
  Button,
  CategoryCta,
  Container,
  CreatorRoster,
  Faqs,
  Heading,
  ImageKit,
  OtherCategoryServices,
  RelatedServices,
} from '@/components';
import type { Crumb } from '@/components';
import { cn } from '@/lib/utils';
import type { SocialServiceContent } from '../types';

/**
 * Social Media service detail (e.g. /services/social/social-media-management).
 *
 * A feed/calendar-driven silhouette within the studio design language: the hero
 * "wow" is a profile-style content-feed panel (photo + ink "text post" tiles) —
 * not Production's photo, the Websites browser frame, the Branding specimen, or
 * the Marketing analytics panel. The body runs intro → content-cadence week
 * strip → what-we-manage grid → inverted engagement band, then the shared
 * related/cta/faqs. Reuses the studio primitives + tokens throughout.
 */
const SocialServiceDetail = ({ data }: { data: SocialServiceContent }) => {
  const crumbs: Crumb[] = [
    { label: 'Perseus', href: '/' },
    { label: 'Services', href: '/services' },
    { label: data.categoryTitle, href: `/services/${data.categorySlug}` },
    { label: data.title },
  ];

  return (
    <main className="pt-28 sm:pt-32">
      {/* ───── Hero: editorial headline + profile-style content feed ───── */}
      <Container>
        <Breadcrumb crumbs={crumbs} />
      </Container>

      <Container className="mt-6">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_0.82fr] lg:gap-14">
          <div>
            <Heading
              titleTag="h1"
              seperatorTitle={data.eyebrow}
              eyebrowRight={data.categoryTitle}
              title={data.heroHeadline}
              titleAccent={data.heroHeadlineAccent}
              description={data.heroSubtitle}
              containerStyle="px-0 md:px-0 mb-0 w-full max-w-none"
              titleStyle="max-w-xl text-4xl sm:text-5xl lg:text-[3.4rem] lg:leading-[1.02]"
              descStyle="max-w-lg"
            />
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link href={data.cta.primaryHref}>
                <Button variant="primary" icon={LuArrowUpRight}>
                  {data.cta.primaryLabel}
                </Button>
              </Link>
              <Link href={`/services/${data.categorySlug}`}>
                <Button variant="secondary" icon={LuArrowUpRight}>
                  Explore all {data.categoryTitle.toLowerCase()} services
                </Button>
              </Link>
            </div>
          </div>

          {/* Content feed — profile header + a grid of post tiles */}
          {data.feed && (
            <div className="overflow-hidden rounded-3xl bg-background-contrast ring-1 ring-inset ring-black/10">
              <div className="flex items-center gap-3 border-b border-black/10 p-4 sm:gap-4 sm:p-5">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-black text-base font-semibold text-white">
                  {data.feed.name.charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold tracking-tight">
                    {data.feed.name}
                  </p>
                  <p className="font-mono text-[11px] text-black/45">
                    {data.feed.handle}
                  </p>
                </div>
                <div className="flex gap-3 sm:gap-4">
                  {data.feed.stats.map((stat) => (
                    <div key={stat.label} className="text-center">
                      <p className="text-sm font-semibold tabular-nums tracking-tight">
                        {stat.value}
                      </p>
                      <p className="font-mono text-[9px] uppercase tracking-tight text-black/40">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-0.5 bg-black/5 p-0.5">
                {data.feed.tiles.map((tile, i) =>
                  tile.imageUrl ? (
                    <div
                      key={i}
                      className="relative aspect-square overflow-hidden bg-black"
                    >
                      <ImageKit
                        src={tile.imageUrl}
                        alt={tile.caption}
                        fill
                        sizes="(min-width: 1024px) 160px, 33vw"
                        className="rounded-none object-cover"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-scrim/55 to-transparent" />
                      <span className="absolute left-2 top-2 rounded-full bg-scrim/55 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-on-media/90 backdrop-blur-sm">
                        {tile.tag}
                      </span>
                    </div>
                  ) : (
                    <div
                      key={i}
                      className="flex aspect-square flex-col justify-between bg-black p-3 text-white"
                    >
                      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/45">
                        {tile.tag}
                      </span>
                      <p className="text-[13px] font-medium leading-snug tracking-tight text-white/90">
                        {tile.caption}
                      </p>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}
        </div>
      </Container>

      {/* ───── Intro: positioning lead + capability highlights ───── */}
      {data.intro && (
        <section className="py-16 sm:py-24">
          <Container>
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
              <h2 className="max-w-xl text-3xl font-semibold tracking-tighter sm:text-4xl">
                {data.intro.heading}
              </h2>
              <p className="max-w-md text-sm leading-relaxed text-black/65 sm:text-base">
                {data.intro.body}
              </p>
            </div>

            <ul className="mt-12 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
              {data.intro.highlights.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 border-t border-black/10 pt-4 text-sm tracking-tight text-black/80"
                >
                  <LuCheck
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0 text-black"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      {/* ───── Roster: vetted creators + collaboration funnel ───── */}
      {data.roster && (
        <section className="pb-16 sm:pb-24">
          <Heading
            titleTag="h2"
            seperatorTitle="Roster"
            eyebrowRight={data.categoryTitle}
            title={data.roster.heading}
            description={data.roster.description}
            containerStyle="mb-10"
            titleStyle="max-w-3xl"
            descStyle="max-w-3xl"
          />
          <Container>
            <CreatorRoster {...data.roster} />
          </Container>
        </section>
      )}

      {/* ───── Cadence: the posting rhythm as a week strip ───── */}
      {data.cadence && (
        <section className="pb-16 sm:pb-24">
          <Heading
            titleTag="h2"
            seperatorTitle="Cadence"
            eyebrowRight={data.categoryTitle}
            title={data.cadence.heading}
            description={data.cadence.description}
            containerStyle="mb-10"
            titleStyle="max-w-3xl"
            descStyle="max-w-3xl"
          />
          <Container>
            {/* Edge-to-edge horizontal scroll on small screens */}
            <div className="-mx-6 overflow-x-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="grid min-w-[640px] grid-cols-7 gap-2">
                {data.cadence.week.map((day) => (
                  <div
                    key={day.day}
                    className="flex min-h-[7.5rem] flex-col rounded-2xl p-3 ring-1 ring-inset ring-black/10"
                  >
                    <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-black/45">
                      {day.day}
                    </span>
                    <div className="mt-3 flex flex-col gap-1.5">
                      {day.posts.length > 0 ? (
                        day.posts.map((post) => (
                          <span
                            key={post}
                            className="rounded-md bg-black px-2 py-1 text-center text-[11px] font-medium tracking-tight text-white"
                          >
                            {post}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] tracking-tight text-black/25">
                          Rest
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {data.cadence.summary.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full px-3 py-1.5 text-xs font-medium tracking-tight text-black/70 ring-1 ring-inset ring-black/15"
                >
                  {chip}
                </span>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* ───── What we manage: editorial bordered grid ───── */}
      {data.included && (
        <section className="pb-16 sm:pb-24">
          <Heading
            titleTag="h2"
            seperatorTitle="Scope"
            eyebrowRight={data.categoryTitle}
            title={data.included.heading}
            description={data.included.description}
            containerStyle="mb-10"
            titleStyle="max-w-3xl"
            descStyle="max-w-3xl"
          />
          <Container>
            <div className="grid border-t border-black/10 sm:grid-cols-2 lg:grid-cols-3">
              {data.included.items.map((item, i) => (
                <div
                  key={item.title}
                  className={cn(
                    'border-b border-black/10 px-1 py-7 sm:px-6',
                    i % 2 === 0 ? 'sm:border-r sm:border-black/10' : '',
                    'lg:border-r lg:border-black/10',
                  )}
                >
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-[11px] tabular-nums text-black/35">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h3 className="text-base font-semibold tracking-tight">
                      {item.title}
                    </h3>
                  </div>
                  <p className="mt-2 pl-8 text-sm leading-relaxed text-black/60">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* ───── Outcomes: inverted engagement band ───── */}
      {data.outcomes && (
        <section className="pb-16 sm:pb-24">
          <Container>
            <div className="overflow-hidden rounded-3xl bg-black text-white ring-1 ring-inset ring-white/8">
              <div className="p-8 sm:p-12 lg:p-14">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">
                  Impact
                </span>
                <h2 className="mt-6 max-w-2xl text-3xl font-semibold tracking-tighter sm:text-4xl">
                  {data.outcomes.heading}
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/60 sm:text-base">
                  {data.outcomes.description}
                </p>

                <dl className="mt-12 grid gap-px border-t border-white/10 sm:grid-cols-3">
                  {data.outcomes.stats.map((stat) => (
                    <div key={stat.label} className="pt-8">
                      <dt className="text-3xl font-semibold leading-none tracking-tighter tabular-nums sm:text-4xl">
                        {stat.prefix && (
                          <span className="text-white/40">{stat.prefix}</span>
                        )}
                        {stat.value}
                        {stat.suffix && (
                          <span className="text-white/40">{stat.suffix}</span>
                        )}
                      </dt>
                      <dd className="mt-3 max-w-xs pr-6 text-sm leading-relaxed text-white/55">
                        {stat.label}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </Container>
        </section>
      )}

      {/* ───── Related services within the category ───── */}
      <RelatedServices
        services={data.relatedServices}
        categorySlug={data.categorySlug}
        categoryTitle={data.categoryTitle}
        serviceTitle={data.title}
      />

      <OtherCategoryServices currentCategorySlug={data.categorySlug} />

      <CategoryCta cta={data.cta} />

      {data.faqs.length > 0 && (
        <Faqs
          title="Frequently Asked Questions"
          description={`Platforms, content, approvals, and reporting for ${data.title.toLowerCase()} — answered before we start.`}
          faqs={data.faqs}
        />
      )}
    </main>
  );
};

export default SocialServiceDetail;
