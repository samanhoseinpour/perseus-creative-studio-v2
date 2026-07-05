'use client';

import { useEffect, useState } from 'react';
import {
  LuArrowLeft as ArrowLeft,
  LuArrowRight as ArrowRight,
} from 'react-icons/lu';

import Button from '@/components/Button';
import Container from '@/components/ui/Container';
import ImgClient from '@/components/ImgClient';
import { cn } from '@/lib/utils';
import { clientLogoDisc } from '@/utils/images';
import type { Testimonial } from '@/components/Services/types';

/**
 * Client testimonials as a framed quote grid: a single hairline frame holds the
 * visible pair, a vertical rule splits them, and the band pages two-at-a-time on
 * desktop (one on mobile) with arrows + dots. Each cell prints the quote, the
 * person, and the client's company mark — no video. Adaptive in both themes
 * (cards flip with the page); each logo fills a round coin backed by a white or
 * dark disc so transparent marks stay legible either way. The section heading is supplied
 * by the wrappers (HomeTestimonials / CategoryTestimonials), not here.
 */
const Testimonials = ({
  testimonials,
  autoplay = false,
}: {
  testimonials: Testimonial[];
  autoplay?: boolean;
}) => {
  const total = testimonials.length;

  // Cards per view: two on md+, one below — read once and on resize so the
  // paging math and the dots always match what's actually visible.
  const [perView, setPerView] = useState(1);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setPerView(mq.matches ? 2 : 1);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const pages = Math.max(1, Math.ceil(total / perView));
  const [page, setPage] = useState(0);

  // Keep the page in range when perView (and therefore the page count) changes.
  useEffect(() => {
    setPage((p) => Math.min(p, pages - 1));
  }, [pages]);

  const hasControls = total > perView;
  const next = () => setPage((p) => (p + 1) % pages);
  const prev = () => setPage((p) => (p - 1 + pages) % pages);

  useEffect(() => {
    if (!autoplay || !hasControls) return;
    const id = setInterval(() => setPage((p) => (p + 1) % pages), 5000);
    return () => clearInterval(id);
  }, [autoplay, hasControls, pages]);

  // Each cell is (100 / perView)% of the viewport; a page steps a full 100%.
  // Clamp the last step to the track end so an odd final card never leaves an
  // empty half-cell inside the frame.
  const maxOffset = Math.max(0, total - perView) * (100 / perView);
  const offset = Math.min(page * 100, maxOffset);

  return (
    <section className="mb-8">
      <Container>
        <div
          role="group"
          aria-roledescription="carousel"
          aria-label="Client testimonials"
          className="relative overflow-hidden rounded-2xl border border-foreground/10"
        >
          <CornerTicks />
          <div
            className="flex transition-transform duration-700 ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none"
            style={{ transform: `translateX(-${offset}%)` }}
          >
            {testimonials.map((t) => {
              // Logos fill a round coin (object-cover): opaque marks cover the
              // disc, while transparent marks fall back to a white or dark disc so
              // they stay legible in either theme (see clientLogoDisc).
              const chip =
                clientLogoDisc(t.logo) === 'light' ? 'bg-on-media' : 'bg-scrim';
              return (
                <figure
                  key={t.name}
                  className="flex h-96 shrink-0 basis-full flex-col p-7 sm:p-9 md:basis-1/2 md:even:border-l md:even:border-foreground/10"
                >
                  <blockquote className="line-clamp-6 text-base leading-relaxed text-foreground sm:text-lg">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <figcaption className="mt-auto pt-6">
                    <div className="text-sm font-medium text-foreground">
                      {t.name}
                    </div>
                    <div className="text-xs text-foreground/60">
                      {t.designation}
                    </div>
                    <span
                      className={cn(
                        'mt-4 flex size-10 shrink-0 overflow-hidden rounded-full',
                        chip,
                      )}
                    >
                      <ImgClient
                        src={t.logo}
                        alt={`${t.name} — client logo`}
                        width={200}
                        height={200}
                        className="size-full rounded-full object-contain"
                      />
                    </span>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </div>

        {hasControls && (
          <div className="mt-6 flex items-center justify-between gap-4">
            <div className="flex gap-2">
              <Button
                size="small"
                onClick={prev}
                className="p-2"
                aria-label="Previous testimonials"
                icon={ArrowLeft}
                shimmer={false}
              />
              <Button
                size="small"
                onClick={next}
                className="p-2"
                aria-label="Next testimonials"
                icon={ArrowRight}
                shimmer={false}
              />
            </div>
            <div
              className="flex items-center gap-1.5"
              aria-label="Testimonial carousel position"
            >
              {Array.from({ length: pages }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPage(i)}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    i === page
                      ? 'w-6 bg-foreground'
                      : 'w-1.5 bg-foreground/30 hover:bg-foreground/50',
                  )}
                  aria-label={`Go to testimonials page ${i + 1}`}
                  aria-current={i === page ? 'true' : undefined}
                />
              ))}
            </div>
          </div>
        )}
      </Container>
    </section>
  );
};

/**
 * Four faint registration crosshairs inset at the frame corners — a quiet nod to
 * a spec / blueprint grid. Purely decorative, so it's hidden from assistive tech.
 */
const CornerTicks = () => (
  <>
    {[
      'left-3 top-3',
      'right-3 top-3',
      'left-3 bottom-3',
      'right-3 bottom-3',
    ].map((pos) => (
      <span
        key={pos}
        aria-hidden
        className={cn(
          'pointer-events-none absolute size-2.5 text-foreground/20',
          pos,
        )}
      >
        <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-current" />
        <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-current" />
      </span>
    ))}
  </>
);

export default Testimonials;
