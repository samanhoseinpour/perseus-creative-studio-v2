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
import { getCategoryProjectSummaries } from '@/lib/projectsStore';
import { latestYear } from '@/components/Projects/utils';
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
    service?: string | string[];
    industry?: string | string[];
    location?: string | string[];
    page?: string | string[];
  }>;
}) {
  const { category } = await params;
  const data = PROJECT_CATEGORIES[category];
  if (!data) notFound();

  // Filter + page state live in the URL (?service= / ?industry= / ?location= /
  // ?page=), read server-side like the /blogs index so the filtered, paged grid
  // ships in the initial HTML. All of it canonicalises to the bare category
  // path (see generateMetadata), so none of these query views are indexed or
  // emitted to the sitemap. Every param goes through firstParam(): a repeated
  // key (?service=a&service=b) arrives as an array, not the string the naive
  // type suggests.
  const { service, industry, location, page } = await searchParams;
  const initialService = firstParam(service);
  const initialIndustry = firstParam(industry);
  const initialLocation = firstParam(location);
  const initialPage = parsePage(firstParam(page));

  // The category's public cards from the store — fetched once here and
  // threaded into the sections below, so they stay sync components.
  const projects = await getCategoryProjectSummaries(category);
  const live = projects.length > 0;

  // Single source for the trail — feeds both the visible <Breadcrumb> and the
  // BreadcrumbList JSON-LD below.
  const crumbs: Crumb[] = [
    { label: 'Perseus', href: '/' },
    { label: 'Projects', href: '/projects' },
    { label: data.title },
  ];

  // Case studies with live detail pages, newest-first (the visible grid's
  // default order) — the only entries whose URLs exist, so the only ones the
  // CollectionPage's ItemList may claim.
  const detailReady = [...projects]
    .sort((a, b) => latestYear(b.year) - latestYear(a.year))
    .filter((p) => p.hasDetail);

  return (
    <>
      <script
        id="ld-json-project-category"
        type="application/ld+json"
        // The ItemList carries DB-sourced project titles — escape `<` so a
        // value containing `</script>` can't break out of the element.
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
                ...(detailReady.length
                  ? {
                      mainEntity: {
                        '@id': `${data.seo.canonicalPath}#case-studies`,
                      },
                    }
                  : {}),
              },
              // The category's live case studies — detail-ready only, so every
              // listed URL resolves; mirrors the hub page's category ItemList.
              ...(detailReady.length
                ? [
                    {
                      '@type': 'ItemList',
                      '@id': `${data.seo.canonicalPath}#case-studies`,
                      name: `${data.title} case studies`,
                      itemListElement: detailReady.map((p, i) => ({
                        '@type': 'ListItem',
                        position: i + 1,
                        name: p.title,
                        url: `${SITE_URL}/projects/${category}/${p.slug}`,
                      })),
                    },
                  ]
                : []),
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
          }).replace(/</g, '\\u003c'),
        }}
      />
      <main className="pt-28 sm:pt-32">
        {live ? (
          <CaseFileIndex
            data={data}
            projects={projects}
            crumbs={crumbs}
            initialService={initialService}
            initialIndustry={initialIndustry}
            initialLocation={initialLocation}
            initialPage={initialPage}
          />
        ) : (
          <CategoryComingSoon data={data} crumbs={crumbs} />
        )}
        <CategoryProof data={data} projects={projects} />
        {/* Everything below is off-screen on load. It stays in the server HTML
            (links/headings crawlable) but the browser skips its layout/paint
            until scrolled near — trims initial render on this image- and
            SVG-heavy route without an ssr:false SEO cost. */}
        <div className="cv-auto">
          <ProjectCategoryServices data={data} projects={projects} />
        </div>
        <div className="cv-auto">
          <OtherProjectCategories currentSlug={data.slug} />
        </div>
        {data.faqs?.length ? (
          <div className="cv-auto">
            <Faqs
              title={`${data.title} — questions, answered`}
              description={`Scope, timelines, and how ${data.title.toLowerCase()} engagements actually run. If your question isn’t here, get in touch.`}
              faqs={data.faqs}
            />
          </div>
        ) : null}
        <div className="cv-auto">
          <FromTheBlog
            categorySlug={data.slug}
            categoryTitle={data.title}
            seperatorTitle="Reading"
          />
        </div>
        <div className="cv-auto">
          <NextFileCta cta={data.cta} />
        </div>
      </main>
    </>
);
}
