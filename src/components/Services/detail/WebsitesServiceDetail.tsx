import Link from 'next/link';
import { LuArrowUpRight, LuSend, LuCheck } from 'react-icons/lu';

import {
  BeforeAfterSlider,
  Breadcrumb,
  BuildTimeline,
  Button,
  CategoryCta,
  CodeToUI,
  Container,
  ConversionAnatomy,
  CoreWebVitals,
  DashboardMock,
  Faqs,
  FeaturedCaseHero,
  Heading,
  MetricGauge,
  OtherCategoryServices,
  ProjectShowcase,
  RelatedServices,
  ResponsiveShowcase,
  SiteViewport,
  StackDiagram,
  StorefrontMock,
  UptimeMonitor,
} from '@/components';
import type { Crumb } from '@/components';
import { cn } from '@/lib/utils';
import { PROJECT_CATEGORIES, getServiceProjects } from '@/constants/projects';
import { PERSEUS_HOME_SHOT } from '@/constants/services';
import type { WebsiteServiceContent } from '../types';

/**
 * Websites service detail (e.g. /services/websites/website-design).
 *
 * A deliberately different shape from Production: websites are digital, so the
 * hero "wow" is a browser-chrome viewport (UI, not a photo scrim), and the body
 * carries section types Production doesn't have — a layered tech-stack diagram,
 * an animated radial-gauge outcomes dashboard, a scroll-fill build timeline, and
 * an inverted-featured "choose your build" table (scope, never price).
 * Section order when present:
 *   hero → intro → stack → build (vertical timeline) → outcomes (inverted band)
 *   → builds → related → cta → faqs.
 *
 * Reuses the studio primitives (Heading, Breadcrumb, Container, Button, Faqs,
 * CategoryCta) and theme-aware tokens (black/white flip with the theme; the
 * browser chrome leans on background-contrast). No project showcase here —
 * that's the separate Projects feature.
 */
