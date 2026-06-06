import Link from 'next/link';
import { LuArrowUpRight, LuCheck, LuTrendingUp } from 'react-icons/lu';

import {
  Breadcrumb,
  Button,
  CategoryCta,
  Container,
  Faqs,
  Heading,
  OtherCategoryServices,
  RelatedServices,
} from '@/components';
import type { Crumb } from '@/components';
import { cn } from '@/lib/utils';
import type { MarketingServiceContent } from '../types';

/**
 * Digital Marketing service detail (e.g. /services/digital-marketing/seo).
 *
 * A metric-forward silhouette within the studio design language: the hero "wow"
 * is an inverted performance-snapshot panel (KPI tiles + a CSS growth chart) —
 * numbers, not Production's photo, the Websites browser frame, or the Branding
 * specimen. The body runs intro → levers grid → inverted KPI band → reporting
 * band, then the shared related/cta/faqs. Reuses the studio primitives + tokens.
 */
const MarketingServiceDetail = ({ data }: { data: MarketingServiceContent }) => {
  const crumbs: Crumb[] = [
    { label: 'Perseus', href: '/' },
    { label: 'Services', href: '/services' },
    { label: data.categoryTitle, href: `/services/${data.categorySlug}` },
    { label: data.title },
  ];

  return (
    <main className="pt-28 sm:pt-32">
      {/* ───── Hero: editorial headline + inverted performance snapshot ───── */}
      <Container>
        <Breadcrumb crumbs={crumbs} />
      </Container>

      <Container className="mt-6">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_0.9fr] lg:gap-14">
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

          {/* Performance snapshot — KPI tiles + a CSS growth chart */}
          {data.snapshot && (
            <div className="relative overflow-hidden rounded-3xl bg-black p-7 text-white ring-1 ring-inset ring-white/10 sm:p-9">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">
                  {data.snapshot.title}
                </span>
                <LuTrendingUp aria-hidden className="size-4 text-white/45" />
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                {data.snapshot.metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-2xl bg-white/5 p-4 ring-1 ring-inset ring-white/10"
                  >
                    <p className="text-3xl font-semibold leading-none tracking-tighter sm:text-4xl">
                      {metric.value}
                    </p>
                    <p className="mt-2.5 text-sm font-medium tracking-tight text-white/85">
                      {metric.label}
                    </p>
                    {metric.caption && (
                      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-tight text-white/40">
                        {metric.caption}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-7 border-t border-white/10 pt-6">
                <div className="flex h-24 items-end gap-1.5 sm:h-28">
                  {data.snapshot.trend.map((height, i) => (
                    <div
                      key={i}
                      style={{ height: `${height}%` }}
                      className={cn(
                        'flex-1 rounded-t-sm',
                        i === data.snapshot!.trend.length - 1
                          ? 'bg-white'
                          : 'bg-white/20',
                      )}
                    />
                  ))}
                </div>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
                  {data.snapshot.trendLabel}
                </p>
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

      {/* ───── Levers: editorial bordered grid of what we optimize ───── */}
      {data.levers && (
        <section className="pb-16 sm:pb-24">
          <Heading
            titleTag="h2"
            seperatorTitle="Levers"
            eyebrowRight={data.categoryTitle}
            title={data.levers.heading}
            description={data.levers.description}
            containerStyle="mb-10"
            titleStyle="max-w-3xl"
            descStyle="max-w-3xl"
          />
          <Container>
            <div className="grid border-t border-black/10 sm:grid-cols-2 lg:grid-cols-3">
              {data.levers.items.map((item, i) => (
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

      {/* ───── Outcomes: inverted KPI band ───── */}
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

      {/* ───── Reporting: transparency band, light, with cadence chip ───── */}
      {data.reporting && (
        <section className="pb-16 sm:pb-24">
          <Heading
            titleTag="h2"
            seperatorTitle="Reporting"
            eyebrowRight={data.categoryTitle}
            title={data.reporting.heading}
            description={data.reporting.description}
            containerStyle="mb-10"
            titleStyle="max-w-3xl"
            descStyle="max-w-3xl"
          />
          <Container>
            <div className="rounded-3xl p-8 ring-1 ring-inset ring-black/10 sm:p-10">
              {data.reporting.cadence && (
                <span className="inline-flex items-center gap-2 rounded-full bg-black/4 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-black/55 ring-1 ring-inset ring-black/10">
                  <span className="size-1.5 rounded-full bg-black/40" />
                  {data.reporting.cadence} reporting
                </span>
              )}
              <div className="mt-8 grid border-t border-black/10 sm:grid-cols-2 lg:grid-cols-4">
                {data.reporting.items.map((item, i) => (
                  <div
                    key={item.title}
                    className={cn(
                      'border-black/10 py-6 lg:border-r lg:px-6 lg:first:pl-0 lg:last:border-r-0',
                      i < data.reporting!.items.length - 1
                        ? 'border-b lg:border-b-0'
                        : '',
                    )}
                  >
                    <span className="font-mono text-[11px] tabular-nums text-black/35">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h3 className="mt-3 text-base font-semibold tracking-tight">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-black/60">
                      {item.description}
                    </p>
                  </div>
                ))}
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
        titleAccent="From the same accountable team."
      />

      <OtherCategoryServices currentCategorySlug={data.categorySlug} />

      <CategoryCta cta={data.cta} />

      {data.faqs.length > 0 && (
        <Faqs
          title="Frequently Asked Questions"
          description={`Timelines, measurement, methods, and ownership for ${data.title.toLowerCase()} — answered before we start.`}
          faqs={data.faqs}
        />
      )}
    </main>
  );
};

export default MarketingServiceDetail;
