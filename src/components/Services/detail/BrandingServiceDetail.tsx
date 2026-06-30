import Link from 'next/link';
import { LuArrowUpRight, LuCalendarCheck, LuCheck } from 'react-icons/lu';

import {
  BrandDeliverables,
  BrandSpecimenHero,
  Breadcrumb,
  Button,
  CategoryCta,
  Container,
  Faqs,
  GuidelinesSpread,
  Heading,
  IdentitySheet,
  Img,
  Moodboard,
  OtherCategoryServices,
  PositioningMap,
  ProjectShowcase,
  RelatedServices,
  VoiceScale,
} from '@/components';
import type { Crumb } from '@/components';
import { isReadyImage } from '@/utils/images';
import { PERSEUS_LOGO } from '@/constants';
import { getServiceProjects } from '@/constants/projects';
import type { BrandingServiceContent } from '../types';

/**
 * Branding service detail (e.g. /services/branding/brand-strategy-positioning).
 *
 * Its own silhouette within the studio design language: the hero "wow" is an
 * inverted brand-specimen panel (identity — not Production's photo scrim or the
 * Websites browser frame), followed by a cinematic establishing band, an
 * editorial deliverables grid, and an inverted brand-principles band. No
 * numbered-steps section, which keeps it visually distinct from the other two
 * templates. Reuses the shared primitives + theme-aware tokens throughout.
 */
