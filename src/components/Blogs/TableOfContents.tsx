'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Heading } from '@/utils/extractHeadings';
import Link from 'next/link';

interface Props {
  headings: Heading[];
  variant: 'mobile' | 'desktop';
}

export default function TableOfContents({ headings, variant }: Props) {
  const [activeId, setActiveId] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const prevActiveIdxRef = useRef<number>(-1);

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-10% 0% -80% 0%', threshold: 0 },
    );

    headings.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  // Scroll the nav so upcoming headings stay visible.
  // Moving down → active item near top (reveals headings below).
  // Moving up   → active item near bottom (reveals headings above).
  useEffect(() => {
    if (variant !== 'desktop' || !activeId || !navRef.current) return;
    const nav = navRef.current;
    const activeLink = nav.querySelector<HTMLElement>(`[href="#${activeId}"]`);
    if (!activeLink) return;

    const currIdx = headings.findIndex((h) => h.id === activeId);
    const movingDown = currIdx >= prevActiveIdxRef.current;
    prevActiveIdxRef.current = currIdx;

    const offset = movingDown ? 0.2 : 0.6;
    const target = activeLink.offsetTop - nav.clientHeight * offset;
    nav.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
  }, [activeId, headings, variant]);

  const scrollTo = useCallback(
    (id: string) => (e: React.MouseEvent) => {
      e.preventDefault();
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      setIsOpen(false);
    },
    [],
  );

  if (headings.length < 2) return null;

  const TocList = () => (
    <ul className="border-l border-black/10 space-y-0.5">
      {headings.map(({ id, text, level }) => {
        const isActive = activeId === id;
        const indent = level === 3 ? 'pl-4' : level === 4 ? 'pl-7' : 'pl-3';
        return (
          <li key={id}>
            <Link
              href={`#${id}`}
              onClick={scrollTo(id)}
              className={`
                block py-1 text-xs leading-snug transition-all duration-150 ${indent}
                ${
                  isActive
                    ? 'text-black font-semibold -ml-px border-l-2 border-black'
                    : 'text-black/45 hover:text-black/75'
                }
              `}
            >
              {text}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  // ── Mobile ────────────────────────────────────────────────────────────────
  if (variant === 'mobile') {
    return (
      <div className="sticky top-(--header-height) z-40 mb-8">
        <div className="relative">
          {/* Trigger button */}
          <div className="rounded-xl bg-white/80 backdrop-blur-sm border border-black/[0.07] shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
            <button
              onClick={() => setIsOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-black"
              aria-expanded={isOpen}
            >
              Table of Contents
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          {isOpen && (
            <>
              {/* Backdrop — closes dropdown on outside tap */}
              <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
              {/* Floating dropdown */}
              <div className="absolute top-full left-0 right-0 mt-1.5 z-40 rounded-xl bg-white/95 backdrop-blur-md border border-black/[0.07] shadow-[0_4px_20px_rgba(0,0,0,0.1)] overflow-hidden">
                <nav
                  className="overflow-y-auto no-scrollbar max-h-[50vh] px-4 py-3"
                  aria-label="Table of contents"
                  role="doc-toc"
                >
                  <TocList />
                </nav>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Desktop ───────────────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-black/[0.07] shadow-[0_2px_20px_rgba(0,0,0,0.07)] overflow-hidden">
      <div className="px-4 pt-4 pb-2.5 border-b border-black/5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-black/30">
          Table of Contents
        </p>
      </div>
      <div className="relative">
        <nav
          ref={navRef}
          className="overflow-y-scroll no-scrollbar max-h-[30vh] px-4 pt-3 pb-10"
          aria-label="Table of contents"
          role="doc-toc"
        >
          <TocList />
        </nav>
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-linear-to-t from-white to-transparent" />
      </div>
    </div>
  );
}
