'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export type StickyTocSection = { id: string; label: string };

type StickyTocProps = {
  sections: StickyTocSection[];
  className?: string;
  // Pixel distance from the top of the viewport where a section is
  // considered "active" — matches sticky-top offset + a buffer for the
  // section header. Defaults to 200; bump it on pages with taller sticky
  // chrome.
  topPadding?: number;
};

const DEFAULT_TOP_PADDING = 200;

// Mirrors the IntersectionObserver pattern in FaqList: a zero-height
// activation line at y=topPadding, debounced reduce-to-closest, and an
// isScrolling ref that suppresses observer updates while the click
// handler is performing a smooth scroll. Without that suppression the
// observer fires mid-scroll and flips the active item back-and-forth.
const StickyToc = ({
  sections,
  className,
  topPadding = DEFAULT_TOP_PADDING,
}: StickyTocProps) => {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? '');
  const observerRef = useRef<IntersectionObserver | null>(null);
  const isScrollingRef = useRef(false);

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
                current.boundingClientRect.top - topPadding,
              );
              const closestDistance = closest
                ? Math.abs(closest.boundingClientRect.top - topPadding)
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
        rootMargin: `-${topPadding}px 0px -100% 0px`,
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
  }, [sections, topPadding]);

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
      el.style.scrollMargin = `${topPadding}px`;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.replaceState(null, '', `#${id}`);
    }

    setTimeout(() => {
      isScrollingRef.current = false;
    }, 1000);
  };

  return (
    <aside
      className={cn(
        'mt-16 hidden lg:col-start-2 lg:row-start-1 lg:mt-0 lg:block',
        className,
      )}
    >
      <div className="sticky top-40">
        <p className="text-[10px] uppercase tracking-[0.18em] text-black/40">
          Contents
        </p>
        <nav className="mt-4 space-y-2.5">
          {sections.map((section, idx) => {
            const isActive = activeId === section.id;
            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                onClick={(e) => handleClick(e, section.id)}
                className={cn(
                  'flex items-baseline gap-3 text-sm transition-colors',
                  isActive
                    ? 'font-medium text-black'
                    : 'text-black/60 hover:text-black',
                )}
              >
                <span
                  className={cn(
                    'font-mono text-[11px] transition-colors',
                    isActive ? 'text-black' : 'text-black/30',
                  )}
                >
                  §{idx + 1}
                </span>
                <span>{section.label}</span>
              </a>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

export default StickyToc;
