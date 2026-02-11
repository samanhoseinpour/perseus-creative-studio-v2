import type { MetadataRoute } from 'next';
import { blogPosts } from '@/app/constants/blogs';

const BASE_URL = 'https://www.perseustudio.com';

function toDate(input?: string | Date): Date {
  if (!input) return new Date();
  if (input instanceof Date) return input;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? new Date() : d;
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
      priority: 0.5,
      images: ['https://ik.imagekit.io/perseus/navbar-blogs.avif'],
    },
  ];

  // Blog post URLs
  const blogEntries: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${BASE_URL}/blogs/${post.slug}`,
    // Prefer an ISO-like field if you have one. Falls back safely.
    lastModified: toDate(
      (post as any).updatedAt ?? (post as any).datetime ?? (post as any).date,
    ),
    changeFrequency: 'monthly',
    priority: 0.6,
    images: [`https://ik.imagekit.io/perseus/${post.imageUrl}`],
  }));

  return [...staticEntries, ...blogEntries];
}
