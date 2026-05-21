import { Metadata } from 'next';
import Script from 'next/script';
import { BlogGrid } from '@/components';
import {
  blogPosts,
  BLOG_INDEX_FAQS,
  BLOG_PAGE_SIZE,
  PERSEUS_PUBLISHER_REF,
} from '@/constants/blogs';
import { SITE_URL } from '@/constants';
import { firstParam, parsePage } from '@/utils/pagination';

type BlogsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const VALID_CATEGORY_SLUGS = new Set(blogPosts.map((p) => p.category.slug));

function getMaxPage(category: string): number {
  const filtered = category
    ? blogPosts.filter((p) => p.category.slug === category)
    : blogPosts;
  return Math.max(1, Math.ceil(filtered.length / BLOG_PAGE_SIZE));
}

// Self-referencing canonical for every legitimate /blogs variant.
// Per 2026 SEO guidance, paginated and single-filter URLs each get their own
// canonical (not collapsed to /blogs) so deep pages stay indexable and pass
// their own ranking signals.
function buildBlogsCanonical(category: string, page: number): string {
  const validCategory =
    category && VALID_CATEGORY_SLUGS.has(category) ? category : '';
  const maxPage = getMaxPage(validCategory);
  const clampedPage = Math.min(Math.max(1, page), maxPage);

  const params = new URLSearchParams();
  if (validCategory) params.set('category', validCategory);
  if (clampedPage > 1) params.set('page', String(clampedPage));

  const qs = params.toString();
  return qs ? `${SITE_URL}/blogs?${qs}` : `${SITE_URL}/blogs`;
}

const baseMetadata: Metadata = {
  title: 'Blogs & Digital Marketing Insights - Perseus Creative Studio',
  description:
    'In Perseus Creative Studio blog we share our digital marketing insights, fresh case studies for you to stay one step ahead in your business growth.',
  keywords: [],

  alternates: {
    canonical: 'https://www.perseustudio.com/blogs',
  },

  openGraph: {
    title: 'Blogs & Digital Marketing Insights - Perseus Creative Studio',
    description:
      'In Perseus Creative Studio blog we share our digital marketing insights, fresh case studies for you to stay one step ahead in your business growth.',
    url: 'https://www.perseustudio.com/blogs',
    siteName: 'Perseus Creative Studio',
    locale: 'en_CA',
    type: 'website',
    images: [
      {
        url: 'https://ik.imagekit.io/perseus/navbar-blogs.avif?tr=w-1200,h-630,cm-extract,fo-auto',
        width: 1200,
        height: 630,
        alt: 'Perseus Creative Studio — Digital Marketing Blog',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Perseus Creative Studio Blog — Marketing, Web, Video & Photo',
    description:
      'Practical guides on digital marketing, websites, video, and photography for Vancouver businesses.',
    images: [
      {
        url: 'https://ik.imagekit.io/perseus/navbar-blogs.avif?tr=w-1200,h-630,cm-extract,fo-auto',
        width: 1200,
        height: 630,
        alt: 'Perseus Creative Studio — Digital Marketing Blog',
      },
    ],
  },
};

// Internal search-result URLs (e.g. /blogs?query=seo) stay self-canonical but
// carry `noindex` so they don't compete with the hub in SERPs.
// Paginated and category-filtered URLs each get their own self-referencing
// canonical and remain indexable so deep posts are discoverable.
export async function generateMetadata({
  searchParams,
}: BlogsPageProps): Promise<Metadata> {
  const params = await searchParams;
  const category = firstParam(params?.category);
  const page = parsePage(firstParam(params?.page));
  const hasQuery = Boolean(
    firstParam(params?.query) || firstParam(params?.search),
  );

  const canonical = buildBlogsCanonical(category, page);

  // Differentiate paginated titles so SERPs don't see N identical entries.
  const baseTitle =
    typeof baseMetadata.title === 'string'
      ? baseMetadata.title
      : 'Blogs & Digital Marketing Insights - Perseus Creative Studio';
  const isPaginated = page > 1 && canonical.includes('page=');
  const title = isPaginated ? `${baseTitle} — Page ${page}` : baseTitle;

  return {
    ...baseMetadata,
    title,
    alternates: { canonical },
    openGraph: {
      ...baseMetadata.openGraph,
      url: canonical,
      title,
    },
    ...(hasQuery ? { robots: { index: false, follow: true } } : {}),
  };
}

// Posts sorted newest -> oldest so the ItemList matches the rendered grid
// and the `ItemListOrderDescending` claim below.
const orderedPosts = [...blogPosts].sort((a, b) => {
  const at = Date.parse(a.datetime);
  const bt = Date.parse(b.datetime);
  const aTime = Number.isFinite(at) ? at : 0;
  const bTime = Number.isFinite(bt) ? bt : 0;
  if (bTime !== aTime) return bTime - aTime;
  return b.id - a.id;
});

const blogIndexJsonLd = {
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
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${SITE_URL}/blogs#breadcrumb`,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Perseus',
          item: SITE_URL,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Blogs',
          item: `${SITE_URL}/blogs`,
        },
      ],
    },
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

const BlogsPage = async ({ searchParams }: BlogsPageProps) => {
  const params = await searchParams;
  const initialCategory = firstParam(params?.category);
  const initialQuery = firstParam(params?.query) || firstParam(params?.search);
  const initialPage = parsePage(firstParam(params?.page));

  return (
    <main>
      <Script
        id="blog-index-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogIndexJsonLd) }}
      />
      <BlogGrid
        initialCategory={initialCategory}
        initialQuery={initialQuery}
        initialPage={initialPage}
      />
    </main>
  );
};

export default BlogsPage;
