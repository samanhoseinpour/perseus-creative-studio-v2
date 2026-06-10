'use client';

import Link from 'next/link';
import { createContext, useContext, useEffect, useState } from 'react';
import { useConsent } from './ConsentProvider';

const officeLocations = [
  { city: 'Vancouver', tz: 'America/Vancouver' },
  { city: 'Toronto', tz: 'America/Toronto' },
  { city: 'Los Angeles', tz: 'America/Los_Angeles' },
];

export const FooterClocks = () => {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const updateTime = () => setNow(new Date());

    updateTime();
    const intervalId = window.setInterval(updateTime, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const formatCityTime = (timeZone: string) => {
    if (!now) return '--:--';

    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now);
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] tracking-[0.15em] uppercase text-black/50 tabular-nums">
      <span
        aria-hidden
        className="size-1.5 rounded-full bg-black/40 animate-pulse"
      />
      {officeLocations.map((loc) => (
        <span key={loc.city} className="whitespace-nowrap">
          {loc.city} {formatCityTime(loc.tz)}
        </span>
      ))}
    </div>
  );
};

export const CookiePreferencesButton = () => {
  const { reset: openConsent } = useConsent();

  return (
    <button
      type="button"
      onClick={openConsent}
      className="cursor-pointer transition-colors duration-200 hover:text-black"
    >
      Cookie preferences
    </button>
  );
};

const FooterAccordionContext = createContext<{
  openTitle: string | null;
  toggle: (title: string) => void;
} | null>(null);

/**
 * Shared open-state for the mobile directory: at most one group expanded at
 * a time (tapping the open one closes it). Renders no DOM of its own, so the
 * server-rendered groups still flow directly into the nav's md+ grid.
 */
export const FooterAccordion = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [openTitle, setOpenTitle] = useState<string | null>(null);
  const toggle = (title: string) =>
    setOpenTitle((current) => (current === title ? null : title));

  return (
    <FooterAccordionContext.Provider value={{ openTitle, toggle }}>
      {children}
    </FooterAccordionContext.Provider>
  );
};

/**
 * Directory group: plain linked heading + always-visible list on md+, an
 * accordion row below md. The link list arrives as server-rendered children,
 * so the (huge) services registry never enters the client bundle, and the
 * links stay in the DOM when collapsed (CSS-hidden) so crawlers always see
 * them.
 */
export const FooterGroup = ({
  title,
  href,
  children,
}: {
  title: string;
  href?: string;
  children: React.ReactNode;
}) => {
  const accordion = useContext(FooterAccordionContext);
  const open = accordion?.openTitle === title;

  return (
    <div className="max-md:border-b max-md:border-black/10">
      {/* h2, not h3: pages with no other headings (e.g. /offline) would jump
          H1 -> H3 and fail heading-order audits. Only one of the two nodes
          inside is visible (and exposed to AT) at any viewport. */}
      <h2 className="text-sm font-semibold tracking-tight">
        <span className="hidden md:mb-4 md:block">
          {href ? (
            <Link href={href} className="hover:text-primary">
              {title}
            </Link>
          ) : (
            title
          )}
        </span>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => accordion?.toggle(title)}
          className="flex w-full cursor-pointer items-center justify-between py-4 text-left md:hidden"
        >
          {title}
          <span
            aria-hidden
            className={`text-lg font-light leading-none text-black/50 transition-transform duration-300 ${
              open ? 'rotate-45' : ''
            }`}
          >
            +
          </span>
        </button>
      </h2>
      <div
        className={`max-md:grid max-md:transition-[grid-template-rows,visibility] max-md:duration-300 max-md:ease-out ${
          open
            ? 'max-md:grid-rows-[1fr]'
            : 'max-md:invisible max-md:grid-rows-[0fr]'
        }`}
      >
        <div className="max-md:overflow-hidden">
          <div className="max-md:pb-5">{children}</div>
        </div>
      </div>
    </div>
  );
};
