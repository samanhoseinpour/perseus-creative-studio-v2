import {
  ImageKit,
  TextShimmer,
  Container,
  BlogPost,
  BlogPostBackground,
  AnimatedGroup,
} from "@/app/components";
import { blogPosts } from "@/app/constants/blogs";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Script from "next/script";

// Pre-generate all blog pages at build time
export function generateStaticParams() {
  return blogPosts.map((p) => ({ blog: p.slug }));
}

// Per-post SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ blog: string }>;
}): Promise<Metadata> {
  const { blog } = await params;
  const post = blogPosts.find((p) => p.slug === blog);
  if (!post) return { title: "Blog not found" };

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
      index: seo.robots.includes("index"),
      follow: seo.robots.includes("follow"),
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

  return (
    <main className="pb-16 lg:pb-24">
      {/* JSON-LD Schema.org */}
      <Script
        id="ld-json-blog"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            ...post.seo.schema,
          }),
        }}
      />

      <header className="relative h-[460px] w-full xl:h-[400px] bg-background overflow-hidden">
        <Container>
          <ImageKit
            src={post.imageUrl}
            alt={post.title}
            fill
            sizes="100vw"
            className="object-cover object-center pointer-events-none opacity-30"
          />
          <AnimatedGroup className="py-24 sm:py-32">
            <span className="mb-4 block text-sm leading-sm text-white/70">
              Published In <TextShimmer>{post.author.name}</TextShimmer>
            </span>
            <h1 className="mb-4 max-w-4xl text-2xl font-extrabold leading-none text-white sm:text-3xl lg:text-4xl">
              {post.title}
            </h1>
            <p className="text-sm leading-sm text-white/70">
              {post.category.title}
            </p>
          </AnimatedGroup>
        </Container>
      </header>
      <section className="relative pt-16">
        <BlogPostBackground
          gridSize="16:16"
          beams={{ count: 64, speed: 4 }}
          colors={{
            borderColor: "border-white/5",
          }}
          className="pointer-events-none absolute inset-0 -z-10"
        />
        <Container>
          <article>
            <AnimatedGroup className="flex flex-col justify-between lg:flex-row lg:items-center">
              <div className="mb-2 flex items-center space-x-3 lg:mb-0">
                <span className="mb-4 block text-sm leading-sm ">
                  By{" "}
                  <Link href="/">
                    <TextShimmer>{post.author.name}</TextShimmer>
                  </Link>
                  <time className="font-normal" title={`${post.date}`}>
                    {" "}
                    &middot; {post.datetime} - {post.date}
                  </time>
                </span>
              </div>
            </AnimatedGroup>
            <AnimatedGroup className="text-white text-lg leading-lg ">
              {post.description}
            </AnimatedGroup>
          </article>
          <AnimatedGroup>
            <h3 className="mt-16 text-2xl font-bold  leading-2xl sm:text-3xl lg:text-4xl">
              Latest Articles
            </h3>
            <hr className="my-8 border-white" />
          </AnimatedGroup>
        </Container>
        <BlogPost limit={3} />
      </section>
    </main>
  );
}
