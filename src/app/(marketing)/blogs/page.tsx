import { Metadata } from 'next';
import { BlogGrid, Breadcrumb, type Crumb } from '@/components';
import { OG_IMAGE, PERSEUS_PUBLISHER_REF, SITE_URL } from '@/constants';
import { BLOG_INDEX_FAQS } from '@/constants/blogIndexFaqs';
import { BLOG_PAGE_SIZE } from '@/constants/blogPagination';
import { serializeJsonLd } from '@/lib/blogJsonLd';
import { categoryStats, listCategories, listPublishedSummaries } from '@/lib/blogStore';
import { buildBreadcrumbList } from '@/utils/breadcrumbSchema';
import { firstParam, parsePage } from '@/utils/pagination';

type BlogsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

/** A category is a valid ?category= variant only once it HAS a public post
 *  (so `branding` keeps clamping to /blogs until its first post). */
async function validCategorySlugs(): Promise<Set<string>> {
  return new Set((await categoryStats()).map((c) => c.slug));
}

async function getMaxPage(category: string): Promise<number> {
  const stats = await categoryStats();
  const count = category
    ? (stats.find((c) => c.slug === category)?.count ?? 0)
    : stats.reduce((sum, c) => sum + c.count, 0);
  return Math.max(1, Math.ceil(count / BLOG_PAGE_SIZE));
}

// Self-referencing canonical for every legitimate /blogs variant.
// Per 2026 SEO guidance, paginated and single-filter URLs each get their own
// canonical (not collapsed to /blogs) so deep pages stay indexable and pass
// their own ranking signals.
async function buildBlogsCanonical(category: string, page: number): Promise<{ canonical: string; validCategory: string; clampedPage: number }> {
  const valid = await validCategorySlugs();
  const validCategory = category && valid.has(category) ? category : '';
  const maxPage = await getMaxPage(validCategory);
  const clampedPage = Math.min(Math.max(1, page), maxPage);
  const params = new URLSearchParams();
  if (validCategory) params.set('category', validCategory);
  if (clampedPage > 1) params.set('page', String(clampedPage));
  const qs = params.toString();
  return { canonical: qs ? `${SITE_URL}/blogs?${qs}` : `${SITE_URL}/blogs`, validCategory, clampedPage };
}

const baseMetadata: Metadata = {
  title: 'Blogs & Marketing Insights - Perseus Creative Studio',
  description:
    'In Perseus Creative Studio blog we share our marketing insights, fresh case studies for you to stay one step ahead in your business growth.',
  keywords: [],

  alternates: {
    canonical: 'https://www.perseustudio.com/blogs',
  },

  openGraph: {
    title: 'Blogs & Marketing Insights - Perseus Creative Studio',
    description:
      'In Perseus Creative Studio blog we share our marketing insights, fresh case studies for you to stay one step ahead in your business growth.',
    url: 'https://www.perseustudio.com/blogs',
    siteName: 'Perseus Creative Studio',
    locale: 'en_CA',
    type: 'website',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Perseus Creative Studio Marketing Blog',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Perseus Creative Studio Blog: Marketing, Web, Video & Photo',
    description:
      'Practical guides on digital marketing, websites, video, and photography for Vancouver businesses.',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Perseus Creative Studio Marketing Blog',
      },
    ],
  },
};

export async function generateMetadata({ searchParams }: BlogsPageProps): Promise<Metadata> {
  const params = await searchParams;
  const category = firstParam(params?.category);
  const page = parsePage(firstParam(params?.page));
  const { canonical, validCategory, clampedPage } = await buildBlogsCanonical(category, page);
  // Bespoke copy per category from the DATABASE (blog_categories.seo_*);
  // pagination appends "(Page N)" / "Page N." as before.
  const row = validCategory ? (await listCategories()).find((c) => c.slug === validCategory) : null;
  const fallbackTitle = typeof baseMetadata.title === 'string' ? baseMetadata.title : 'Blogs & Marketing Insights - Perseus Creative Studio';
  const fallbackDescription = typeof baseMetadata.description === 'string' ? baseMetadata.description : '';
  // `||`, not `??`: an empty SEO pair must never serve an empty title. A
  // cleared field comes back as '' rather than null, which `??` would keep.
  const baseTitle = row?.seoTitle || fallbackTitle;
  const baseDescription = row?.seoDescription || fallbackDescription;
  const isPaginated = clampedPage > 1 && canonical.includes('page=');
  const title = isPaginated ? `${baseTitle} (Page ${clampedPage})` : baseTitle;
  const description = isPaginated ? `${baseDescription} Page ${clampedPage}.` : baseDescription;
  return {
    ...baseMetadata,
    title,
    description,
    alternates: { canonical },
    openGraph: { ...baseMetadata.openGraph, url: canonical, title, description },
  };
}

// Single source for the trail — feeds both <Breadcrumb> (threaded through
// <BlogGrid> into the header) and the JSON-LD below.
const BLOGS_CRUMBS: Crumb[] = [
  { label: 'Perseus', href: '/' },
  { label: 'Blogs' },
];

async function blogIndexJsonLd() {
  const orderedPosts = await listPublishedSummaries();
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${SITE_URL}/blogs#collection`,
        url: `${SITE_URL}/blogs`,
        name: 'Perseus Creative Studio Blog',
        description:
          'Practical articles on digital marketing, SEO, web design, videography, and photography for Vancouver businesses.',
        inLanguage: 'en-CA',
        breadcrumb: { '@id': `${SITE_URL}/blogs#breadcrumb` },
        publisher: PERSEUS_PUBLISHER_REF,
        mainEntity: { '@id': `${SITE_URL}/blogs#blog` },
      },
      // The Blog entity itself — every BlogPosting on a post page references
      // this node via `isPartOf`, tying the article graph to one publication.
      {
        '@type': 'Blog',
        '@id': `${SITE_URL}/blogs#blog`,
        url: `${SITE_URL}/blogs`,
        name: 'Perseus Creative Studio Blog',
        description:
          'Practical articles on digital marketing, SEO, web design, videography, and photography for Vancouver businesses.',
        inLanguage: 'en-CA',
        publisher: PERSEUS_PUBLISHER_REF,
        mainEntityOfPage: { '@id': `${SITE_URL}/blogs#collection` },
      },
      buildBreadcrumbList(BLOGS_CRUMBS, `${SITE_URL}/blogs`),
      {
        '@type': 'ItemList',
        '@id': `${SITE_URL}/blogs#articles`,
        name: 'All articles',
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        numberOfItems: orderedPosts.length,
        itemListElement: orderedPosts.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${SITE_URL}${p.href}`,
          name: p.title,
        })),
      },
      {
        '@type': 'FAQPage',
        '@id': `${SITE_URL}/blogs#faqs`,
        inLanguage: 'en-CA',
        isPartOf: { '@id': `${SITE_URL}/blogs#collection` },
        mainEntity: BLOG_INDEX_FAQS.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: f.answer,
          },
        })),
      },
    ],
  };
}

const BlogsPage = async ({ searchParams }: BlogsPageProps) => {
  const params = await searchParams;
  const initialCategory = firstParam(params?.category);
  const initialPage = parsePage(firstParam(params?.page));
  return (
    <main>
      <script id="blog-index-ld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(await blogIndexJsonLd()) }} />
      <BlogGrid initialCategory={initialCategory} initialPage={initialPage} breadcrumb={<Breadcrumb crumbs={BLOGS_CRUMBS} />} />
    </main>
  );
};

export default BlogsPage;
