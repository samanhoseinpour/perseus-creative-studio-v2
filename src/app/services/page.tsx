import { Metadata } from 'next';

import {
  ServicesProduction,
  ServicesSocial,
  ServicesEditting,
  ServicesAds,
  ServicesWebsites,
  ServicesBranding,
  ServicesHero,
  ServicesCategories,
  ServicesCta,
} from '@/components';
import type { Crumb } from '@/components';
import { SITE_URL } from '@/constants';
import { PERSEUS_PUBLISHER_REF } from '@/constants/blogs';
import { CATEGORIES } from '@/constants/services';
import { buildBreadcrumbList } from '@/utils/breadcrumbSchema';

export const metadata: Metadata = {
  title: 'Vancouver Marketing Services - Perseus Creative Studio',
  description:
    'Perseus Creative Studio in Vancouver offers web design and social media marketing services. We create digital strategies designed to scale your business.',
  keywords: [],

  alternates: {
    canonical: 'https://www.perseustudio.com/services',
  },

  openGraph: {
    title: 'Vancouver Marketing Services - Perseus Creative Studio',
    description:
      'Perseus Creative Studio in Vancouver offers web design and social media marketing services. We create digital strategies designed to scale your business.',
    url: 'https://www.perseustudio.com/services',
    siteName: 'Perseus Creative Studio',
    locale: 'en_CA',
    type: 'website',
    images: [
      {
        url: 'https://ik.imagekit.io/perseus/navbar-contact.jpeg',
        width: 1200,
        height: 630,
        alt: 'Perseus Creative Studio Services Page Preview',
      },
    ],
  },
};

const SERVICES_URL = `${SITE_URL}/services`;

// Single source for the hub trail — feeds both the BreadcrumbList JSON-LD and
// (should one be added) a visible <Breadcrumb>.
const crumbs: Crumb[] = [
  { label: 'Perseus', href: '/' },
  { label: 'Services' },
];

const ServicesPage = () => {
  return (
    <>
      <script
        id="ld-json-services-hub"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              buildBreadcrumbList(crumbs, SERVICES_URL),
              {
                '@type': 'CollectionPage',
                '@id': `${SERVICES_URL}#webpage`,
                url: SERVICES_URL,
                name: 'Vancouver Marketing Services - Perseus Creative Studio',
                description:
                  'Perseus Creative Studio in Vancouver offers web design and social media marketing services. We create digital strategies designed to scale your business.',
                inLanguage: 'en-CA',
                isPartOf: { '@id': `${SITE_URL}/#website` },
                publisher: PERSEUS_PUBLISHER_REF,
                breadcrumb: { '@id': `${SERVICES_URL}#breadcrumb` },
                mainEntity: { '@id': `${SERVICES_URL}#catalog` },
              },
              {
                // The studio's full service offering — each category is an Offer
                // whose Service links to its landing page, where that Service's
                // own OfferCatalog lists the sub-services.
                '@type': 'OfferCatalog',
                '@id': `${SERVICES_URL}#catalog`,
                name: 'Creative & marketing services',
                provider: PERSEUS_PUBLISHER_REF,
                itemListElement: Object.values(CATEGORIES).map((c) => ({
                  '@type': 'Offer',
                  itemOffered: {
                    '@type': 'Service',
                    name: `${c.title} Services`,
                    serviceType: c.title,
                    description: c.seo.description,
                    provider: PERSEUS_PUBLISHER_REF,
                    areaServed: 'Vancouver, BC',
                    url: `${SITE_URL}/services/${c.slug}`,
                  },
                })),
              },
            ],
          }),
        }}
      />
      <main>
        <ServicesHero crumbs={crumbs} />
        <ServicesCategories />
        <ServicesWebsites />
        <ServicesAds />
        <ServicesProduction />
        <ServicesEditting />
        <ServicesBranding />
        <ServicesSocial />
        <ServicesCta />
      </main>
    </>
  );
};

export default ServicesPage;
