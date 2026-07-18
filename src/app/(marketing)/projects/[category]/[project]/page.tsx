import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LuArrowUpRight as ArrowUpRight } from 'react-icons/lu';

import {
  Button,
  NextFileCta,
  NextFileFooter,
  ProjectCover,
  ProjectDossier,
  ProjectEmbeds,
  ProjectFootnotes,
  ProjectGallery,
  ProjectHighlights,
  ProjectLocalNav,
  ProjectSlateHeader,
  RelatedProjects,
  YouTube,
} from '@/components';
import Container from '@/components/ui/Container';
import { SlateTag } from '@/components/Projects/SlateTag';
import type { Crumb } from '@/components';
import { FULL_INDEX_ROBOTS, SITE_URL, robotsWithPreviewLimits } from '@/constants';
import { PERSEUS_PUBLISHER_REF } from '@/constants/blogs';
import { PROJECT_CATEGORIES } from '@/constants/projects';
import {
  getCategoryProjects,
  getProjectDetail,
  listProjectDetailParams,
} from '@/lib/projectsStore';
import { buildBreadcrumbList } from '@/utils/breadcrumbSchema';
import { coverOgUrl } from '@/utils/images';

// Prerender every public, detail-ready case study; `dynamicParams` stays
// default-true so a project published in /admin after the deploy renders on
// demand — tag invalidation (updateTag in the admin actions) keeps it fresh.
export async function generateStaticParams() {
  const params = await listProjectDetailParams();
  return params.map(({ category, project }) => ({ category, project }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; project: string }>;
}): Promise<Metadata> {
  const { category, project } = await params;
  const detail = await getProjectDetail(category, project);
  if (!detail) return { title: 'Project not found' };

  const categoryTitle = PROJECT_CATEGORIES[detail.category]?.title ?? 'Projects';
  const canonical = `${SITE_URL}/projects/${detail.category}/${detail.slug}`;
  const title = `${detail.title} — ${categoryTitle} Case Study | Perseus Creative Studio`;
  const ogImage = coverOgUrl(detail.cover);
  // Uploaded covers know their true pixel size; static covers aren't probed
  // at runtime, so they get no width/height hint rather than a wrong one.
  const ogDims =
    detail.cover.type === 'media'
      ? {
          width: detail.cover.variants.full.width,
          height: detail.cover.variants.full.height,
        }
      : {};

  return {
    title,
    description: detail.summary,
    alternates: { canonical },
    // Unlisted = reachable by link, never advertised: noindex/nofollow, while
    // public files carry the full-preview directives (same split as blogs).
    robots:
      detail.visibility === 'public'
        ? FULL_INDEX_ROBOTS
        : robotsWithPreviewLimits({ index: false, follow: false }),
    openGraph: {
      title,
      description: detail.summary,
      url: canonical,
      siteName: 'Perseus Creative Studio',
      locale: 'en_CA',
      type: 'article',
      modifiedTime: detail.updatedAt,
      images: [{ url: ogImage, ...ogDims, alt: detail.cover.alt }],
    },
  };
}