const WebsitesServiceDetail = ({ data }: { data: WebsiteServiceContent }) => {
  const crumbs: Crumb[] = [
    { label: 'Perseus', href: '/' },
    { label: 'Services', href: '/services' },
    { label: data.categoryTitle, href: `/services/${data.categorySlug}` },
    { label: data.title },
  ];

  // The faux address bar shows the real canonical URL, minus the protocol.
  const displayUrl = data.seo.canonicalPath.replace(/^https?:\/\//, '');

  // Hero media: a featured project (film-slate) when the service declares one
  // that resolves against the live websites archive — the ProjectSummary is the
  // single source for cover, logo, location, year, and services. Otherwise the
  // browser-chrome SiteViewport: the service's own /images hero when it has one,
  // else our live homepage instead of the placeholder.
  const featured = data.featuredProjectSlug
    ? PROJECT_CATEGORIES.websites?.projects.find(
        (p) => p.slug === data.featuredProjectSlug,
      ) ?? null
    : null;

  const heroImageUrl = data.heroImageUrl.startsWith('/images/')
    ? data.heroImageUrl
    : PERSEUS_HOME_SHOT;
  // When the frame shows our homepage shot — set explicitly on the lighter
  // services, or via the fallback above — the address bar and alt both describe
  // the homepage, so the URL, image, and alt always agree.
  const showingHomeShot = heroImageUrl === PERSEUS_HOME_SHOT;
  const heroDisplayUrl = showingHomeShot ? 'www.perseustudio.com' : displayUrl;
  const heroImageAlt = showingHomeShot
    ? 'The Perseus Creative Studio homepage — designed and built in-house.'
    : data.heroImageAlt;

  return (
    <main className="pt-28 sm:pt-32">
      {/* ───── Hero: editorial headline + a browser-framed viewport ───── */}
      <Container>
        <Breadcrumb crumbs={crumbs} />
      </Container>

      <Heading
        titleTag="h1"
        seperatorTitle={data.eyebrow}
        eyebrowRight={data.categoryTitle}
        title={data.heroHeadline}
        titleAccent={data.heroHeadlineAccent}
        description={data.heroSubtitle}
        containerStyle="mt-6 mb-8"
        titleStyle="max-w-4xl text-4xl sm:text-5xl lg:text-6xl"
        descStyle="max-w-2xl"
      />

      <Container className="mb-10 flex flex-wrap items-center gap-x-6 gap-y-4">
        <Link href={data.cta.primaryHref}>
          <Button variant="primary" icon={LuSend}>
            {data.cta.primaryLabel}
          </Button>
        </Link>
        <Link href={`/services/${data.categorySlug}`}>
          <Button variant="secondary" icon={LuArrowUpRight}>
            Explore all {data.categoryTitle.toLowerCase()} services
          </Button>
        </Link>
      </Container>

      <Container>
        {featured ? (
          <FeaturedCaseHero project={featured} />
        ) : (
          <SiteViewport
            imageUrl={heroImageUrl}
            imageAlt={heroImageAlt}
            displayUrl={heroDisplayUrl}
          />
        )}

        {/* Sibling-service chips for quick cross-linking */}
        {data.relatedServices.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.18em] text-black/40">
              Also in {data.categoryTitle}
            </span>
            {data.relatedServices.map((s) => (
              <Link
                key={s.slug}
                href={
                  s.available
                    ? `/services/${data.categorySlug}/${s.slug}`
                    : '/contact'
                }
                className="rounded-full px-3 py-1.5 text-xs font-medium tracking-tight text-black/65 transition-colors hover:bg-black/4 hover:text-black"
              >
                {s.title}
              </Link>
            ))}
          </div>
        )}
      </Container>

      {/* ───── Intro band: positioning lead + numbered capability row ───── */}
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

            <div className="mt-12 grid border-t border-black/10 sm:grid-cols-2 lg:grid-cols-4">
              {data.intro.highlights.map((item, i) => (
                <div
                  key={item}
                  className={cn(
                    'border-b border-black/10 py-6 lg:border-r lg:last:border-r-0',
                    'pr-6 lg:px-6 lg:first:pl-0',
                  )}
                >
                  <span className="font-mono text-[11px] tabular-nums text-black/35">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="mt-3 text-sm font-medium leading-relaxed tracking-tight text-black/80">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* ───── Responsive: one design across desktop / tablet / phone ───── */}
      {data.responsive && (
        <section className="pb-16 sm:pb-24">
          <Heading
            titleTag="h2"
            seperatorTitle="Responsive"
            eyebrowRight={data.categoryTitle}
            title={data.responsive.heading}
            description={data.responsive.description}
            containerStyle="mb-10"
            titleStyle="max-w-3xl"
            descStyle="max-w-3xl"
          />
          <Container>
            <ResponsiveShowcase {...data.responsive} />
          </Container>
        </section>
      )}

      {/* ───── Before/After: draggable redesign comparison ───── */}
      {data.comparison && (
        <section className="pb-16 sm:pb-24">
          <Heading
            titleTag="h2"
            seperatorTitle="Before / After"
            eyebrowRight={data.categoryTitle}
            title={data.comparison.heading}
            description={data.comparison.description}
            containerStyle="mb-10"
            titleStyle="max-w-3xl"
            descStyle="max-w-3xl"
          />
          <Container>
            <BeforeAfterSlider
              before={data.comparison.before}
              after={data.comparison.after}
              degradeBefore={data.comparison.degradeBefore}
            />
            {data.comparison.note && (
              <p className="mt-4 max-w-2xl text-xs leading-relaxed text-black/45">
                {data.comparison.note}
              </p>
            )}
          </Container>
        </section>
      )}

      {/* ───── Storefront: interactive product grid + cart ───── */}
      {data.storefront && (
        <section className="pb-16 sm:pb-24">
          <Heading
            titleTag="h2"
            seperatorTitle="Storefront"
            eyebrowRight={data.categoryTitle}
            title={data.storefront.heading}
            description={data.storefront.description}
            containerStyle="mb-10"
            titleStyle="max-w-3xl"
            descStyle="max-w-3xl"
          />
          <Container>
            <StorefrontMock {...data.storefront} />
          </Container>
        </section>
      )}

      {/* ───── Code → UI: development signature ───── */}
      {data.codeToUi && (
        <section className="pb-16 sm:pb-24">
          <Heading
            titleTag="h2"
            seperatorTitle="Code → UI"
            eyebrowRight={data.categoryTitle}
            title={data.codeToUi.heading}
            description={data.codeToUi.description}
            containerStyle="mb-10"
            titleStyle="max-w-3xl"
            descStyle="max-w-3xl"
          />
          <Container>
            <CodeToUI {...data.codeToUi} />
          </Container>
        </section>
      )}

      {/* ───── Conversion anatomy: landing-page signature ───── */}
      {data.conversionAnatomy && (
        <section className="pb-16 sm:pb-24">
          <Heading
            titleTag="h2"
            seperatorTitle="Anatomy"
            eyebrowRight={data.categoryTitle}
            title={data.conversionAnatomy.heading}
            description={data.conversionAnatomy.description}
            containerStyle="mb-10"
            titleStyle="max-w-3xl"
            descStyle="max-w-3xl"
          />
          <Container>
            <ConversionAnatomy {...data.conversionAnatomy} />
          </Container>
        </section>
      )}

      {/* ───── Dashboard: web-app signature ───── */}
      {data.dashboardMock && (
        <section className="pb-16 sm:pb-24">
          <Heading
            titleTag="h2"
            seperatorTitle="Interface"
            eyebrowRight={data.categoryTitle}
            title={data.dashboardMock.heading}
            description={data.dashboardMock.description}
            containerStyle="mb-10"
            titleStyle="max-w-3xl"
            descStyle="max-w-3xl"
          />
          <Container>
            <DashboardMock {...data.dashboardMock} />
          </Container>
        </section>
      )}

      {/* ───── Core Web Vitals: audit signature ───── */}
      {data.coreWebVitals && (
        <section className="pb-16 sm:pb-24">
          <Heading
            titleTag="h2"
            seperatorTitle="Core Web Vitals"
            eyebrowRight={data.categoryTitle}
            title={data.coreWebVitals.heading}
            description={data.coreWebVitals.description}
            containerStyle="mb-10"
            titleStyle="max-w-3xl"
            descStyle="max-w-3xl"
          />
          <Container>
            <CoreWebVitals {...data.coreWebVitals} />
          </Container>
        </section>
      )}

      {/* ───── Uptime monitor: maintenance signature ───── */}
      {data.uptimeMonitor && (
        <section className="pb-16 sm:pb-24">
          <Heading
            titleTag="h2"
            seperatorTitle="Status"
            eyebrowRight={data.categoryTitle}
            title={data.uptimeMonitor.heading}
            description={data.uptimeMonitor.description}
            containerStyle="mb-10"
            titleStyle="max-w-3xl"
            descStyle="max-w-3xl"
          />
          <Container>
            <UptimeMonitor {...data.uptimeMonitor} />
          </Container>
        </section>
      )}

      {/* ───── Tech stack: layered fanning slab diagram ───── */}
      {data.stack && (
        <section className="pb-16 sm:pb-24">
          <Heading
            titleTag="h2"
            seperatorTitle={data.stack.eyebrow ?? 'Stack'}
            eyebrowRight={data.categoryTitle}
            title={data.stack.heading}
            description={data.stack.description}
            containerStyle="mb-10"
            titleStyle="max-w-3xl"
            descStyle="max-w-3xl"
          />
          <Container>
            <StackDiagram groups={data.stack.groups} />
          </Container>
        </section>
      )}

      {/* ───── Build: vertical connected timeline ───── */}
      {data.build && (
        <section className="pb-16 sm:pb-24">
          <Heading
            titleTag="h2"
            seperatorTitle="Process"
            eyebrowRight={data.categoryTitle}
            title={data.build.heading}
            description={data.build.description}
            containerStyle="mb-10"
            titleStyle="max-w-3xl"
            descStyle="max-w-3xl"
          />
          <Container>
            <BuildTimeline steps={data.build.steps} />
          </Container>
        </section>
      )}

      {/* ───── Outcomes: inverted band, why a fast custom build pays off ───── */}
      {data.outcomes && (
        <section className="pb-16 sm:pb-24">
          <Container>
            <div className="overflow-hidden rounded-3xl bg-black text-white">
              <div className="p-8 sm:p-12 lg:p-14">
                <span className="eyebrow text-[10px] text-white/45">
                  Lighthouse · Before → After
                </span>
                <h2 className="mt-6 max-w-2xl text-3xl font-semibold tracking-tighter sm:text-4xl">
                  {data.outcomes.heading}
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/60 sm:text-base">
                  {data.outcomes.description}
                </p>

                {/* Legend: before vs after */}
                <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: '#ff4e42' }}
                    />
                    Typical site — before
                  </span>
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: '#0cce6b' }}
                    />
                    Your Perseus build — after
                  </span>
                </div>

                <div className="mt-12 grid gap-10 border-t border-white/10 pt-12 sm:grid-cols-3">
                  {data.outcomes.metrics.map((metric) => (
                    <MetricGauge
                      key={metric.label}
                      label={metric.label}
                      caption={metric.caption}
                      before={metric.before}
                      after={metric.after}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Container>
        </section>
      )}

      {/* ───── Build: hairline table of project scope (no prices) ───── */}
      {data.builds && (
        <section className="pb-16 sm:pb-24">
          <Heading
            titleTag="h2"
            seperatorTitle="Build"
            eyebrowRight={data.categoryTitle}
            title={data.builds.heading}
            description={data.builds.description}
            containerStyle="mb-10"
            titleStyle="max-w-3xl"
            descStyle="max-w-3xl"
          />
          <Container>
            <div className="grid overflow-hidden rounded-3xl lg:grid-cols-3">
              {data.builds.tiers.map((tier) => (
                <div
                  key={tier.name}
                  className={cn(
                    'flex flex-col p-8 sm:p-10',
                    'border-b border-black/10 last:border-b-0',
                    'lg:border-b-0 lg:border-r lg:last:border-r-0',
                    tier.featured
                      ? 'bg-black text-white lg:border-black'
                      : 'bg-background-contrast',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'eyebrow text-[11px]',
                        tier.featured ? 'text-white/55' : 'text-black/45',
                      )}
                    >
                      Build
                    </span>
                    {tier.featured && (
                      <span className="rounded-full bg-white px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-black">
                        Most chosen
                      </span>
                    )}
                  </div>

                  <h3 className="mt-5 text-2xl font-semibold tracking-tighter sm:text-3xl">
                    {tier.name}
                  </h3>

                  <p
                    className={cn(
                      'mt-3 text-sm leading-relaxed',
                      tier.featured ? 'text-white/65' : 'text-black/60',
                    )}
                  >
                    {tier.bestFor}
                  </p>

                  <ul
                    className={cn(
                      'mt-8 flex flex-1 flex-col gap-3 border-t pt-8',
                      tier.featured ? 'border-white/15' : 'border-black/10',
                    )}
                  >
                    {tier.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-3 text-sm tracking-tight"
                      >
                        <LuCheck
                          aria-hidden
                          className={cn(
                            'mt-0.5 size-4 shrink-0',
                            tier.featured ? 'text-white' : 'text-black',
                          )}
                        />
                        <span
                          className={
                            tier.featured ? 'text-white/80' : 'text-black/75'
                          }
                        >
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8">
                    <Link href={tier.ctaHref}>
                      <Button
                        variant={tier.featured ? 'secondary' : 'primary'}
                        icon={LuArrowUpRight}
                        className={cn(
                          'w-full justify-center',
                          tier.featured && 'bg-white text-black',
                        )}
                      >
                        {tier.ctaLabel}
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {data.builds.note && (
              <p className="mt-4 max-w-2xl text-xs leading-relaxed text-black/45">
                {data.builds.note}
              </p>
            )}
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
      />

      <OtherCategoryServices currentCategorySlug={data.categorySlug} />

      <CategoryCta cta={data.cta} />

      {data.faqs.length > 0 && (
        <Faqs
          title="Frequently Asked Questions"
          description={`Scope, process, deliverables, and handoff for ${data.title.toLowerCase()} — answered before we start.`}
          faqs={data.faqs}
        />
      )}
    </main>
  );
};

export default WebsitesServiceDetail;
