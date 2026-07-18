import Link from 'next/link';
import { LuArrowUpRight as ArrowUpRight, LuSend as Send } from 'react-icons/lu';

import Button from '@/components/Button';
import Container from '@/components/ui/Container';
import type { ProjectCtaContent } from './types';
import { SlateTag } from './SlateTag';

interface NextFileCtaProps {
  cta: ProjectCtaContent;
  /** `compact` drops the ghost intake row and tightens type/padding — the
   *  detail pages' slim booking band, sitting above a next-file/next-client
   *  footer that carries the visual weight instead. Default keeps every
   *  existing call site unchanged. */
  variant?: 'full' | 'compact';
}

/**
 * The closing band that invites the visitor's next project. A slate bar carries
 * a "Now booking" cue, and a ghost intake row leaves CLIENT and SECTOR as blank
 * dashed fields with the current year already filled in — the visitor's project
 * is the one not started yet. Replaces the services CategoryCta on every
 * /projects page.
 *
 * Deliberately an inverted band: `bg-black` / `text-white` resolve through the
 * ink/surface tokens, so the panel flips to a dark band in light mode and a
 * light band in dark mode — always the inverse of the page, so it separates
 * from the background.
 */
const NextFileCta = ({ cta, variant = 'full' }: NextFileCtaProps) => {
  const year = new Date().getFullYear();
  const compact = variant === 'compact';

  return (
    <section className="pb-16 sm:pb-24">
      <Container>
        <div className="overflow-hidden rounded-3xl bg-black text-white">
          {/* Slate bar — availability cue */}
          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-4 sm:px-8">
            <SlateTag className="flex items-center gap-3 text-white/55">
              <span aria-hidden className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-white/60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-white" />
              </span>
              {cta.eyebrow}
            </SlateTag>
            <SlateTag className="text-white/55">Now booking</SlateTag>
          </div>

          <div className={compact ? 'p-6 sm:p-10' : 'p-8 sm:p-12 lg:p-14'}>
            <h2
              className={
                compact
                  ? 'max-w-2xl text-2xl font-semibold tracking-tighter sm:text-3xl'
                  : 'max-w-2xl text-3xl font-semibold tracking-tighter sm:text-4xl lg:text-5xl'
              }
            >
              {cta.headline}
            </h2>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-white/60 sm:text-base">
              {cta.description}
            </p>

            {/* Ghost intake row — the project's blank fields */}
            {!compact && (
              <SlateTag
                as="div"
                aria-hidden
                className="mt-10 flex flex-wrap items-baseline gap-x-10 gap-y-4 border-y border-white/10 py-5 text-white/45 sm:text-[11px]"
              >
                <span>
                  Client
                  <span className="ml-2 inline-block w-20 border-b border-dashed border-white/25 sm:w-28">
                    &nbsp;
                  </span>
                </span>
                <span>
                  Sector
                  <span className="ml-2 inline-block w-20 border-b border-dashed border-white/25 sm:w-28">
                    &nbsp;
                  </span>
                </span>
                <span>
                  Year <span className="ml-2 text-white/80">{year}</span>
                </span>
              </SlateTag>
            )}

            {/* Inverted band — buttons invert with it (see CategoryCta):
                primary takes the page-background fill, secondary goes
                ghost-outline, so they stay distinct in both themes. */}
            <div
              className={
                compact
                  ? 'mt-8 flex flex-col gap-3 sm:flex-row'
                  : 'mt-10 flex flex-col gap-3 sm:flex-row'
              }
            >
              <Link href={cta.primaryHref}>
                <Button
                  variant="primary"
                  icon={Send}
                  background="var(--background)"
                  shimmerColor="var(--foreground)"
                  className="w-full justify-center border-black/10 text-black sm:w-auto"
                >
                  {cta.primaryLabel}
                </Button>
              </Link>

              {cta.secondaryLabel && cta.secondaryHref && (
                <Link href={cta.secondaryHref}>
                  <Button
                    variant="secondary"
                    icon={ArrowUpRight}
                    className="w-full justify-center border-white/25 bg-white/0 text-white/85 shadow-none backdrop-blur-none hover:border-white/50 hover:bg-white/10 hover:text-white sm:w-auto"
                  >
                    {cta.secondaryLabel}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default NextFileCta;
