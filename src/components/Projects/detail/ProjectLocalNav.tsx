'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import Button from '@/components/Button';
import Container from '@/components/ui/Container';
import { cn } from '@/lib/utils';

export type LocalNavSection = { id: string; label: string };

interface ProjectLocalNavProps {
  /** The case file's title, truncated in the bar. */
  title: string;
  /** Anchor targets, in page order — ids live on the page's section wrappers. */
  sections: LocalNavSection[];
  ctaHref: string;
  ctaLabel: string;
  /** Zero-height marker the page renders after the hero frame — the bar shows
   *  once it scrolls above the viewport. */
  sentinelId: string;
}

// Fixed chrome above an anchored section: 80px navbar + 48px ribbon + buffer.
// Matches the `scroll-mt-36` (144px) the page puts on section wrappers.
const TOP_PADDING = 144;

/**
 * The case file's local nav — the Apple product-ribbon pattern: a slim fixed
 * bar under the navbar with the project name, section anchors, and one CTA.
 * Hidden until the hero frame scrolls past (a sentinel IntersectionObserver),
 * then slides in with transform/opacity only. Active-section tracking and the
 * click-scroll handling mirror StickyToc (the proven Lenis-compatible
 * pattern): an activation line at y=TOP_PADDING, debounced reduce-to-closest,
 * and an isScrolling ref so the observer doesn't fight smooth scrolls.
 *
 * Rendered directly inside <main> — never under a transformed/filtered
 * ancestor, which would capture its fixed positioning (the MobileMenu gotcha).
 * Stacks at z-40: below the navbar (z-98) and its mega-panels, above content.
 */
const ProjectLocalNav = ({
  title,
  sections,
  ctaHref,
  ctaLabel,
  sentinelId,
}: ProjectLocalNavProps) => {
  const [visible, setVisible] = useState(false);
  const [activeId, setActiveId] = useState<string>('');
  const observerRef = useRef<IntersectionObserver | null>(null);
  const isScrollingRef = useRef(false);

  // Show/hide off the sentinel: visible only once it has scrolled above the
  // viewport (not while it sits below the fold on load).
  useEffect(() => {
    const sentinel = document.getElementById(sentinelId);
    if (!sentinel) return;
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinelId]);

  const setupObserver = useCallback(() => {
    observerRef.current?.disconnect();

    let debounceTimeout: ReturnType<typeof setTimeout> | undefined;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (isScrollingRef.current) return;

        if (debounceTimeout) clearTimeout(debounceTimeout);

        debounceTimeout = setTimeout(() => {
          const intersecting = entries.filter((e) => e.isIntersecting);

          const entry = intersecting.reduce(
            (closest, current) => {
              const distance = Math.abs(
                current.boundingClientRect.top - TOP_PADDING,
              );
              const closestDistance = closest
                ? Math.abs(closest.boundingClientRect.top - TOP_PADDING)
                : Infinity;
              return distance < closestDistance ? current : closest;
            },
            null as IntersectionObserverEntry | null,
          );

          if (entry?.target.id) setActiveId(entry.target.id);
        }, 150);
      },
      {
        root: null,
        rootMargin: `-${TOP_PADDING}px 0px -100% 0px`,
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });

    return () => {
      if (debounceTimeout) clearTimeout(debounceTimeout);
    };
  }, [sections]);

  useEffect(() => {
    const cleanup = setupObserver();
    return () => {
      cleanup();
      observerRef.current?.disconnect();
    };
  }, [setupObserver]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setActiveId(id);
    isScrollingRef.current = true;

    const el = document.getElementById(id);
    if (el) {
      el.style.scrollMargin = `${TOP_PADDING}px`;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.replaceState(null, '', `#${id}`);
    }

    setTimeout(() => {
      isScrollingRef.current = false;
    }, 1000);
  };

  return (
    <nav
      aria-label="On this page"
      inert={!visible || undefined}
      className={cn(
        'fixed inset-x-0 top-(--header-row-height) z-40 border-b border-black/10 bg-background-contrast/90 backdrop-blur-xl',
        'transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none',
        visible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none -translate-y-2 opacity-0',
      )}
    >
      <Container className="flex h-12 items-center gap-4 sm:gap-6">
        <p className="min-w-0 shrink-0 truncate text-[13px] font-medium tracking-tight text-black max-sm:max-w-28 sm:max-w-56">
          {title}
        </p>
        <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-4 overflow-x-auto sm:justify-center sm:gap-5">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              onClick={(e) => handleClick(e, section.id)}
              className={cn(
                'whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.16em] transition-colors',
                activeId === section.id
                  ? 'text-black'
                  : 'text-black/50 hover:text-black',
              )}
            >
              {section.label}
            </a>
          ))}
        </div>
        <Link href={ctaHref} className="shrink-0 max-sm:hidden">
          <Button
            size="small"
            showIcon={false}
            tabIndex={-1}
            className="px-4 py-1.5 text-[11px]"
          >
            {ctaLabel}
          </Button>
        </Link>
      </Container>
    </nav>
  );
};

export default ProjectLocalNav;
