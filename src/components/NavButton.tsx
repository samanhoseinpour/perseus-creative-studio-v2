'use client';

import { useRouter } from 'next/navigation';
import type { ButtonHTMLAttributes } from 'react';

interface NavButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Internal destination — pushed through the app router, never emitted as
   *  an `<a href>`, so crawlers can't discover it as a URL. */
  href: string;
  /** Mirrors next/link's `scroll` prop — pass false to keep the viewport in
   *  place (filter rails re-rendering a grid in view). */
  scroll?: boolean;
}

/**
 * Crawl-silent navigation control for parameterised view states — facet
 * filters (?service= / ?industry= / ?location=) and form prefills
 * (?tab= / ?role=). Those URLs canonicalise to their bare path and must not
 * enter the crawl graph as pages: emitted as real `<a>`s they surface in
 * audits as hundreds of thin duplicates (single-link / crawl-depth issues),
 * and robots-blocking them instead reads as "blocked from AI search". A
 * `<button>` that router-pushes sidesteps both — the URL still updates, deep
 * links stay shareable, and it's the honest semantics for a control that
 * switches view state rather than opening a document. Hover/focus prefetch
 * keeps the first activation as snappy as `<Link>`.
 */
const NavButton = ({
  href,
  scroll = true,
  onClick,
  onMouseEnter,
  onFocus,
  children,
  ...rest
}: NavButtonProps) => {
  const router = useRouter();
  const prefetch = () => router.prefetch(href);

  return (
    <button
      {...rest}
      type="button"
      onMouseEnter={(e) => {
        onMouseEnter?.(e);
        prefetch();
      }}
      onFocus={(e) => {
        onFocus?.(e);
        prefetch();
      }}
      onClick={(e) => {
        onClick?.(e);
        // Same contract as next/link: a caller that preventDefaults (e.g. a
        // carousel suppressing the click that ends a drag) cancels the push.
        if (!e.defaultPrevented) router.push(href, { scroll });
      }}
    >
      {children}
    </button>
  );
};

export default NavButton;
