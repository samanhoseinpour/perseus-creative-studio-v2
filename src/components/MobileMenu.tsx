'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  LuArrowUpRight as ArrowUpRight,
  LuSend as Send,
  LuChevronRight as ChevronRight,
  LuChevronLeft as ChevronLeft,
} from 'react-icons/lu';
import Img from './Img';
import Button from './Button';
import ThemeSwitcher from './ThemeSwitcher';
import Container from './ui/Container';
import WhatsAppChatButton from './WhatsAppChatButton';
import { SocialLinks } from '@/constants/socials';
import { CONTACT } from '@/constants/contact';
import { SlateTag } from '@/components/Projects/SlateTag';
import { pad2 } from '@/components/Projects/utils';
import { useLenis } from '@/utils/lenis';
import { useEdgeFade } from '@/hooks/useEdgeFade';
import {
  navItems,
  isActiveRoute,
  type PanelName,
  type NavLinkGroup,
  type BlogPanelData,
  type ProjectsPanelData,
  type ProjectsPanelCover,
} from '@/lib/navItems';

// The navbar's canonical easing — the same curve the desktop mega-panels and
// the hamburger animate on, so the sheet feels cut from the same cloth.
const EASE = [0.76, 0, 0.24, 1] as const;

// The footer's social-pill idiom. `black`/`white` flip with the theme (mapped
// to --ink/--surface in globals.css @theme inline), so this is dark-mode-safe.
const socialPillClass =
  'flex size-9 cursor-pointer items-center justify-center rounded-full border border-black/10 text-black/60 transition-colors duration-200 hover:border-black hover:bg-black hover:text-white motion-reduce:transition-none';

const sectionLabel: Record<PanelName, string> = {
  services: 'Services',
  projects: 'Projects',
  blogs: 'Blogs',
};

/**
 * The mobile menu — a full-screen sheet under the fixed header. An Apple-style
 * drill-in (push) navigation: the six primary destinations as large rows, the
 * three with a `panel` pushing into a focused detail screen — the service
 * ledger, the projects reel, and the blog journal — so every desktop link is
 * reachable on a phone without the long scroll an in-place accordion produced.
 * State (open/close) lives in NavbarClient; this mounts only while open, which
 * doubles as the scroll-lock lifecycle.
 */
