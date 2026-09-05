import Link from 'next/link';
import { LuArrowUpRight as ArrowUpRight, LuUserRound as UserRound } from 'react-icons/lu';

import Breadcrumb, { type Crumb } from '@/components/Breadcrumb';
import Button from '@/components/Button';
import Faqs from '@/components/Faqs';
import Heading from '@/components/Heading';
import Img from '@/components/Img';
import PrevNextNav from '@/components/PrevNextNav';
import { MediaImage } from '@/components/ProjectMediaImage';
import ProjectShowcase from '@/components/Projects/showcase/ProjectShowcase';
import CategoryVisual from '@/components/Services/visuals/CategoryVisual';
import BlogPost from '@/components/Blogs/shared/BlogPost';
import { selectBlogCards } from '@/components/Blogs/shared/blogFeed';
import Container from '@/components/ui/Container';
import TextShimmer from '@/components/ui/TextShimmer';
import { PERSEUS_LOGO } from '@/constants';
import { figures, headings, howTos, tocEntries, videos } from '@/lib/blogBody';
import { buildPostJsonLd, serializeJsonLd } from '@/lib/blogJsonLd';
import { categoryStats, neighbours, type PublishedPost } from '@/lib/blogStore';
import { getCategoryProjects } from '@/lib/projectsStore';
import { readingMinutes } from '@/utils/extractHeadings';
import ArticleBody from './ArticleBody';
import ArticleFeedback from './ArticleFeedback';
import KeyTakeaways from './KeyTakeaways';
import ShareBlogs from './ShareBlogs';
import SidebarCta from './SidebarCta';
import SourcesList from './SourcesList';
import TableOfContents from './TableOfContents';

/**
 * ONE component renders the whole post page from a PublishedPost view model:
 * the marketing route renders it, and the preview route at
 * /admin/blogs/[id]/preview renders it from an uncached draft view. It imports
 * every dependency by direct path, never the @/components barrel (the
 * components↔index cycle CLAUDE.md documents).
 *
 * `preview` DROPS the two controls that would lie on an unpublished post, and
 * dropping them is the point rather than disabling them:
 *
 *  - `ArticleFeedback` writes a vote keyed on the slug, and the action checks
 *    that slug against `publishedSlugExists`, so a vote cast here is accepted
 *    by the button and silently discarded by the server. A control that
 *    reports success and does nothing is worse than no control.
 *  - `ShareBlogs` builds every intent URL from the post's future public
 *    address, which 404s until the post is published. A share sheet whose
 *    links are dead is the same lie in a different shape.
 *
 * Everything else renders exactly as the public route renders it, which is the
 * whole promise of the preview: what a writer sees is what a reader gets,
 * because it is the same component and not a second rendering of it.
 */
