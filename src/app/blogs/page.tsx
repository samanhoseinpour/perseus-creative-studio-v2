import { Metadata } from 'next';
import Script from 'next/script';
import { BlogGrid } from '@/components';
import { blogPosts, BLOG_INDEX_FAQS } from '@/constants/blogs';
import { SITE_URL } from '@/constants';

type BlogsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
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

// Internal search-result URLs (e.g. /blogs?query=seo) carry the same canonical
// as /blogs, but we additionally tell crawlers not to index them so they don't
// compete with the hub or surface low-value pages in SERPs.
export async function generateMetadata({
  searchParams,
}: BlogsPageProps): Promise<Metadata> {
  const params = await searchParams;
  const hasQuery = Boolean(
    firstParam(params?.query) || firstParam(params?.search),
  );

  if (!hasQuery) return baseMetadata;

  return {
    ...baseMetadata,
    robots: { index: false, follow: true },
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
      publisher: {
        '@type': 'Organization',
        name: 'Perseus Creative Studio',
        url: SITE_URL,
        logo: {
          '@type': 'ImageObject',
          url: `${SITE_URL}/logo-black.png`,
        },
      },
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

  return (
    <main>
      <Script
        id="blog-index-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogIndexJsonLd) }}
      />
      <BlogGrid initialCategory={initialCategory} initialQuery={initialQuery} />
    </main>
  );
};

export default BlogsPage;
