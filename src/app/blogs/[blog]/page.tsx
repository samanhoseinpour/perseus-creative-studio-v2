import path from 'path';
import fs from 'fs/promises';
import matter from 'gray-matter';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import {
  Children,
  isValidElement,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react';
import {
  Button,
  Img,
  TextShimmer,
  Container,
  BlogPost,
  ShareBlogs,
  TableOfContents,
  SidebarCta,
  SmartLink,
  YouTube,
  Instagram,
  Image,
  Heading,
  PrevNextNav,
  Breadcrumb,
  Faqs,
  ProjectShowcase,
  type Crumb,
} from '@/components';
import {
  extractHeadings,
  extractFaqs,
  extractVideos,
  extractImages,
  stripFaqSection,
  makeSlugDeduper,
  countWords,
  readingTimeIso,
  readingMinutes,
} from '@/utils/extractHeadings';
import {
  blogPosts,
  BLOG_AUTHORS,
  PERSEUS_PUBLISHER_REF,
  buildAuthorSchema,
} from '@/constants/blogs';
import { getCategoryProjects } from '@/constants/projects';
import { SITE_URL, robotsWithPreviewLimits, PERSEUS_LOGO } from '@/constants';
import { resolveImageUrl } from '@/utils/images';
import { buildBreadcrumbList } from '@/utils/breadcrumbSchema';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  LuArrowUpRight as ArrowUpRight,
  LuUserRound as UserRound,
} from 'react-icons/lu';
import CategoryVisual from '@/components/Services/visuals/CategoryVisual';

// The article's lead image as an ImageObject (richer than a bare string: lets
// crawlers read licensing without inferring from the URL). Returns an array to
// keep the BlogPosting `image` shape stable. Self-hosted assets can't be
// re-cropped on the fly, so we emit the single source image rather than a
// 1:1/4:3/16:9 crop set.
function articleImageSet(imageUrl: string) {
  // Hero assets carry the Perseus license URL so Google can surface the
  // image-license badge in Image search. All hero assets have been verified
  // Perseus-owned or appropriately licensed (audited 2026-05-21).
  return [
    {
      '@type': 'ImageObject' as const,
      url: resolveImageUrl(imageUrl),
      license: `${SITE_URL}/license`,
      acquireLicensePage: `${SITE_URL}/license`,
    },
  ];
}

const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;

function articleOgImage(imageUrl: string): string {
  return resolveImageUrl(imageUrl);
}

