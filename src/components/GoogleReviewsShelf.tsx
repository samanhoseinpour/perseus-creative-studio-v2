'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LuArrowLeft as ArrowLeft,
  LuArrowRight as ArrowRight,
} from 'react-icons/lu';

import type { GoogleReview } from '@/lib/googleReviews';
import Button from './Button';
import Stars from './Stars';
import GoogleGlyph from './GoogleGlyph';

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || 'G';

// Reviewer avatar: the real Google profile photo when present, falling back to
// an initials monogram. Google photo URLs can 404 or expire, so onError swaps
// back to the monogram (which also sits behind the image while it loads). A
// plain <img> keeps these tiny third-party avatars off next/image's optimizer
// and out of next.config's remotePatterns.
const Avatar = ({ name, photo }: { name: string; photo?: string }) => {
  const [broken, setBroken] = useState(false);
  const showPhoto = Boolean(photo) && !broken;

  return (
    <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-foreground text-xs font-semibold text-background">
      <span aria-hidden={showPhoto || undefined}>{initials(name)}</span>
      {showPhoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt=""
          width={40}
          height={40}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
          className="absolute inset-0 size-full object-cover"
        />
      )}
    </span>
  );
};

const ReviewCard = ({ review }: { review: GoogleReview }) => (
  <article className="flex h-full flex-col rounded-3xl border border-foreground/10 bg-background p-6 transition-colors duration-300 hover:border-foreground/30">
    <div className="flex items-center justify-between">
      <Stars value={review.rating} size={18} />
      <GoogleGlyph className="h-5 w-5" />
    </div>

    <p className="mt-5 line-clamp-6 text-sm leading-relaxed text-foreground/90">
      {review.text}
    </p>

    <div className="mt-auto flex items-center gap-3 pt-6">
      <Avatar name={review.authorName} photo={review.authorPhoto} />
      <div className="min-w-0">
        {review.authorUrl ? (
          <a
            href={review.authorUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="block truncate text-sm font-semibold text-foreground hover:underline"
          >
            {review.authorName}
          </a>
        ) : (
          <span className="block truncate text-sm font-semibold text-foreground">
            {review.authorName}
          </span>
        )}
        <span className="block truncate text-xs text-foreground/60">
          {[review.relativeTime, 'via Google'].filter(Boolean).join(' · ')}
        </span>
      </div>
    </div>
  </article>
);

// One card's scroll stride (card width + gap), measured from the live DOM so it
// stays correct across the responsive basis breakpoints.
const getStep = (el: HTMLOListElement) => {
  const cards = el.querySelectorAll<HTMLElement>('[data-card]');
  if (cards.length > 1) return cards[1].offsetLeft - cards[0].offsetLeft;
  return cards[0]?.offsetWidth ?? el.clientWidth;
};

const GoogleReviewsShelf = ({ reviews }: { reviews: GoogleReview[] }) => {
  const trackRef = useRef<HTMLOListElement>(null);
  // Scrollbar-style indicator: thumb width = portion of the strip in view,
  // progress = 0 at the start … 1 at the end. Positioning the thumb with
  // `progress * (1 - width)` guarantees its right edge meets the track's right
  // edge at max scroll, so the indicator is correct at every breakpoint
  // regardless of how many cards are visible.
  const [thumb, setThumb] = useState({ width: 1, progress: 0 });
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(reviews.length <= 1);

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const { scrollLeft, clientWidth, scrollWidth } = el;
    const max = scrollWidth - clientWidth;
    // Floor the width so a sliver-wide thumb stays visible on narrow viewports.
    const width = Math.min(1, Math.max(clientWidth / scrollWidth || 1, 0.14));
    const progress = max > 0 ? scrollLeft / max : 0;
    setThumb({ width, progress });
    setAtStart(scrollLeft <= 8);
    setAtEnd(scrollLeft >= max - 8);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      el.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  const page = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * getStep(el), behavior: 'smooth' });
  };

  if (reviews.length === 0) return null;

  return (
    <div className="mt-8">
      <ol
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {reviews.map((review, i) => (
          <li
            key={`${review.authorName}-${i}`}
            data-card
            className="shrink-0 snap-start basis-[85%] sm:basis-[55%] lg:basis-[31.5%]"
          >
            <ReviewCard review={review} />
          </li>
        ))}
      </ol>

      <div className="mt-6 flex items-center justify-between gap-4">
        <div
          aria-hidden="true"
          className="relative h-1 w-28 overflow-hidden rounded-full bg-foreground/15 sm:w-40"
        >
          <span
            className="absolute inset-y-0 rounded-full bg-foreground"
            style={{
              width: `${thumb.width * 100}%`,
              left: `${thumb.progress * (1 - thumb.width) * 100}%`,
            }}
          />
        </div>

        <div className="flex gap-2">
          <Button
            size="small"
            shimmer={false}
            className="p-2 disabled:cursor-default disabled:opacity-40"
            onClick={() => page(-1)}
            disabled={atStart}
            aria-label="Previous reviews"
            icon={ArrowLeft}
          />
          <Button
            size="small"
            shimmer={false}
            className="p-2 disabled:cursor-default disabled:opacity-40"
            onClick={() => page(1)}
            disabled={atEnd}
            aria-label="Next reviews"
            icon={ArrowRight}
          />
        </div>
      </div>
    </div>
  );
};

export default GoogleReviewsShelf;
