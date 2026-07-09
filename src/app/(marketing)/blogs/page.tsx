import { Metadata } from 'next';
import { BlogGrid } from '@/components';
import {
  blogPosts,
  BLOG_INDEX_FAQS,
  BLOG_PAGE_SIZE,
  PERSEUS_PUBLISHER_REF,
} from '@/constants/blogs';
import { SITE_URL, OG_IMAGE } from '@/constants';
import { firstParam, parsePage } from '@/utils/pagination';

type BlogsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const VALID_CATEGORY_SLUGS = new Set(blogPosts.map((p) => p.category.slug));

// Per-category title + description copy. Without this the /blogs hub and
// /blogs?category=<slug> variants all serve identical metadata, which
// Semrush (and Google) flag as duplicate. Each entry is intentionally
// substantive — Google penalizes near-duplicate stub descriptions just as
// hard as fully identical ones.
//
// EVERY category that has posts needs an entry — a missing one silently falls
// back to the hub's base metadata, recreating the duplicate-meta problem this
// map exists to prevent. `branding` is absent only because no branding post
// exists yet; add its entry alongside the first post (the dev-time check below
// will nag until then).
const CATEGORY_META: Record<string, { title: string; description: string }> = {
  'digital-marketing': {
    title: 'Digital Marketing Articles for Vancouver Businesses — Perseus',
    description:
      'SEO, paid ads, content, social, and growth strategy guides for Vancouver businesses — practical playbooks from the Perseus team’s client work.',
  },
  production: {
    // Keep base titles ≤61 chars: pagination appends " — Page N" (9 chars)
    // and Semrush flags titles over 70.
    title: 'Video, Photo & Aerial Production for Vancouver — Perseus',
    description:
      'Videography, photography, drone, and visual storytelling guides for Vancouver brands — production, gear, and post-production lessons from the Perseus team.',
  },
  websites: {
    title: 'Websites — Design, Development & UX Articles — Perseus Studio',
    description:
      'Website design, development, UX, and conversion strategy articles for Vancouver businesses — what makes a site fast, credible, and revenue-driving.',
  },
  social: {
    title: 'Social Media Marketing Articles for Vancouver — Perseus',
    description:
      'Social media marketing guides for Vancouver brands — Instagram, Reels, content ideas, and audience-growth tactics from the Perseus team’s client work.',
  },
};

// Dev-time exhaustiveness check for the note above — fires once at module
// evaluation, never in production builds.
if (process.env.NODE_ENV !== 'production') {
  for (const slug of VALID_CATEGORY_SLUGS) {
    if (!CATEGORY_META[slug]) {
      console.warn(
        `[blogs] CATEGORY_META has no entry for category "${slug}" — its ` +
          '?category= view will serve the hub\'s duplicate title/description.',
      );
    }
  }
}

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
        alt: 'Perseus Creative Studio — Marketing Blog',
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
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Perseus Creative Studio — Marketing Blog',
      },
    ],
  },
};

// Paginated and category-filtered URLs each get their own self-referencing
// canonical and remain indexable so deep posts are discoverable.
export async function generateMetadata({
  searchParams,
}: BlogsPageProps): Promise<Metadata> {
  const params = await searchParams;
  const category = firstParam(params?.category);
  const page = parsePage(firstParam(params?.page));

  const canonical = buildBlogsCanonical(category, page);

  // Differentiate title + description across every legitimate /blogs variant
  // so SERPs don't see N identical entries. Category variants get bespoke
  // copy from CATEGORY_META; pagination appends "— Page N" to both fields.
  const validCategory =
    category && VALID_CATEGORY_SLUGS.has(category) ? category : '';
  const categoryMeta = validCategory ? CATEGORY_META[validCategory] : null;

  const fallbackTitle =
    typeof baseMetadata.title === 'string'
      ? baseMetadata.title
      : 'Blogs & Marketing Insights - Perseus Creative Studio';
  const fallbackDescription =
    typeof baseMetadata.description === 'string'
      ? baseMetadata.description
      : '';

  const baseTitle = categoryMeta?.title ?? fallbackTitle;
  const baseDescription = categoryMeta?.description ?? fallbackDescription;

  // Same clamp as buildBlogsCanonical, so title/description can never
  // disagree with the canonical (/blogs?page=999 must say "Page 4" in both).
  const clampedPage = Math.min(Math.max(1, page), getMaxPage(validCategory));

  const isPaginated = clampedPage > 1 && canonical.includes('page=');
  const title = isPaginated ? `${baseTitle} — Page ${clampedPage}` : baseTitle;
  const description = isPaginated
    ? `${baseDescription} Page ${clampedPage}.`
    : baseDescription;

  return {
    ...baseMetadata,
    title,
    description,
    alternates: { canonical },
    openGraph: {
      ...baseMetadata.openGraph,
      url: canonical,
      title,
      description,
    },
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
  const initialPage = parsePage(firstParam(params?.page));

  return (
    <main>
      <script
        id="blog-index-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogIndexJsonLd) }}
      />
      <BlogGrid
        initialCategory={initialCategory}
        initialPage={initialPage}
      />
    </main>
  );
};

export default BlogsPage;