const MobileMenu = ({
  serviceGroups,
  blogPanel,
  projectsPanel,
  onNavigate,
}: {
  serviceGroups: NavLinkGroup[];
  blogPanel: BlogPanelData;
  projectsPanel: ProjectsPanelData;
  /** Closes the sheet — called after any in-sheet navigation. */
  onNavigate: () => void;
}) => {
  const reduceMotion = useReducedMotion();
  const lenis = useLenis();

  // The drill-in stack: null = the root list; a PanelName = that section's
  // detail screen, pushed in over the root.
  const [activeSection, setActiveSection] = useState<PanelName | null>(null);

  // Own the viewport while open: pause Lenis and lock the body so the page
  // behind the opaque sheet can't scroll (kills iOS scroll-chaining too).
  // Mount == open, so this lifecycle is the open/close lifecycle.
  useEffect(() => {
    lenis?.stop();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      lenis?.start();
      document.body.style.overflow = prev;
    };
  }, [lenis]);

  const serviceCount = serviceGroups.reduce((n, g) => n + g.links.length, 0);
  const tally: Record<PanelName, string> = {
    services: `${serviceCount} services`,
    projects: `${projectsPanel.totalProjects} projects`,
    blogs: `${blogPanel.total} articles`,
  };

  // The drill-in (root ↔ detail) cross-fade.
  const fadeTransition = { duration: reduceMotion ? 0.15 : 0.3, ease: EASE };

  return (
    <motion.div
      // Open/close: a smooth top-down roll, matching the menu's previous feel —
      // the sheet is full-size but revealed by a clip-path inset sweeping down
      // from the header (GPU-composited, so it stays smooth). Reduced motion
      // gets a plain fade.
      initial={
        reduceMotion ? { opacity: 0 } : { clipPath: 'inset(0 0 100% 0)' }
      }
      animate={reduceMotion ? { opacity: 1 } : { clipPath: 'inset(0 0 0% 0)' }}
      exit={reduceMotion ? { opacity: 0 } : { clipPath: 'inset(0 0 100% 0)' }}
      transition={{ duration: reduceMotion ? 0.2 : 0.6, ease: EASE }}
      role="dialog"
      aria-label="Site menu"
      className="fixed inset-x-0 top-(--header-row-height) bottom-0 z-90 flex flex-col bg-background-contrast xl:hidden"
    >
      {/* Screen stage — the root list and the section detail push horizontally
          within this clipped region. */}
      <div className="relative flex-1 overflow-hidden">
        {/* Root list — always mounted; the detail screen cross-fades in over
            it, so its entrance stagger never replays on the way back. Inert
            while covered. */}
        <div
          aria-hidden={activeSection !== null}
          inert={activeSection !== null}
          // data-lenis-prevent: root Lenis preventDefault()s wheel globally, so
          // without this the lock (lenis.stop) also kills mouse-wheel scroll
          // inside the sheet. This opts the pane back into native scroll.
          data-lenis-prevent
          className="absolute inset-0 overflow-y-auto overscroll-contain px-4 sm:px-6 no-scrollbar"
        >
          <Container className="pt-1 pb-10">
            <RootScreen
              tally={tally}
              reduceMotion={!!reduceMotion}
              onOpenSection={setActiveSection}
              onNavigate={onNavigate}
            />
          </Container>
        </div>

        {/* Section detail — pushes in from the right over the root, iOS-style;
            Back slides it out the same way. */}
        <AnimatePresence>
          {activeSection && (
            <motion.div
              key={activeSection}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={fadeTransition}
              // See the root pane above — re-enables native wheel scroll while
              // Lenis is stopped (also covers the nested horizontal filmstrips).
              data-lenis-prevent
              className="absolute inset-0 overflow-y-auto overscroll-contain bg-background-contrast no-scrollbar"
            >
              <DetailScreen
                section={activeSection}
                tally={tally[activeSection]}
                serviceGroups={serviceGroups}
                blogPanel={blogPanel}
                projectsPanel={projectsPanel}
                onBack={() => setActiveSection(null)}
                onNavigate={onNavigate}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pinned action — present on every screen, aligned to the logo, always
          reachable without scrolling to the bottom. */}
      <div className="border-t border-black/10 bg-background-contrast px-4 pt-4 pb-[max(env(safe-area-inset-bottom),1rem)] sm:px-6">
        <Container>
          <Link href="/contact" onClick={onNavigate} className="block">
            {/* shimmer off: a sheet-pinned primary button is effectively
                always-on while open, where the conic sweep reads as flicker. */}
            <Button size="medium" shimmer={false} icon={Send} className="w-full border-0">
              Get In Touch With Us
            </Button>
          </Link>
        </Container>
      </div>
    </motion.div>
  );
};

// ───────────────────────────────────────────────────────────────────────────

// Leading accent bar marking the current route. Sits in Container's constant
// px-6 gutter (-left-3) so it never nudges the row's text — pure overlay.
// foreground token → correct in light + dark.
const ActiveBar = () => (
  <span
    aria-hidden
    className="pointer-events-none absolute top-1/2 -left-3 h-7 w-[3px] -translate-y-1/2 rounded-full bg-foreground"
  />
);

