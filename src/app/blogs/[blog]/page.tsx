import path from 'path';
import fs from 'fs/promises';
import matter from 'gray-matter';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';

import { Suspense } from 'react';
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
} from '@/app/components';
import { blogPosts } from '@/app/constants/blogs';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';

// Pre-generate all blog pages at build time (still driven by blogPosts)
export function generateStaticParams() {
  return blogPosts.map((p) => ({ blog: p.slug }));
}

async function loadPostMdx(slug: string, categorySlug: string) {
  const filePath = path.join(
    process.cwd(),
    'src',
    'app',
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
  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    alternates: { canonical: seo.canonicalPath },
    openGraph: {
      type: seo.ogType,
      title: seo.ogTitle,
      description: seo.ogDescription,
      images: [seo.ogImage],
      url: seo.canonicalPath,
    },
    twitter: {
      card: seo.twitterCard,
      title: seo.ogTitle,
      description: seo.ogDescription,
      images: [seo.ogImage],
    },
    robots: {
      index: seo.robots.includes('index'),
      follow: seo.robots.includes('follow'),
    },
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

  return (
    <main className="pb-16 lg:pb-24">
      {/* JSON-LD Schema.org */}
      <Script
        id="ld-json-blog"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            ...post.seo.schema,
          }),
        }}
      />

      <header className="relative h-[460px] w-full xl:h-[420px] overflow-hidden">
        <Container>
          <ImageKit
            src={post.imageUrl}
            alt={post.title}
            fill
            sizes="100vw"
            className="object-cover object-center pointer-events-none opacity-30 bg-background -z-10"
          />
          <div className="py-24 sm:py-32">
            <div className="flex flex-col justify-between lg:flex-row lg:items-center">
              <div className="mb-2 flex items-center space-x-3 lg:mb-0">
                <span className="mb-4 block text-sm leading-sm ">
                  By{' '}
                  <Link href="/">
                    <TextShimmer>{post.author.name}</TextShimmer>
                  </Link>
                  <time className="font-normal" title={`${post.date}`}>
                    {' '}
                    &middot; {post.datetime} - {post.date}
                  </time>
                </span>
              </div>
            </div>

            <h1 className="mb-6 max-w-4xl text-2xl leading-2xl font-bold text-black sm:text-3xl sm:leading-3xl lg:text-4xl lg:leading-4xl">
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
          {mdx ? (
            <article
              className="
                sm:text-justify
              text-black/90 text-md leading-md
                [&>h2]:mt-12 [&>h2]:mb-3 [&>h2]:text-2xl sm:[&>h2]:text-3xl [&>h2]:font-bold [&>h2]:text-black
                [&>h3]:mt-8 [&>h3]:mb-2 [&>h3]:text-lg  sm:[&>h3]:text-xl [&>h3]:font-semibold [&>h3]:text-black
                [&>h4]:mt-6 [&>h4]:mb-2 [&>h4]:text-md  sm:[&>h4]:text-lg [&>h4]:font-semibold [&>h4]:text-black
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
                components={{ YouTube, a: SmartLink, img: SmartImage }}
              />
            </article>
          ) : (
            <p className="text-black text-md leading-md">{post.description}</p>
          )}

          <div>
            <h3 className="mt-16 text-2xl leading-2xl font-bold sm:text-3xl lg:text-4xl">
              Related Articles About {post.category.title}
            </h3>
            <hr className="my-8 border-black" />
          </div>
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
