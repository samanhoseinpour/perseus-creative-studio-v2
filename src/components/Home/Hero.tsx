'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Play, X, ArrowRight, ArrowLeft, Send } from 'lucide-react';
import { Container, Button, ImageKit, TextShimmer } from '../';
import { projectsHorizontalGallery } from '@/constants/projects';

const REEL_YOUTUBE_ID = 'kC3LPrq2fqY';
const REEL_DURATION = '0:41';
const AUTO_ADVANCE_MS = 6000;

const ROTATING_WORDS = [
  'love.',
  'like.',
  'feel.',
  'want.',
  'seek.',
  'need.',
  'save.',
  'know.',
];
const ROTATING_WORD_PLACEHOLDER = ROTATING_WORDS.reduce((longest, word) =>
  word.length > longest.length ? word : longest,
);

const SLIDES = projectsHorizontalGallery.map((p, i) => ({
  index: i,
  imageSrc: p.imageSrc,
  title: p.title,
  description: p.description,
  href: p.href,
  eyebrow: `Industry ${String(i + 1).padStart(2, '0')}`,
}));

const Hero = () => {
  const [wordIndex, setWordIndex] = useState(0);
  const [isReelOpen, setIsReelOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  // Carousel state
  const reelOverlayRef = useRef<HTMLDivElement | null>(null);
  const carouselSectionRef = useRef<HTMLElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const progressRafRef = useRef<number | null>(null);
  const progressLastTickRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  const progressBarRef = useRef<HTMLSpanElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isCarouselInView, setIsCarouselInView] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const section = carouselSectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsCarouselInView(entry.isIntersecting);
      },
      {
        threshold: 0.25,
      },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (shouldReduceMotion) return;

    const id = window.setInterval(
      () => setWordIndex((i) => (i + 1) % ROTATING_WORDS.length),
      3400,
    );
    return () => window.clearInterval(id);
  }, [shouldReduceMotion]);

  // Lock body scroll + ESC handler while reel is open.
  useEffect(() => {
    if (!isReelOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    window.requestAnimationFrame(() => {
      reelOverlayRef.current?.focus();
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsReelOpen(false);
    };

    document.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [isReelOpen]);

  // Track the card closest to the visual center of the scrolling track.
  const updateActiveCard = useCallback(() => {
    const root = scrollRef.current;
    if (!root) return;

    const rootRect = root.getBoundingClientRect();
    const rootCenter = rootRect.left + rootRect.width / 2;
    const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-idx]'));

    let closestIndex = activeIndex;
    let closestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card) => {
      const cardRect = card.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;
      const distance = Math.abs(cardCenter - rootCenter);
      const idx = Number(card.getAttribute('data-idx'));

      if (!Number.isNaN(idx) && distance < closestDistance) {
        closestDistance = distance;
        closestIndex = idx;
      }
    });

    setActiveIndex((current) =>
      current === closestIndex ? current : closestIndex,
    );
  }, [activeIndex]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    const scheduleUpdate = () => {
      if (rafRef.current !== null) return;

      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        updateActiveCard();
      });
    };

    updateActiveCard();
    root.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      root.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);

      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [updateActiveCard]);

  const scrollToCard = useCallback(
    (idx: number) => {
      if (SLIDES.length === 0) return;

      const wrapped = (idx + SLIDES.length) % SLIDES.length;
      const el = scrollRef.current?.querySelector<HTMLElement>(
        `[data-idx="${wrapped}"]`,
      );
      if (!el) return;
      el.scrollIntoView({
        behavior: shouldReduceMotion ? 'auto' : 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    },
    [shouldReduceMotion],
  );

  const trackCarouselNavigation = useCallback(
    (source: 'card-surface' | 'cta', slide: (typeof SLIDES)[number]) => {
      window.dispatchEvent(
        new CustomEvent('carousel:navigate', {
          detail: {
            source,
            index: slide.index,
            title: slide.title,
            href: slide.href,
          },
        }),
      );
    },
    [],
  );

  // Keep carousel progress and auto-advance on the same pause-aware clock.
  useEffect(() => {
    progressRef.current = 0;
    progressLastTickRef.current = null;

    if (progressBarRef.current) {
      progressBarRef.current.style.transform = 'scaleX(0)';
    }
  }, [activeIndex]);

  useEffect(() => {
    if (
      SLIDES.length === 0 ||
      shouldReduceMotion ||
      isPaused ||
      isReelOpen ||
      !isCarouselInView
    ) {
      progressLastTickRef.current = null;
      return;
    }

    const tick = (timestamp: number) => {
      if (progressLastTickRef.current === null) {
        progressLastTickRef.current = timestamp;
      }

      const delta = timestamp - progressLastTickRef.current;
      progressLastTickRef.current = timestamp;

      const nextProgress = Math.min(
        progressRef.current + delta / AUTO_ADVANCE_MS,
        1,
      );

      progressRef.current = nextProgress;

      if (progressBarRef.current) {
        progressBarRef.current.style.transform = `scaleX(${nextProgress})`;
      }

      if (nextProgress >= 1) {
        progressRef.current = 0;
        progressLastTickRef.current = null;

        if (progressBarRef.current) {
          progressBarRef.current.style.transform = 'scaleX(0)';
        }

        scrollToCard(activeIndex + 1);
        return;
      }

      progressRafRef.current = window.requestAnimationFrame(tick);
    };

    progressRafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (progressRafRef.current !== null) {
        window.cancelAnimationFrame(progressRafRef.current);
        progressRafRef.current = null;
      }
    };
  }, [
    activeIndex,
    shouldReduceMotion,
    isPaused,
    isReelOpen,
    scrollToCard,
    isCarouselInView,
  ]);

  return (
    <section className="relative w-full overflow-hidden pt-(--header-height)">
      {/* ─── Atmospheric backdrop ─── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-[80vh] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(99,102,241,0.13),transparent_70%)]" />
        <div className="absolute inset-x-0 top-0 h-[70vh] bg-[radial-gradient(ellipse_45%_40%_at_50%_18%,rgba(20,20,20,0.05),transparent_70%)]" />
        <motion.div
          className="absolute left-1/2 top-[14%] h-[560px] w-[560px] -translate-x-1/2 rounded-full blur-3xl bg-[radial-gradient(circle,rgba(125,130,255,0.18),rgba(125,130,255,0)_70%)]"
          animate={
            shouldReduceMotion
              ? undefined
              : { x: ['-58%', '-42%', '-50%'], y: [-14, 18, -10] }
          }
          transition={
            shouldReduceMotion
              ? undefined
              : { duration: 18, repeat: Infinity, ease: 'easeInOut' }
          }
        />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(20,20,20,0.18)_1px,transparent_1px)] bg-size-[26px_26px] mask-[radial-gradient(ellipse_at_50%_30%,black_15%,transparent_75%)] opacity-55" />
      </div>

      {/* ─── Heading + CTAs ─── */}
      <Container className="relative flex flex-col items-center text-center pt-14 sm:pt-20 pb-12 sm:pb-14">
        <div className="flex items-center gap-4 w-full max-w-3xl">
          <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-black/50">
            Perseus Creative Studio
          </span>
          <span className="h-px flex-1 bg-black/10" />
          <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-black/50">
            Vancouver Creative Agency
          </span>
        </div>

        <h1 className="mt-8 max-w-4xl font-semibold tracking-tighter text-black text-5xl leading-5xl sm:text-6xl sm:leading-5xl md:text-7xl md:leading-4xl">
          <span>Build a brand</span>
          <span className="block text-black/40">
            <span>people </span>
            <span
              className="relative inline-flex justify-center align-baseline"
              aria-live="polite"
            >
              <span aria-hidden className="invisible whitespace-nowrap">
                {ROTATING_WORD_PLACEHOLDER}
              </span>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={wordIndex}
                  initial={
                    shouldReduceMotion
                      ? { opacity: 1 }
                      : { y: '60%', filter: 'blur(8px)', opacity: 0 }
                  }
                  animate={
                    shouldReduceMotion
                      ? { opacity: 1 }
                      : { y: 0, filter: 'blur(0px)', opacity: 1 }
                  }
                  exit={
                    shouldReduceMotion
                      ? { opacity: 1 }
                      : { y: '-60%', filter: 'blur(8px)', opacity: 0 }
                  }
                  transition={
                    shouldReduceMotion
                      ? { duration: 0 }
                      : { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
                  }
                  className="absolute left-0 top-0 inline-block whitespace-nowrap"
                >
                  {ROTATING_WORDS[wordIndex]}
                </motion.span>
              </AnimatePresence>
            </span>
          </span>
        </h1>

        <p className="mt-4 max-w-2xl text-sm text-black/60">
          <TextShimmer as="span">Perseus Creative Studio</TextShimmer> is a
          Vancouver creative digital marketing agency helping brands grow
          through social media marketing, video production, photography, website
          design, and search engine marketing.
        </p>

        <div className="mt-9 flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
          <Link href="/contact">
            <Button size="medium" variant="primary" icon={Send}>
              Start a Project
            </Button>
          </Link>

          <Button
            type="button"
            variant="secondary"
            size="small"
            icon={Play}
            showIcon={false}
            onClick={() => setIsReelOpen(true)}
            className="gap-3 px-3.5 py-2"
            aria-label="Watch the 2025 project recap"
          >
            <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-black text-white shadow-[0_0_0_3px_rgba(20,20,20,0.06)]">
              <span className="absolute inset-0 rounded-full bg-white/0 group-hover:bg-white/10 transition-colors" />
              <Play className="relative h-3 w-3 fill-current translate-x-px" />
            </span>
            <span className="text-sm font-medium tracking-tight transition-colors">
              Watch 2025 Recap
            </span>
            <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-black/40 tabular-nums">
              {REEL_DURATION}
            </span>
          </Button>
        </div>
      </Container>

      {/* ─── Apple-style Featured Carousel ─── */}
      {SLIDES.length > 0 && (
        <section
          ref={carouselSectionRef}
          aria-label="Featured work by industry"
          className="relative pb-16"
        >
          <Container>
            {/* Heading row — same anatomy as your Heading component */}
            <div className="flex items-center gap-4 mb-7 sm:mb-9">
              <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-black/50">
                01 — Industry Focus
              </span>
              <span className="h-px flex-1 bg-black/10" />
              <span className="hidden sm:inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.22em] uppercase tabular-nums text-black/55">
                <span>Sector-led creative systems</span>
                <span className="h-3 w-px bg-black/15" />
                <span>{String(SLIDES.length).padStart(2, '0')} industries</span>
              </span>
              <div className="ml-2 hidden sm:flex items-center gap-1.5">
                <CarouselArrow
                  direction="prev"
                  onClick={() => scrollToCard(activeIndex - 1)}
                />
                <CarouselArrow
                  direction="next"
                  onClick={() => scrollToCard(activeIndex + 1)}
                />
              </div>
            </div>
          </Container>

          {/* Track — full-bleed beyond Container so cards can peek nicely */}
          <div className="relative">
            {/* Edge fades */}
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 sm:w-24 bg-linear-to-r from-background to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 sm:w-24 bg-linear-to-l from-background to-transparent" />

            <div
              ref={scrollRef}
              className="flex gap-4 sm:gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar px-6 sm:px-12 md:px-[14%] py-4 scroll-px-6 sm:scroll-px-12 md:scroll-px-[14%]"
            >
              {SLIDES.map((slide, i) => {
                const isActive = i === activeIndex;
                return (
                  <article
                    key={slide.title}
                    data-idx={i}
                    onMouseEnter={() => {
                      if (isActive) setIsPaused(true);
                    }}
                    onMouseLeave={() => {
                      if (isActive) setIsPaused(false);
                    }}
                    onFocus={() => {
                      if (isActive) setIsPaused(true);
                    }}
                    onBlur={() => {
                      if (isActive) setIsPaused(false);
                    }}
                    onTouchStart={() => {
                      if (isActive) setIsPaused(true);
                    }}
                    onTouchEnd={() => {
                      if (isActive) setIsPaused(false);
                    }}
                    onTouchCancel={() => {
                      if (isActive) setIsPaused(false);
                    }}
                    className={[
                      'group snap-center shrink-0 relative cursor-pointer overflow-hidden rounded-3xl',
                      'w-[78vw] sm:w-[64vw] md:w-[54vw] lg:w-[48vw] max-w-[820px]',
                      'aspect-4/5 sm:aspect-5/4 md:aspect-16/10',
                      'transition-[transform,opacity,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
                      'will-change-transform',
                      isActive
                        ? 'scale-100 opacity-100 shadow-[0_30px_70px_-30px_rgba(20,20,20,0.55)]'
                        : 'scale-[0.93] opacity-60 shadow-[0_10px_30px_-20px_rgba(20,20,20,0.25)]',
                    ].join(' ')}
                    aria-labelledby={`slide-title-${i}`}
                  >
                    <button
                      type="button"
                      className="absolute inset-0 z-10 cursor-pointer rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                      data-carousel-action={isActive ? 'navigate' : 'select'}
                      data-carousel-source="card-surface"
                      onClick={() => {
                        if (isActive) {
                          trackCarouselNavigation('card-surface', slide);
                          router.push(slide.href);
                          return;
                        }

                        scrollToCard(i);
                      }}
                      aria-label={
                        isActive
                          ? `Explore ${slide.title}`
                          : `View ${slide.title}`
                      }
                    />
                    {/* Image */}
                    <div className="absolute inset-0">
                      <ImageKit
                        src={slide.imageSrc}
                        alt={slide.title}
                        fill
                        sizes="(min-width:1024px) 50vw, (min-width:640px) 70vw, 80vw"
                        className="object-cover rounded-none transition-transform duration-1200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                        priority={i === 0}
                      />
                    </div>

                    {/* Bottom-up scrim for text readability */}
                    <div className="absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-black/80 via-black/40 to-transparent" />

                    {/* Top-left index */}
                    <div className="absolute top-5 left-5 sm:top-7 sm:left-7 flex items-center gap-2 font-mono text-[10px] sm:text-[11px] tracking-[0.22em] uppercase text-white/75">
                      <span className="relative flex h-1.5 w-1.5">
                        {isActive && (
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" />
                        )}
                        <span
                          className={[
                            'relative inline-flex h-1.5 w-1.5 rounded-full',
                            isActive ? 'bg-white' : 'bg-white/50',
                          ].join(' ')}
                        />
                      </span>
                      <span className="tabular-nums">
                        {String(i + 1).padStart(2, '0')} /{' '}
                        {String(SLIDES.length).padStart(2, '0')}
                      </span>
                    </div>

                    {/* Top-right eyebrow */}
                    <div className="absolute top-5 right-5 sm:top-7 sm:right-7 font-mono text-[10px] sm:text-[11px] tracking-[0.22em] uppercase text-white/65">
                      {slide.eyebrow}
                    </div>

                    {/* Active progress bar */}
                    {isActive && (
                      <span
                        ref={progressBarRef}
                        className="absolute top-0 left-0 h-0.5 w-full origin-left bg-white/85 z-10"
                        style={{ transform: 'scaleX(0)' }}
                      />
                    )}

                    {/* Bottom content */}
                    <div className="absolute inset-x-0 bottom-0 z-20 p-6 sm:p-8 md:p-10 pointer-events-none">
                      <h3
                        id={`slide-title-${i}`}
                        className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tighter text-white max-w-[18ch]"
                      >
                        {slide.title}
                      </h3>
                      <p className="mt-3 text-sm sm:text-base text-white/75 max-w-md leading-relaxed">
                        {slide.description}
                      </p>
                      <Link
                        href={slide.href}
                        className="pointer-events-auto relative z-30 mt-5 inline-flex items-center gap-2.5 text-sm font-medium text-white"
                        aria-label={`Explore ${slide.title}`}
                        data-carousel-action="navigate"
                        data-carousel-source="cta"
                        onClick={() => trackCarouselNavigation('cta', slide)}
                      >
                        <span className="relative">
                          Explore {slide.title}
                          <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-white transition-all duration-500 ease-out group-hover:w-full" />
                        </span>
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/35 backdrop-blur-sm transition-colors group-hover:bg-white group-hover:border-white">
                          <ArrowRight className="h-3 w-3 transition-colors group-hover:text-black" />
                        </span>
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          {/* Footer rail: index + dots + status */}
          <Container>
            <div className="mt-7 sm:mt-9 flex items-center justify-between gap-4">
              <span className="font-mono text-[11px] tabular-nums tracking-[0.22em] uppercase text-black/55">
                <span className="text-black/85">
                  {String(activeIndex + 1).padStart(2, '0')}
                </span>
                <span className="mx-1.5 text-black/30">/</span>
                <span>{String(SLIDES.length).padStart(2, '0')}</span>
              </span>

              <div className="flex items-center gap-1.5">
                {SLIDES.map((_, i) => {
                  const isActive = i === activeIndex;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => scrollToCard(i)}
                      aria-label={`Go to slide ${i + 1}`}
                      className="group relative h-2 cursor-pointer"
                    >
                      <span
                        className={[
                          'block h-1 rounded-full transition-all duration-500',
                          isActive
                            ? 'w-8 bg-black/80'
                            : 'w-1 bg-black/20 group-hover:bg-black/40',
                        ].join(' ')}
                      />
                    </button>
                  );
                })}
              </div>

              <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-black/55 flex items-center gap-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span
                    className={[
                      'absolute inline-flex h-full w-full rounded-full',
                      isPaused
                        ? 'bg-black/30'
                        : 'animate-ping bg-emerald-500/60',
                    ].join(' ')}
                  />
                  <span
                    className={[
                      'relative inline-flex h-1.5 w-1.5 rounded-full',
                      isPaused ? 'bg-black/40' : 'bg-emerald-500',
                    ].join(' ')}
                  />
                </span>
                <span className="hidden sm:inline">
                  {isPaused ? 'Paused' : 'Auto · 6s'}
                </span>
              </span>
            </div>
          </Container>
        </section>
      )}

      {/* ─── Reel modal — portaled to body so it sits above navbar + escapes overflow ─── */}
      {isMounted &&
        createPortal(
          <AnimatePresence>
            {isReelOpen && (
              <motion.div
                ref={reelOverlayRef}
                tabIndex={-1}
                key="reel-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="fixed inset-0 z-100 flex items-center justify-center"
                role="dialog"
                aria-modal="true"
                aria-label="2025 project recap"
                onClick={() => setIsReelOpen(false)}
              >
                <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

                <div className="absolute top-0 inset-x-0 border-b border-white/10">
                  <Container>
                    <div className="flex items-center justify-between gap-3 py-4 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-white/60">
                      <span className="flex items-center gap-2">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500/70" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                        </span>
                        <span>Now Playing · 2025 Recap</span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsReelOpen(false);
                        }}
                        className="group inline-flex items-center gap-2 hover:text-white transition-colors cursor-pointer"
                        aria-label="Close reel"
                      >
                        <span className="hidden sm:inline">Close</span>
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 group-hover:border-white/60 group-hover:bg-white/5 transition-colors">
                          <X className="h-3.5 w-3.5" />
                        </span>
                      </button>
                    </div>
                  </Container>
                </div>

                <motion.div
                  initial={{ scale: 0.94, opacity: 0, y: 12 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.96, opacity: 0, y: 8 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="relative z-10 w-[92vw] max-w-6xl mx-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="aspect-video w-full overflow-hidden rounded-xl bg-black ring-1 ring-white/10 shadow-2xl mt-6">
                    <iframe
                      className="h-full w-full"
                      src={`https://www.youtube-nocookie.com/embed/${REEL_YOUTUBE_ID}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                      title="Perseus Creative Studio 2025 project recap"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-white/50">
                    <span>Perseus · Creative Studio</span>
                    {/* <span className="hidden sm:inline">Press ESC to close</span> */}
                    <span>2025 Project Recap · {REEL_DURATION}</span>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </section>
  );
};

const CarouselArrow = ({
  direction,
  onClick,
}: {
  direction: 'prev' | 'next';
  onClick: () => void;
}) => {
  const isNext = direction === 'next';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isNext ? 'Next slide' : 'Previous slide'}
      className="group flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/60 backdrop-blur-md hover:bg-black hover:border-black transition-all cursor-pointer shadow-[0_1px_0_rgba(255,255,255,0.6)_inset]"
    >
      {isNext ? (
        <ArrowRight className="h-3.5 w-3.5 text-black/70 group-hover:text-white transition-colors" />
      ) : (
        <ArrowLeft className="h-3.5 w-3.5 text-black/70 group-hover:text-white transition-colors" />
      )}
    </button>
  );
};

export default Hero;
