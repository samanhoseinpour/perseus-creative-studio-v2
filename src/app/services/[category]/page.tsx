import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Script from 'next/script';

import {
  Breadcrumb,
  Container,
  ServiceCategoryBento,
  CategoryStats,
  CategoryJournal,
  OtherCategories,
  PrevNextCategory,
  CategoryCta,
  Faqs,
} from '@/components';
import type { Crumb } from '@/components';
import { SITE_URL } from '@/constants';
import { PERSEUS_PUBLISHER_REF } from '@/constants/blogs';
import { CATEGORIES } from '@/constants/services';
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
      <Script
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
                hasPart: data.services.map((s) => ({
                  '@type': 'Service',
                  name: s.title,
                  description: s.tagline,
                  serviceType: s.title,
                  provider: PERSEUS_PUBLISHER_REF,
                  ...(s.available
                    ? { url: `${data.seo.canonicalPath}/${s.slug}` }
                    : {}),
                })),
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
        <Container>
          <Breadcrumb crumbs={crumbs} />
        </Container>
        {/* Decision funnel: offer → proof → objections → explore → convert → nav */}
        <ServiceCategoryBento data={data} />
        <CategoryStats data={data} />
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
