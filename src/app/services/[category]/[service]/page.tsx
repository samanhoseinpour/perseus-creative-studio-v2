import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Script from 'next/script';

import { SITE_URL } from '@/constants';
import { PERSEUS_PUBLISHER_REF } from '@/constants/blogs';
import { PRODUCTION_SERVICES } from '@/constants/services';

export function generateStaticParams() {
  return Object.values(PRODUCTION_SERVICES).map((s) => ({
    category: s.categorySlug,
    service: s.slug,
  }));
}

function getService(category: string, service: string) {
  if (category === 'production') return PRODUCTION_SERVICES[service] ?? null;
  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; service: string }>;
}): Promise<Metadata> {
  const { category, service } = await params;
  const data = getService(category, service);
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
      images: [{ url: data.seo.ogImage, width: 1200, height: 630, alt: data.title }],
    },
  };
}

export default async function ServiceDetailRoute({
  params,
}: {
  params: Promise<{ category: string; service: string }>;
}) {
  const { category, service } = await params;
  const data = getService(category, service);
  if (!data) notFound();

  return (
    <>
      <Script
        id="ld-json-service-detail"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'BreadcrumbList',
                '@id': `${data.seo.canonicalPath}#breadcrumb`,
                itemListElement: [
                  { '@type': 'ListItem', position: 1, name: 'Perseus', item: SITE_URL },
                  {
                    '@type': 'ListItem',
                    position: 2,
                    name: 'Services',
                    item: `${SITE_URL}/services`,
                  },
                  {
                    '@type': 'ListItem',
                    position: 3,
                    name: data.categoryTitle,
                    item: `${SITE_URL}/services/${data.categorySlug}`,
                  },
                  {
                    '@type': 'ListItem',
                    position: 4,
                    name: data.title,
                    item: data.seo.canonicalPath,
                  },
                ],
              },
              {
                // WebPage node carries the breadcrumb. `breadcrumb` is a
                // Schema.org property of WebPage (not Service), so the link to
                // the BreadcrumbList lives here, mirroring the CollectionPage
                // on /services/[category]. mainEntity points at the Service.
                '@type': 'WebPage',
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
                '@type': 'Service',
                '@id': `${data.seo.canonicalPath}#service`,
                name: data.title,
                serviceType: data.title,
                description: data.seo.description,
                provider: PERSEUS_PUBLISHER_REF,
                areaServed: 'Vancouver, BC',
                url: data.seo.canonicalPath,
                inLanguage: 'en-CA',
              },
              ...(data.faqs.length
                ? [
                    {
                      '@type': 'FAQPage',
                      '@id': `${data.seo.canonicalPath}#faqs`,
                      inLanguage: 'en-CA',
                      isPartOf: { '@id': `${data.seo.canonicalPath}#service` },
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
      {/* TODO(service UI): rebuild the /services/[category]/[service]
          presentation. Data, metadata, and JSON-LD above are intact and ready
          to feed the new template. `data` holds the full ProductionServiceContent. */}
      <main className="min-h-svh" />
    </>
  );
}
