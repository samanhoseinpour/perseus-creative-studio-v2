import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import ArticlePage from '@/components/Blogs/post/ArticlePage';
import { SITE_URL, X_HANDLE, robotsWithPreviewLimits } from '@/constants';
import { xHandleFromSameAs } from '@/lib/blogJsonLd';
import { getPublishedPost, listPublishedParams, type PublishedPost } from '@/lib/blogStore';
import { heroOgUrl } from '@/utils/images';

const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;

// Prerender every published post (the projects/[project] precedent); an
// unknown slug on demand is notFound() without touching the per-slug cache.
export async function generateStaticParams() {
  return listPublishedParams();
}

/** robotsWithPreviewLimits mirrors the base into googleBot, so an override
 *  deep-merges into BOTH or the two meta tags disagree. Null = identity. */
function robotsFor(seo: PublishedPost['seo']): Metadata['robots'] {
  const base = robotsWithPreviewLimits(seo.robots) as Record<string, unknown> & { googleBot?: Record<string, unknown> };
  if (!seo.robotsExtra) return base;
  return { ...base, ...seo.robotsExtra, googleBot: { ...(base.googleBot ?? {}), ...seo.robotsExtra } };
}

export async function generateMetadata({ params }: { params: Promise<{ blog: string }> }): Promise<Metadata> {
  const { blog } = await params;
  const view = await getPublishedPost(blog);
  if (!view) return { title: 'Blog not found' };
  const { seo } = view;
  const ogImage = { url: heroOgUrl(seo.ogImage), width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT, alt: view.imageAlt };
  return {
    title: seo.title,
    description: seo.description,
    ...(seo.emitLegacyMetaKeywords ? { keywords: seo.focusKeywords } : {}),
    alternates: { canonical: seo.canonicalUrl },
    openGraph: {
      type: 'article',
      title: seo.ogTitle,
      description: seo.ogDescription,
      images: [ogImage],
      url: seo.canonicalUrl,
      publishedTime: view.publishedDay,
      modifiedTime: view.modifiedDay,
      section: view.category.title,
      tags: seo.focusKeywords,
      authors: [`${SITE_URL}${view.author.href}`],
    },
    twitter: {
      card: seo.twitterCard as 'summary_large_image' | 'summary',
      title: seo.ogTitle,
      description: seo.ogDescription,
      images: [ogImage],
      site: X_HANDLE,
      creator: xHandleFromSameAs(view.author.sameAs) ?? X_HANDLE,
    },
    robots: robotsFor(seo),
  };
}

export default async function BlogPage({ params }: { params: Promise<{ blog: string }> }) {
  const { blog } = await params;
  const view = await getPublishedPost(blog);
  if (!view) notFound();
  return <ArticlePage view={view} />;
}
