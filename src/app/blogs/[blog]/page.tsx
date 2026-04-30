import path from 'path';
import fs from 'fs/promises';
import matter from 'gray-matter';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import { Suspense, Children, isValidElement, type ReactNode } from 'react';
import {
  ImageKit,
  TextShimmer,
  Container,
  BlogPost,
  BlogPostSkleton,
  ShareBlogs,
  SmartLink,
  YouTube,
  SmartImage,
} from '@/components';
import TableOfContents from '@/components/Blogs/TableOfContents';
import SidebarCta from '@/components/Blogs/SidebarCta';
import BlogBreadcrumb from '@/components/Blogs/BlogBreadcrumb';
import {
  extractHeadings,
  extractFaqs,
  slugifyHeading,
  countWords,
  readingTimeIso,
  readingMinutes,
} from '@/utils/extractHeadings';
import { blogPosts } from '@/constants/blogs';
import { SITE_URL } from '@/constants';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const IMAGEKIT_BASE = 'https://ik.imagekit.io/perseus';

// Google recommends supplying the article's lead image in 1:1, 4:3, and 16:9
// crops so it can pick the best for each surface (Discover, Top Stories, etc.).
function articleImageSet(imageUrl: string): string[] {
  const base = `${IMAGEKIT_BASE}/${imageUrl}`;
  return [
    `${base}?tr=w-1200,h-1200,cm-extract,fo-auto`,
    `${base}?tr=w-1200,h-900,cm-extract,fo-auto`,
    `${base}?tr=w-1200,h-630,cm-extract,fo-auto`,
  ];
}

const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;

function articleOgImage(imageUrl: string): string {
  return `${IMAGEKIT_BASE}/${imageUrl}?tr=w-${OG_IMAGE_WIDTH},h-${OG_IMAGE_HEIGHT},cm-extract,fo-auto`;
}

function childrenToText(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) => {
      if (typeof child === 'string') return child;
      if (typeof child === 'number') return String(child);
      if (isValidElement<{ children?: ReactNode }>(child))
        return childrenToText(child.props.children);
      return '';
    })
    .join('');
}

function makeHeading(Tag: 'h2' | 'h3' | 'h4') {
  return function HeadingWithId({
    children,
    ...props
  }: {
    children?: ReactNode;
    [k: string]: unknown;
  }) {
    const id = slugifyHeading(childrenToText(children));
    return (
      <Tag id={id} {...props}>
        {children}
      </Tag>
    );
  };
}

// Pre-generate all blog pages at build time (still driven by blogPosts)
export function generateStaticParams() {
  return blogPosts.map((p) => ({ blog: p.slug }));
}

async function loadPostMdx(slug: string, categorySlug: string) {
  const filePath = path.join(
    process.cwd(),
    'src',
    'content',
    'blogs',
    categorySlug,
    `${slug}.mdx`,
  );

  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const { content, data } = matter(raw);
    return { content, data };
  } catch {
    return null;
  }
}

