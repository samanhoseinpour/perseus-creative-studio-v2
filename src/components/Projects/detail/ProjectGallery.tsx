import type { CSSProperties } from 'react';

import ProjectMediaImage from '@/components/ProjectMediaImage';
import Container from '@/components/ui/Container';
import type { ProjectGalleryImage } from '../types';
import { SlateTag } from '../SlateTag';
import { galleryBeats, pad2 } from '../utils';
import { cn } from '@/lib/utils';

interface ProjectGalleryProps {
  images: ProjectGalleryImage[];
  /** For the fallback alt when a frame was uploaded without one. */
  projectTitle: string;
}

/**
 * The stills from the engagement, cut into chapter beats instead of a uniform
 * contact sheet: `galleryBeats` (Projects/utils) maps stored order + aspect
 * ratio onto full-bleed frames, contained plates, and half pairs, so the page
 * alternates cinematic media with the surrounding text sections. Every image
 * is an /admin upload — rendered through <ProjectMediaImage> (stored rung
 * ladder + stored LQIP), so the sheet loads light and never shifts layout.
 * Frame numbering stays global across beats (the film-edge FRAME NN chips).
 *
 * Full-bleed frames render at 100vw while the upload ladder tops out at the
 * ≤1600px master — acceptable upscale for cover-fit photography; don't add a
 * runtime transcode for it.
 */
const ProjectGallery = ({ images, projectTitle }: ProjectGalleryProps) => {
  if (images.length === 0) return null;

  const beats = galleryBeats(images);

  const frameFigure = (
    frame: { image: ProjectGalleryImage; index: number },
    className: string,
    sizes: string,
    style?: CSSProperties,
  ) => (
    <figure
      key={frame.image.id}
      className={cn(
        'group relative overflow-hidden bg-black/5',
        className,
      )}
      style={style}
    >
      <ProjectMediaImage
        variants={frame.image.variants}
        alt={frame.image.alt || `${projectTitle} — still ${frame.index + 1}.`}
        blurDataUrl={frame.image.blurDataUrl}
        fill
        sizes={sizes}
        className="rounded-none object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.03]"
      />
      {/* Film-edge chip — pinned on-media ink over the photograph */}
      <SlateTag
        aria-hidden
        size="xs"
        tracking="18"
        className="absolute left-2.5 top-2.5 rounded-full bg-scrim/55 px-2 py-1 tabular-nums text-on-media/85 backdrop-blur-sm"
      >
        Frame {pad2(frame.index + 1)}
      </SlateTag>
    </figure>
  );

  return (
    <section className="pt-16 sm:pt-24">
      <Container>
        <div className="flex items-center gap-4">
          <SlateTag as="h2" size="md" className="whitespace-nowrap text-black/60">
            Stills
          </SlateTag>
          <span aria-hidden className="h-px flex-1 bg-black/10" />
          <SlateTag className="whitespace-nowrap tabular-nums text-black/45">
            {pad2(images.length)} {images.length === 1 ? 'frame' : 'frames'}
          </SlateTag>
        </div>
      </Container>

      <div className="mt-8 space-y-3 sm:space-y-5">
        {beats.map((beat, beatIndex) => {
          if (beat.kind === 'full-bleed') {
            return (
              <div key={beatIndex} className="my-4 sm:my-8">
                {frameFigure(
                  beat.frames[0],
                  'aspect-[16/9] md:aspect-[21/9] w-full',
                  '100vw',
                )}
              </div>
            );
          }

          if (beat.kind === 'paired-half') {
            // Unified frame per pair: portrait pairs keep a tall crop.
            const bothPortrait = beat.frames.every(
              ({ image }) => image.variants.full.width < image.variants.full.height,
            );
            return (
              <Container key={beatIndex}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                  {beat.frames.map((frame) =>
                    frameFigure(
                      frame,
                      cn(
                        'rounded-2xl',
                        bothPortrait ? 'aspect-[4/5]' : 'aspect-[4/3]',
                      ),
                      '(min-width: 640px) 50vw, 100vw',
                    ),
                  )}
                </div>
              </Container>
            );
          }

          // contained-wide — natural ratio; a lone portrait narrows + centers.
          const { image } = beat.frames[0];
          const { width, height } = image.variants.full;
          const portrait = width < height;
          return (
            <Container key={beatIndex}>
              <div className={cn(portrait && 'mx-auto max-w-3xl')}>
                {frameFigure(
                  beat.frames[0],
                  'rounded-2xl w-full',
                  portrait
                    ? '(min-width: 800px) 768px, 100vw'
                    : '(min-width: 1200px) 1152px, 100vw',
                  { aspectRatio: `${width} / ${height}` },
                )}
              </div>
            </Container>
          );
        })}
      </div>
    </section>
  );
};

export default ProjectGallery;