// Live hours + open/closed status against CONTACT.hours, in the studio's
// timezone — reuses the footer clock's pulsing-dot register. The dot is live
// (pulses while open); the schedule text is always shown, so this one element
// carries both the hours and the current status. Client-only (the sheet mounts
// on open), so no SSR mismatch; computes on mount, refreshes each minute.
const HoursStatus = () => {
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    const compute = () => {
      // % 24 folds the locale "24" some Intl runtimes emit at midnight to 0.
      const hour =
        Number(
          new Intl.DateTimeFormat('en-US', {
            timeZone: CONTACT.hours.tz,
            hour: 'numeric',
            hour12: false,
          }).format(new Date()),
        ) % 24;
      setOpen(hour >= CONTACT.hours.opensHour && hour < CONTACT.hours.closesHour);
    };
    compute();
    const id = window.setInterval(compute, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.15em] uppercase text-black/40">
      <span
        aria-hidden
        className={`size-1.5 shrink-0 rounded-full ${
          open
            ? 'bg-foreground motion-safe:animate-pulse'
            : open === false
              ? 'bg-black/25'
              : 'bg-black/15'
        }`}
      />
      {CONTACT.hours.label}
      {open !== null && (
        <span className="sr-only">
          {open ? ' (currently open)' : ' (currently closed)'}
        </span>
      )}
    </span>
  );
};

// Direct line — one compact register row: a thin eyebrow (label + the live
// hours/status), then the call and email together on a single line. Keeps the
// sheet's text idiom (mono eyebrow, dot separator) — just far denser than the
// stacked label rows it replaced.
const ContactRegister = () => (
  <div className="mt-8">
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <span className="eyebrow text-[10px] text-black/40">
        Direct line
      </span>
      <HoursStatus />
    </div>
    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 border-t border-black/[0.07] pt-2 text-[14px] font-medium tracking-tight">
      <a
        href={CONTACT.phone.href}
        className="cursor-pointer py-1 text-black/85 transition-colors duration-200 hover:text-black"
      >
        {CONTACT.phone.label}
      </a>
      <span aria-hidden className="text-black/20">
        ·
      </span>
      <a
        href={CONTACT.email.href}
        className="cursor-pointer py-1 text-black/85 transition-colors duration-200 hover:text-black"
      >
        {CONTACT.email.label}
      </a>
    </div>
  </div>
);