// MDX `<Image src="...">` values can be a leading-slash /images path, a bare
// legacy filename, or a fully-qualified URL. Normalize to an absolute URL for
// JSON-LD `contentUrl` (unmigrated paths resolve to the placeholder).
function mdxImageSrcToUrl(src: string): string {
  if (/^https?:\/\//i.test(src)) return src;
  return resolveImageUrl(src);
}

// Filename stem used for stable @id fragments (e.g. `#image-foo-bar`).
// Falls back to a numeric index when the src has no usable basename.
function imageSlugFromSrc(src: string, index: number): string {
  const last = src.split(/[?#]/)[0].split('/').filter(Boolean).pop() ?? '';
  const stem = last.replace(/\.[a-z0-9]+$/i, '');
  return stem || `image-${index + 1}`;
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

function makeHeading(Tag: 'h2' | 'h3' | 'h4', resolveId: (text: string) => string) {
  return function HeadingWithId({
    children,
    ...props
  }: {
    children?: ReactNode;
    [k: string]: unknown;
  }) {
    const id = resolveId(childrenToText(children));
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
    return matter(raw).content;
  } catch (err) {
    // ENOENT = post has no MDX file yet → fall back to post.description.
    // Anything else (gray-matter parse failure, permission error, etc.)
    // should be loud in dev so authors catch the broken post.
    const code = (err as NodeJS.ErrnoException).code;
    if (process.env.NODE_ENV !== 'production' && code !== 'ENOENT') {
      console.error(
        `[blogs] Failed to load MDX for ${categorySlug}/${slug}:`,
        err,
      );
    }
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
  const author = BLOG_AUTHORS[post.authorSlug];
  const dateModified = post.updatedAt ?? post.datetime;
  const ogImage = {
    url: articleOgImage(post.imageUrl),
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    alt: post.imageAlt,
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
      authors: [author.name],
    },
    twitter: {
      card: seo.twitterCard,
      title: seo.ogTitle,
      description: seo.ogDescription,
      images: [ogImage],
    },
    robots: robotsWithPreviewLimits(seo.robots),
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

  const author = BLOG_AUTHORS[post.authorSlug];

  // Single source for the trail — feeds both the visible <Breadcrumb> and the
  // BreadcrumbList JSON-LD.
  const crumbs: Crumb[] = [
    { label: 'Perseus', href: '/' },
    { label: 'Blogs', href: '/blogs' },
    {
      label: post.category.title,
      href: `/blogs?category=${post.category.slug}`,
    },
    { label: post.title },
  ];

  // Load MDX for this post (if exists). Fallback to description if not.
  const mdx = await loadPostMdx(post.slug, post.category.slug);
  // JSON `post.faqs` wins when set — it's the curated, schema-stable source.
  // Older posts that don't define one fall back to MDX regex extraction.
  const mdxFaqs = mdx ? extractFaqs(mdx) : [];
  const faqs = post.faqs?.length ? post.faqs : mdxFaqs;
  // The FAQ section renders through the shared <Faqs> accordion below the
  // article instead of as plain MDX headings, so it's stripped from the
  // body. Only stripped when extractFaqs parsed the section — a
  // mal-formatted one stays in the body rather than vanishing.
  const bodyMdx = mdx && mdxFaqs.length > 0 ? stripFaqSection(mdx) : mdx;
  const headings = bodyMdx ? extractHeadings(bodyMdx) : [];
  // Keep one TOC entry for the relocated FAQ section; the accordion wrapper
  // below carries the matching `id="faqs"` anchor.
  if (faqs.length > 0) headings.push({ level: 2, text: 'FAQs', id: 'faqs' });
  // Stamp DOM heading ids with the same document-order dedupe the TOC uses, so
  // repeated heading text (e.g. a body section that also appears as an FAQ
  // question) produces unique anchors that still match the TOC links. One
  // instance per render — the MDX renders headings top-to-bottom in the same
  // order extractHeadings scanned them.
  const resolveHeadingId = makeSlugDeduper();
  const videos = mdx ? extractVideos(mdx) : [];
  const inlineImages = mdx ? extractImages(mdx) : [];
  const wordCount = mdx ? countWords(mdx) : 0;
  const readingMin = readingMinutes(wordCount);
  const timeRequired = readingTimeIso(wordCount);

  // Prev/next within the same category, ordered newest → oldest.
  // "prev" = chronologically earlier (older), "next" = chronologically later (newer).
  // Parse the datetime so we don't depend on string-lex order — same shape
  // as the hub's orderedPosts sort, with `id` as a stable tiebreaker.
  const categoryPosts = blogPosts
    .filter((p) => p.category.slug === post.category.slug)
    .sort((a, b) => {
      const at = Date.parse(a.datetime);
      const bt = Date.parse(b.datetime);
      const aTime = Number.isFinite(at) ? at : 0;
      const bTime = Number.isFinite(bt) ? bt : 0;
      if (bTime !== aTime) return bTime - aTime;
      return b.id - a.id;
    });
  const currentIdx = categoryPosts.findIndex((p) => p.slug === post.slug);
  const newerPost = currentIdx > 0 ? categoryPosts[currentIdx - 1] : null;
  const olderPost =
    currentIdx >= 0 && currentIdx < categoryPosts.length - 1
      ? categoryPosts[currentIdx + 1]
      : null;
  const prevPost = olderPost;
  const nextPost = newerPost;

  // Other categories (everything except the current post's category). Each
  // card carries: article count, total reading-time across the category's
  // MDX, distinct-author count, plus the newest post's title + date so the
  // card has real data instead of just a label. MDX reads happen at build
  // time (static page), so the per-page I/O is paid once per deploy.
  // Sorted by title for stable output. Links go to /blogs?category=<slug>
  // — the hub owns the canonical category routes via URL state.
  const otherCategories = await (async () => {
    type Item = {
      slug: string;
      title: string;
      count: number;
      latestIso: string | null;
      latestTitle: string | null;
      authors: Set<string>;
      readingMinutes: number;
    };
    const map = new Map<string, Item>();
    for (const p of blogPosts) {
      if (p.category.slug === post.category.slug) continue;
      const existing = map.get(p.category.slug);
      if (existing) {
        existing.count += 1;
        existing.authors.add(p.authorSlug);
        if (!existing.latestIso || p.datetime > existing.latestIso) {
          existing.latestIso = p.datetime;
          existing.latestTitle = p.title;
        }
      } else {
        map.set(p.category.slug, {
          slug: p.category.slug,
          title: p.category.title,
          count: 1,
          latestIso: p.datetime,
          latestTitle: p.title,
          authors: new Set([p.authorSlug]),
          readingMinutes: 0,
        });
      }
    }

    // Compute total word count per category by reading each post's MDX.
    // Mirrors the wordCountsFor() pattern on /blogs/authors. Missing files
    // (post hasn't been authored yet) contribute zero words silently.
    await Promise.all(
      Array.from(map.values()).map(async (item) => {
        const postsInCat = blogPosts.filter(
          (p) => p.category.slug === item.slug,
        );
        const words = await Promise.all(
          postsInCat.map(async (p) => {
            const mdxContent = await loadPostMdx(p.slug, p.category.slug);
            return mdxContent ? countWords(mdxContent) : 0;
          }),
        );
        item.readingMinutes = readingMinutes(words.reduce((s, w) => s + w, 0));
      }),
    );

    return Array.from(map.values()).sort((a, b) =>
      a.title.localeCompare(b.title),
    );
  })();

  const formatLatest = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString('en-CA', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC',
        })
      : null;

  return (
    <main className="pb-16 lg:pb-24">
      {/* JSON-LD: BreadcrumbList + BlogPosting in a single @graph so the
          two nodes can cross-reference via @id. */}
      <script
        id="ld-json"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              buildBreadcrumbList(crumbs, post.seo.canonicalPath),
              {
                // Explicit BlogPosting construction. Author + publisher are
                // resolved through the shared helpers in `constants/blogs`
                // so every JSON-LD node references the same Organization /
                // Person identity. Dates use the post's top-level fields,
                // not a duplicated schema block.
                '@type': 'BlogPosting' as const,
                '@id': `${post.seo.canonicalPath}#article`,
                headline: post.title,
                description: post.seo.description,
                keywords: post.seo.keywords,
                articleSection: post.category.title,
                inLanguage: 'en-CA',
                url: post.seo.canonicalPath,
                // Ties this article to the Blog entity declared on the hub
                // (/blogs) so crawlers see one publication, not 38 islands.
                isPartOf: { '@id': `${SITE_URL}/blogs#blog` },
                isAccessibleForFree: true,
                datePublished: post.datetime,
                dateModified: post.updatedAt ?? post.datetime,
                author: buildAuthorSchema(author.href),
                publisher: PERSEUS_PUBLISHER_REF,
                image: articleImageSet(post.imageUrl),
                mainEntityOfPage: {
                  '@type': 'WebPage',
                  '@id': post.seo.canonicalPath,
                  // `breadcrumb` is a Schema.org property of WebPage, not of
                  // Article/BlogPosting. Emitting it on the BlogPosting node
                  // trips validators ("property breadcrumb is not recognized");
                  // attaching it to this WebPage (mainEntityOfPage) keeps the
                  // link to the standalone #breadcrumb BreadcrumbList valid.
                  breadcrumb: {
                    '@id': `${post.seo.canonicalPath}#breadcrumb`,
                  },
                },
                wordCount,
                timeRequired,
                // Flags the H1 and the first body paragraph as voice-friendly
                // (Google Assistant, news readers). Selectors map to the
                // `id="post-title"` H1 and the first <p> child of the
                // `article-body` wrapper — both unconditionally present.
                speakable: {
                  '@type': 'SpeakableSpecification',
                  cssSelector: [
                    '#post-title',
                    '.article-body > p:first-of-type',
                  ],
                },
                // Expose the TOC as a structured ItemList rather than a
                // newline-joined string. Each section is a ListItem with
                // a fragment URL so crawlers can map it to an in-page
                // anchor — eligible for SERP sitelinks on the article.
                // Threshold matches the rendered TOC (>=2 H2s).
                ...(() => {
                  const tocItems = headings.filter((h) => h.level === 2);
                  if (tocItems.length < 2) return {};
                  return {
                    hasPart: {
                      '@type': 'ItemList',
                      '@id': `${post.seo.canonicalPath}#toc`,
                      name: 'Table of contents',
                      itemListOrder:
                        'https://schema.org/ItemListOrderAscending',
                      numberOfItems: tocItems.length,
                      itemListElement: tocItems.map((h, i) => ({
                        '@type': 'ListItem',
                        position: i + 1,
                        url: `${post.seo.canonicalPath}#${h.id}`,
                        name: h.text,
                      })),
                    },
                  };
                })(),
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
              // One VideoObject per unique Perseus-owned YouTube clip. Embeds
              // marked `external` (videos on someone else's channel) are
              // skipped so structured data doesn't falsely claim Perseus as
              // the publisher. Required fields (name, description, thumbnail,
              // uploadDate, contentUrl/embedUrl, publisher) are populated;
              // `maxresdefault.jpg` may 404 on older uploads, so `hqdefault`
              // is included as a fallback.
              ...videos
                .filter((v) => !v.external)
                .map((v) => ({
                  '@type': 'VideoObject' as const,
                  '@id': `${post.seo.canonicalPath}#video-${v.id}`,
                  name: v.title ?? post.title,
                  description: v.description ?? post.description,
                  thumbnailUrl: [
                    `https://i.ytimg.com/vi/${v.id}/maxresdefault.jpg`,
                    `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
                  ],
                  uploadDate: v.uploadDate ?? post.datetime,
                  contentUrl: `https://www.youtube.com/watch?v=${v.id}`,
                  embedUrl: `https://www.youtube.com/embed/${v.id}`,
                  publisher: PERSEUS_PUBLISHER_REF,
                  isPartOf: { '@id': `${post.seo.canonicalPath}#article` },
                  inLanguage: 'en-CA',
                })),
              // One ImageObject per showcase `<Image>` in the MDX (those
              // with caption/credit). Carries creator + creditText + the
              // Perseus license URLs so Google Images can attribute the
              // photo and surface the image-license badge. All embedded
              // showcase assets have been verified Perseus-owned or
              // appropriately licensed (audited 2026-05-21).
              ...inlineImages.map((img, i) => {
                const url = mdxImageSrcToUrl(img.src);
                const slug = imageSlugFromSrc(img.src, i);
                const year = new Date(
                  post.updatedAt ?? post.datetime,
                ).getUTCFullYear();
                return {
                  '@type': 'ImageObject' as const,
                  '@id': `${post.seo.canonicalPath}#image-${slug}`,
                  url,
                  contentUrl: url,
                  ...(img.caption ? { caption: img.caption } : {}),
                  ...(img.alt ? { description: img.alt } : {}),
                  ...(img.width ? { width: img.width } : {}),
                  ...(img.height ? { height: img.height } : {}),
                  creator: {
                    '@type': 'Organization' as const,
                    name: 'Perseus Creative Studio',
                    url: SITE_URL,
                  },
                  creditText: img.credit ?? 'Perseus Creative Studio',
                  copyrightNotice: `© ${year} Perseus Creative Studio`,
                  copyrightHolder: {
                    '@type': 'Organization' as const,
                    name: 'Perseus Creative Studio',
                  },
                  license: `${SITE_URL}/license`,
                  acquireLicensePage: `${SITE_URL}/license`,
                  isPartOf: { '@id': `${post.seo.canonicalPath}#article` },
                  inLanguage: 'en-CA',
                };
              }),
            ],
          }),
        }}
      />

      <article aria-labelledby="post-title">
        <header className="relative h-[460px] w-full xl:h-[420px] overflow-hidden">
          {/* Hero rendered at 30% opacity behind text — low quality is
              imperceptible at that blend and cuts bytes on the LCP image.
              Lives outside <Container> so `fill` anchors to the positioned
              <header> rather than the max-width container. */}
          <Img
            src={post.imageUrl}
            alt={post.imageAlt}
            fill
            sizes="100vw"
            priority
            quality={60}
            className="object-cover object-center pointer-events-none opacity-30 bg-background -z-10"
          />
          <Container>
            <div className="py-24 sm:py-32">
              <Breadcrumb crumbs={crumbs} />
              <div className="flex flex-col justify-between lg:flex-row lg:items-center">
                <div className="mb-2 flex items-center space-x-3 lg:mb-0">
                  <span className="mb-4 block text-sm leading-sm ">
                    By{' '}
                    <Link href={author.href}>
                      {/* `as="span"`: TextShimmer defaults to <h3>, which put a
                          heading before the H1 and broke heading order on every
                          post (Semrush content audit). */}
                      <TextShimmer as="span">{author.name}</TextShimmer>
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
                            'en-CA',
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
              <div className="min-w-0 xl:col-start-1 xl:row-start-1">
                {/* Mobile TOC — inside the tall content column so sticky has room to work */}
                {headings.length >= 2 && (
                  <div className="xl:hidden">
                    <TableOfContents headings={headings} variant="mobile" />
                  </div>
                )}
                {bodyMdx ? (
                  <div
                    className="
                  article-body
                  text-black/90 text-md leading-md
                    [&>h2]:scroll-mt-24 [&>h2]:mt-12 [&>h2]:mb-6 [&>h2]:text-2xl sm:[&>h2]:text-3xl [&>h2]:font-bold [&>h2]:text-black [&>h2]:max-w-2xl [&>h2]:border-l-3 [&>h2]:border-black/20 [&>h2]:pl-4
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
                    [&_table]:w-full
                    [&_table]:border-separate [&_table]:border-spacing-0
                    [&_th]:border-b [&_th]:border-white/20 [&_th]:p-3 [&_th]:align-top
                    [&_th:not(:last-child)]:border-r
                    [&_td]:border-b [&_td]:border-black/20 [&_td]:p-3 [&_td]:align-top [&_td]:text-sm
                    [&_td:not(:last-child)]:border-r
                    [&_tbody_tr:last-child_td]:border-b-0
                  [&_thead_th]:bg-black [&_th]:text-white
                  [&_tbody_tr:nth-child(odd)]:bg-black/10
                  [&_tbody_tr:nth-child(even)]:bg-white
                  hover:[&_tbody_tr]:bg-black/10
                  "
                  >
                    <MDXRemote
                      source={bodyMdx}
                      options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
                      components={{
                        YouTube,
                        Instagram,
                        Image,
                        a: SmartLink,
                        img: Image,
                        // Wrap tables so a wide one scrolls within its own box
                        // instead of forcing horizontal scroll on the whole
                        // page and shifting the layout. The wrapper also owns
                        // the rounded border — its overflow clipping rounds
                        // the corners (incl. the black thead). The inner
                        // <table> keeps the prose [&_table] styling since it
                        // stays a descendant of the article body; cells use
                        // border-b/border-r (border-separate) so edges don't
                        // double against the wrapper border.
                        table: (props: ComponentPropsWithoutRef<'table'>) => (
                          <div className="my-8 overflow-x-auto rounded-2xl border border-black/20">
                            <table {...props} />
                          </div>
                        ),
                        h2: makeHeading('h2', resolveHeadingId),
                        h3: makeHeading('h3', resolveHeadingId),
                        h4: makeHeading('h4', resolveHeadingId),
                      }}
                    />
                  </div>
                ) : (
                  <div className="article-body">
                    <p className="text-black text-md leading-md">
                      {post.description}
                    </p>
                  </div>
                )}

                <aside
                  aria-labelledby="author-profile-heading"
                  className="mt-12 rounded-2xl bg-background-contrast p-6"
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    <Link
                      href={author.href}
                      className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-black/5"
                      aria-label={`View ${author.name} author profile`}
                    >
                      {author.imageUrl ? (
                        <Img
                          src={author.imageUrl}
                          alt={`${author.name} portrait`}
                          width={160}
                          height={160}
                          className={`h-full w-full p-1 ${
                            author.imageUrl === PERSEUS_LOGO
                              ? 'object-contain dark:invert'
                              : 'object-cover'
                          }`}
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-black/60">
                          <UserRound className="h-8 w-8" aria-hidden="true" />
                        </span>
                      )}
                    </Link>

                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-wide text-black/60">
                        Written by
                      </p>
                      <h2
                        id="author-profile-heading"
                        className="mt-1 text-xl leading-xl font-semibold text-black"
                      >
                        <Link
                          href={author.href}
                          className="transition-colors hover:text-black/80"
                        >
                          {author.name}
                        </Link>
                      </h2>
                      {author.role && (
                        <p className="mt-1 text-xs leading-xs text-black/60">
                          {author.role}
                        </p>
                      )}
                    </div>

                    <Link href={author.href} className="inline-flex w-fit">
                      <Button
                        variant="secondary"
                        size="small"
                        icon={UserRound}
                        className="px-4 py-2 text-[10px] uppercase tracking-wide"
                      >
                        View {author.name}
                      </Button>
                    </Link>
                  </div>
                </aside>

                {/* Mobile CTA — desktop sidebar is hidden on mobile */}
                <div className="xl:hidden mt-12">
                  <SidebarCta
                    categorySlug={post.category.slug}
                    serviceSlug={post.serviceSlug}
                  />
                </div>
              </div>

              <aside className="hidden xl:flex xl:flex-col xl:gap-4 xl:col-start-2 xl:row-start-1 xl:sticky xl:top-24">
                {headings.length >= 2 && (
                  <TableOfContents headings={headings} variant="desktop" />
                )}
                <SidebarCta
                  categorySlug={post.category.slug}
                  serviceSlug={post.serviceSlug}
                />
              </aside>
            </div>
          </Container>
        </section>
      </article>

      {/* FAQ accordion — same Q&A set that feeds the FAQPage JSON-LD above,
          rendered through the sitewide <Faqs> accordion instead of plain MDX
          headings. `id="faqs"` matches the TOC entry appended in `headings`. */}
      {faqs.length > 0 && (
        <div id="faqs" className="scroll-mt-24">
          <Faqs
            faqs={faqs}
            description={`Quick answers to the questions readers ask most about this topic — the same ones covered in “${post.title}”.`}
          />
        </div>
      )}

      <PrevNextNav
        className="mt-12"
        ariaLabel="Article navigation"
        prev={
          prevPost
            ? {
                href: prevPost.href,
                title: prevPost.title,
                eyebrow: `Previous in ${post.category.title}`,
              }
            : null
        }
        next={
          nextPost
            ? {
                href: nextPost.href,
                title: nextPost.title,
                eyebrow: `Next in ${post.category.title}`,
              }
            : null
        }
      />

      <section
        aria-label={`Related articles about ${post.category.title}`}
        className="mt-16"
      >
        <Heading
          titleTag="h2"
          seperatorTitle="Related Articles"
          eyebrowRight="More Reads"
          title={
            post.relatedPosts?.length
              ? 'Hand-picked related reads'
              : `More on ${post.category.title}`
          }
          titleAccent={
            post.relatedPosts?.length
              ? 'Editor’s picks from across the journal.'
              : 'Continue reading from the same category.'
          }
          description={
            post.relatedPosts?.length
              ? 'A curated set of articles chosen to extend the ideas in this piece.'
              : `Explore more articles about ${post.category.title} from the Perseus Creative Studio journal.`
          }
          containerStyle="mb-10"
          titleStyle="max-w-4xl"
          descStyle="max-w-3xl"
        />

        {post.relatedPosts?.length ? (
          <BlogPost
            limit={4}
            showFilters={false}
            enableFiltering={false}
            forcedSlugs={post.relatedPosts}
            excludeSlug={post.slug}
          />
        ) : (
          <BlogPost
            limit={4}
            showFilters={false}
            enableFiltering={false}
            forcedCategorySlug={post.category.slug}
            excludeSlug={post.slug}
          />
        )}
      </section>

      {/* Real work from the same discipline — the projects behind the writing.
          <ProjectShowcase> self-guards (renders nothing) if the post's category
          maps to no project category or has no projects. */}
      <ProjectShowcase
        entries={getCategoryProjects(post.category.slug, 4)}
        seperatorTitle="From the Archive"
        title="See the work, not just the words."
        titleAccent={`Recent ${post.category.title} projects.`}
        description={`Real ${post.category.title.toLowerCase()} engagements from the Perseus archive — the work behind the writing.`}
        viewAllHref={`/projects/${post.category.slug}`}
        viewAllLabel={`All ${post.category.title} projects`}
      />

      {otherCategories.length > 0 && (
        <section aria-label="Browse other categories" className="mt-16">
          <Heading
            titleTag="h2"
            seperatorTitle="Other Categories"
            eyebrowRight="Keep Exploring"
            title="Browse other topics from the journal"
            titleAccent="Pick another angle to dive into."
            description={`More categories the Perseus team has published on — beyond ${post.category.title}.`}
            containerStyle="mb-10"
            titleStyle="max-w-4xl"
            descStyle="max-w-3xl"
          />
          <Container>
            {/* Each card is backed by that category's bespoke <CategoryVisual>
                (the same drawn charcoal artwork as the /services surfaces —
                blog category slugs map 1:1 to service categories), with the
                journal's real numbers as a mono stat strip on a hairline. */}
            <ul className="media-adaptive grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {otherCategories.map((cat) => {
                const latest = formatLatest(cat.latestIso);
                return (
                  <li key={cat.slug} className="h-full">
                    <Link
                      href={`/blogs?category=${cat.slug}`}
                      className="group relative isolate flex h-full min-h-[17rem] flex-col justify-between overflow-hidden rounded-3xl p-6"
                    >
                      {/* Code-rendered category artwork + scrim */}
                      <div className="absolute inset-0 -z-10 transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]">
                        <CategoryVisual slug={cat.slug} variant="card" />
                      </div>
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 -z-10 bg-linear-to-t from-scrim/85 via-scrim/25 to-transparent"
                      />

                      <div className="flex items-start justify-between gap-4">
                        <span className="eyebrow text-[10px] text-on-media/75">
                          The Journal
                        </span>
                        <span
                          aria-hidden="true"
                          className="grid size-9 shrink-0 place-items-center rounded-full bg-on-media/10 text-on-media backdrop-blur-sm transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                        >
                          <ArrowUpRight className="size-4" />
                        </span>
                      </div>

                      <div>
                        <h3 className="text-2xl font-semibold tracking-tight text-on-media">
                          {cat.title}
                        </h3>

                        {cat.latestTitle && (
                          <p className="mt-2 line-clamp-2 text-sm leading-snug text-on-media/70">
                            <span className="text-on-media/45">Latest — </span>
                            {cat.latestTitle}
                            {latest && (
                              <span className="text-on-media/45"> · {latest}</span>
                            )}
                          </p>
                        )}

                        <dl className="mt-5 flex flex-wrap items-baseline gap-x-5 gap-y-2 border-t border-on-media/15 pt-4 font-mono text-[10px] uppercase tracking-[0.15em] text-on-media/55">
                          <div className="flex items-baseline gap-1.5">
                            <dd className="text-sm tracking-normal text-on-media tabular-nums">
                              {cat.count}
                            </dd>
                            <dt>{cat.count === 1 ? 'Article' : 'Articles'}</dt>
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <dd className="text-sm tracking-normal text-on-media tabular-nums">
                              {cat.readingMinutes}m
                            </dd>
                            <dt>Reading</dt>
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <dd className="text-sm tracking-normal text-on-media tabular-nums">
                              {cat.authors.size}
                            </dd>
                            <dt>
                              {cat.authors.size === 1 ? 'Author' : 'Authors'}
                            </dt>
                          </div>
                        </dl>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Container>
        </section>
      )}
    </main>
  );
}
