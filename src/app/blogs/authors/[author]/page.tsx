import path from 'path';
import fs from 'fs/promises';
import matter from 'gray-matter';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import {
  Instagram,
  Linkedin,
  Youtube,
  Facebook,
  Twitter,
  Globe,
  Calendar,
  Tag,
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  FileText,
  Layers,
  PencilLine,
  Clock,
  MapPin,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import {
  Container,
  ImageKit,
  BorderBeam,
  TextShimmer,
  Heading,
  Button,
} from '@/components';
import BlogBreadcrumb from '@/components/Blogs/BlogBreadcrumb';
import {
  BLOG_AUTHORS,
  blogPosts,
  BLOG_PAGE_SIZE,
  getBlogAuthor,
  type BlogAuthor,
  type BlogPost,
} from '@/constants/blogs';
import { SITE_URL, IMAGEKIT_BASE, servicesDataHome } from '@/constants';
import { countWords, readingMinutes } from '@/utils/extractHeadings';
import { firstParam, getPageNumbers, parsePage } from '@/utils/pagination';

const FALLBACK_OG_IMAGE = `${IMAGEKIT_BASE}/logo-white.png`;
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

const SOCIAL_ICON_MAP: { match: RegExp; Icon: LucideIcon; label: string }[] = [
  { match: /instagram\.com/i, Icon: Instagram, label: 'Instagram' },
  { match: /linkedin\.com/i, Icon: Linkedin, label: 'LinkedIn' },
  { match: /youtube\.com/i, Icon: Youtube, label: 'YouTube' },
  { match: /facebook\.com/i, Icon: Facebook, label: 'Facebook' },
  { match: /(?:twitter\.com|x\.com)/i, Icon: Twitter, label: 'X (Twitter)' },
];

function resolveSocial(url: string) {
  for (const entry of SOCIAL_ICON_MAP) {
    if (entry.match.test(url)) return entry;
  }
  return { Icon: Globe, label: 'Website' };
}

function authorOgImage(author: BlogAuthor): string {
  if (!author.ogImage) return FALLBACK_OG_IMAGE;
  return `${IMAGEKIT_BASE}/${author.ogImage}?tr=w-${OG_WIDTH},h-${OG_HEIGHT},cm-extract,fo-auto`;
}

function authorPostsFor(author: BlogAuthor) {
  return blogPosts
    .filter((p) => p.author.href === author.href)
    .sort((a, b) => (a.datetime < b.datetime ? 1 : -1));
}

function uniqueCategories(posts: BlogPost[]) {
  const map = new Map<string, { title: string; slug: string; count: number }>();
  for (const p of posts) {
    const existing = map.get(p.category.slug);
    if (existing) existing.count += 1;
    else
      map.set(p.category.slug, {
        title: p.category.title,
        slug: p.category.slug,
        count: 1,
      });
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

type CadenceBucket = {
  key: string;
  label: string;
  fullLabel: string;
  count: number;
};

function buildCadenceBuckets(posts: BlogPost[]): {
  mode: 'monthly' | 'yearly';
  buckets: CadenceBucket[];
} {
  if (!posts.length) return { mode: 'monthly', buckets: [] };

  const dates = posts
    .map((p) => new Date(`${p.datetime}T00:00:00Z`))
    .filter((d) => !Number.isNaN(d.getTime()));
  if (!dates.length) return { mode: 'monthly', buckets: [] };

  const min = new Date(Math.min(...dates.map((d) => d.getTime())));
  const max = new Date(Math.max(...dates.map((d) => d.getTime())));

  const startYear = min.getUTCFullYear();
  const startMonth = min.getUTCMonth();
  const endYear = max.getUTCFullYear();
  const endMonth = max.getUTCMonth();
  const totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;

  if (totalMonths <= 18) {
    const buckets: CadenceBucket[] = [];
    for (let i = 0; i < totalMonths; i++) {
      const d = new Date(Date.UTC(startYear, startMonth + i, 1));
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
        2,
        '0',
      )}`;
      buckets.push({
        key,
        label: d.toLocaleString('en-US', {
          month: 'short',
          timeZone: 'UTC',
        }),
        fullLabel: d.toLocaleString('en-US', {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        }),
        count: 0,
      });
    }
    for (const p of posts) {
      const d = new Date(`${p.datetime}T00:00:00Z`);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
        2,
        '0',
      )}`;
      const b = buckets.find((bk) => bk.key === key);
      if (b) b.count += 1;
    }
    return { mode: 'monthly', buckets };
  }

  const buckets: CadenceBucket[] = [];
  for (let y = startYear; y <= endYear; y++) {
    buckets.push({
      key: String(y),
      label: String(y),
      fullLabel: String(y),
      count: 0,
    });
  }
  for (const p of posts) {
    const d = new Date(`${p.datetime}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) continue;
    const b = buckets.find((bk) => bk.key === String(d.getUTCFullYear()));
    if (b) b.count += 1;
  }
  return { mode: 'yearly', buckets };
}

type PostWordCount = { slug: string; words: number };

async function loadAuthorWriting(posts: BlogPost[]) {
  const perPost: PostWordCount[] = await Promise.all(
    posts.map(async (p) => {
      try {
        const filePath = path.join(
          process.cwd(),
          'src',
          'content',
          'blogs',
          p.category.slug,
          `${p.slug}.mdx`,
        );
        const raw = await fs.readFile(filePath, 'utf8');
        const { content } = matter(raw);
        return { slug: p.slug, words: countWords(content) };
      } catch {
        return { slug: p.slug, words: 0 };
      }
    }),
  );
  const totalWords = perPost.reduce((sum, w) => sum + w.words, 0);
  const totalMinutes = totalWords > 0 ? readingMinutes(totalWords) : 0;
  const avgWords = posts.length > 0 ? Math.round(totalWords / posts.length) : 0;
  return { totalWords, totalMinutes, avgWords, perPost };
}

function formatReadingTime(min: number): string {
  if (min <= 0) return '—';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatMonthYear(datetime: string): string {
  const d = new Date(`${datetime}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// Map a service title to the most appropriate internal route.
const SERVICE_HREF_MAP: Record<string, string> = {
  'Website Development': '/services/websites',
};

function serviceHref(title: string): string {
  return SERVICE_HREF_MAP[title] ?? '/services';
}

export function generateStaticParams() {
  return Object.keys(BLOG_AUTHORS).map((author) => ({ author }));
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ author: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { author: authorSlug } = await params;
  const author = getBlogAuthor(authorSlug);
  if (!author) return { title: 'Author not found' };

  // Self-referencing canonical per 2026 SEO guidance. Clamp out-of-range
  // ?page=N to the actual last page so stale URLs don't compete with real
  // ones. Page 1 omits the param so the bare /blogs/authors/<slug> stays
  // the clean canonical.
  const sp = await searchParams;
  const requestedPage = parsePage(firstParam(sp?.page));
  const authorPosts = blogPosts.filter((p) => p.author.href === author.href);
  // restPosts (posts.slice(1)) is what the More-articles section paginates.
  const restPostsCount = Math.max(0, authorPosts.length - 1);
  const maxPage = Math.max(1, Math.ceil(restPostsCount / BLOG_PAGE_SIZE));
  const clampedPage = Math.min(Math.max(1, requestedPage), maxPage);
  const canonical =
    clampedPage > 1
      ? `${SITE_URL}${author.href}?page=${clampedPage}`
      : `${SITE_URL}${author.href}`;

  const titleBase = `${author.name} — ${author.role}${
    author.location ? ` in ${author.location.locality}` : ''
  }`;
  const isPaginated = clampedPage > 1;
  const title = isPaginated ? `${titleBase} — Page ${clampedPage}` : titleBase;
  const description = author.bio;
  const ogImage = authorOgImage(author);

  // Heuristic name split for OG profile: "Perseus Creative Studio" → first
  // word as firstName, rest as lastName. Crawlers tolerate this for org-style
  // authors.
  const nameParts = author.name.split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ') || undefined;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'profile',
      title,
      description,
      url: canonical,
      siteName: 'Perseus Creative Studio',
      locale: 'en_CA',
      firstName,
      lastName,
      username: author.slug,
      images: [
        {
          url: ogImage,
          width: OG_WIDTH,
          height: OG_HEIGHT,
          alt: `${author.name} — ${author.role}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
      site: '@Perseustudio1',
      creator: '@Perseustudio1',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-snippet': -1,
        'max-image-preview': 'large',
        'max-video-preview': -1,
      },
    },
  };
}

export default async function AuthorPage({
  params,
  searchParams,
}: {
  params: Promise<{ author: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { author: authorSlug } = await params;
  const author = getBlogAuthor(authorSlug);
  if (!author) notFound();

  const sp = await searchParams;
  const requestedPage = parsePage(firstParam(sp?.page));

  const posts = authorPostsFor(author);
  const topics = uniqueCategories(posts);
  const latestPost = posts[0];
  const restPosts = posts.slice(1);

  // Paginate the "More articles" section. The Highlights/topic showcase
  // above are author-wide signals (not part of the paginated archive).
  const restTotalPages = Math.max(
    1,
    Math.ceil(restPosts.length / BLOG_PAGE_SIZE),
  );
  const restActivePage = Math.min(Math.max(1, requestedPage), restTotalPages);
  const paginatedRestPosts = restPosts.slice(
    (restActivePage - 1) * BLOG_PAGE_SIZE,
    restActivePage * BLOG_PAGE_SIZE,
  );
  const restStartIndex = (restActivePage - 1) * BLOG_PAGE_SIZE + 1;
  const restEndIndex = restStartIndex + paginatedRestPosts.length - 1;

  // Page-link builder: preserves the author route, sets ?page=N (omits the
  // param for page 1 so canonical stays clean), and anchors to #articles
  // so the click lands on the More-articles section instead of the route
  // top.
  const buildPageHref = (page: number) =>
    page > 1
      ? `${author.href}?page=${page}#articles`
      : `${author.href}#articles`;
  const cadence = buildCadenceBuckets(posts);
  const cadenceMax = Math.max(1, ...cadence.buckets.map((b) => b.count));
  const writing = await loadAuthorWriting(posts);
  const canonical = `${SITE_URL}${author.href}`;
  const firstName = author.name.split(' ')[0];

  // Highlights derived from the data we already have.
  const longestEntry =
    writing.perPost.length > 0
      ? writing.perPost.reduce(
          (acc, w) => (w.words > acc.words ? w : acc),
          writing.perPost[0],
        )
      : null;
  const longestPost =
    longestEntry && longestEntry.words > 0
      ? (posts.find((p) => p.slug === longestEntry.slug) ?? null)
      : null;
  const topTopic = topics[0] ?? null;
  const earliestPost = posts.length > 0 ? posts[posts.length - 1] : null;
  const avgReadingPerArticle =
    writing.avgWords > 0 ? readingMinutes(writing.avgWords) : 0;

  // Person.knowsAbout combines the explicitly-curated expertise list with
  // the topic titles the author has actually published on. Dedupe via Set.
  const knowsAbout = Array.from(
    new Set([...(author.knowsAbout ?? []), ...topics.map((t) => t.title)]),
  );

  const isAgencyAuthor = author.slug === 'perseus-creative-studio';

  // Organization profiles surface services; individual profiles surface skills.
  const specialties = isAgencyAuthor
    ? servicesDataHome.slice(0, 6).map((service) => ({
        title: service.title,
        description: service.category,
        href: serviceHref(service.title),
      }))
    : (author.knowsAbout ?? []).slice(0, 9).map((skill) => ({
        title: skill,
        description: 'Author expertise',
        href: undefined,
      }));

  // For each topic, find the most recent post in it. `posts` is sorted desc,
  // so the first match per topic is the latest in that topic. Used to build
  // the "Browse by topic" section.
  const topicShowcase: {
    topic: (typeof topics)[number];
    post: BlogPost;
  }[] = [];
  for (const topic of topics) {
    const post = posts.find((p) => p.category.slug === topic.slug);
    if (post) topicShowcase.push({ topic, post });
  }

  // Article-length distribution buckets. Edges are inclusive on min,
  // exclusive on max. `Infinity` catches the long tail.
  const lengthBuckets = [
    { key: 'short', label: 'Quick', range: '< 800w', min: 0, max: 800 },
    {
      key: 'standard',
      label: 'Standard',
      range: '800–1.5k',
      min: 800,
      max: 1500,
    },
    { key: 'deep', label: 'Deep', range: '1.5k–3k', min: 1500, max: 3000 },
    {
      key: 'definitive',
      label: 'Definitive',
      range: '3k+',
      min: 3000,
      max: Infinity,
    },
  ].map((b) => ({
    ...b,
    count: writing.perPost.filter(
      (w) => w.words > 0 && w.words >= b.min && w.words < b.max,
    ).length,
  }));
  const lengthBucketsMax = Math.max(1, ...lengthBuckets.map((b) => b.count));
  const totalLengthCounted = lengthBuckets.reduce((s, b) => s + b.count, 0);

  // Total words written per topic. Complements "Coverage by topic" (counts)
  // by surfacing depth instead of just frequency.
  const wordsByTopicSorted = topics
    .map((topic) => {
      const words = posts
        .filter((p) => p.category.slug === topic.slug)
        .reduce((sum, p) => {
          const w = writing.perPost.find((wp) => wp.slug === p.slug);
          return sum + (w?.words ?? 0);
        }, 0);
      return { ...topic, words };
    })
    .sort((a, b) => b.words - a.words);
  const totalWordsForBars = Math.max(
    1,
    wordsByTopicSorted.reduce((s, t) => s + t.words, 0),
  );

  return (
    <main className="pb-16 lg:pb-24">
      <Script
        id="ld-json-author"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'BreadcrumbList',
                '@id': `${canonical}#breadcrumb`,
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
                  {
                    '@type': 'ListItem',
                    position: 3,
                    name: 'Authors',
                    item: `${SITE_URL}/blogs/authors`,
                  },
                  {
                    '@type': 'ListItem',
                    position: 4,
                    name: author.name,
                    item: canonical,
                  },
                ],
              },
              {
                '@type': 'ProfilePage',
                '@id': `${canonical}#profile`,
                inLanguage: 'en-CA',
                url: canonical,
                breadcrumb: { '@id': `${canonical}#breadcrumb` },
                mainEntity: { '@id': `${canonical}#person` },
              },
              {
                '@type': 'Person',
                '@id': `${canonical}#person`,
                name: author.name,
                jobTitle: author.role,
                description: author.bio,
                url: canonical,
                image: `${SITE_URL}${author.imageUrl}`,
                sameAs: author.sameAs,
                ...(knowsAbout.length > 0 && { knowsAbout }),
                ...(author.location && {
                  address: {
                    '@type': 'PostalAddress',
                    addressLocality: author.location.locality,
                    addressRegion: author.location.region,
                    addressCountry: author.location.country,
                  },
                  workLocation: {
                    '@type': 'Place',
                    name: `${author.location.locality}, ${author.location.region}`,
                    address: {
                      '@type': 'PostalAddress',
                      addressLocality: author.location.locality,
                      addressRegion: author.location.region,
                      addressCountry: author.location.country,
                    },
                  },
                }),
              },
            ],
          }),
        }}
      />

      {/* HERO */}
      <header className="relative w-full overflow-hidden">
        <Container>
          <div className="py-24 sm:py-32">
            <BlogBreadcrumb
              crumbs={[
                { label: 'Perseus', href: '/' },
                { label: 'Blogs', href: '/blogs' },
                { label: 'Authors', href: '/blogs/authors' },
                { label: author.name },
              ]}
            />

            <div className="mt-2 grid gap-8 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-12">
              <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-full bg-background-contrast lg:h-40 lg:w-40">
                <ImageKit
                  src={author.imageUrl}
                  alt={`${author.name} portrait`}
                  width={320}
                  height={320}
                  className="h-full w-full object-cover p-2"
                />
                <BorderBeam duration={14} size={140} />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-background-contrast-black/10 px-3 py-1 text-[10px] uppercase tracking-wide text-black">
                    <Tag className="h-3 w-3 opacity-60" aria-hidden="true" />
                    <span className="leading-none">{author.role}</span>
                  </span>
                  {author.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 rounded-full bg-background-contrast-black/10 px-3 py-1 text-[10px] uppercase tracking-wide text-black"
                    >
                      <MapPin
                        className="h-3 w-3 opacity-60"
                        aria-hidden="true"
                      />
                      <span className="leading-none">{tag}</span>
                    </span>
                  ))}
                </div>

                <h1 className="mt-3 text-3xl leading-3xl font-bold text-black sm:text-4xl sm:leading-4xl lg:text-5xl lg:leading-5xl">
                  <TextShimmer as="span">{author.name}</TextShimmer>
                </h1>

                <p className="mt-4 max-w-2xl text-md leading-md text-black/80">
                  {author.bio}
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  {author.sameAs.length > 0 && (
                    <ul
                      aria-label={`${author.name} on social media`}
                      className="flex flex-wrap gap-2"
                    >
                      {author.sameAs.map((url) => {
                        const { Icon, label } = resolveSocial(url);
                        return (
                          <li key={url}>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer me"
                              aria-label={`${author.name} on ${label}`}
                              title={label}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-background-contrast-black/10 text-black transition-colors hover:bg-background-contrast-black/15"
                            >
                              <Icon
                                className="h-4 w-4 opacity-70"
                                aria-hidden="true"
                              />
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  <Link href="/contact" className="inline-flex">
                    <Button
                      variant="primary"
                      size="small"
                      icon={ArrowUpRight}
                      className="px-4 py-2 text-[10px] uppercase tracking-wide"
                    >
                      Work with Perseus
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </header>

      {/* STATS STRIP */}
      <section aria-labelledby="author-stats-heading">
        <Container>
          <h2 id="author-stats-heading" className="sr-only">
            {author.name} at a glance
          </h2>
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <li className="flex items-center gap-3 rounded-2xl bg-background-contrast p-5">
              <FileText
                className="h-5 w-5 shrink-0 text-black/60"
                aria-hidden="true"
              />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-black/60">
                  Articles published
                </p>
                <p className="mt-0.5 text-lg leading-lg font-semibold text-black">
                  {posts.length}
                </p>
              </div>
            </li>
            <li className="flex items-center gap-3 rounded-2xl bg-background-contrast p-5">
              <Layers
                className="h-5 w-5 shrink-0 text-black/60"
                aria-hidden="true"
              />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-black/60">
                  Topics covered
                </p>
                <p className="mt-0.5 text-lg leading-lg font-semibold text-black">
                  {topics.length}
                </p>
              </div>
            </li>
            <li className="flex items-center gap-3 rounded-2xl bg-background-contrast p-5">
              <PencilLine
                className="h-5 w-5 shrink-0 text-black/60"
                aria-hidden="true"
              />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-black/60">
                  Words written
                </p>
                <p className="mt-0.5 text-lg leading-lg font-semibold text-black">
                  {writing.totalWords > 0
                    ? writing.totalWords.toLocaleString('en-US')
                    : '—'}
                </p>
              </div>
            </li>
            <li className="flex items-center gap-3 rounded-2xl bg-background-contrast p-5">
              <Clock
                className="h-5 w-5 shrink-0 text-black/60"
                aria-hidden="true"
              />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-black/60">
                  Total reading
                </p>
                <p className="mt-0.5 text-lg leading-lg font-semibold text-black">
                  {formatReadingTime(writing.totalMinutes)}
                </p>
              </div>
            </li>
            <li className="flex items-center gap-3 rounded-2xl bg-background-contrast p-5">
              <Sparkles
                className="h-5 w-5 shrink-0 text-black/60"
                aria-hidden="true"
              />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-black/60">
                  Active since
                </p>
                <p className="mt-0.5 text-lg leading-lg font-semibold text-black">
                  {earliestPost ? formatMonthYear(earliestPost.datetime) : '—'}
                </p>
              </div>
            </li>
            <li className="flex items-center gap-3 rounded-2xl bg-background-contrast p-5">
              <TrendingUp
                className="h-5 w-5 shrink-0 text-black/60"
                aria-hidden="true"
              />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-black/60">
                  Last published
                </p>
                <p className="mt-0.5 text-lg leading-lg font-semibold text-black">
                  {latestPost ? formatMonthYear(latestPost.datetime) : '—'}
                </p>
              </div>
            </li>
            <li className="flex items-center gap-3 rounded-2xl bg-background-contrast p-5">
              <PencilLine
                className="h-5 w-5 shrink-0 text-black/60"
                aria-hidden="true"
              />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-black/60">
                  Avg article
                </p>
                <p className="mt-0.5 text-lg leading-lg font-semibold text-black">
                  {writing.avgWords > 0
                    ? `${writing.avgWords.toLocaleString('en-US')} words`
                    : '—'}
                </p>
              </div>
            </li>
            <li className="flex items-center gap-3 rounded-2xl bg-background-contrast p-5">
              <Clock
                className="h-5 w-5 shrink-0 text-black/60"
                aria-hidden="true"
              />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-black/60">
                  Avg read
                </p>
                <p className="mt-0.5 text-lg leading-lg font-semibold text-black">
                  {avgReadingPerArticle > 0
                    ? `${avgReadingPerArticle} min`
                    : '—'}
                </p>
              </div>
            </li>
          </ul>
        </Container>
      </section>

      {/* CHARTS: cadence + topic distribution */}
      {posts.length > 0 && (
        <section aria-labelledby="author-charts-heading" className="mt-12">
          <Container>
            <h2 id="author-charts-heading" className="sr-only">
              Publishing breakdown
            </h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {/* Publishing cadence */}
              <div className="rounded-2xl bg-background-contrast p-6">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-sm leading-sm font-semibold text-black">
                    Publishing cadence
                  </h3>
                  <span className="text-[10px] uppercase tracking-wide text-black/50">
                    {cadence.mode === 'monthly' ? 'Monthly' : 'Yearly'}
                  </span>
                </div>
                <div
                  className="mt-5 flex h-40 items-stretch gap-2"
                  role="img"
                  aria-label={`${author.name} publishing cadence chart`}
                >
                  {cadence.buckets.map((b) => {
                    const pct =
                      b.count > 0
                        ? Math.max((b.count / cadenceMax) * 100, 8)
                        : 0;
                    return (
                      <div
                        key={b.key}
                        className="flex h-full flex-1 flex-col items-center gap-1.5"
                      >
                        <span className="h-3 text-[8px] leading-none text-black/60">
                          {b.count > 0 ? b.count : ''}
                        </span>
                        <div
                          className="relative w-full flex-1 overflow-hidden rounded-md bg-background-contrast-black/10"
                          title={`${b.count} ${
                            b.count === 1 ? 'post' : 'posts'
                          } · ${b.fullLabel}`}
                        >
                          <div
                            className="absolute inset-x-0 bottom-0 rounded-md bg-background-contrast-black"
                            style={{ height: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[8px] leading-none text-black/60">
                          {b.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Topic distribution */}
              <div className="rounded-2xl bg-background-contrast p-6">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-sm leading-sm font-semibold text-black">
                    Coverage by topic
                  </h3>
                  <span className="text-[10px] uppercase tracking-wide text-black/50">
                    {topics.length} {topics.length === 1 ? 'topic' : 'topics'}
                  </span>
                </div>
                <ul className="mt-5 space-y-3">
                  {topics.map((t) => {
                    const pct = (t.count / posts.length) * 100;
                    return (
                      <li key={t.slug}>
                        <Link
                          href={`/blogs?category=${t.slug}`}
                          className="group block"
                        >
                          <div className="flex items-baseline justify-between gap-2 text-[11px]">
                            <span className="inline-flex items-center gap-1.5 font-medium text-black">
                              <Tag
                                className="h-3 w-3 opacity-50"
                                aria-hidden="true"
                              />
                              {t.title}
                            </span>
                            <span className="shrink-0 text-black/60">
                              {t.count} {t.count === 1 ? 'article' : 'articles'}{' '}
                              · {Math.round(pct)}%
                            </span>
                          </div>
                          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-background-contrast-black/10">
                            <div
                              className="h-full rounded-full bg-background-contrast-black transition-opacity group-hover:opacity-80"
                              style={{ width: `${Math.max(pct, 4)}%` }}
                            />
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Article length mix */}
              {writing.totalWords > 0 && (
                <div className="rounded-2xl bg-background-contrast p-6">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-sm leading-sm font-semibold text-black">
                      Article length mix
                    </h3>
                    <span className="text-[10px] uppercase tracking-wide text-black/50">
                      {totalLengthCounted}{' '}
                      {totalLengthCounted === 1 ? 'article' : 'articles'}
                    </span>
                  </div>
                  <div
                    className="mt-5 flex h-40 items-stretch gap-2"
                    role="img"
                    aria-label={`${author.name} article length distribution`}
                  >
                    {lengthBuckets.map((b) => {
                      const pct =
                        b.count > 0
                          ? Math.max((b.count / lengthBucketsMax) * 100, 8)
                          : 0;
                      return (
                        <div
                          key={b.key}
                          className="flex h-full flex-1 flex-col items-center gap-1.5"
                        >
                          <span className="h-3 text-[8px] leading-none text-black/60">
                            {b.count > 0 ? b.count : ''}
                          </span>
                          <div
                            className="relative w-full flex-1 overflow-hidden rounded-md bg-background-contrast-black/10"
                            title={`${b.count} ${
                              b.count === 1 ? 'post' : 'posts'
                            } · ${b.label} (${b.range})`}
                          >
                            <div
                              className="absolute inset-x-0 bottom-0 rounded-md bg-background-contrast-black"
                              style={{ height: `${pct}%` }}
                            />
                          </div>
                          <div className="flex flex-col items-center text-center">
                            <span className="text-[9px] leading-tight font-medium text-black">
                              {b.label}
                            </span>
                            <span className="text-[8px] leading-tight text-black/50">
                              {b.range}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Depth by topic (total words) */}
              {writing.totalWords > 0 && wordsByTopicSorted.length > 0 && (
                <div className="rounded-2xl bg-background-contrast p-6">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-sm leading-sm font-semibold text-black">
                      Depth by topic
                    </h3>
                    <span className="text-[10px] uppercase tracking-wide text-black/50">
                      {writing.totalWords.toLocaleString('en-US')} total words
                    </span>
                  </div>
                  <ul className="mt-5 space-y-3">
                    {wordsByTopicSorted.map((t) => {
                      const pct = (t.words / totalWordsForBars) * 100;
                      return (
                        <li key={t.slug}>
                          <Link
                            href={`/blogs?category=${t.slug}`}
                            className="group block"
                          >
                            <div className="flex items-baseline justify-between gap-2 text-[11px]">
                              <span className="inline-flex items-center gap-1.5 font-medium text-black">
                                <PencilLine
                                  className="h-3 w-3 opacity-50"
                                  aria-hidden="true"
                                />
                                {t.title}
                              </span>
                              <span className="shrink-0 text-black/60">
                                {t.words.toLocaleString('en-US')} words ·{' '}
                                {Math.round(pct)}%
                              </span>
                            </div>
                            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-background-contrast-black/10">
                              <div
                                className="h-full rounded-full bg-background-contrast-black transition-opacity group-hover:opacity-80"
                                style={{ width: `${Math.max(pct, 4)}%` }}
                              />
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </Container>
        </section>
      )}

      {/* HIGHLIGHTS */}
      {(topTopic || longestPost || latestPost) && (
        <section aria-labelledby="author-highlights-heading" className="mt-12">
          <Container>
            <Heading
              titleTag="h2"
              seperatorTitle="01 — Highlights"
              eyebrowRight="Key Signals"
              title="Highlights"
              titleAccent={`The strongest signals from ${firstName}.`}
              description="A quick view of the author’s most-covered topic, longest deep-dive, and most recent article."
              containerStyle="px-0 md:px-0 mb-10 w-full max-w-none"
              titleStyle="max-w-4xl"
              descStyle="max-w-3xl"
            />
            <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              {topTopic && (
                <li className="rounded-2xl bg-background-contrast p-5">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-black/60">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="leading-none">Most-covered topic</span>
                  </div>
                  <p className="mt-3 text-md leading-md font-semibold text-black">
                    {topTopic.title}
                  </p>
                  <p className="mt-1 text-xs leading-xs text-black/60">
                    {topTopic.count}{' '}
                    {topTopic.count === 1 ? 'article' : 'articles'} ·{' '}
                    {Math.round((topTopic.count / posts.length) * 100)}% of
                    output
                  </p>
                  <Link
                    href={`/blogs?category=${topTopic.slug}`}
                    className="mt-4 inline-flex"
                  >
                    <Button
                      variant="secondary"
                      size="small"
                      icon={Tag}
                      className="px-3.5 py-2 text-[10px] uppercase tracking-wide"
                    >
                      Browse topic
                    </Button>
                  </Link>
                </li>
              )}
              {longestPost && longestEntry && longestEntry.words > 0 && (
                <li className="rounded-2xl bg-background-contrast p-5">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-black/60">
                    <PencilLine className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="leading-none">Longest deep-dive</span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-md leading-md font-semibold text-black">
                    {longestPost.title}
                  </p>
                  <p className="mt-1 text-xs leading-xs text-black/60">
                    {longestEntry.words.toLocaleString('en-US')} words ·{' '}
                    {readingMinutes(longestEntry.words)} min read
                  </p>
                  <Link href={longestPost.href} className="mt-4 inline-flex">
                    <Button
                      variant="secondary"
                      size="small"
                      icon={BookOpen}
                      className="px-3.5 py-2 text-[10px] uppercase tracking-wide"
                    >
                      Read article
                    </Button>
                  </Link>
                </li>
              )}
              {latestPost && (
                <li className="rounded-2xl bg-background-contrast p-5">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-black/60">
                    <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="leading-none">Most recent post</span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-md leading-md font-semibold text-black">
                    {latestPost.title}
                  </p>
                  <p className="mt-1 text-xs leading-xs text-black/60">
                    <time dateTime={latestPost.datetime}>
                      {latestPost.date}
                    </time>{' '}
                    · {latestPost.category.title}
                  </p>
                  <Link href={latestPost.href} className="mt-4 inline-flex">
                    <Button
                      variant="secondary"
                      size="small"
                      icon={BookOpen}
                      className="px-3.5 py-2 text-[10px] uppercase tracking-wide"
                    >
                      Read article
                    </Button>
                  </Link>
                </li>
              )}
            </ul>
          </Container>
        </section>
      )}

      {/* BROWSE BY TOPIC */}
      {topicShowcase.length >= 2 && (
        <section aria-labelledby="author-topics-heading" className="mt-12">
          <Container>
            <Heading
              titleTag="h2"
              seperatorTitle="02 — Topics"
              eyebrowRight="Topic Map"
              title="Browse by topic"
              titleAccent={`A starting point in each area ${firstName} writes about.`}
              description="Explore the latest article in each topic area, then browse the full category when you need more depth."
              containerStyle="px-0 md:px-0 mb-10 w-full max-w-none"
              titleStyle="max-w-4xl"
              descStyle="max-w-3xl"
            />
            <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {topicShowcase.map(({ topic, post }) => (
                <li key={topic.slug}>
                  <article className="group flex h-full flex-col overflow-hidden rounded-2xl bg-background-contrast">
                    <Link
                      href={post.href}
                      className="relative aspect-video w-full overflow-hidden"
                    >
                      <ImageKit
                        alt={post.title}
                        src={post.imageUrl}
                        fill
                        sizes="(min-width: 1024px) 33vw, 100vw"
                        className="object-cover bg-background-contrast-black transition-transform duration-300 group-hover:scale-105"
                      />
                    </Link>
                    <div className="flex min-h-0 flex-1 flex-col gap-3 p-5">
                      <div className="flex flex-wrap items-center gap-2 text-[10px]">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-background-contrast-black/10 px-3 py-1 text-black">
                          <Tag
                            className="h-3 w-3 opacity-60"
                            aria-hidden="true"
                          />
                          <span className="leading-none">{topic.title}</span>
                        </span>
                        <span className="text-black/60">
                          {topic.count}{' '}
                          {topic.count === 1 ? 'article' : 'articles'}
                        </span>
                      </div>
                      <h3 className="line-clamp-2 text-sm leading-sm font-semibold text-black">
                        <Link
                          href={post.href}
                          className="transition-colors hover:text-black/80"
                        >
                          {post.title}
                        </Link>
                      </h3>
                      <p className="line-clamp-3 text-xs leading-xs text-black/70">
                        {post.description}
                      </p>
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2 text-[10px]">
                        <Link href={post.href} className="inline-flex">
                          <Button
                            variant="secondary"
                            size="small"
                            icon={BookOpen}
                            className="px-3 py-1.5 text-[10px] uppercase tracking-wide"
                          >
                            Read latest
                          </Button>
                        </Link>
                        <Link
                          href={`/blogs?category=${topic.slug}`}
                          className="inline-flex items-center gap-1.5 uppercase tracking-wide text-black/60 transition-colors hover:text-black"
                        >
                          <span className="leading-none">All in topic</span>
                          <ArrowUpRight
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        </Link>
                      </div>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      {/* MORE ARTICLES */}
      {restPosts.length > 0 && (
        <section
          aria-label={`More articles from ${firstName}`}
          className="mt-12"
        >
          <Container>
            <Heading
              titleTag="h2"
              seperatorTitle="03 — More Articles"
              eyebrowRight="More Reads"
              title={`More from ${firstName}`}
              titleAccent="Additional thinking from the same author."
              description="Continue through the author’s article library across strategy, marketing, brand, web, and media production."
              containerStyle="px-0 md:px-0 mb-10 w-full max-w-none"
              titleStyle="max-w-4xl"
              descStyle="max-w-3xl"
            />
            <div id="articles" className="scroll-mt-24">
              {restTotalPages > 1 && (
                <p
                  className="mb-6 text-xs leading-xs text-black/60 tabular-nums"
                  aria-live="polite"
                >
                  Showing{' '}
                  <span className="font-medium text-black">
                    {restStartIndex}–{restEndIndex}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium text-black">
                    {restPosts.length}
                  </span>{' '}
                  {restPosts.length === 1 ? 'article' : 'articles'}
                </p>
              )}
            <ul className="grid grid-cols-1 items-stretch gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
              {paginatedRestPosts.map((post) => (
                <li key={post.id}>
                  <article className="flex h-full flex-col items-start justify-start rounded-2xl bg-background-contrast">
                    <Link
                      href={post.href}
                      className="relative w-full aspect-video sm:aspect-2/1 lg:aspect-3/2 rounded-2xl"
                    >
                      <ImageKit
                        alt={post.title}
                        src={post.imageUrl}
                        fill
                        sizes="(min-width: 1024px) 33vw, 100vw"
                        className="rounded-2xl object-cover bg-background-contrast-black"
                      />
                    </Link>
                    <div className="flex min-h-0 flex-1 flex-col px-4 py-6">
                      <div className="flex items-center gap-x-4 text-[8px]">
                        <span className="inline-flex items-center gap-1 text-black">
                          <Calendar
                            className="h-3 w-3 opacity-60"
                            aria-hidden="true"
                          />
                          <time dateTime={post.datetime} className="text-black">
                            {post.date}
                          </time>
                        </span>
                        <Link
                          href={`/blogs?category=${post.category.slug}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-background-contrast-black/10 px-3 py-1 text-black"
                        >
                          <span className="leading-none">
                            {post.category.title}
                          </span>
                        </Link>
                      </div>
                      <h3 className="mt-3 line-clamp-2 text-sm leading-sm font-semibold text-black">
                        <Link href={post.href}>{post.title}</Link>
                      </h3>
                      <p className="mt-3 line-clamp-3 text-xs leading-xs text-black/70">
                        {post.description}
                      </p>
                    </div>
                  </article>
                </li>
              ))}
            </ul>

            {restTotalPages > 1 && (
              <nav
                aria-label={`${firstName} article pagination`}
                className="mt-12 flex flex-wrap items-center justify-center gap-1.5"
              >
                {restActivePage > 1 && (
                  <Link
                    href={buildPageHref(restActivePage - 1)}
                    rel="prev"
                    aria-label="Previous page"
                    className="inline-flex items-center gap-1 rounded-full bg-background-contrast-black/10 px-3 py-1.5 text-[10px] text-black transition-colors hover:bg-background-contrast-black/15"
                  >
                    <ChevronLeft className="h-3 w-3" aria-hidden="true" />
                    <span>Prev</span>
                  </Link>
                )}

                {getPageNumbers(restActivePage, restTotalPages).map((p, i) =>
                  p === 'ellipsis' ? (
                    <span
                      key={`ellipsis-${i}`}
                      aria-hidden="true"
                      className="px-1 text-[10px] text-black/40"
                    >
                      …
                    </span>
                  ) : p === restActivePage ? (
                    <span
                      key={p}
                      aria-current="page"
                      aria-label={`Page ${p}, current`}
                      className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-background-contrast-black px-2 text-[10px] tabular-nums text-white"
                    >
                      {p}
                    </span>
                  ) : (
                    <Link
                      key={p}
                      href={buildPageHref(p)}
                      aria-label={`Page ${p}`}
                      className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-background-contrast-black/10 px-2 text-[10px] tabular-nums text-black transition-colors hover:bg-background-contrast-black/15"
                    >
                      {p}
                    </Link>
                  ),
                )}

                {restActivePage < restTotalPages && (
                  <Link
                    href={buildPageHref(restActivePage + 1)}
                    rel="next"
                    aria-label="Next page"
                    className="inline-flex items-center gap-1 rounded-full bg-background-contrast-black/10 px-3 py-1.5 text-[10px] text-black transition-colors hover:bg-background-contrast-black/15"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-3 w-3" aria-hidden="true" />
                  </Link>
                )}
              </nav>
            )}
            </div>
          </Container>
        </section>
      )}

      {/* EMPTY STATE */}
      {posts.length === 0 && (
        <section className="mt-12">
          <Container>
            <div className="rounded-2xl bg-background-contrast p-8 text-center">
              <p className="text-md leading-md text-black/70">
                No articles yet — check back soon.
              </p>
            </div>
          </Container>
        </section>
      )}

      {/* SPECIALTIES */}
      {specialties.length > 0 && (
        <section aria-label="Author specialties" className="mt-16">
          <Container>
            <div className="mb-10">
              <Heading
                titleTag="h2"
                seperatorTitle="04 — Specialties"
                eyebrowRight="Core Focus"
                title={
                  isAgencyAuthor
                    ? `What ${firstName} does`
                    : `What ${firstName} knows about`
                }
                titleAccent={
                  isAgencyAuthor
                    ? 'Services connected to the studio’s work.'
                    : 'Topics connected to this author’s expertise.'
                }
                description={
                  isAgencyAuthor
                    ? 'Explore the services most closely connected to this author profile.'
                    : 'Explore the topics and skills this author writes about most often.'
                }
                containerStyle="px-0 md:px-0 w-full max-w-none"
                titleStyle="max-w-4xl"
                descStyle="max-w-3xl"
              />

              {isAgencyAuthor && (
                <Link href="/services" className="mt-6 inline-flex">
                  <Button
                    variant="secondary"
                    size="small"
                    icon={Layers}
                    className="px-4 py-2 text-[10px] uppercase tracking-wide"
                  >
                    All services
                  </Button>
                </Link>
              )}
            </div>
            <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {specialties.map((specialty) => {
                const card = (
                  <>
                    <p className="text-md leading-md font-semibold text-black">
                      {specialty.title}
                    </p>
                    <p className="mt-2 text-xs leading-xs text-black/70">
                      {specialty.description}
                    </p>
                    {specialty.href && (
                      <span className="mt-auto inline-flex items-center gap-1 pt-4 text-[10px] uppercase tracking-wide text-black/60 transition-colors group-hover:text-black">
                        <span className="leading-none">Explore</span>
                        <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                      </span>
                    )}
                  </>
                );

                return (
                  <li key={specialty.title}>
                    {specialty.href ? (
                      <Link
                        href={specialty.href}
                        className="group flex h-full flex-col rounded-2xl bg-background-contrast p-5 transition-colors hover:bg-background-contrast-black/10"
                      >
                        {card}
                      </Link>
                    ) : (
                      <div className="flex h-full flex-col rounded-2xl bg-background-contrast p-5">
                        {card}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Container>
        </section>
      )}

      {/* CTA */}
      <section aria-labelledby="author-cta-heading" className="mt-16">
        <Container>
          <div className="relative overflow-hidden rounded-2xl bg-background-contrast-black p-8 text-white sm:p-10">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-white/60">
                  {author.location && (
                    <>
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      <span className="leading-none">
                        Based in {author.location.locality},{' '}
                        {author.location.region}
                      </span>
                    </>
                  )}
                </p>
                <h2
                  id="author-cta-heading"
                  className="mt-1 text-2xl leading-2xl font-bold sm:text-3xl"
                >
                  Work with Perseus
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-sm text-white/70">
                  From brand strategy to launch, we help Vancouver businesses
                  ship work that compounds. Tell us where you want to grow.
                </p>
              </div>
              <Link href="/contact" className="inline-flex w-fit">
                <Button
                  variant="secondary"
                  size="small"
                  icon={ArrowUpRight}
                  className="bg-white px-5 py-2.5 text-[10px] uppercase tracking-wide text-black hover:bg-white/90"
                >
                  Get in touch
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
