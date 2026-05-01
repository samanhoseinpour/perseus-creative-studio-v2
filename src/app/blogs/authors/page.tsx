import path from 'path';
import fs from 'fs/promises';
import matter from 'gray-matter';
import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import {
  Instagram,
  Linkedin,
  Youtube,
  Facebook,
  Twitter,
  Globe,
  Tag,
  ArrowRight,
  ArrowUpRight,
  FileText,
  Layers,
  PencilLine,
  Users,
  MapPin,
  Sparkles,
  TrendingUp,
  Calendar,
  Clock,
  BookOpen,
  History,
  type LucideIcon,
} from 'lucide-react';
import { Container, ImageKit, BorderBeam, TextShimmer } from '@/components';
import BlogBreadcrumb from '@/components/Blogs/BlogBreadcrumb';
import {
  BLOG_AUTHORS,
  blogPosts,
  type BlogAuthor,
  type BlogPost,
} from '@/constants/blogs';
import { SITE_URL } from '@/constants';
import { countWords, readingMinutes } from '@/utils/extractHeadings';

const IMAGEKIT_BASE = 'https://ik.imagekit.io/perseus';
const FALLBACK_OG_IMAGE = `${IMAGEKIT_BASE}/navbar-about-2.jpeg`;
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const CANONICAL = `${SITE_URL}/blogs/authors`;

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

