import type { Metadata } from 'next';

import { ArchiveStacks } from '@/components';
import type { Crumb } from '@/components';
import { IMAGEKIT_BASE, SITE_URL } from '@/constants';
import { PERSEUS_PUBLISHER_REF } from '@/constants/blogs';
import { PROJECT_CATEGORIES } from '@/constants/projects';
import { buildBreadcrumbList } from '@/utils/breadcrumbSchema';

const CANONICAL = `${SITE_URL}/projects`;

const TITLE = 'Projects & Case Studies in Vancouver | Perseus Creative Studio';
const DESCRIPTION =
  'The Perseus archive: real client work filed by discipline — production films, website builds, marketing campaigns, social programs, and brand identities, each documented as a case study.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: CANONICAL,
    siteName: 'Perseus Creative Studio',
    locale: 'en_CA',
    type: 'website',
    images: [
      {
        url: `${IMAGEKIT_BASE}/projects-realestate-1.jpg?tr=w-1200,h-630,cm-extract,fo-auto`,
        width: 1200,
        height: 630,
        alt: 'Perseus Creative Studio projects archive',
      },
    ],
  },
};

export default function ProjectsHubPage() {
  // Single source for the trail — feeds both the visible <Breadcrumb> and the
  // BreadcrumbList JSON-LD below.
  const crumbs: Crumb[] = [
    { label: 'Perseus', href: '/' },
    { label: 'Projects' },
  ];

  const categories = Object.values(PROJECT_CATEGORIES);

  return (
    <>
      <script
        id="ld-json-projects-hub"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              buildBreadcrumbList(crumbs, CANONICAL),
              {
                '@type': 'CollectionPage',
                '@id': `${CANONICAL}#webpage`,
                url: CANONICAL,
                name: TITLE,
                description: DESCRIPTION,
                inLanguage: 'en-CA',
                isPartOf: { '@id': `${SITE_URL}/#website` },
                publisher: PERSEUS_PUBLISHER_REF,
                breadcrumb: { '@id': `${CANONICAL}#breadcrumb` },
                mainEntity: { '@id': `${CANONICAL}#categories` },
              },
              {
                '@type': 'ItemList',
                '@id': `${CANONICAL}#categories`,
                name: 'Project categories',
                itemListElement: categories.map((c, i) => ({
                  '@type': 'ListItem',
                  position: i + 1,
                  name: `${c.title} Projects`,
                  url: c.seo.canonicalPath,
                })),
              },
            ],
          }),
        }}
      />
      <main>
        <ArchiveStacks crumbs={crumbs} />
      </main>
    </>
  );
}
