import { PERSEUS_PUBLISHER_REF, SITE_URL } from '@/constants';
import type { PublicAuthor, PublishedPost } from '@/lib/blogStore';
import { heroOgUrl, resolveImageUrl } from '@/utils/images';
import { buildBreadcrumbList } from '@/utils/breadcrumbSchema';
import type { Crumb } from '@/components/Breadcrumb';
import {
  readingTimeIso,
  type EmbeddedImage,
  type EmbeddedVideo,
  type Heading,
  type HowToData,
} from '@/utils/extractHeadings';

/**
 * Every JSON-LD builder for the blog surfaces, plus the ONE serializer. Pure
 * (type-only imports from the store) so scripts/check-blog-body.mts can run
 * it under plain node. Not `blogSchema.ts`: every src/lib/*Schema.ts is a
 * zod module by house convention.
 */

/** `<` is escaped so a title of `</script><script>` cannot close the ld+json
 *  block (the projects pages' stored-XSS guard, applied to every blog
 *  surface now that titles are database strings). The two line separators
 *  are escaped because they are line terminators in JavaScript but not in
 *  JSON. The parity snapshot parses the graph, so the byte change is
 *  invisible to the diff. */
export function serializeJsonLd(graph: unknown): string {
  return JSON.stringify(graph)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function xHandleFromSameAs(sameAs?: string[]): string | undefined {
  for (const url of sameAs ?? []) {
    const m = url.match(/^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/(@?[A-Za-z0-9_]{1,15})\/?$/i);
    if (m) return m[1].startsWith('@') ? m[1] : `@${m[1]}`;
  }
  return undefined;
}

/** A static author image absolutizes; a Blob URL (image_media, later) passes
 *  through verbatim, so the origin can never be doubled. */
export function authorImageUrl(author: PublicAuthor): string {
  return /^https?:\/\//i.test(author.imageUrl) ? author.imageUrl : `${SITE_URL}${author.imageUrl}`;
}

export function buildAuthorSchema(author: PublicAuthor) {
  if (author.kind === 'organization') return PERSEUS_PUBLISHER_REF;
  return {
    '@type': 'Person' as const,
    '@id': `${SITE_URL}${author.href}#person`,
    name: author.name,
    url: `${SITE_URL}${author.href}`,
    jobTitle: author.role,
    description: author.bio,
    image: authorImageUrl(author),
    ...(author.sameAs.length ? { sameAs: author.sameAs } : {}),
    ...(author.knowsAbout.length ? { knowsAbout: author.knowsAbout } : {}),
    ...(author.location
      ? {
          address: {
            '@type': 'PostalAddress' as const,
            addressLocality: author.location.locality,
            addressRegion: author.location.region,
            addressCountry: author.location.country,
          },
        }
      : {}),
    worksFor: PERSEUS_PUBLISHER_REF,
  };
}

/**
 * The lead image as an ImageObject set (one source; no crop set). Takes an
 * ABSOLUTE url and passes it through untouched: callers absolutize first,
 * through heroOgUrl (the hero) or figureUrl (a body figure).
 *
 * `licensed` is the caller's own discriminator, never a guess from the url,
 * and it gates the two licence fields for the reason in `figureOwnership`
 * below: only a static /images asset is one this studio has vetted.
 */
export function articleImageSet(imageUrl: string, licensed: boolean) {
  return [
    {
      '@type': 'ImageObject' as const,
      url: imageUrl,
      ...(licensed
        ? {
            license: `${SITE_URL}/license`,
            acquireLicensePage: `${SITE_URL}/license`,
          }
        : {}),
    },
  ];
}

/**
 * The ownership, credit and licence half of a figure's ImageObject.
 *
 * EMITTED ONLY OVER A STATIC /images ASSET, and that is a correctness rule
 * rather than a nicety. These fields are a machine-readable claim that Perseus
 * created the image, holds its copyright, and licenses it on the terms at
 * /license. That was true by accident while every image in the corpus was
 * hand-curated; the moment /admin can upload one it stops being true, and the
 * site would be publishing a copyright claim over a photograph nobody vetted.
 * CLAUDE.md's structured-data rule already said so: these emit only when every
 * embedded image is verified Perseus-owned or appropriately licensed.
 *
 * For an uploaded image the whole block is dropped, INCLUDING the
 * `?? 'Perseus Creative Studio'` credit default that used to stand in for a
 * missing one: an absent credit must render no credit, not our name. A credit
 * the writer typed is their own words about their own image and still travels.
 */
function figureOwnership(
  img: EmbeddedImage,
  year: string,
): Record<string, unknown> {
  if (img.source !== 'static') {
    return img.credit ? { creditText: img.credit } : {};
  }
  return {
    creator: { '@type': 'Organization' as const, name: 'Perseus Creative Studio', url: SITE_URL },
    creditText: img.credit ?? 'Perseus Creative Studio',
    copyrightNotice: `© ${year} Perseus Creative Studio`,
    copyrightHolder: { '@type': 'Organization' as const, name: 'Perseus Creative Studio' },
    license: `${SITE_URL}/license`,
    acquireLicensePage: `${SITE_URL}/license`,
  };
}

/** Filename stem for stable `#image-<stem>` fragments, as before. */
export function imageSlugFromSrc(src: string, index: number): string {
  const last = src.split(/[?#]/)[0].split('/').filter(Boolean).pop() ?? '';
  const stem = last.replace(/\.[a-z0-9]+$/i, '');
  return stem || `image-${index + 1}`;
}

function figureUrl(src: string): string {
  return /^https?:\/\//i.test(src) ? src : resolveImageUrl(src);
}

export type PostJsonLdInput = {
  view: PublishedPost;
  crumbs: Crumb[];
  /** The composed TOC (body headings + Sources/FAQs pseudo-entries). */
  toc: Heading[];
  videos: EmbeddedVideo[];
  figures: EmbeddedImage[];
  howTos: HowToData[];
};

/** The post page's @graph. Every @id anchors on the SELF url; only
 *  <link rel=canonical> and og:url follow a canonical override. */
export function buildPostJsonLd({ view, crumbs, toc, videos, figures, howTos }: PostJsonLdInput) {
  const self = view.seo.selfUrl;
  const toEntityNode = (e: { name: string; sameAs: string[] }) => ({
    '@type': 'Thing' as const,
    '@id': e.sameAs[0],
    name: e.name,
    sameAs: e.sameAs,
  });
  const aboutEntities = view.entities.filter((e) => e.primary).map(toEntityNode);
  const mentionEntities = view.entities.filter((e) => !e.primary).map(toEntityNode);
  const tocItems = toc.filter((h) => h.level === 2);
  const heroUrl = heroOgUrl(view.hero);
  const year = view.modifiedDay.slice(0, 4);

  return {
    '@context': 'https://schema.org',
    '@graph': [
      buildBreadcrumbList(crumbs, self),
      {
        '@type': 'BlogPosting' as const,
        '@id': `${self}#article`,
        headline: view.title,
        description: view.seo.description,
        keywords: view.seo.focusKeywords,
        articleSection: view.category.title,
        inLanguage: 'en-CA',
        url: self,
        isPartOf: { '@id': `${SITE_URL}/blogs#blog` },
        isAccessibleForFree: true,
        datePublished: view.publishedDay,
        dateModified: view.modifiedDay,
        author: buildAuthorSchema(view.author),
        publisher: PERSEUS_PUBLISHER_REF,
        image: articleImageSet(heroUrl, view.hero.type === 'static'),
        thumbnailUrl: heroUrl,
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': self,
          breadcrumb: { '@id': `${self}#breadcrumb` },
        },
        wordCount: view.wordCount,
        timeRequired: readingTimeIso(view.wordCount),
        ...(view.keyTakeaways.length ? { abstract: view.keyTakeaways.join(' ') } : {}),
        ...(view.sources.length
          ? {
              citation: view.sources.map((s) => ({
                '@type': 'CreativeWork' as const,
                name: s.title,
                url: s.href,
              })),
            }
          : {}),
        ...(aboutEntities.length ? { about: aboutEntities } : {}),
        ...(mentionEntities.length ? { mentions: mentionEntities } : {}),
        speakable: {
          '@type': 'SpeakableSpecification',
          cssSelector: [
            '#post-title',
            ...(view.keyTakeaways.length ? ['#key-takeaways'] : []),
            '.article-body > p:first-of-type',
          ],
        },
        ...(tocItems.length >= 2
          ? {
              hasPart: {
                '@type': 'ItemList',
                '@id': `${self}#toc`,
                name: 'Table of contents',
                itemListOrder: 'https://schema.org/ItemListOrderAscending',
                numberOfItems: tocItems.length,
                itemListElement: tocItems.map((h, i) => ({
                  '@type': 'ListItem',
                  position: i + 1,
                  url: `${self}#${h.id}`,
                  name: h.text,
                })),
              },
            }
          : {}),
      },
      ...(view.faqs.length > 0
        ? [
            {
              '@type': 'FAQPage',
              '@id': `${self}#faqs`,
              inLanguage: 'en-CA',
              isPartOf: { '@id': `${self}#article` },
              mainEntity: view.faqs.map((f) => ({
                '@type': 'Question',
                name: f.question,
                acceptedAnswer: { '@type': 'Answer', text: f.answer },
              })),
            },
          ]
        : []),
      ...howTos.map((h, i) => ({
        '@type': 'HowTo' as const,
        '@id': `${self}#howto${i === 0 ? '' : `-${i + 1}`}`,
        name: h.name ?? view.title,
        inLanguage: 'en-CA',
        isPartOf: { '@id': `${self}#article` },
        ...(h.totalTime ? { totalTime: h.totalTime } : {}),
        step: h.steps.map((s, si) => ({
          '@type': 'HowToStep' as const,
          position: si + 1,
          name: s.name,
          text: s.text,
          url: `${self}#${s.id}`,
        })),
      })),
      ...videos
        .filter((v) => !v.external)
        .map((v) => ({
          '@type': 'VideoObject' as const,
          '@id': `${self}#video-${v.id}`,
          name: v.title ?? view.title,
          description: v.description ?? view.description,
          thumbnailUrl: [
            `https://i.ytimg.com/vi/${v.id}/maxresdefault.jpg`,
            `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
          ],
          uploadDate: v.uploadDate ?? view.publishedDay,
          contentUrl: `https://www.youtube.com/watch?v=${v.id}`,
          embedUrl: `https://www.youtube.com/embed/${v.id}`,
          publisher: PERSEUS_PUBLISHER_REF,
          isPartOf: { '@id': `${self}#article` },
          inLanguage: 'en-CA',
        })),
      ...figures.map((img, i) => {
        const url = figureUrl(img.src);
        const slug = imageSlugFromSrc(img.src, i);
        return {
          '@type': 'ImageObject' as const,
          '@id': `${self}#image-${slug}`,
          url,
          contentUrl: url,
          ...(img.caption ? { caption: img.caption } : {}),
          ...(img.alt ? { description: img.alt } : {}),
          ...(img.width ? { width: img.width } : {}),
          ...(img.height ? { height: img.height } : {}),
          ...figureOwnership(img, year),
          isPartOf: { '@id': `${self}#article` },
          inLanguage: 'en-CA',
        };
      }),
    ],
  };
}