function formatMonthYear(datetime: string): string {
  const d = new Date(`${datetime}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatReadingTime(min: number): string {
  if (min <= 0) return '—';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
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

function authorPostsFor(author: BlogAuthor) {
  return blogPosts
    .filter((p) => p.author.href === author.href)
    .sort((a, b) => (a.datetime < b.datetime ? 1 : -1));
}

type TopicCount = { title: string; slug: string; count: number };

function topicsFor(posts: BlogPost[]): TopicCount[] {
  const map = new Map<string, TopicCount>();
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

type PostWordCount = { slug: string; words: number };

async function wordCountsFor(posts: BlogPost[]): Promise<PostWordCount[]> {
  if (!posts.length) return [];
  return Promise.all(
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
}

type AuthorSummary = {
  author: BlogAuthor;
  posts: BlogPost[];
  topics: TopicCount[];
  topTopic: TopicCount | null;
  latestPost: BlogPost | null;
  earliestPost: BlogPost | null;
  perPost: PostWordCount[];
  totalWords: number;
};

async function buildAuthorSummary(author: BlogAuthor): Promise<AuthorSummary> {
  const posts = authorPostsFor(author);
  const topics = topicsFor(posts);
  const perPost = await wordCountsFor(posts);
  const totalWords = perPost.reduce((sum, w) => sum + w.words, 0);
  return {
    author,
    posts,
    topics,
    topTopic: topics[0] ?? null,
    latestPost: posts[0] ?? null,
    earliestPost: posts.length > 0 ? posts[posts.length - 1] : null,
    perPost,
    totalWords,
  };
}

const TITLE = 'Blog Authors & Contributors — Perseus Creative Studio';
const DESCRIPTION =
  'Meet the writers behind the Perseus Creative Studio blog — strategists, operators, and creatives covering digital marketing, brand, web, and media production from Vancouver, BC.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL },
  openGraph: {
    type: 'website',
    title: TITLE,
    description: DESCRIPTION,
    url: CANONICAL,
    siteName: 'Perseus Creative Studio',
    locale: 'en_CA',
    images: [
      {
        url: FALLBACK_OG_IMAGE,
        width: OG_WIDTH,
        height: OG_HEIGHT,
        alt: 'Perseus Creative Studio — Authors',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [FALLBACK_OG_IMAGE],
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

export default async function AuthorsIndexPage() {
  // Promote the agency author first, then individuals, preserving the order
  // declared in BLOG_AUTHORS.
  const orderedAuthors = Object.values(BLOG_AUTHORS).sort((a, b) => {
    if (a.slug === 'perseus-creative-studio') return -1;
    if (b.slug === 'perseus-creative-studio') return 1;
    return 0;
  });

  const summaries = await Promise.all(orderedAuthors.map(buildAuthorSummary));

  const totalArticles = summaries.reduce((sum, s) => sum + s.posts.length, 0);
  const totalWords = summaries.reduce((sum, s) => sum + s.totalWords, 0);
  const allTopics = new Set<string>();
  for (const s of summaries) {
    for (const t of s.topics) allTopics.add(t.slug);
  }

  // Cross-team data: flatten posts across authors, aggregate topic counts,
  // find newest/oldest, build a team-wide cadence chart, and attach each post
  // to its author for attribution.
  const allPosts = summaries
    .flatMap((s) => s.posts)
    .sort((a, b) => (a.datetime < b.datetime ? 1 : -1));
  const teamTopics = topicsFor(allPosts);
  const teamCadence = buildCadenceBuckets(allPosts);
  const teamCadenceMax = Math.max(
    1,
    ...teamCadence.buckets.map((b) => b.count),
  );
  const totalReadingMinutes = totalWords > 0 ? readingMinutes(totalWords) : 0;
  const avgWordsPerArticle =
    totalArticles > 0 ? Math.round(totalWords / totalArticles) : 0;
  const avgReadingPerArticle =
    avgWordsPerArticle > 0 ? readingMinutes(avgWordsPerArticle) : 0;
  const teamLatest = allPosts[0] ?? null;
  const teamEarliest =
    allPosts.length > 0 ? allPosts[allPosts.length - 1] : null;
  const recentPosts = allPosts.slice(0, 6);

  const authorByHref = new Map(summaries.map((s) => [s.author.href, s.author]));
  const wordsBySlug = new Map<string, number>();
  for (const s of summaries) {
    for (const w of s.perPost) wordsBySlug.set(w.slug, w.words);
  }
  const teamLatestAuthor = teamLatest
    ? (authorByHref.get(teamLatest.author.href) ?? null)
    : null;
  const teamLatestWords = teamLatest
    ? (wordsBySlug.get(teamLatest.slug) ?? 0)
    : 0;

  return (
    <main className="pb-16 lg:pb-24">
      <Script
        id="ld-json-authors-index"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'BreadcrumbList',
                '@id': `${CANONICAL}#breadcrumb`,
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
                    item: CANONICAL,
                  },
                ],
              },
              {
                '@type': 'CollectionPage',
                '@id': `${CANONICAL}#collection`,
                inLanguage: 'en-CA',
                url: CANONICAL,
                name: TITLE,
                description: DESCRIPTION,
                breadcrumb: { '@id': `${CANONICAL}#breadcrumb` },
                hasPart: summaries.map((s) => ({
                  '@type': 'Person',
                  name: s.author.name,
                  jobTitle: s.author.role,
                  description: s.author.bio,
                  url: `${SITE_URL}${s.author.href}`,
                  image: `${SITE_URL}${s.author.imageUrl}`,
                  sameAs: s.author.sameAs,
                })),
                mainEntity: {
                  '@type': 'ItemList',
                  itemListOrder: 'https://schema.org/ItemListOrderAscending',
                  numberOfItems: summaries.length,
                  itemListElement: summaries.map((s, i) => ({
                    '@type': 'ListItem',
                    position: i + 1,
                    url: `${SITE_URL}${s.author.href}`,
                    name: s.author.name,
                  })),
                },
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
                { label: 'Authors' },
              ]}
            />

            <div className="mt-2 flex flex-col gap-4">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-background-contrast-black/10 px-3 py-1 text-[10px] uppercase tracking-wide text-black">
                <Users className="h-3 w-3 opacity-60" aria-hidden="true" />
                <span className="leading-none">
                  {summaries.length}{' '}
                  {summaries.length === 1 ? 'contributor' : 'contributors'}
                </span>
              </span>

              <h1 className="text-3xl leading-3xl font-bold text-black sm:text-4xl sm:leading-4xl lg:text-5xl lg:leading-5xl">
                <TextShimmer as="span">Meet our authors</TextShimmer>
              </h1>

              <p className="max-w-2xl text-md leading-md text-black/80">
                Strategists, operators, and creatives behind the Perseus
                Creative Studio blog — writing about digital marketing, brand,
                web, and media production from Vancouver, BC.
              </p>
            </div>
          </div>
        </Container>
      </header>

      {/* AUTHORS GRID */}
      <section aria-labelledby="authors-grid-heading">
        <Container>
          <div className="mb-6 flex items-end justify-between gap-3">
            <div>
              <h2
                id="authors-grid-heading"
                className="text-xl leading-xl font-semibold text-black sm:text-2xl"
              >
                Meet the team
              </h2>
              <p className="mt-1 text-xs leading-xs text-black/60">
                {summaries.length} voices, one studio. Pick a profile to dive
                into their articles, expertise, and writing cadence.
              </p>
            </div>
            <Link
              href="/blogs"
              className="hidden items-center gap-1.5 text-[10px] uppercase tracking-wide text-black sm:inline-flex"
            >
              <span className="leading-none">All articles</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {summaries.map(
              ({
                author,
                posts,
                topics,
                topTopic,
                latestPost,
                earliestPost,
              }) => (
                <li key={author.slug}>
                  <article className="group relative flex h-full flex-col rounded-2xl bg-background-contrast p-6 ring-1 ring-transparent transition-all duration-300 hover:-translate-y-0.5 hover:ring-black/10">
                    <div className="flex flex-col items-center text-center">
                      <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full bg-background-contrast-black/5">
                        <ImageKit
                          src={author.imageUrl}
                          alt={`${author.name} portrait`}
                          width={224}
                          height={224}
                          className="h-full w-full object-cover p-1.5"
                        />
                        <BorderBeam duration={14} size={120} />
                      </div>

                      <p className="mt-4 text-[10px] uppercase tracking-wide text-black/60">
                        {author.role}
                      </p>
                      <h3 className="mt-1 text-lg leading-lg font-semibold text-black sm:text-xl sm:leading-xl">
                        <Link
                          href={author.href}
                          className="transition-colors before:absolute before:inset-0 before:rounded-2xl before:content-[''] hover:text-black/80"
                          aria-label={`${author.name} — ${author.role}`}
                        >
                          {author.name}
                        </Link>
                      </h3>
                      {author.location && (
                        <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-black/60">
                          <MapPin
                            className="h-3 w-3 opacity-60"
                            aria-hidden="true"
                          />
                          <span className="leading-none">
                            {author.location.locality}, {author.location.region}
                          </span>
                        </p>
                      )}
                    </div>

                    <p className="mt-4 line-clamp-3 text-center text-xs leading-xs text-black/70">
                      {author.bio}
                    </p>

                    <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-black/10 pt-5">
                      <div className="text-center">
                        <dt className="text-[9px] uppercase tracking-wide text-black/50">
                          Articles
                        </dt>
                        <dd className="mt-0.5 inline-flex items-center gap-1 text-sm leading-sm font-semibold text-black">
                          <FileText
                            className="h-3 w-3 opacity-50"
                            aria-hidden="true"
                          />
                          {posts.length}
                        </dd>
                      </div>
                      <div className="text-center">
                        <dt className="text-[9px] uppercase tracking-wide text-black/50">
                          Topics
                        </dt>
                        <dd className="mt-0.5 inline-flex items-center gap-1 text-sm leading-sm font-semibold text-black">
                          <Layers
                            className="h-3 w-3 opacity-50"
                            aria-hidden="true"
                          />
                          {topics.length}
                        </dd>
                      </div>
                      <div className="text-center">
                        <dt className="text-[9px] uppercase tracking-wide text-black/50">
                          {latestPost ? 'Last' : 'Active'}
                        </dt>
                        <dd className="mt-0.5 inline-flex items-center gap-1 text-sm leading-sm font-semibold text-black">
                          <TrendingUp
                            className="h-3 w-3 opacity-50"
                            aria-hidden="true"
                          />
                          {latestPost
                            ? formatMonthYear(latestPost.datetime)
                            : earliestPost
                              ? formatMonthYear(earliestPost.datetime)
                              : '—'}
                        </dd>
                      </div>
                    </dl>

                    {topTopic && (
                      <p className="mt-4 inline-flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-wide text-black/60">
                        <Sparkles
                          className="h-3 w-3 opacity-60"
                          aria-hidden="true"
                        />
                        <span className="leading-none">
                          Most-covered: {topTopic.title}
                        </span>
                      </p>
                    )}

                    {topics.length > 0 && (
                      <ul className="relative z-10 mt-3 flex flex-wrap justify-center gap-1.5">
                        {topics.slice(0, 4).map((t) => (
                          <li key={t.slug}>
                            <Link
                              href={`/blogs?category=${t.slug}`}
                              className="inline-flex items-center gap-1 rounded-full bg-background-contrast-black/10 px-2.5 py-1 text-[10px] text-black transition-colors hover:bg-background-contrast-black/15"
                            >
                              <Tag
                                className="h-3 w-3 opacity-60"
                                aria-hidden="true"
                              />
                              <span className="leading-none">{t.title}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="relative z-10 mt-auto flex flex-wrap items-center justify-between gap-3 pt-6">
                      {author.sameAs.length > 0 ? (
                        <ul
                          aria-label={`${author.name} on social media`}
                          className="flex flex-wrap gap-1.5"
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
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-background-contrast-black/10 text-black transition-colors hover:bg-background-contrast-black/15"
                                >
                                  <Icon
                                    className="h-3.5 w-3.5 opacity-70"
                                    aria-hidden="true"
                                  />
                                </a>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <span aria-hidden="true" />
                      )}

                      <Link
                        href={author.href}
                        className="inline-flex items-center gap-1.5 rounded-full bg-background-contrast-black px-4 py-2 text-[10px] uppercase tracking-wide text-white transition-colors hover:bg-background-contrast-black/90"
                      >
                        <span className="leading-none">View profile</span>
                        <ArrowUpRight
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                      </Link>
                    </div>
                  </article>
                </li>
              ),
            )}
          </ul>
        </Container>
      </section>

      {/* STATS STRIP */}
      <section aria-labelledby="authors-stats-heading" className="mt-16">
        <Container>
          <div className="mb-6">
            <h2
              id="authors-stats-heading"
              className="text-xl leading-xl font-semibold text-black sm:text-2xl"
            >
              Studio at a glance
            </h2>
            <p className="mt-1 text-xs leading-xs text-black/60">
              The numbers behind everything the team has shipped to date.
            </p>
          </div>
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <li className="flex items-center gap-3 rounded-2xl bg-background-contrast p-5">
              <Users
                className="h-5 w-5 shrink-0 text-black/60"
                aria-hidden="true"
              />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-black/60">
                  Contributors
                </p>
                <p className="mt-0.5 text-lg leading-lg font-semibold text-black">
                  {summaries.length}
                </p>
              </div>
            </li>
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
                  {totalArticles}
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
                  {allTopics.size}
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
                  {totalWords > 0 ? totalWords.toLocaleString('en-US') : '—'}
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
                  {formatReadingTime(totalReadingMinutes)}
                </p>
              </div>
            </li>
            <li className="flex items-center gap-3 rounded-2xl bg-background-contrast p-5">
              <History
                className="h-5 w-5 shrink-0 text-black/60"
                aria-hidden="true"
              />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-black/60">
                  First published
                </p>
                <p className="mt-0.5 text-lg leading-lg font-semibold text-black">
                  {teamEarliest ? formatMonthYear(teamEarliest.datetime) : '—'}
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
                  {teamLatest ? formatMonthYear(teamLatest.datetime) : '—'}
                </p>
              </div>
            </li>
            <li className="flex items-center gap-3 rounded-2xl bg-background-contrast p-5">
              <BookOpen
                className="h-5 w-5 shrink-0 text-black/60"
                aria-hidden="true"
              />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-black/60">
                  Avg article
                </p>
                <p className="mt-0.5 text-lg leading-lg font-semibold text-black">
                  {avgWordsPerArticle > 0
                    ? `${avgWordsPerArticle.toLocaleString('en-US')} words`
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

      {/* LATEST FROM THE TEAM */}
      {teamLatest && (
        <section aria-labelledby="authors-latest-heading" className="mt-12">
          <Container>
            <div className="flex items-baseline justify-between gap-3">
              <h2
                id="authors-latest-heading"
                className="text-xl leading-xl font-semibold text-black sm:text-2xl"
              >
                Latest from the team
              </h2>
              <Link
                href="/blogs"
                className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-black"
              >
                <span className="leading-none">All articles</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
            <article className="mt-4 grid gap-0 overflow-hidden rounded-2xl bg-background-contrast md:grid-cols-2">
              <Link
                href={teamLatest.href}
                className="group relative aspect-video w-full overflow-hidden md:aspect-auto md:h-full md:min-h-[280px]"
              >
                <ImageKit
                  src={teamLatest.imageUrl}
                  alt={teamLatest.title}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover bg-background-contrast-black transition-transform duration-300 group-hover:scale-105"
                />
              </Link>
              <div className="flex min-h-0 flex-col justify-center gap-4 p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-2 text-[10px]">
                  <Link
                    href={`/blogs?category=${teamLatest.category.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-background-contrast-black/10 px-3 py-1 text-black"
                  >
                    <Tag className="h-3 w-3 opacity-60" aria-hidden="true" />
                    <span className="leading-none">
                      {teamLatest.category.title}
                    </span>
                  </Link>
                  <span className="inline-flex items-center gap-1 text-black/60">
                    <Calendar
                      className="h-3 w-3 opacity-60"
                      aria-hidden="true"
                    />
                    <time dateTime={teamLatest.datetime}>
                      {teamLatest.date}
                    </time>
                  </span>
                  {teamLatestWords > 0 && (
                    <span className="inline-flex items-center gap-1 text-black/60">
                      <Clock
                        className="h-3 w-3 opacity-60"
                        aria-hidden="true"
                      />
                      <span className="leading-none">
                        {readingMinutes(teamLatestWords)} min read
                      </span>
                    </span>
                  )}
                </div>
                <h3 className="line-clamp-3 text-xl leading-xl font-semibold text-black sm:text-2xl">
                  <Link
                    href={teamLatest.href}
                    className="transition-colors hover:text-black/80"
                  >
                    {teamLatest.title}
                  </Link>
                </h3>
                <p className="line-clamp-3 text-xs leading-xs text-black/70">
                  {teamLatest.description}
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3 pt-2">
                  {teamLatestAuthor && (
                    <Link
                      href={teamLatestAuthor.href}
                      className="inline-flex items-center gap-2"
                    >
                      <span className="relative h-7 w-7 overflow-hidden rounded-full bg-background-contrast-black/10">
                        <ImageKit
                          src={teamLatestAuthor.imageUrl}
                          alt=""
                          width={48}
                          height={48}
                          className="h-full w-full object-cover p-0.5"
                        />
                      </span>
                      <span className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wide text-black/60">
                          By
                        </span>
                        <span className="text-xs leading-xs font-medium text-black">
                          {teamLatestAuthor.name}
                        </span>
                      </span>
                    </Link>
                  )}
                  <Link
                    href={teamLatest.href}
                    className="inline-flex items-center gap-1.5 rounded-full bg-background-contrast-black px-4 py-2 text-[10px] uppercase tracking-wide text-white transition-colors hover:bg-background-contrast-black/90"
                  >
                    <span className="leading-none">Read article</span>
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </article>
          </Container>
        </section>
      )}

      {/* WHAT WE COVER — team-wide topics */}
      {teamTopics.length > 0 && (
        <section aria-labelledby="authors-topics-heading" className="mt-12">
          <Container>
            <div>
              <h2
                id="authors-topics-heading"
                className="text-xl leading-xl font-semibold text-black sm:text-2xl"
              >
                What we cover
              </h2>
              <p className="mt-1 text-xs leading-xs text-black/60">
                Every topic the Perseus team has published on, ranked by output.
              </p>
            </div>
            <ul className="mt-4 flex flex-wrap gap-2">
              {teamTopics.map((t) => {
                const pct = (t.count / allPosts.length) * 100;
                return (
                  <li key={t.slug}>
                    <Link
                      href={`/blogs?category=${t.slug}`}
                      className="group inline-flex items-center gap-2 rounded-full bg-background-contrast px-4 py-2 text-xs leading-xs text-black transition-colors hover:bg-background-contrast-black/10"
                    >
                      <Tag
                        className="h-3.5 w-3.5 opacity-60"
                        aria-hidden="true"
                      />
                      <span className="font-medium">{t.title}</span>
                      <span className="text-[10px] text-black/60">
                        {t.count} · {Math.round(pct)}%
                      </span>
                      <ArrowUpRight
                        className="h-3 w-3 opacity-50 transition-opacity group-hover:opacity-100"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Container>
        </section>
      )}

      {/* PUBLISHING MOMENTUM — team cadence chart */}
      {teamCadence.buckets.length > 0 && (
        <section aria-labelledby="authors-momentum-heading" className="mt-12">
          <Container>
            <div className="rounded-2xl bg-background-contrast p-6">
              <div className="flex items-baseline justify-between gap-3">
                <h2
                  id="authors-momentum-heading"
                  className="text-sm leading-sm font-semibold text-black"
                >
                  Publishing momentum
                </h2>
                <span className="text-[10px] uppercase tracking-wide text-black/50">
                  {teamCadence.mode === 'monthly' ? 'Monthly' : 'Yearly'} ·{' '}
                  {totalArticles} {totalArticles === 1 ? 'article' : 'articles'}
                </span>
              </div>
              <div
                className="mt-5 flex h-40 items-stretch gap-2"
                role="img"
                aria-label="Perseus team publishing cadence"
              >
                {teamCadence.buckets.map((b) => {
                  const pct =
                    b.count > 0
                      ? Math.max((b.count / teamCadenceMax) * 100, 8)
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
          </Container>
        </section>
      )}

      {/* RECENT ACTIVITY — last few posts across the team */}
      {recentPosts.length > 0 && (
        <section aria-labelledby="authors-recent-heading" className="mt-12">
          <Container>
            <div className="flex items-baseline justify-between gap-3">
              <h2
                id="authors-recent-heading"
                className="text-xl leading-xl font-semibold text-black sm:text-2xl"
              >
                Recent activity
              </h2>
              <span className="text-[10px] uppercase tracking-wide text-black/50">
                Last {recentPosts.length}{' '}
                {recentPosts.length === 1 ? 'article' : 'articles'}
              </span>
            </div>
            <ol className="mt-4 divide-y divide-black/10 overflow-hidden rounded-2xl bg-background-contrast">
              {recentPosts.map((post) => {
                const author = authorByHref.get(post.author.href) ?? null;
                const words = wordsBySlug.get(post.slug) ?? 0;
                return (
                  <li key={post.id}>
                    <Link
                      href={post.href}
                      className="group flex items-center gap-4 p-4 transition-colors duration-500 hover:bg-background-contrast-black/5"
                    >
                      <span className="relative hidden h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-background-contrast-black/10 sm:block">
                        <ImageKit
                          src={post.imageUrl}
                          alt=""
                          fill
                          sizes="96px"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-black/60">
                          <span className="inline-flex items-center gap-1">
                            <Calendar
                              className="h-3 w-3 opacity-60"
                              aria-hidden="true"
                            />
                            <time dateTime={post.datetime}>{post.date}</time>
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-background-contrast-black/10 px-2 py-0.5 text-black">
                            <Tag
                              className="h-3 w-3 opacity-60"
                              aria-hidden="true"
                            />
                            <span className="leading-none">
                              {post.category.title}
                            </span>
                          </span>
                          {words > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <Clock
                                className="h-3 w-3 opacity-60"
                                aria-hidden="true"
                              />
                              <span className="leading-none">
                                {readingMinutes(words)} min
                              </span>
                            </span>
                          )}
                        </div>
                        <h3 className="mt-1.5 line-clamp-2 text-sm leading-sm font-semibold text-black transition-colors group-hover:text-black/80">
                          {post.title}
                        </h3>
                        {author && (
                          <p className="mt-1 inline-flex items-center gap-1.5 text-[10px] text-black/60">
                            <span className="leading-none">By</span>
                            <span className="leading-none font-medium text-black">
                              {author.name}
                            </span>
                          </p>
                        )}
                      </div>
                      <ArrowUpRight
                        className="h-4 w-4 shrink-0 text-black/40 transition-colors group-hover:text-black"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                );
              })}
            </ol>
          </Container>
        </section>
      )}

      {/* CTA */}
      <section aria-labelledby="authors-cta-heading" className="mt-16">
        <Container>
          <div className="relative overflow-hidden rounded-2xl bg-background-contrast-black p-8 text-white sm:p-10">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-white/60">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  <span className="leading-none">Vancouver · BC</span>
                </p>
                <h2
                  id="authors-cta-heading"
                  className="mt-1 text-2xl leading-2xl font-bold sm:text-3xl"
                >
                  Read what we publish
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-sm text-white/70">
                  Browse the full library of articles from the Perseus team —
                  digital marketing, brand strategy, web, and media production.
                </p>
              </div>
              <Link
                href="/blogs"
                className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-[10px] uppercase tracking-wide text-black transition-colors hover:bg-white/90"
              >
                <span className="leading-none">Browse all articles</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
