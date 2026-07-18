import Link from 'next/link';

import Breadcrumb from '@/components/Breadcrumb';
import ClientLogoImg from '@/components/ClientLogoImg';
import Container from '@/components/ui/Container';
import type { Crumb } from '@/components/Breadcrumb';
import type { ProjectDetailData } from '@/lib/projectsStore';
import { cn } from '@/lib/utils';
import { clientLogoDisc } from '@/utils/images';
import { SlateTag } from '../SlateTag';
import { slugify } from '../utils';

interface ProjectSlateHeaderProps {
  detail: ProjectDetailData;
  categoryTitle: string;
  crumbs: Crumb[];
}

/**
 * The case file's cover sheet — owns the breadcrumb and the page's only <h1>.
 * A mono `CASE FILE · DISCIPLINE · YEAR` eyebrow rides the section rule, the
 * title and dek follow, and a hairline-ruled call-sheet band prints the file's
 * fields: the client (mark + name), the industry (a filter link, same token
 * the category rail sets), the location, and the year. The engagement's
 * service chips close the band — each one lands on the category index
 * pre-filtered to that service, mirroring CaseSlateCard's chips.
 */
const ProjectSlateHeader = ({
  detail,
  categoryTitle,
  crumbs,
}: ProjectSlateHeaderProps) => {
  const logoDisc = clientLogoDisc(detail.client.logoUrl);

  const mark = detail.client.logoUrl ? (
    <span
      className={cn(
        'flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full',
        // Coin faces are pinned in both themes (see globals.css --coin-face):
        // the disc must match the logo's own ink, not the page theme.
        logoDisc === 'dark'
          ? 'bg-(--coin-face-dark)'
          : 'bg-(--coin-face) ring-1 ring-black/10',
      )}
    >
      <ClientLogoImg
        src={detail.client.logoUrl}
        alt={`${detail.client.name} logo`}
      />
    </span>
  ) : null;

  return (
    <Container>
      <Breadcrumb crumbs={crumbs} />

      {/* Eyebrow rule — the slate's top edge */}
      <div className="flex items-center gap-4">
        <SlateTag as="p" className="whitespace-nowrap text-black/60">
          Case file · {categoryTitle} · {detail.year}
        </SlateTag>
        <span aria-hidden className="h-px flex-1 bg-black/10" />
        <SlateTag className="whitespace-nowrap text-black/45 max-sm:hidden">
          On the record
        </SlateTag>
      </div>

      <h1 className="mt-6 max-w-3xl text-3xl font-semibold tracking-tighter text-black sm:text-4xl lg:text-5xl">
        {detail.title}
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-black/60 sm:text-base">
        {detail.summary}
      </p>

      {/* Call-sheet band — the file's fields on one ruled line. Each group is
          a direct <div><dt/><dd/></div> child of the <dl> (the only nesting
          the dl content model allows), so the mark rides inside the dd. */}
      <dl className="mt-8 flex flex-wrap items-center gap-x-10 gap-y-4 border-y border-black/10 py-5">
        <div>
          <SlateTag as="dt" size="xs" tracking="18" className="text-black/45">
            Client
          </SlateTag>
          <dd className="mt-1 flex items-center gap-2.5 text-sm font-medium text-black">
            {mark}
            {detail.client.name}
          </dd>
        </div>

        <div>
          <SlateTag as="dt" size="xs" tracking="18" className="text-black/45">
            Industry
          </SlateTag>
          <dd className="mt-0.5 text-sm text-black/80">
            <Link
              href={`/projects/${detail.category}?industry=${slugify(detail.industry)}`}
              className="underline-offset-4 outline-none transition-colors hover:underline focus-visible:underline"
            >
              {detail.industry}
            </Link>
          </dd>
        </div>

        {detail.location && (
          <div>
            <SlateTag as="dt" size="xs" tracking="18" className="text-black/45">
              Location
            </SlateTag>
            <dd className="mt-0.5 text-sm text-black/80">{detail.location}</dd>
          </div>
        )}

        <div>
          <SlateTag as="dt" size="xs" tracking="18" className="text-black/45">
            Year
          </SlateTag>
          <dd className="mt-0.5 text-sm tabular-nums text-black/80">
            {detail.year}
          </dd>
        </div>

        {detail.services.length > 0 && (
          <div className="min-w-0 flex-1 basis-full sm:basis-auto">
            <SlateTag as="dt" size="xs" tracking="18" className="text-black/45">
              Services on the engagement
            </SlateTag>
            <dd className="mt-1.5 flex flex-wrap gap-1.5">
              {detail.services.map((service) => (
                <Link
                  key={service}
                  href={`/projects/${detail.category}?service=${slugify(service)}`}
                  className="shrink-0 rounded-full bg-black/10 px-2.5 py-1 text-[10px] text-black outline-none transition-colors hover:bg-black/20"
                >
                  {service}
                </Link>
              ))}
            </dd>
          </div>
        )}
      </dl>
    </Container>
  );
};

export default ProjectSlateHeader;
