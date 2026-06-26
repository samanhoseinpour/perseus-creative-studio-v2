import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import {
  CaseFileIndex,
  CategoryComingSoon,
  CategoryProof,
  ProjectCategoryServices,
  OtherProjectCategories,
  Faqs,
  FromTheBlog,
  NextFileCta,
} from '@/components';
import type { Crumb } from '@/components';
import { SITE_URL } from '@/constants';
import { PERSEUS_PUBLISHER_REF } from '@/constants/blogs';
import { PROJECT_CATEGORIES } from '@/constants/projects';
import { buildBreadcrumbList } from '@/utils/breadcrumbSchema';
import { firstParam, parsePage } from '@/utils/pagination';

export function generateStaticParams() {
  return Object.keys(PROJECT_CATEGORIES).map((category) => ({ category }));
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ page?: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const data = PROJECT_CATEGORIES[category];
  if (!data) return { title: 'Projects not found' };

  // Paginated views get a page-suffixed <title> AND <meta description> so
  // duplicate-meta audits stay clean — mirrors the /blogs hub: the title gets
  // " — Page N", the description gets " Page N." appended. The canonical still
  // points at the unsuffixed base path (filtered and paginated categories all
  // canonicalise to /projects/<category>).
  const page = parsePage(firstParam((await searchParams).page));
  const paginated = page > 1;
  const title = paginated ? `${data.seo.title} — Page ${page}` : data.seo.title;
  const description = paginated
    ? `${data.seo.description} Page ${page}.`
    : data.seo.description;

  return {
    title,
    description,
    alternates: { canonical: data.seo.canonicalPath },
    openGraph: {
      title,
      description,
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

export default async function ProjectCategoryRoute({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{
    service?: string;
    industry?: string;
    location?: string;
    page?: string;
  }>;
}) {
  const { category } = await params;
  const data = PROJECT_CATEGORIES[category];
  if (!data) notFound();

  // Filter + page state live in the URL (?service= / ?industry= / ?location= /
  // ?page=), read server-side like the /blogs index so the filtered, paged grid
  // ships in the initial HTML. All of it canonicalises to the bare category
  // path (see generateMetadata), so none of these query views are indexed or
  // emitted to the sitemap.
  const { service, industry, location, page } = await searchParams;
  const initialPage = parsePage(firstParam(page));

  const live = data.projects.length > 0;

  // Single source for the trail — feeds both the visible <Breadcrumb> and the
  // BreadcrumbList JSON-LD below.
  const crumbs: Crumb[] = [
    { label: 'Perseus', href: '/' },
    { label: 'Projects', href: '/projects' },
    { label: data.title },
  ];

  return (
    <>
      <script
        id="ld-json-project-category"
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
                // Per-case-study ItemList is omitted while project detail pages
                // are torn down — the CreativeWork URLs it emitted pointed at
                // /projects/<category>/<project>, which no longer exists.
              },
              // Discipline Q&A — emitted only when the category carries FAQs.
              ...(data.faqs?.length
                ? [
                    {
                      '@type': 'FAQPage',
                      '@id': `${data.seo.canonicalPath}#faqs`,
                      inLanguage: 'en-CA',
                      isPartOf: { '@id': `${data.seo.canonicalPath}#webpage` },
                      mainEntity: data.faqs.map((f) => ({
                        '@type': 'Question',
                        name: f.question,
                        acceptedAnswer: {
                          '@type': 'Answer',
                          text: f.answer,
                        },
                      })),
                    },
                  ]
                : []),
            ],
          }),
        }}
      />
      <main className="pt-28 sm:pt-32">
        {live ? (
          <CaseFileIndex
            data={data}
            crumbs={crumbs}
            initialService={service}
            initialIndustry={industry}
            initialLocation={location}
            initialPage={initialPage}
          />
        ) : (
          <CategoryComingSoon data={data} crumbs={crumbs} />
        )}
        <CategoryProof data={data} />
        <ProjectCategoryServices data={data} />
        <OtherProjectCategories currentSlug={data.slug} />
        {data.faqs?.length ? (
          <Faqs
            title={`${data.title} — questions, answered`}
            description={`Scope, timelines, and how ${data.title.toLowerCase()} engagements actually run. If your question isn’t here, get in touch.`}
            faqs={data.faqs}
          />
        ) : null}
        <FromTheBlog
          categorySlug={data.slug}
          categoryTitle={data.title}
          seperatorTitle="Reading"
        />
        <NextFileCta cta={data.cta} />
      </main>
    </>
);
}
