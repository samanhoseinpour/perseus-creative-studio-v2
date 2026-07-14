import Link from 'next/link';
import { LuArrowUpRight, LuCalendarCheck, LuCheck } from 'react-icons/lu';

import Breadcrumb from '@/components/Breadcrumb';
import Button from '@/components/Button';
import CategoryCta from '@/components/Services/category/CategoryCta';
import Container from '@/components/ui/Container';
import Faqs from '@/components/Faqs';
import Heading from '@/components/Heading';
import OtherCategoryServices from '@/components/Services/shared/OtherCategoryServices';
import ProjectShowcase from '@/components/Projects/showcase/ProjectShowcase';
import RelatedServices from '@/components/Services/shared/RelatedServices';
import type { Crumb } from '@/components/Breadcrumb';
import { getServiceProjects } from '@/constants/projects';
import { blurFor } from '@/lib/imageBlur';
import type { MarketingServiceContent } from '../types';
// Client visual mocks — lazy so they don't land in the app-wide eager
// client chunk that every route loads (see ./lazy.tsx).
import {
  AdPreviewCard,
  EventFlow,
  FunnelChart,
  MarketingLevers,
  MarketingSnapshotHero,
  ReportingPreview,
  SerpRankClimb,
} from '@/components/Services/detail/lazy';

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
                <Button variant="primary" icon={LuCalendarCheck}>
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

          {/* Performance snapshot — live dashboard panel */}
          {data.snapshot && <MarketingSnapshotHero {...data.snapshot} />}
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

      {/* ───── SERP climb: SEO signature, result reorders to #1 ───── */}
      {data.serp && (
        <section className="pb-16 sm:pb-24">
          <Heading
            titleTag="h2"
            seperatorTitle="Search results"
            eyebrowRight={data.categoryTitle}
            title={data.serp.heading}
            description={data.serp.description}
            containerStyle="mb-10"
            titleStyle="max-w-3xl"
            descStyle="max-w-3xl"
          />
          <Container>
            <SerpRankClimb {...data.serp} />
          </Container>
        </section>
      )}

      {/* ───── Ad preview: paid-channel signature, native ad mock ───── */}
      {data.adPreview && (
        <section className="pb-16 sm:pb-24">
          <Heading
            titleTag="h2"
            seperatorTitle="Ad preview"
            eyebrowRight={data.categoryTitle}
            title={data.adPreview.heading}
            description={data.adPreview.description}
            containerStyle="mb-10"
            titleStyle="max-w-3xl"
            descStyle="max-w-3xl"
          />
          <Container>
            <AdPreviewCard
              {...data.adPreview}
              imageBlur={
                data.adPreview.imageUrl
                  ? blurFor(data.adPreview.imageUrl)
                  : undefined
              }
            />
          </Container>
        </section>
      )}

      {/* ───── Event flow: tracking signature ───── */}
      {data.eventFlow && (
        <section className="pb-16 sm:pb-24">
          <Heading
            titleTag="h2"
            seperatorTitle="Event flow"
            eyebrowRight={data.categoryTitle}
            title={data.eventFlow.heading}
            description={data.eventFlow.description}
            containerStyle="mb-10"
            titleStyle="max-w-3xl"
            descStyle="max-w-3xl"
          />
          <Container>
            <EventFlow {...data.eventFlow} />
          </Container>
        </section>
      )}

      {/* ───── Funnel: CRO signature, before vs after optimization ───── */}
      {data.funnel && (
        <section className="pb-16 sm:pb-24">
          <Heading
            titleTag="h2"
            seperatorTitle="Funnel"
            eyebrowRight={data.categoryTitle}
            title={data.funnel.heading}
            description={data.funnel.description}
            containerStyle="mb-10"
            titleStyle="max-w-3xl"
            descStyle="max-w-3xl"
          />
          <Container>
            <FunnelChart {...data.funnel} />
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
            <MarketingLevers items={data.levers.items} />
          </Container>
        </section>
      )}

      {/* ───── Outcomes: inverted KPI band ───── */}
      {data.outcomes && (
        <section className="pb-16 sm:pb-24">
          <Container>
            <div className="overflow-hidden rounded-3xl bg-black text-white">
              <div className="p-8 sm:p-12 lg:p-14">
                <span className="eyebrow text-[10px] text-white/45">
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
            <ReportingPreview
              cadence={data.reporting.cadence}
              items={data.reporting.items}
            />
          </Container>
        </section>
      )}

      {/* Real work that came out of this service — filtered to projects whose
          deliverables match it (videography → videography work, etc.), falling
          back to the discipline when a service has no tagged projects yet. */}
      <ProjectShowcase
        entries={getServiceProjects(data.categorySlug, data.slug, 4)}
        title="Proof, not promises."
        titleAccent={`Recent ${data.categoryTitle} work.`}
        description={`A look at real ${data.categoryTitle.toLowerCase()} engagements from the Perseus archive — the work behind ${data.title}.`}
        viewAllHref={`/projects/${data.categorySlug}`}
        viewAllLabel={`All ${data.categoryTitle} projects`}
      />

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
