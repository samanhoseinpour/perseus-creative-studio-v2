import Link from 'next/link';
import { LuArrowUpRight, LuCalendarCheck, LuCheck } from 'react-icons/lu';

import Breadcrumb from '@/components/Breadcrumb';
import Button from '@/components/Button';
import CategoryCta from '@/components/Services/category/CategoryCta';
import Container from '@/components/ui/Container';
import ContentCalendar from '@/components/Services/detail/ContentCalendar';
import CreatorRoster from '@/components/Services/detail/CreatorRoster';
import Faqs from '@/components/Faqs';
import Heading from '@/components/Heading';
import InsightsBoard from '@/components/Services/detail/InsightsBoard';
import OtherCategoryServices from '@/components/Services/shared/OtherCategoryServices';
import PillarMap from '@/components/Services/detail/PillarMap';
import ProjectShowcase from '@/components/Projects/showcase/ProjectShowcase';
import RelatedServices from '@/components/Services/shared/RelatedServices';
import SocialFeedHero from '@/components/Services/detail/SocialFeedHero';
import SocialOutcomes from '@/components/Services/detail/SocialOutcomes';
import SocialScopeBoard from '@/components/Services/detail/SocialScopeBoard';
import type { Crumb } from '@/components/Breadcrumb';
import { getServiceProjects } from '@/constants/projects';
import { blurFor } from '@/lib/imageBlur';
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

          {/* Content feed — a living profile feed in a phone surface */}
          {data.feed && (
            <SocialFeedHero
              {...data.feed}
              tiles={data.feed.tiles.map((tile) => ({
                ...tile,
                blur: tile.imageUrl ? blurFor(tile.imageUrl) : undefined,
              }))}
            />
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

      {/* ───── Insights: reporting board ───── */}
      {data.insights && (
        <section className="pb-16 sm:pb-24">
          <Heading
            titleTag="h2"
            seperatorTitle="Insights"
            eyebrowRight={data.categoryTitle}
            title={data.insights.heading}
            description={data.insights.description}
            containerStyle="mb-10"
            titleStyle="max-w-3xl"
            descStyle="max-w-3xl"
          />
          <Container>
            <InsightsBoard {...data.insights} />
          </Container>
        </section>
      )}

      {/* ───── Pillars: content-mix bar + pillar grid ───── */}
      {data.pillars && (
        <section className="pb-16 sm:pb-24">
          <Heading
            titleTag="h2"
            seperatorTitle="Pillars"
            eyebrowRight={data.categoryTitle}
            title={data.pillars.heading}
            description={data.pillars.description}
            containerStyle="mb-10"
            titleStyle="max-w-3xl"
            descStyle="max-w-3xl"
          />
          <Container>
            <PillarMap {...data.pillars} />
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
            <CreatorRoster
              {...data.roster}
              creators={data.roster.creators.map((creator) => ({
                ...creator,
                blur: creator.imageUrl ? blurFor(creator.imageUrl) : undefined,
              }))}
            />
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
            <ContentCalendar
              week={data.cadence.week}
              summary={data.cadence.summary}
            />
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
            <SocialScopeBoard items={data.included.items} />
          </Container>
        </section>
      )}

      {/* ───── Outcomes: engagement-style impact panel ───── */}
      {data.outcomes && (
        <section className="pb-16 sm:pb-24">
          <Container>
            <SocialOutcomes {...data.outcomes} />
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
          description={`Platforms, content, approvals, and reporting for ${data.title.toLowerCase()} — answered before we start.`}
          faqs={data.faqs}
        />
      )}
    </main>
  );
};

export default SocialServiceDetail;