// Per-post SEO (still from blogPosts for now)
export async function generateMetadata({
  params,
}: {
  params: Promise<{ blog: string }>;
}): Promise<Metadata> {
  const { blog } = await params;
  const post = blogPosts.find((p) => p.slug === blog);
  if (!post) return { title: 'Blog not found' };

  const { seo } = post;
  const dateModified = post.updatedAt ?? post.datetime;
  const ogImage = {
    url: articleOgImage(post.imageUrl),
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    alt: post.title,
  };
  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    alternates: { canonical: seo.canonicalPath },
    openGraph: {
      type: seo.ogType,
      title: seo.ogTitle,
      description: seo.ogDescription,
      images: [ogImage],
      url: seo.canonicalPath,
      publishedTime: post.datetime,
      modifiedTime: dateModified,
      section: post.category.title,
      tags: seo.keywords,
      authors: [post.author.name],
    },
    twitter: {
      card: seo.twitterCard,
      title: seo.ogTitle,
      description: seo.ogDescription,
      images: [ogImage],
    },
    robots: seo.robots,
  };
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ blog: string }>;
}) {
  const { blog } = await params;
  const post = blogPosts.find((p) => p.slug === blog);
  if (!post) notFound();

  // Load MDX for this post (if exists). Fallback to description if not.
  const mdx = await loadPostMdx(post.slug, post.category.slug);
  const headings = mdx ? extractHeadings(mdx.content) : [];
  const faqs = mdx ? extractFaqs(mdx.content) : [];
  const wordCount = mdx ? countWords(mdx.content) : 0;
  const readingMin = readingMinutes(wordCount);
  const timeRequired = readingTimeIso(wordCount);

  // Prev/next within the same category, ordered newest → oldest.
  // "prev" = chronologically earlier (older), "next" = chronologically later (newer).
  const categoryPosts = blogPosts
    .filter((p) => p.category.slug === post.category.slug)
    .sort((a, b) => (a.datetime < b.datetime ? 1 : -1));
  const currentIdx = categoryPosts.findIndex((p) => p.slug === post.slug);
  const newerPost = currentIdx > 0 ? categoryPosts[currentIdx - 1] : null;
  const olderPost =
    currentIdx >= 0 && currentIdx < categoryPosts.length - 1
      ? categoryPosts[currentIdx + 1]
      : null;
  const prevPost = olderPost;
  const nextPost = newerPost;

  return (
    <main className="pb-16 lg:pb-24">
      {/* JSON-LD: BreadcrumbList + BlogPosting in a single @graph so the
          two nodes can cross-reference via @id. */}
      <Script
        id="ld-json"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'BreadcrumbList',
                '@id': `${post.seo.canonicalPath}#breadcrumb`,
                itemListElement: [
                  {
                    '@type': 'ListItem',
                    position: 1,
                    name: 'Home',
                    item: SITE_URL,
                  },
                  {
                    '@type': 'ListItem',
                    position: 2,
                    name: 'Blogs',
                    item: `${SITE_URL}/blogs`,
                  },
                  {
                    '@type': 'ListItem',
                    position: 3,
                    name: post.category.title,
                    item: `${SITE_URL}/blogs?category=${post.category.slug}`,
                  },
                  {
                    '@type': 'ListItem',
                    position: 4,
                    name: post.title,
                    item: post.seo.canonicalPath,
                  },
                ],
              },
              {
                ...post.seo.schema,
                '@id': `${post.seo.canonicalPath}#article`,
                description: post.seo.description,
                keywords: post.seo.keywords,
                articleSection: post.category.title,
                inLanguage: 'en-CA',
                url: post.seo.canonicalPath,
                isAccessibleForFree: true,
                dateModified: post.updatedAt ?? post.datetime,
                image: articleImageSet(post.imageUrl),
                mainEntityOfPage: {
                  '@type': 'WebPage',
                  '@id': post.seo.canonicalPath,
                },
                breadcrumb: {
                  '@id': `${post.seo.canonicalPath}#breadcrumb`,
                },
                wordCount,
                timeRequired,
                ...(headings.length > 0 && {
                  tableOfContents: headings
                    .filter((h) => h.level === 2)
                    .map((h) => h.text)
                    .join('\n'),
                }),
              },
              ...(faqs.length > 0
                ? [
                    {
                      '@type': 'FAQPage',
                      '@id': `${post.seo.canonicalPath}#faqs`,
                      inLanguage: 'en-CA',
                      isPartOf: { '@id': `${post.seo.canonicalPath}#article` },
                      mainEntity: faqs.map((f) => ({
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

      {prevPost && <link rel="prev" href={prevPost.seo.canonicalPath} />}
      {nextPost && <link rel="next" href={nextPost.seo.canonicalPath} />}

      <article aria-labelledby="post-title">
        <header className="relative h-[460px] w-full xl:h-[420px] overflow-hidden">
          <Container>
            <ImageKit
              src={post.imageUrl}
              alt={post.title}
              fill
              sizes="100vw"
              priority
              className="object-cover object-center pointer-events-none opacity-30 bg-background -z-10"
            />
            <div className="py-24 sm:py-32">
              <BlogBreadcrumb
                crumbs={[
                  { label: 'Home', href: '/' },
                  { label: 'Blogs', href: '/blogs' },
                  {
                    label: post.category.title,
                    href: `/blogs?category=${post.category.slug}`,
                  },
                  { label: post.title },
                ]}
              />
              <div className="flex flex-col justify-between lg:flex-row lg:items-center">
                <div className="mb-2 flex items-center space-x-3 lg:mb-0">
                  <span className="mb-4 block text-sm leading-sm ">
                    By{' '}
                    <Link href="/">
                      <TextShimmer>{post.author.name}</TextShimmer>
                    </Link>
                    <time className="font-normal" dateTime={post.datetime}>
                      {' '}
                      &middot; {post.date}
                    </time>
                    {post.updatedAt && post.updatedAt !== post.datetime && (
                      <>
                        {' '}
                        &middot;{' '}
                        <time
                          className="font-normal text-black/60"
                          dateTime={post.updatedAt}
                        >
                          Updated{' '}
                          {new Date(post.updatedAt).toLocaleDateString(
                            'en-US',
                            {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              timeZone: 'UTC',
                            },
                          )}
                        </time>
                      </>
                    )}
                    {wordCount > 0 && (
                      <span className="text-black/60">
                        {' '}
                        &middot; {readingMin} min read &middot;{' '}
                        {wordCount.toLocaleString('en-US')} words
                      </span>
                    )}
                  </span>
                </div>
              </div>

              <h1
                id="post-title"
                className="mb-6 max-w-5xl text-2xl leading-2xl font-bold text-black sm:text-3xl sm:leading-3xl lg:text-4xl lg:leading-4xl"
              >
                {post.title}
              </h1>

              <Link
                href={`/blogs?category=${post.category.slug}`}
                className="text-sm leading-sm text-black"
              >
                Category: {post.category.title}
              </Link>
              <ShareBlogs
                title={post.title}
                slug={post.slug}
                canonicalPath={post.seo?.canonicalPath}
              />
            </div>
          </Container>
        </header>

        <section className="pt-8">
          <Container>
            <div className="xl:grid xl:grid-cols-[1fr_220px] xl:gap-10 xl:items-start">
              {/* Desktop sidebar */}
              <aside className="hidden xl:flex xl:flex-col xl:gap-4 xl:col-start-2 xl:row-start-1 xl:sticky xl:top-24">
                {headings.length >= 2 && (
                  <TableOfContents headings={headings} variant="desktop" />
                )}
                <SidebarCta categorySlug={post.category.slug} />
              </aside>

              {/* Main content */}
              <div className="xl:col-start-1 xl:row-start-1">
                {/* Mobile TOC — inside the tall content column so sticky has room to work */}
                {headings.length >= 2 && (
                  <div className="xl:hidden">
                    <TableOfContents headings={headings} variant="mobile" />
                  </div>
                )}
                {mdx ? (
                  <div
                    className="
                    sm:text-justify
                  text-black/90 text-md leading-md
                    [&>h2]:scroll-mt-24 [&>h2]:mt-12 [&>h2]:mb-3 [&>h2]:text-2xl sm:[&>h2]:text-3xl [&>h2]:font-bold [&>h2]:text-black
                    [&>h3]:scroll-mt-24 [&>h3]:mt-8 [&>h3]:mb-2 [&>h3]:text-lg  sm:[&>h3]:text-xl [&>h3]:font-semibold [&>h3]:text-black
                    [&>h4]:scroll-mt-24 [&>h4]:mt-6 [&>h4]:mb-2 [&>h4]:text-md  sm:[&>h4]:text-lg [&>h4]:font-semibold [&>h4]:text-black
                  [&_a]:text-black [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:opacity-80
                    [&>ul]:my-4 [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:text-sm [&>ul]:leading-sm
                    [&>ol]:my-4 [&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:text-sm [&>ol]:leading-sm
                    [&_li]:my-1
                    [&>blockquote]:my-6 [&>blockquote]:border-l-2 [&>blockquote]:border-black/20 [&>blockquote]:pl-4 [&>blockquote]:text-black/80
                    [&>hr]:my-10 [&>hr]:border-black/20
                    [&>pre]:my-6 [&>pre]:overflow-x-auto [&>pre]:rounded-xl [&>pre]:bg-black/5 [&>pre]:p-4
                    [&_code]:rounded [&_code]:bg-black/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-black
                    [&_table]:my-8
                    [&_table]:w-full
                    [&_table]:border-collapse
                    [&_th]:border [&_th]:border-white/20 [&_th]:p-3 [&_th]:align-top
                    [&_td]:border [&_td]:border-black/20 [&_td]:p-3 [&_td]:align-top [&_td]:text-sm
                  [&_thead_th]:bg-black [&_th]:text-white
                  [&_tbody_tr:nth-child(odd)]:bg-black/10
                  [&_tbody_tr:nth-child(even)]:bg-white
                  hover:[&_tbody_tr]:bg-black/10
                  "
                  >
                    <MDXRemote
                      source={mdx.content}
                      options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
                      components={{
                        YouTube,
                        a: SmartLink,
                        img: SmartImage,
                        h2: makeHeading('h2'),
                        h3: makeHeading('h3'),
                        h4: makeHeading('h4'),
                      }}
                    />
                  </div>
                ) : (
                  <p className="text-black text-md leading-md">
                    {post.description}
                  </p>
                )}

                {/* Mobile CTA — desktop sidebar is hidden on mobile */}
                <div className="xl:hidden mt-12">
                  <SidebarCta categorySlug={post.category.slug} />
                </div>
              </div>
            </div>
          </Container>
        </section>
      </article>

      {(prevPost || nextPost) && (
        <nav aria-label="Article navigation" className="mt-12">
          <Container>
            <div className="grid gap-4 sm:grid-cols-2">
              {prevPost ? (
                <Link
                  href={prevPost.href}
                  rel="prev"
                  className="group flex items-center gap-3 rounded-2xl bg-background-contrast p-5 transition-colors duration-500 hover:bg-background-contrast-black/10"
                >
                  <ArrowLeft
                    className="h-5 w-5 shrink-0 text-black/60 transition-transform group-hover:-translate-x-0.5 group-hover:text-black"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-black/60">
                      Previous in {post.category.title}
                    </p>
                    <h3 className="mt-1 line-clamp-2 text-sm leading-sm font-semibold text-black">
                      {prevPost.title}
                    </h3>
                  </div>
                </Link>
              ) : (
                <span className="hidden sm:block" aria-hidden="true" />
              )}
              {nextPost ? (
                <Link
                  href={nextPost.href}
                  rel="next"
                  className="group flex items-center justify-end gap-3 rounded-2xl bg-background-contrast p-5 transition-colors duration-500 hover:bg-background-contrast-black/10 sm:text-right"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-black/60">
                      Next in {post.category.title}
                    </p>
                    <h3 className="mt-1 line-clamp-2 text-sm leading-sm font-semibold text-black">
                      {nextPost.title}
                    </h3>
                  </div>
                  <ArrowRight
                    className="h-5 w-5 shrink-0 text-black/60 transition-transform group-hover:translate-x-0.5 group-hover:text-black"
                    aria-hidden="true"
                  />
                </Link>
              ) : (
                <span className="hidden sm:block" aria-hidden="true" />
              )}
            </div>
          </Container>
        </nav>
      )}

      <section aria-labelledby="related-heading">
        <Container>
          <h3
            id="related-heading"
            className="mt-16 text-2xl leading-2xl font-bold sm:text-3xl lg:text-4xl"
          >
            Related Articles About {post.category.title}
          </h3>
          <hr className="my-8 border-black" />
        </Container>

        <Suspense fallback={<BlogPostSkleton />}>
          <BlogPost
            limit={4}
            showFilters={false}
            enableFiltering={false}
            forcedCategorySlug={post.category.slug}
            excludeSlug={post.slug}
          />
        </Suspense>
      </section>
    </main>
  );
}