export default async function ArticlePage({
  view,
  preview = false,
}: {
  view: PublishedPost;
  preview?: boolean;
}) {
  const { author } = view;
  const crumbs: Crumb[] = [
    { label: 'Perseus', href: '/' },
    { label: 'Blogs', href: '/blogs' },
    { label: view.category.title, href: `/blogs?category=${view.category.slug}` },
    { label: view.title },
  ];
  const reservedAnchors = [
    ...(view.keyTakeaways.length ? ['key-takeaways'] : []),
    ...(view.sources.length ? ['sources'] : []),
    ...(view.faqs.length > 0 ? ['faqs'] : []),
  ];
  const bodyHeadings = headings(view.body, reservedAnchors);
  const toc = tocEntries(bodyHeadings, { hasSources: view.sources.length > 0, hasFaqs: view.faqs.length > 0 });
  const embeddedVideos = videos(view.body);
  const showcaseFigures = figures(view.body);
  const howToBlocks = howTos(view.body);
  const readingMin = readingMinutes(view.wordCount);

  const [{ prev: prevPost, next: nextPost }, stats, archiveEntries, curatedCards] =
    await Promise.all([
      neighbours(view.slug),
      categoryStats(),
      getCategoryProjects(view.category.slug, 4),
      selectBlogCards(
        view.relatedSlugs.length
          ? { forcedSlugs: view.relatedSlugs, excludeSlug: view.slug, limit: 4 }
          : { categorySlug: view.category.slug, excludeSlug: view.slug, limit: 4 },
      ),
    ]);

  // A CURATION THAT RESOLVED TO NOTHING FALLS BACK TO THE CATEGORY, and the
  // fallback is here rather than inside `selectBlogCards` because the call
  // above passes `forcedSlugs` or `categorySlug` and never both, so the reader
  // that would have to choose between them is this one.
  //
  // It is reachable two ways and only the first can be repaired at the data
  // layer. UNPUBLISHING a curated target leaves the `blog_post_related` row
  // intact while dropping the post from `listPublishedSummaries`. HARD-DELETING
  // one cascades that row away, but the referring post's public page reads its
  // related slugs from the FROZEN published snapshot, so the dead slug sits in
  // `forcedSlugs` until somebody republishes the referrer. Nothing the
  // deleting writer does can clear it.
  //
  // The alternative was to render nothing, and that is worse on a public page:
  // it throws away four internal links precisely when the category has two
  // dozen posts to offer, and punishes this post for a curation that rotted
  // somewhere else. `listPublishedSummaries` is behind `unstable_cache`, so
  // this second read is a Data Cache hit rather than a Neon round trip.
  const related =
    view.relatedSlugs.length > 0 && curatedCards.length === 0
      ? await selectBlogCards({
          categorySlug: view.category.slug,
          excludeSlug: view.slug,
          limit: 4,
        })
      : curatedCards;
  const otherCategories = stats
    .filter((c) => c.slug !== view.category.slug)
    .map((c) => ({
      slug: c.slug,
      title: c.title,
      count: c.count,
      latestIso: c.latestKey,
      latestTitle: c.latestTitle,
      authors: c.distinctAuthors,
      readingMinutes: readingMinutes(c.wordTotal),
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
  const formatLatest = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : null;
  const jsonLd = buildPostJsonLd({ view, crumbs, toc, videos: embeddedVideos, figures: showcaseFigures, howTos: howToBlocks });

  // Whether the section may call itself a curation, read from what the CURATED
  // read resolved rather than from what was asked for. `selectBlogCards` drops
  // any forced slug that is not a published post, and its `curated ?? …`
  // fallback only fires when `forcedSlugs` was empty to begin with, so a
  // curated list whose every entry has since been purged or unpublished comes
  // back as `[]`. The heading, the accent and the description all read this one
  // flag, because three separate ternaries over `relatedSlugs.length` is how
  // the page ended up promising "a curated set of articles chosen to extend the
  // ideas in this piece" over cards the category supplied instead.
  const curatedRelated = view.relatedSlugs.length > 0 && curatedCards.length > 0;

  return (
    <main className="pb-16 lg:pb-24">
      <script id="ld-json" type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <article aria-labelledby="post-title">
        <header className="relative h-[460px] w-full xl:h-[420px] overflow-hidden">
          {/* Hero rendered at 30% opacity behind text. Lives outside
              <Container> so `fill` anchors to the positioned <header> rather
              than the max-width container. (No `quality` prop: the custom
              loader serves pre-encoded static variants and ignores it.) */}
          {view.hero.type === 'static' ? (
            <Img
              src={view.hero.src}
              alt={view.imageAlt}
              fill
              sizes="100vw"
              priority
              className="object-cover object-center pointer-events-none opacity-30 bg-background -z-10"
            />
          ) : (
            <MediaImage
              variants={view.hero.variants}
              alt={view.imageAlt}
              blurDataUrl={view.hero.blurDataUrl}
              fill
              sizes="100vw"
              priority
              className="object-cover object-center pointer-events-none opacity-30 bg-background -z-10"
            />
          )}
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
                    <time className="font-normal" dateTime={view.publishedDay}>
                      {' '}
                      &middot; {view.date}
                    </time>
                    {view.showsUpdated && (
                      <>
                        {' '}
                        &middot;{' '}
                        <time
                          className="font-normal text-black/60"
                          dateTime={view.modifiedDay}
                        >
                          Updated{' '}
                          {new Date(view.modifiedDay).toLocaleDateString(
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
                    {view.wordCount > 0 && (
                      <span className="text-black/60">
                        {' '}
                        &middot; {readingMin} min read &middot;{' '}
                        {view.wordCount.toLocaleString('en-US')} words
                      </span>
                    )}
                  </span>
                </div>
              </div>

              <h1
                id="post-title"
                className="mb-6 max-w-5xl text-2xl leading-2xl font-bold text-black sm:text-3xl sm:leading-3xl lg:text-4xl lg:leading-4xl"
              >
                {view.title}
              </h1>

              <Link
                href={`/blogs?category=${view.category.slug}`}
                className="text-sm leading-sm text-black"
              >
                Category: {view.category.title}
              </Link>
              {!preview && (
                <ShareBlogs
                  title={view.title}
                  slug={view.slug}
                  canonicalPath={view.seo.selfUrl}
                />
              )}
            </div>
          </Container>
        </header>

        <section className="pt-8">
          <Container>
            <div className="xl:grid xl:grid-cols-[1fr_220px] xl:gap-10 xl:items-start">
              <div className="min-w-0 xl:col-start-1 xl:row-start-1">
                {/* Mobile TOC — inside the tall content column so sticky has room to work */}
                {toc.length >= 2 && (
                  <div className="xl:hidden">
                    <TableOfContents headings={toc} variant="mobile" />
                  </div>
                )}
                {/* Answer-first summary box — also feeds the BlogPosting
                    `abstract` and the speakable selector above. */}
                {view.keyTakeaways.length ? (
                  <KeyTakeaways takeaways={view.keyTakeaways} />
                ) : null}
                <ArticleBody doc={view.body} headingIds={bodyHeadings.map((h) => h.id)} />

                {/* Visible citations — same list the `citation` schema
                    property above mirrors. TOC anchor: id="sources". */}
                {view.sources.length ? (
                  <SourcesList sources={view.sources} />
                ) : null}

                {/* Write-only reader vote; tallies surface in /admin/feedback. */}
                {!preview && <ArticleFeedback slug={view.slug} />}

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
                      {/* Credential sentence readers (and raters) can judge
                          expertise by — the same bio the Person JSON-LD
                          carries as `description`. */}
                      <p className="mt-2 text-sm leading-sm text-black/70">
                        {author.bio}
                      </p>
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
                    categorySlug={view.category.slug}
                    serviceSlug={view.serviceSlug ?? undefined}
                  />
                </div>
              </div>

              <aside className="hidden xl:flex xl:flex-col xl:gap-4 xl:col-start-2 xl:row-start-1 xl:sticky xl:top-24">
                {toc.length >= 2 && (
                  <TableOfContents headings={toc} variant="desktop" />
                )}
                <SidebarCta
                  categorySlug={view.category.slug}
                  serviceSlug={view.serviceSlug ?? undefined}
                />
              </aside>
            </div>
          </Container>
        </section>
      </article>

      {/* FAQ accordion — same Q&A set that feeds the FAQPage JSON-LD above,
          rendered through the sitewide <Faqs> accordion instead of plain MDX
          headings. `id="faqs"` matches the TOC entry appended in `headings`. */}
      {view.faqs.length > 0 && (
        <div id="faqs" className="scroll-mt-24">
          <Faqs
            faqs={view.faqs}
            description={`Quick answers to the questions readers ask most about this topic, the same ones covered in “${view.title}”.`}
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
                eyebrow: `Previous in ${view.category.title}`,
              }
            : null
        }
        next={
          nextPost
            ? {
                href: nextPost.href,
                title: nextPost.title,
                eyebrow: `Next in ${view.category.title}`,
              }
            : null
        }
      />

      {/* THE WHOLE SECTION GOES when there is nothing to put in it, and this
          guard is the backstop rather than the fix. The fallback above means an
          empty list now needs BOTH the curated read and the category read to
          come back with nothing, which today takes a category holding only this
          post. The editor this programme is building makes that a single form
          away, so without the guard the contradiction returns through the
          category path: `BlogPost` renders "No related posts found for this
          blog." under a heading that has just offered more of them. */}
      {related.length > 0 && (
        <section
          aria-label={`Related articles about ${view.category.title}`}
          className="mt-16"
        >
          <Heading
            titleTag="h2"
            seperatorTitle="Related Articles"
            eyebrowRight="More Reads"
            title={
              curatedRelated
                ? 'Hand-picked related reads'
                : `More on ${view.category.title}`
            }
            titleAccent={
              curatedRelated
                ? 'Editor’s picks from across the journal.'
                : 'Continue reading from the same category.'
            }
            description={
              curatedRelated
                ? 'A curated set of articles chosen to extend the ideas in this piece.'
                : `Explore more articles about ${view.category.title} from the Perseus Creative Studio journal.`
            }
            containerStyle="mb-10"
            titleStyle="max-w-4xl"
            descStyle="max-w-3xl"
          />

          {/* Curation happens server-side (selectBlogCards) so the client grid
              receives four slim cards instead of importing the whole registry. */}
          <BlogPost posts={related} showFilters={false} enableFiltering={false} />
        </section>
      )}

      {/* Real work from the same discipline — the projects behind the writing.
          <ProjectShowcase> self-guards (renders nothing) if the post's category
          maps to no project category or has no projects. */}
      <ProjectShowcase
        entries={archiveEntries}
        seperatorTitle="From the Archive"
        title="See the work, not just the words."
        titleAccent={`Recent ${view.category.title} projects.`}
        description={`Real ${view.category.title.toLowerCase()} engagements from the Perseus archive: the work behind the writing.`}
        viewAllHref={`/projects/${view.category.slug}`}
        viewAllLabel={`All ${view.category.title} projects`}
      />

      {otherCategories.length > 0 && (
        <section aria-label="Browse other categories" className="mt-16">
          <Heading
            titleTag="h2"
            seperatorTitle="Other Categories"
            eyebrowRight="Keep Exploring"
            title="Browse other topics from the journal"
            titleAccent="Pick another angle to dive into."
            description={`More categories the Perseus team has published on, beyond ${view.category.title}.`}
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
                            <span className="text-on-media/45">Latest: </span>
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
                              {cat.authors}
                            </dd>
                            <dt>
                              {cat.authors === 1 ? 'Author' : 'Authors'}
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
