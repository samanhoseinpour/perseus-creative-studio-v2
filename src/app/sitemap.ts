import type { MetadataRoute } from 'next';
import { blogPosts, BLOG_AUTHORS, BLOG_PAGE_SIZE } from '@/constants/blogs';

const BASE_URL = 'https://www.perseustudio.com';

function toDate(input?: string | Date): Date {
  if (!input) return new Date();
  if (input instanceof Date) return input;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

// Freshest post date in a slice, for accurate sitemap `lastModified` signals.
function latestPostDate(posts: typeof blogPosts): Date {
  return posts.reduce((acc, p) => {
    const d = toDate(p.updatedAt ?? p.datetime ?? p.date);
    return d > acc ? d : acc;
  }, new Date(0));
}

export default function sitemap(): MetadataRoute.Sitemap {
  // Static site pages
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 1,
      images: ['https://ik.imagekit.io/perseus/logo-black.png'],
    },
    {
      url: `${BASE_URL}/services`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.9,
      images: ['https://ik.imagekit.io/perseus/navbar-contact.jpeg'],
    },
    {
      url: `${BASE_URL}/projects`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
      images: ['https://ik.imagekit.io/perseus/navbar-projects-2.jpg'],
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.7,
      images: ['https://ik.imagekit.io/perseus/navbar-about-2.jpeg'],
    },
    {
      url: `${BASE_URL}/services/websites`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.6,
      images: ['https://ik.imagekit.io/perseus/navbar-website.jpeg'],
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
      images: ['https://ik.imagekit.io/perseus/logo-black.png'],
    },
    {
      url: `${BASE_URL}/blogs`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
      images: ['https://ik.imagekit.io/perseus/navbar-blogs.avif'],
    },
    {
      url: `${BASE_URL}/blogs/authors`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/frequently-asked-questions`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
      images: ['https://ik.imagekit.io/perseus/logo-white.png'],
    },
    {
      url: `${BASE_URL}/contact/careers`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
      images: ['https://ik.imagekit.io/perseus/logo-white.png'],
    },
  ];

  // Blog post URLs
  const blogEntries: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${BASE_URL}/blogs/${post.slug}`,
    lastModified: toDate(post.updatedAt ?? post.datetime ?? post.date),
    changeFrequency: 'monthly',
    priority: 0.6,
    images: [`https://ik.imagekit.io/perseus/${post.imageUrl}`],
  }));

  // Paginated + category-filtered blog index URLs. /blogs (page 1, no filter)
  // is already in `staticEntries`, so this list only emits the extras.
  // Each entry's canonical exists in `app/blogs/page.tsx` and is indexable,
  // so crawlers can use these to discover deep-archive posts directly.
  const blogIndexExtraEntries: MetadataRoute.Sitemap = [];

  const maxPageAllPosts = Math.max(
    1,
    Math.ceil(blogPosts.length / BLOG_PAGE_SIZE),
  );
  const allPostsLastModified = latestPostDate(blogPosts);
  for (let page = 2; page <= maxPageAllPosts; page++) {
    blogIndexExtraEntries.push({
      url: `${BASE_URL}/blogs?page=${page}`,
      lastModified: allPostsLastModified,
      changeFrequency: 'weekly',
      priority: 0.5,
    });
  }

  const categorySlugs = Array.from(
    new Set(blogPosts.map((p) => p.category.slug)),
  );
  for (const slug of categorySlugs) {
    const inCategory = blogPosts.filter((p) => p.category.slug === slug);
    const lastModified = latestPostDate(inCategory);
    const maxPage = Math.max(
      1,
      Math.ceil(inCategory.length / BLOG_PAGE_SIZE),
    );
    for (let page = 1; page <= maxPage; page++) {
      blogIndexExtraEntries.push({
        url:
          page === 1
            ? `${BASE_URL}/blogs?category=${slug}`
            : `${BASE_URL}/blogs?category=${slug}&page=${page}`,
        lastModified,
        changeFrequency: 'weekly',
        priority: 0.5,
      });
    }
  }

  // Author profile pages, including paginated "More articles" tails.
  // restPosts (everything except the latest post, which is the Highlights
  // feature) is what each author page paginates — so we emit page=2..N
  // when an author has enough posts to need them.
  const authorEntries: MetadataRoute.Sitemap = [];
  for (const author of Object.values(BLOG_AUTHORS)) {
    const authorPosts = blogPosts.filter((p) => p.author.href === author.href);
    const lastModified = authorPosts.length
      ? latestPostDate(authorPosts)
      : new Date();
    authorEntries.push({
      url: `${BASE_URL}${author.href}`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.4,
    });

    const restCount = Math.max(0, authorPosts.length - 1);
    const maxPage = Math.max(1, Math.ceil(restCount / BLOG_PAGE_SIZE));
    for (let page = 2; page <= maxPage; page++) {
      authorEntries.push({
        url: `${BASE_URL}${author.href}?page=${page}`,
        lastModified,
        changeFrequency: 'monthly',
        priority: 0.3,
      });
    }
  }

  return [
    ...staticEntries,
    ...blogIndexExtraEntries,
    ...blogEntries,
    ...authorEntries,
  ];
}