export default async function ProjectDetailRoute({
  params,
}: {
  params: Promise<{ category: string; project: string }>;
}) {
  const { category, project } = await params;
  // Null for a draft, an unknown slug, a bad category segment (pgEnum guard in
  // portfolioQueries), or a project with no detail content yet — the
  // curated-rollout contract: no content, no page.
  const detail = await getProjectDetail(category, project);
  if (!detail) notFound();

  const chrome = PROJECT_CATEGORIES[detail.category];
  if (!chrome) notFound();
  const categoryTitle = chrome.title;
  const canonical = `${SITE_URL}/projects/${detail.category}/${detail.slug}`;

  // Single source for the trail — feeds both the visible <Breadcrumb> (via the
  // slate header) and the BreadcrumbList JSON-LD below.
  const crumbs: Crumb[] = [
    { label: 'Perseus', href: '/' },
    { label: 'Projects', href: '/projects' },
    { label: categoryTitle, href: `/projects/${detail.category}` },
    { label: detail.title },
  ];

  // Screening room: the first YouTube embed takes the cinematic frame in place
  // of the cover; the rest of the embeds render in their own section below.
  const screeningRoom = detail.embeds.find((e) => e.kind === 'youtube') ?? null;
  const remainingEmbeds = screeningRoom
    ? detail.embeds.filter((e) => e.id !== screeningRoom.id)
    : detail.embeds;

  // The whole drawer, newest-first: the shelf takes up to six non-self
  // siblings, and the next-file footer takes the one after this project
  // (wrap-around). An unlisted project is absent from the public snapshot
  // (selfIndex -1) — its "next" is simply the drawer's newest file.
  const siblings = await getCategoryProjects(detail.category, 99);
  const selfIndex = siblings.findIndex((e) => e.project.slug === detail.slug);
  const related = siblings
    .filter((entry) => entry.project.slug !== detail.slug)
    .slice(0, 6);
  const nextEntry =
    related.length === 0
      ? null
      : selfIndex === -1
        ? siblings[0]
        : siblings[(selfIndex + 1) % siblings.length];

  // Footnoted stats collect into the page-bottom Notes block; numbering is
  // shared with ProjectHighlights' superscripts (both derive from this order).
  const footnotes = detail.stats
    .filter((s) => s.footnote)
    .map((s) => s.footnote as string);

  // The local-nav ribbon's anchor registry, in page order — only sections
  // that actually render. Ids live on the page-level wrappers below.
  const sections = [
    screeningRoom ? { id: 'film', label: 'The film' } : null,
    detail.stats.length > 0 ? { id: 'highlights', label: 'Highlights' } : null,
    detail.description ? { id: 'overview', label: 'Overview' } : null,
    detail.gallery.length > 0 ? { id: 'stills', label: 'Stills' } : null,
    remainingEmbeds.length > 0 ? { id: 'reels', label: 'Reels' } : null,
    detail.testimonial ? { id: 'record', label: 'On the record' } : null,
  ].filter((s): s is { id: string; label: string } => s !== null);

  const isPublic = detail.visibility === 'public';

  return (
    <>
      {/* JSON-LD — public files only; an unlisted page must not hand crawlers
          a structured invitation to the URL it noindexes. */}
      {isPublic && (
        <script
          id="ld-json-project-detail"
          type="application/ld+json"
          // DB-sourced strings (title, summary, description, client name) ride
          // this script verbatim — escape `<` so a value containing
          // `</script>` can't break out of the element (stored-XSS guard).
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                buildBreadcrumbList(crumbs, canonical),
                {
                  '@type': 'CreativeWork',
                  '@id': `${canonical}#work`,
                  name: detail.title,
                  url: canonical,
                  description: detail.summary,
                  image: coverOgUrl(detail.cover),
                  genre: categoryTitle,
                  ...(detail.services.length
                    ? { keywords: detail.services.join(', ') }
                    : {}),
                  dateModified: detail.updatedAt,
                  inLanguage: 'en-CA',
                  creator: PERSEUS_PUBLISHER_REF,
                  publisher: PERSEUS_PUBLISHER_REF,
                  isPartOf: { '@id': `${chrome.seo.canonicalPath}#webpage` },
                  ...(detail.client.name
                    ? {
                        about: {
                          '@type': 'Organization',
                          name: detail.client.name,
                        },
                      }
                    : {}),
                },
                // One VideoObject per unique YouTube video. Every embed here
                // was added through /admin for Perseus-produced work, so
                // publisher attribution is safe (there is no `external` flag
                // in the store — third-party reels shouldn't be attached to a
                // case file in the first place). Deduped by ref: the same
                // video embedded twice is one entity, and its `@id` is keyed
                // on the ref. uploadDate falls back to the file's last-edit
                // date: the only ISO date the record carries.
                ...[
                  ...new Map(
                    detail.embeds
                      .filter((e) => e.kind === 'youtube')
                      .map((e) => [e.ref, e]),
                  ).values(),
                ].map((e, i, all) => ({
                    '@type': 'VideoObject' as const,
                    '@id': `${canonical}#video-${e.ref}`,
                    name:
                      all.length > 1
                        ? `${detail.title} — clip ${i + 1}`
                        : detail.title,
                    description: detail.summary,
                    thumbnailUrl: [
                      `https://i.ytimg.com/vi/${e.ref}/maxresdefault.jpg`,
                      `https://i.ytimg.com/vi/${e.ref}/hqdefault.jpg`,
                    ],
                    uploadDate: detail.updatedAt,
                    contentUrl: `https://www.youtube.com/watch?v=${e.ref}`,
                    embedUrl: `https://www.youtube.com/embed/${e.ref}`,
                    publisher: PERSEUS_PUBLISHER_REF,
                    isPartOf: { '@id': `${canonical}#work` },
                    inLanguage: 'en-CA',
                  })),
              ],
            }).replace(/</g, '\\u003c'),
          }}
        />
      )}

      <main className="pt-28 sm:pt-32">
        {/* Local-nav ribbon — fixed directly under the navbar; rendered first
            in <main> so no transformed/filtered ancestor captures its fixed
            positioning. Hidden until the hero frame's sentinel scrolls past. */}
        <ProjectLocalNav
          title={detail.title}
          sections={sections}
          ctaHref="/contact"
          ctaLabel="Start a project"
          sentinelId="detail-localnav-sentinel"
        />

        <ProjectSlateHeader
          detail={detail}
          categoryTitle={categoryTitle}
          crumbs={crumbs}
        />

        {/* Screening room / cover — the file's cinematic frame */}
        <div
          id={screeningRoom ? 'film' : undefined}
          className="scroll-mt-36"
        >
          <Container className="pt-10 sm:pt-14">
            {screeningRoom ? (
              <>
                <div className="mb-3 flex items-center justify-between gap-4">
                  <SlateTag as="h2" size="md" className="text-black/60">
                    Screening room
                  </SlateTag>
                  <SlateTag className="text-black/45">The film</SlateTag>
                </div>
                {/* YouTube owns its aspect frame; my-8 margins collapse fine here */}
                <div className="[&>div]:my-0">
                  <YouTube id={screeningRoom.ref} title={detail.title} />
                </div>
              </>
            ) : (
              <div className="relative aspect-video overflow-hidden rounded-3xl bg-black/5">
                <ProjectCover
                  cover={detail.cover}
                  fill
                  priority
                  sizes="(min-width: 1536px) 1472px, 100vw"
                  className="rounded-none object-cover"
                />
              </div>
            )}
          </Container>
        </div>
        {/* Zero-height marker: the ribbon appears once this scrolls above the
            viewport — i.e. once the hero frame is behind the reader. */}
        <div id="detail-localnav-sentinel" aria-hidden />

        {detail.stats.length > 0 && (
          <div id="highlights" className="scroll-mt-36">
            <ProjectHighlights stats={detail.stats} />
          </div>
        )}

        {detail.description && (
          <div id="overview" className="scroll-mt-36">
            <ProjectDossier description={detail.description} />
          </div>
        )}

        {detail.gallery.length > 0 && (
          <div id="stills" className="cv-auto scroll-mt-36">
            <ProjectGallery
              images={detail.gallery}
              projectTitle={detail.title}
            />
          </div>
        )}

        {remainingEmbeds.length > 0 && (
          <div id="reels" className="cv-auto scroll-mt-36">
            <ProjectEmbeds
              embeds={remainingEmbeds}
              projectTitle={detail.title}
            />
          </div>
        )}

        {/* The client's signed note on the file */}
        {detail.testimonial && (
          <section id="record" className="scroll-mt-36 pt-16 sm:pt-24">
            <Container>
              <figure className="max-w-3xl border-y border-black/10 py-10">
                <SlateTag as="p" className="text-black/45">
                  On the record
                </SlateTag>
                <blockquote className="mt-5 text-xl font-medium tracking-tight text-black sm:text-2xl">
                  “{detail.testimonial.quote}”
                </blockquote>
                {detail.testimonial.name && (
                  <figcaption className="mt-5">
                    <SlateTag className="text-black/50">
                      — {detail.testimonial.name}
                      {detail.testimonial.role
                        ? `, ${detail.testimonial.role}`
                        : ''}
                    </SlateTag>
                  </figcaption>
                )}
              </figure>
            </Container>
          </section>
        )}

        {/* The shipped work, live */}
        {detail.externalUrl && (
          <section className="pt-16 sm:pt-24">
            <Container className="flex justify-center">
              <a
                href={detail.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Visit the live site for ${detail.title}`}
              >
                <Button size="medium" icon={ArrowUpRight} tabIndex={-1}>
                  Visit the live site
                </Button>
              </a>
            </Container>
          </section>
        )}

        {/* Apple-style fine print for the highlights' superscripts */}
        <ProjectFootnotes footnotes={footnotes} />

        {/* Everything below is off-screen on load — same cv-auto trim as the
            category page. The ending runs shelf → slim booking band → the
            next file bleeding in, so the archive never dead-ends. */}
        <div className="cv-auto">
          <RelatedProjects
            entries={related}
            categorySlug={detail.category}
            categoryTitle={categoryTitle}
          />
        </div>
        <div className="cv-auto pt-16 sm:pt-24">
          <NextFileCta cta={chrome.cta} variant="compact" />
        </div>
        {nextEntry && (
          <div className="cv-auto">
            <NextFileFooter entry={nextEntry} />
          </div>
        )}
      </main>
    </>
  );
}
