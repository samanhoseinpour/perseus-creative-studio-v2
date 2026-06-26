import Link from 'next/link';
import { LuCalendarCheck, LuCheck } from 'react-icons/lu';

import {
  BeforeAfterSlider,
  Breadcrumb,
  Button,
  CategoryCta,
  ContactSheet,
  Container,
  DollhouseTour,
  Faqs,
  FlightPathMap,
  Heading,
  Img,
  OtherCategoryServices,
  ProductionCallSheet,
  TurntableViewer,
  RelatedServices,
  Testimonials,
} from '@/components';
import type { Crumb } from '@/components';
import type { ProductionServiceContent } from '../types';

/**
 * Production service detail (e.g. /services/production/videography).
 *
 * Distinct Production layout:
 *   hero (still) → intro band → formats (one shoot → every format) → process →
 *   what's-included table → outcomes (inverted band) → scoping ("what shapes
 *   your quote", no prices) → testimonials → related services → cta → faqs.
 *
 * Composes the established studio idioms — mono eyebrows, hairline editorial
 * grids, scrim-over-photo with on-media text, inverted contrast bands — rather
 * than generic cards. Project reels live in the (separate) Projects feature,
 * not here.
 */
const ProductionServiceDetail = ({
  data,
}: {
  data: ProductionServiceContent;
}) => {
  const crumbs: Crumb[] = [
    { label: 'Perseus', href: '/' },
    { label: 'Services', href: '/services' },
    { label: data.categoryTitle, href: `/services/${data.categorySlug}` },
    { label: data.title },
  ];

  return (
    <main className="pt-28 sm:pt-32">
      <Container>
        <div className="relative h-[80svh] min-h-[540px] w-full overflow-hidden rounded-3xl">
          <Img
            src={data.heroImageUrl}
            alt={data.heroImageAlt}
            fill
            priority
            sizes="(min-width: 1280px) 1240px, 100vw"
            className={`rounded-none object-cover ${data.heroImagePosition ?? ''}`}
          />

          {/* Legibility scrims: top for the headline, heavier bottom for chips */}
          <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-scrim/65 via-scrim/15 to-scrim/80" />

          {/* Headline overlaid top-left — shared Breadcrumb + Heading, on-media */}
          <div className="absolute inset-x-6 top-8 sm:inset-x-10 sm:top-10">
            <Breadcrumb crumbs={crumbs} onMedia />
            <Heading
              titleTag="h1"
              seperatorTitle={data.eyebrow}
              eyebrowRight={data.categoryTitle}
              seperatorTitleStyle="text-on-media/70"
              eyebrowRightStyle="text-on-media/70"
              title={data.heroHeadline}
              titleAccent={data.heroHeadlineAccent}
              // Pinned: the accent sits over the hero photo, so it must not
              // flip dark in light mode like the default text-black/40 does.
              titleAccentStyle="text-on-media/40"
              description={data.heroSubtitle}
              containerStyle="px-0 md:px-0 mb-0 w-full max-w-none"
              titleStyle="max-w-2xl text-on-media text-4xl sm:text-5xl lg:text-6xl"
              descStyle="max-w-md text-on-media/75"
            />
            <div className="mt-7">
              <Link href="/contact">
                <Button variant="primary" icon={LuCalendarCheck}>
                  Book a Production Call
                </Button>
              </Link>
            </div>
          </div>

          {/* Sibling-service chips, bottom-left */}
          <div className="absolute inset-x-6 bottom-6 flex flex-wrap items-center gap-2 sm:inset-x-10 sm:bottom-8 sm:max-w-[60%]">
            <span className="rounded-full bg-on-media px-3 py-1.5 text-xs font-medium tracking-tight text-scrim">
              {data.title}
            </span>
            {data.relatedServices.map((s) => (
              <Link
                key={s.slug}
                href={
                  s.available
                    ? `/services/${data.categorySlug}/${s.slug}`
                    : '/contact'
                }
                className="rounded-full px-3 py-1.5 text-xs font-medium tracking-tight text-on-media/80 transition-colors hover:bg-on-media/10 hover:text-on-media"
              >
                {s.title}
              </Link>
            ))}
          </div>
        </div>
      </Container>

      {/* ───── Intro band: positioning + highlightsz checklist ───── */}
      {data.intro && (
        <section className="py-16 sm:py-20">
          <Container>
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
              <h2 className="max-w-md text-3xl font-semibold tracking-tighter sm:text-4xl">
                {data.intro.heading}
              </h2>
              <div>
                <p className="text-sm leading-relaxed text-black/65 sm:text-base">
                  {data.intro.body}
                </p>
                <ul className="mt-8 grid gap-x-8 gap-y-4 sm:grid-cols-2">
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
              </div>
            </div>
          </Container>
        </section>
      )}

      {/* ───── Grade: raw → graded before/after comparison ───── */}
      {data.grade && (
        <section className="pb-16 sm:pb-24">
          <Heading
            titleTag="h2"
            seperatorTitle="Color"
            eyebrowRight={data.categoryTitle}
            title={data.grade.heading}
            description={data.grade.description}
            containerStyle="mb-10"
            titleStyle="max-w-3xl"
            descStyle="max-w-3xl"
          />
          <Container>
            <BeforeAfterSlider
              before={data.grade.before}
              after={data.grade.after}
              degradeBefore={data.grade.degradeBefore}
            />
            {data.grade.note && (
              <p className="mt-4 max-w-2xl text-xs leading-relaxed text-black/45">
                {data.grade.note}
              </p>
            )}
          </Container>
        </section>
      )}

      {/* ───── Flight plan: drone route drawn over an aerial still ───── */}
      {data.flightPath && (
        <section className="pb-16 sm:pb-24">
          <Heading
            titleTag="h2"
            seperatorTitle="Flight plan"
            eyebrowRight={data.categoryTitle}
            title={data.flightPath.heading}
            description={data.flightPath.description}
            containerStyle="mb-10"
            titleStyle="max-w-3xl"
            descStyle="max-w-3xl"
          />
          <Container>
            <FlightPathMap {...data.flightPath} />
          </Container>
        </section>
      )}

      {/* ───── Formats: one shoot → every format, one frame re-cropped ───── */}
      {data.formats && (
        <section className="pb-16 sm:pb-24">
          <Heading
            titleTag="h2"
            seperatorTitle="Formats"
            eyebrowRight={data.categoryTitle}
            title={data.formats.heading}
            description={data.formats.description}
            containerStyle="mb-10"
            titleStyle="max-w-3xl"
            descStyle="max-w-3xl"
          />
          <Container>
            <div className="grid items-end gap-4 sm:grid-cols-[2fr_1fr_1fr]">
              {data.formats.ratios.map((format, i) => (
                <figure key={format.ratio} className="min-w-0">
                  <div
                    style={{ aspectRatio: format.aspect.replace('/', ' / ') }}
                    className="relative w-full overflow-hidden rounded-2xl bg-black"
                  >
                    <Img
                      src={data.formats!.imageUrl}
                      alt={i === 0 ? data.formats!.imageAlt : ''}
                      fill
                      sizes="(min-width: 640px) 40vw, 100vw"
                      className="rounded-none object-cover"
                    />
                    <span className="absolute left-3 top-3 rounded-full bg-scrim/55 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-on-media/90 backdrop-blur-sm">
                      {format.ratio}
                    </span>
                  </div>
                  <figcaption className="mt-3 flex items-baseline gap-2">
                    <span className="font-mono text-[11px] tabular-nums text-black/35">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-sm font-medium tracking-tight text-black/75">
                      {format.label}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* ───── Contact sheet: photography signature ───── */}
      {data.contactSheet && (
        <section className="pb-16 sm:pb-24">
          <Heading
            titleTag="h2"
            seperatorTitle="Contact sheet"
            eyebrowRight={data.categoryTitle}
            title={data.contactSheet.heading}
            description={data.contactSheet.description}
            containerStyle="mb-10"
            titleStyle="max-w-3xl"
            descStyle="max-w-3xl"
          />
          <Container>
            <ContactSheet {...data.contactSheet} />
          </Container>
        </section>
      )}

      {/* ───── Turntable: 2D/3D signature ───── */}
      {data.turntable && (
        <section className="pb-16 sm:pb-24">
          <Heading
            titleTag="h2"
            seperatorTitle="Turntable"
            eyebrowRight={data.categoryTitle}
            title={data.turntable.heading}
            description={data.turntable.description}
            containerStyle="mb-10"
            titleStyle="max-w-3xl"
            descStyle="max-w-3xl"
          />
          <Container>
            <TurntableViewer {...data.turntable} />
          </Container>
        </section>
      )}

      {/* ───── Tour: virtual-tour signature ───── */}
      {data.tour && (
        <section className="pb-16 sm:pb-24">
          <Heading
            titleTag="h2"
            seperatorTitle="Virtual tour"
            eyebrowRight={data.categoryTitle}
            title={data.tour.heading}
            description={data.tour.description}
            containerStyle="mb-10"
            titleStyle="max-w-3xl"
            descStyle="max-w-3xl"
          />
          <Container>
            <DollhouseTour {...data.tour} />
          </Container>
        </section>
      )}

      {/* ───── Process: oversized numbered steps on hairlines ───── */}
      {data.process && (
        <section className="py-16 sm:py-24">
          <Container>
            <Heading
              titleTag="h2"
              seperatorTitle="How it works"
              eyebrowRight={data.categoryTitle}
              title={data.process.heading}
              description={data.process.description}
              containerStyle="px-0 md:px-0 mb-10 w-full max-w-none"
              titleStyle="max-w-3xl"
              descStyle="max-w-3xl"
            />

            <ol className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {data.process.steps.map((s) => (
                <li key={s.step} className="border-t border-black/15 pt-5">
                  <span className="block text-5xl font-semibold leading-none tracking-tighter tabular-nums text-black/15">
                    {s.step}
                  </span>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-black/60">
                    {s.description}
                  </p>
                </li>
              ))}
            </ol>
          </Container>
        </section>
      )}

      {/* ───── What's included: editorial table, no cards ───── */}
      {data.included && (
        <section className="py-16 sm:py-24">
          <Container>
            <Heading
              titleTag="h2"
              seperatorTitle="Scope"
              eyebrowRight={data.categoryTitle}
              title={data.included.heading}
              description={data.included.description}
              containerStyle="px-0 md:px-0 mb-10 w-full max-w-none"
              titleStyle="max-w-3xl"
              descStyle="max-w-3xl"
            />

            <div className="mt-12">
              <ProductionCallSheet items={data.included.items} />
            </div>
          </Container>
        </section>
      )}

      {/* ───── Outcomes: inverted contrast band, big values ───── */}
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
                  {data.outcomes.stats.map((s) => (
                    <div key={s.label} className="pt-8">
                      <dt className="text-4xl font-semibold leading-none tracking-tighter tabular-nums sm:text-5xl">
                        {s.prefix && (
                          <span className="text-white/40">{s.prefix}</span>
                        )}
                        {s.value}
                        {s.suffix && (
                          <span className="text-white/40">{s.suffix}</span>
                        )}
                      </dt>
                      <dd className="mt-3 max-w-xs pr-6 text-sm leading-relaxed text-white/55">
                        {s.label}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </Container>
        </section>
      )}

      {/* ───── Scoping: what shapes the quote (no prices) ───── */}
      {data.scoping && (
        <section className="pb-16 sm:pb-24">
          <Heading
            titleTag="h2"
            seperatorTitle="Scoping"
            eyebrowRight={data.categoryTitle}
            title={data.scoping.heading}
            description={data.scoping.description}
            containerStyle="mb-10"
            titleStyle="max-w-3xl"
            descStyle="max-w-3xl"
          />
          <Container>
            <div className="grid border-t border-black/10 sm:grid-cols-2 lg:grid-cols-4">
              {data.scoping.factors.map((factor, i) => (
                <div
                  key={factor.title}
                  className={[
                    'border-b border-black/10 px-1 py-7 sm:px-6',
                    i % 2 === 0 ? 'sm:border-r sm:border-black/10' : '',
                    'lg:border-r lg:border-black/10 lg:last:border-r-0',
                  ].join(' ')}
                >
                  <span className="font-mono text-[11px] tabular-nums text-black/35">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-3 text-base font-semibold tracking-tight">
                    {factor.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-black/60">
                    {factor.description}
                  </p>
                </div>
              ))}
            </div>
            {data.scoping.note && (
              <p className="mt-6 max-w-2xl text-sm leading-relaxed text-black/55">
                {data.scoping.note}
              </p>
            )}
          </Container>
        </section>
      )}

      {/* ───── Testimonials: real client video reviews ───── */}
      {data.testimonials && data.testimonials.length > 0 && (
        <section className="pb-16 sm:pb-24">
          <Heading
            titleTag="h2"
            seperatorTitle="Proof"
            eyebrowRight="Reviews · Results · Long-term partners"
            title="What clients say"
            titleAccent="Proof from the people we build with."
            description={`Real feedback from ${data.categoryTitle.toLowerCase()} clients across real estate, construction, fitness, and development.`}
            containerStyle="mb-4"
            titleStyle="max-w-3xl"
            descStyle="max-w-3xl"
          />
          <Testimonials testimonials={data.testimonials} autoplay />
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
          description={`Scope, timelines, deliverables, and ownership for ${data.title.toLowerCase()} — answered before we start.`}
          faqs={data.faqs}
        />
      )}
    </main>
  );
};

export default ProductionServiceDetail;