const BrandingServiceDetail = ({ data }: { data: BrandingServiceContent }) => {
  const crumbs: Crumb[] = [
    { label: 'Perseus', href: '/' },
    { label: 'Services', href: '/services' },
    { label: data.categoryTitle, href: `/services/${data.categorySlug}` },
    { label: data.title },
  ];

  return (
    <main className="pt-28 sm:pt-32">
      {/* ───── Hero: editorial headline + inverted brand-specimen panel ───── */}
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

          {/* Brand specimen — a designed "identity at a glance" artifact */}
          {data.specimen && (
            <BrandSpecimenHero
              {...data.specimen}
              categoryTitle={data.categoryTitle}
            />
          )}
        </div>
      </Container>

      {/* ───── Establishing band: the brand photo, on-media caption ─────
          Renders only with a real brand photo. No branding photography is
          self-hosted yet, so without this guard `heroImageUrl` resolves to the
          shared placeholder and the band shows the post-production shot on every
          branding page. PERSEUS_LOGO is the explicit "no brand photo yet" sentinel,
          so it's excluded here too. Drops back in automatically once a real
          /images asset is wired to the service's card/hero. */}
      {isReadyImage(data.heroImageUrl) && data.heroImageUrl !== PERSEUS_LOGO && (
        <section className="pt-14 sm:pt-20">
          <Container>
            <div className="relative aspect-3/2 w-full overflow-hidden rounded-3xl sm:aspect-21/9">
              <Img
                src={data.heroImageUrl}
                alt={data.heroImageAlt}
                fill
                sizes="(min-width: 1280px) 1240px, 100vw"
                className={`rounded-none object-cover ${data.heroImagePosition ?? ''}`}
              />
              <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-scrim/70 via-scrim/10 to-transparent" />
              <span className="absolute bottom-6 left-6 max-w-md font-mono text-[11px] uppercase tracking-[0.18em] text-on-media/80 sm:bottom-8 sm:left-8">
                Strategy → Identity → Voice — one senior team
              </span>
            </div>
          </Container>
        </section>
      )}

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

      {/* ───── Positioning map: brand-strategy signature ───── */}
      {data.positioningMap && (
        <section className="pb-16 sm:pb-24">
          <Heading
            titleTag="h2"
            seperatorTitle="Positioning"
            eyebrowRight={data.categoryTitle}
            title={data.positioningMap.heading}
            description={data.positioningMap.description}
            containerStyle="mb-10"
            titleStyle="max-w-3xl"
            descStyle="max-w-3xl"
          />
          <Container>
            <PositioningMap {...data.positioningMap} />
          </Container>
        </section>
      )}

      {/* ───── Voice: messaging signature ───── */}
      {data.voice && (
        <section className="pb-16 sm:pb-24">
          <Heading
            titleTag="h2"
            seperatorTitle="Voice"
            eyebrowRight={data.categoryTitle}
            title={data.voice.heading}
            description={data.voice.description}
            containerStyle="mb-10"
            titleStyle="max-w-3xl"
            descStyle="max-w-3xl"
          />
          <Container>
            <VoiceScale {...data.voice} />
          </Container>
        </section>
      )}

      {/* ───── Moodboard: creative-direction signature ───── */}
      {data.moodboard && (
        <section className="pb-16 sm:pb-24">
          <Heading
            titleTag="h2"
            seperatorTitle="Moodboard"
            eyebrowRight={data.categoryTitle}
            title={data.moodboard.heading}
            description={data.moodboard.description}
            containerStyle="mb-10"
            titleStyle="max-w-3xl"
            descStyle="max-w-3xl"
          />
          <Container>
            <Moodboard {...data.moodboard} />
          </Container>
        </section>
      )}

      {/* ───── Guidelines: document-spread mock ───── */}
      {data.guidelines && (
        <section className="pb-16 sm:pb-24">
          <Heading
            titleTag="h2"
            seperatorTitle="Guidelines"
            eyebrowRight={data.categoryTitle}
            title={data.guidelines.heading}
            description={data.guidelines.description}
            containerStyle="mb-10"
            titleStyle="max-w-3xl"
            descStyle="max-w-3xl"
          />
          <Container>
            <GuidelinesSpread {...data.guidelines} />
          </Container>
        </section>
      )}

      {/* ───── Identity sheet: the mark as a built system ───── */}
      {data.identitySheet && (
        <section className="pb-16 sm:pb-24">
          <Heading
            titleTag="h2"
            seperatorTitle="Identity sheet"
            eyebrowRight={data.categoryTitle}
            title={data.identitySheet.heading}
            description={data.identitySheet.description}
            containerStyle="mb-10"
            titleStyle="max-w-3xl"
            descStyle="max-w-3xl"
          />
          <Container>
            <IdentitySheet {...data.identitySheet} />
          </Container>
        </section>
      )}

      {/* ───── Deliverables: editorial bordered grid ───── */}
      {data.deliverables && (
        <section className="pb-16 sm:pb-24">
          <Heading
            titleTag="h2"
            seperatorTitle="Deliverables"
            eyebrowRight={data.categoryTitle}
            title={data.deliverables.heading}
            description={data.deliverables.description}
            containerStyle="mb-10"
            titleStyle="max-w-3xl"
            descStyle="max-w-3xl"
          />
          <Container>
            <BrandDeliverables items={data.deliverables.items} />
          </Container>
        </section>
      )}

      {/* ───── Principles: inverted band, big numbered statements ───── */}
      {data.principles && (
        <section className="pb-16 sm:pb-24">
          <Container>
            <div className="overflow-hidden rounded-3xl bg-black text-white">
              <div className="p-8 sm:p-12 lg:p-14">
                <span className="eyebrow text-[10px] text-white/45">
                  Principles
                </span>
                <h2 className="mt-6 max-w-2xl text-3xl font-semibold tracking-tighter sm:text-4xl">
                  {data.principles.heading}
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/60 sm:text-base">
                  {data.principles.description}
                </p>

                <div className="mt-12 grid gap-x-12 gap-y-10 border-t border-white/10 pt-10 sm:grid-cols-2">
                  {data.principles.items.map((principle) => (
                    <div key={principle.index} className="flex gap-5">
                      <span className="font-mono text-sm tabular-nums text-white/35">
                        {principle.index}
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold tracking-tight sm:text-xl">
                          {principle.title}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-white/60">
                          {principle.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
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
          description={`Scope, process, and deliverables for ${data.title.toLowerCase()} — answered before we start.`}
          faqs={data.faqs}
        />
      )}
    </main>
  );
};

export default BrandingServiceDetail;
