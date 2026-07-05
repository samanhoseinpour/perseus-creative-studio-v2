import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import {
  CategoryHero,
  ServiceCategoryBento,
  CategoryFit,
  CategoryProcess,
  CategoryStats,
  CategoryWhyUs,
  CategoryTestimonials,
  CategoryJournal,
  OtherCategories,
  PrevNextCategory,
  CategoryCta,
  ProjectShowcase,
  Faqs,
} from '@/components';
import type { Crumb } from '@/components';
import { SITE_URL } from '@/constants';
import { PERSEUS_PUBLISHER_REF } from '@/constants/blogs';
import { CATEGORIES } from '@/constants/services';
import { getCategoryProjects } from '@/constants/projects';
import CategoryVisual, {
  isPhotoCategory,
} from '@/components/Services/visuals/CategoryVisual';
import { buildBreadcrumbList } from '@/utils/breadcrumbSchema';

export function generateStaticParams() {
  return Object.keys(CATEGORIES).map((category) => ({ category }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const data = CATEGORIES[category];
  if (!data) return { title: 'Service not found' };

  return {
    title: data.seo.title,
    description: data.seo.description,
    alternates: { canonical: data.seo.canonicalPath },
    openGraph: {
      title: data.seo.title,
      description: data.seo.description,
      url: data.seo.canonicalPath,
      siteName: 'Perseus Creative Studio',
      locale: 'en_CA',
      type: 'website',
      images: [
        { url: data.seo.ogImage, width: 1200, height: 630, alt: data.title },
      ],
    },
  };
}

export default async function ServiceCategoryRoute({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const data = CATEGORIES[category];
  if (!data) notFound();

  // Single source for the trail — feeds both the visible <Breadcrumb> and the
  // BreadcrumbList JSON-LD below.
  const crumbs: Crumb[] = [
    { label: 'Perseus', href: '/' },
    { label: 'Services', href: '/services' },
    { label: data.title },
  ];

  return (
    <>
      <script
        id="ld-json-service-category"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              buildBreadcrumbList(crumbs, data.seo.canonicalPath),
              {
                '@type': 'CollectionPage',
                '@id': `${data.seo.canonicalPath}#webpage`,
                url: data.seo.canonicalPath,
                name: data.seo.title,
                description: data.seo.description,
                inLanguage: 'en-CA',
                isPartOf: { '@id': `${SITE_URL}/#website` },
                publisher: PERSEUS_PUBLISHER_REF,
                breadcrumb: { '@id': `${data.seo.canonicalPath}#breadcrumb` },
                mainEntity: { '@id': `${data.seo.canonicalPath}#service` },
              },
              {
                // The category's service offering. Mirrors the Service node on
                // /services/[category]/[service] (provider + areaServed for
                // local SEO); the sub-services live in its OfferCatalog so they
                // aren't duplicated on the CollectionPage.
                '@type': 'Service',
                '@id': `${data.seo.canonicalPath}#service`,
                name: `${data.title} Services`,
                serviceType: data.title,
                description: data.seo.description,
                provider: PERSEUS_PUBLISHER_REF,
                areaServed: 'Vancouver, BC',
                url: data.seo.canonicalPath,
                inLanguage: 'en-CA',
                hasOfferCatalog: {
                  '@type': 'OfferCatalog',
                  name: `${data.title} services`,
                  itemListElement: data.services.map((s) => ({
                    '@type': 'Offer',
                    itemOffered: {
                      '@type': 'Service',
                      name: s.title,
                      description: s.tagline,
                      serviceType: s.title,
                      provider: PERSEUS_PUBLISHER_REF,
                      ...(s.available
                        ? { url: `${data.seo.canonicalPath}/${s.slug}` }
                        : {}),
                    },
                  })),
                },
              },
              ...(data.faqs.length
                ? [
                    {
                      '@type': 'FAQPage',
                      '@id': `${data.seo.canonicalPath}#faqs`,
                      inLanguage: 'en-CA',
                      isPartOf: { '@id': `${data.seo.canonicalPath}#webpage` },
                      mainEntity: data.faqs.map((f) => ({
                        '@type': 'Question',
                        name: f.question,
                        acceptedAnswer: { '@type': 'Answer', text: f.answer },
                      })),
                    },
                  ]
                : []),
            ],
          }),
        }}
      />
      <main className="pt-28 sm:pt-32">
        <CategoryHero
          data={data}
          crumbs={crumbs}
          // Editorial index chip (e.g. 03 / 05) — computed here so the client
          // hero doesn't import the CATEGORIES registry just for the ordering.
          index={Object.keys(CATEGORIES).indexOf(data.slug) + 1}
          total={Object.keys(CATEGORIES).length}
          // Server-rendered so the client hero doesn't pull Img (and its
          // server-only blur map) into the client bundle.
          visual={<CategoryVisual slug={data.slug} variant="hero" />}
          isPhoto={isPhotoCategory(data.slug)}
        />
        {/* Decision funnel: hero → offer → process → proof → objections → explore → convert → nav */}
        <ServiceCategoryBento data={data} />
        <CategoryFit data={data} />
        <CategoryProcess data={data} />
        <CategoryStats data={data} />
        <CategoryWhyUs data={data} />
        <CategoryTestimonials data={data} />
        {/* The discipline's latest work — same showcase used on /about, blog
            posts, and the per-service pages, scoped here to this category. */}
        <ProjectShowcase
          entries={getCategoryProjects(data.slug, 4)}
          title="The work, on the record."
          titleAccent={`Recent ${data.title} projects.`}
          description={`Real client work, filed under ${data.title} — the proof behind the service.`}
          viewAllHref={`/projects/${data.slug}`}
          viewAllLabel={`All ${data.title} projects`}
        />
        <Faqs
          title="Frequently Asked Questions"
          description="Scope, timelines, deliverables, and how we work. If your question isn’t covered here, get in touch."
          faqs={data.faqs}
        />
        <CategoryJournal
          blogCategorySlug={data.blogCategorySlug}
          categoryTitle={data.title}
        />
        <OtherCategories currentSlug={data.slug} />
        <CategoryCta cta={data.cta} />
        <PrevNextCategory currentSlug={data.slug} />
      </main>
    </>
  );
}