// Root list — the six primary destinations, then the social register + theme.
// Panel rows push into a detail screen; the rest navigate straight to their hub.
const RootScreen = ({
  tally,
  reduceMotion,
  onOpenSection,
  onNavigate,
}: {
  tally: Record<PanelName, string>;
  reduceMotion: boolean;
  onOpenSection: (name: PanelName) => void;
  onNavigate: () => void;
}) => {
  const pathname = usePathname();

  // Row entrance: a calm staggered fade-up. Skipped under reduced-motion.
  const rowIn = (i: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, ease: EASE, delay: 0.05 + i * 0.05 },
        };

  return (
    <>
      <nav aria-label="Main Navigation" className="flex flex-col">
        {navItems.map((item, i) => {
          const active = isActiveRoute(pathname, item.href);
          return (
            <motion.div
              key={item.href}
              {...rowIn(i)}
              className="border-b border-black/10"
            >
              {item.panel ? (
                <button
                  type="button"
                  onClick={() => onOpenSection(item.panel!)}
                  aria-label={`Open ${item.label}`}
                  aria-current={active ? 'page' : undefined}
                  className="group relative flex min-h-[64px] w-full cursor-pointer items-center justify-between gap-4 py-2 text-left text-foreground"
                >
                  {active && <ActiveBar />}
                  <span
                    className={`text-[28px] font-medium tracking-tight transition-colors duration-200 ${
                      active
                        ? 'text-black'
                        : 'text-black/80 group-hover:text-black'
                    }`}
                  >
                    {item.label}
                  </span>
                  <span className="flex items-center gap-3">
                    <SlateTag size="sm" tracking="15" className="text-black/40">
                      {tally[item.panel]}
                    </SlateTag>
                    <ChevronRight
                      className={`size-5 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transition-none ${
                        active
                          ? 'text-foreground'
                          : 'text-black/30 group-hover:text-black/70'
                      }`}
                    />
                  </span>
                </button>
              ) : (
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className="group relative flex min-h-[64px] cursor-pointer items-center justify-between gap-4 py-2 text-foreground"
                >
                  {active && <ActiveBar />}
                  <span
                    className={`text-[28px] font-medium tracking-tight transition-colors duration-200 ${
                      active
                        ? 'text-black'
                        : 'text-black/80 group-hover:text-black'
                    }`}
                  >
                    {item.label}
                  </span>
                  <ArrowUpRight
                    className={`size-5 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none ${
                      active
                        ? 'text-foreground'
                        : 'text-black/30 group-hover:text-black/70'
                    }`}
                  />
                </Link>
              )}
            </motion.div>
          );
        })}
      </nav>

      {/* Direct line — the contact register, in the sheet's editorial idiom. */}
      <motion.div {...rowIn(navItems.length)}>
        <ContactRegister />
      </motion.div>

      {/* Socials (icons) + theme — the brand's register voice closes the list. */}
      <motion.div
        {...rowIn(navItems.length + 1)}
        className="mt-8 flex flex-col gap-5"
      >
        <ul className="flex flex-wrap items-center gap-2.5">
          {SocialLinks.map((social) => (
            <li key={social.label}>
              {social.label === 'WhatsApp' ? (
                <WhatsAppChatButton className={socialPillClass}>
                  {social.icon}
                </WhatsAppChatButton>
              ) : (
                <a
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className={socialPillClass}
                >
                  {social.icon}
                </a>
              )}
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-3 font-mono text-[10px] tracking-[0.15em] uppercase">
          <span className="text-black/40">Theme:</span>
          {/* opens rightward into the empty end of the "Theme:" row */}
          <ThemeSwitcher direction="right" />
        </div>
      </motion.div>
    </>
  );
};

// A section's detail screen — a sticky Back/title bar, then the section body.
const DetailScreen = ({
  section,
  tally,
  serviceGroups,
  blogPanel,
  projectsPanel,
  onBack,
  onNavigate,
}: {
  section: PanelName;
  tally: string;
  serviceGroups: NavLinkGroup[];
  blogPanel: BlogPanelData;
  projectsPanel: ProjectsPanelData;
  onBack: () => void;
  onNavigate: () => void;
}) => {
  const backRef = useRef<HTMLButtonElement>(null);

  // Land keyboard focus on Back when the screen pushes in. Programmatic focus
  // doesn't trip :focus-visible, so there's no stray ring on a touch open.
  useEffect(() => {
    backRef.current?.focus();
  }, []);

  return (
    <>
      {/* Sticky section bar — full-bleed surface, content aligned to the logo. */}
      <div className="sticky top-0 z-10 border-b border-black/10 bg-background-contrast px-4 sm:px-6">
        <Container className="flex items-center justify-between gap-4 py-3.5">
          <button
            ref={backRef}
            type="button"
            onClick={onBack}
            aria-label="Back to menu"
            className="group -ml-1.5 flex cursor-pointer items-center gap-1 rounded-md py-1 pr-2 pl-1.5 text-foreground"
          >
            <ChevronLeft className="size-5 text-black/50 transition-transform duration-200 group-hover:-translate-x-0.5 group-hover:text-black motion-reduce:transition-none" />
            <span className="text-[15px] tracking-tight text-black/70 transition-colors duration-200 group-hover:text-black">
              Back
            </span>
          </button>
          <span className="flex items-center gap-3">
            <span className="text-[17px] font-semibold tracking-tight text-foreground">
              {sectionLabel[section]}
            </span>
            <SlateTag size="sm" tracking="15" className="text-black/40">
              {tally}
            </SlateTag>
          </span>
        </Container>
      </div>

      {/* Section body — the desktop-derived content blocks, reused verbatim. */}
      <div className="px-4 pt-5 pb-10 sm:px-6">
        <Container>
          {section === 'services' && (
            <ServicesContent groups={serviceGroups} onNavigate={onNavigate} />
          )}
          {section === 'projects' && (
            <ProjectsContent panel={projectsPanel} onNavigate={onNavigate} />
          )}
          {section === 'blogs' && (
            <BlogsContent panel={blogPanel} onNavigate={onNavigate} />
          )}
        </Container>
      </div>
    </>
  );
};

// Closing register line under each section — a hub link + a mono tally.
const SectionFooter = ({ children }: { children: ReactNode }) => (
  <div className="mt-5 flex items-center justify-between gap-4 border-t border-black/10 pt-4">
    {children}
  </div>
);

// Services — grouped: every discipline with its full service list, so the
// individual service links the desktop panel shows are all reachable here.
const ServicesContent = ({
  groups,
  onNavigate,
}: {
  groups: NavLinkGroup[];
  onNavigate: () => void;
}) => {
  const pathname = usePathname();
  const total = groups.reduce((n, g) => n + g.links.length, 0);
  return (
    <div>
      {groups.map((group) => {
        const groupHref = group.href ?? '/services';
        const groupActive = isActiveRoute(pathname, groupHref);
        return (
          <div
            key={group.title}
            className="border-t border-black/[0.07] pt-4 first:border-t-0 first:pt-0"
          >
            <Link
              href={groupHref}
              onClick={onNavigate}
              aria-current={groupActive ? 'page' : undefined}
              className={`cursor-pointer eyebrow text-[11px] transition-colors duration-200 hover:text-black ${
                groupActive ? 'text-black' : 'text-black/50'
              }`}
            >
              {group.title}
            </Link>
            <ul className="mt-1.5">
              {group.links.map((link) => {
                const linkActive = isActiveRoute(pathname, link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={onNavigate}
                      aria-current={linkActive ? 'page' : undefined}
                      className={`flex min-h-[44px] cursor-pointer items-center text-[15px] tracking-tight transition-colors duration-200 hover:text-black ${
                        linkActive
                          ? 'font-medium text-black'
                          : 'text-black/65'
                      }`}
                    >
                      {link.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      <SectionFooter>
        <Link
          href="/services"
          onClick={onNavigate}
          className="cursor-pointer text-[13px] font-medium tracking-tighter text-black/80 transition-colors duration-200 hover:text-black"
        >
          All Services →
        </Link>
        <SlateTag size="xs" tracking="20" className="text-black/40">
          {total} services · {groups.length} disciplines
        </SlateTag>
      </SectionFooter>
    </div>
  );
};

// One discipline's filmstrip — horizontal scroll carrying the same FilterRail
// edge-fade (via useEdgeFade), so covers dissolve into the bleed edges instead
// of hard-cutting, but only on a side that still has more to scroll. Its own
// component so each row owns an independent edge-fade measurement.
const ProjectFilmstrip = ({
  covers,
  onNavigate,
}: {
  covers: ProjectsPanelCover[];
  onNavigate: () => void;
}) => {
  const { ref, maskImage } = useEdgeFade<HTMLDivElement>();
  return (
    <div
      ref={ref}
      style={{ maskImage, WebkitMaskImage: maskImage }}
      className="-mx-6 mt-3 flex gap-2 overflow-x-auto overscroll-x-contain px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {covers.map((cover) => (
        <Link
          key={`${cover.href}-${cover.title}`}
          href={cover.href}
          onClick={onNavigate}
          aria-label={cover.title}
          className="group/frame relative aspect-video w-[140px] shrink-0 cursor-pointer overflow-hidden rounded-md bg-scrim"
        >
          <Img
            src={cover.src}
            alt=""
            fill
            sizes="140px"
            className="rounded-none object-cover"
          />
          <span
            aria-hidden
            className="absolute inset-x-0 bottom-0 bg-linear-to-t from-scrim/90 to-transparent px-1.5 pt-4 pb-1"
          >
            <span className="block truncate text-[10px] font-medium tracking-tight text-on-media">
              {cover.title}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
};

// Projects — the reel: each discipline indexed, with its latest covers in a
// horizontally-scrollable filmstrip that bleeds to the container edge. Reuses
// the desktop frame treatment (dark scrim plate + on-media caption) verbatim.
const ProjectsContent = ({
  panel,
  onNavigate,
}: {
  panel: ProjectsPanelData;
  onNavigate: () => void;
}) => {
  const pathname = usePathname();
  return (
    <div>
      <ul className="flex flex-col divide-y divide-black/[0.07]">
        {panel.categories.map((cat, i) => {
          const active = isActiveRoute(pathname, cat.href);
          return (
            <li key={cat.href} className="py-4 first:pt-0">
              <Link
                href={cat.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className="group flex cursor-pointer items-baseline gap-3"
              >
                <SlateTag
                  className={active ? 'text-black/60' : 'text-black/35'}
                >
                  {pad2(i + 1)}
                </SlateTag>
                <span
                  className={`min-w-0 truncate text-base font-semibold tracking-tighter transition-colors group-hover:text-black ${
                    active ? 'text-black' : 'text-black/85'
                  }`}
                >
                  {cat.title}
                </span>
                <SlateTag
                  size="xs"
                  tracking="15"
                  className="ml-auto shrink-0 whitespace-nowrap text-black/40"
                >
                  {cat.meta}
                </SlateTag>
              </Link>

              <ProjectFilmstrip covers={cat.covers} onNavigate={onNavigate} />
            </li>
          );
        })}
      </ul>
      <SectionFooter>
        <Link
          href="/projects"
          onClick={onNavigate}
          className="cursor-pointer text-[13px] font-medium tracking-tighter text-black/80 transition-colors duration-200 hover:text-black"
        >
          All projects →
        </Link>
        <SlateTag size="xs" tracking="20" className="text-black/40">
          {panel.totalProjects} projects · {panel.totalCategories} disciplines
        </SlateTag>
      </SectionFooter>
    </div>
  );
};

// Blogs — the journal: each category's latest post as a cover, then a ruled
// index of the next few headlines with their datelines. Mirrors the desktop
// panel's contents-page treatment.
const BlogsContent = ({
  panel,
  onNavigate,
}: {
  panel: BlogPanelData;
  onNavigate: () => void;
}) => (
  <div>
    <div className="flex flex-col gap-7">
      {panel.categories.map((cat) => (
        <div key={cat.href}>
          <Link
            href={cat.href}
            onClick={onNavigate}
            className="cursor-pointer eyebrow text-[11px] text-black/50 transition-colors duration-200 hover:text-black"
          >
            {cat.name}
          </Link>

          {/* Featured — the latest post as a small cover beside its headline. */}
          <Link
            href={cat.featured.href}
            onClick={onNavigate}
            className="group mt-3 flex cursor-pointer gap-4"
          >
            <div className="aspect-video w-[112px] shrink-0 overflow-hidden rounded-md">
              <Img
                src={cat.featured.image}
                alt={cat.featured.imageAlt}
                width={224}
                height={126}
                className="h-full w-full rounded-none object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-[14px] font-medium tracking-tight text-black/85 transition-colors duration-200 group-hover:text-black">
                {cat.featured.title}
              </p>
              <p className="mt-1 font-mono text-[10px] tracking-[0.15em] uppercase text-black/40">
                {cat.featured.date}
              </p>
            </div>
          </Link>

          {/* Journal index — the next few headlines, ruled like a contents page. */}
          {cat.more.length > 0 && (
            <ul className="mt-3 divide-y divide-black/[0.07] border-t border-black/[0.07]">
              {cat.more.map((post) => (
                <li key={post.href}>
                  <Link
                    href={post.href}
                    onClick={onNavigate}
                    className="flex cursor-pointer items-baseline justify-between gap-3 py-2.5"
                  >
                    <span className="min-w-0 flex-1 line-clamp-1 text-[13px] tracking-tight text-black/65 transition-colors duration-200 hover:text-black">
                      {post.title}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] tracking-[0.15em] uppercase text-black/35">
                      {post.dateLabel}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
    <SectionFooter>
      <div className="flex items-center gap-5">
        <Link
          href="/blogs"
          onClick={onNavigate}
          className="cursor-pointer text-[13px] font-medium tracking-tighter text-black/80 transition-colors duration-200 hover:text-black"
        >
          All Articles →
        </Link>
        <Link
          href="/blogs/authors"
          onClick={onNavigate}
          className="cursor-pointer text-[13px] tracking-tighter text-black/60 transition-colors duration-200 hover:text-black"
        >
          Authors
        </Link>
      </div>
      <SlateTag size="xs" tracking="20" className="text-black/40">
        {panel.total} articles
      </SlateTag>
    </SectionFooter>
  </div>
);

export default MobileMenu;
