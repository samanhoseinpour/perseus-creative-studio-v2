'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { LuArrowUpRight as ArrowUpRight } from 'react-icons/lu';
import { ImageKit, Button, ThemeSwitcher } from './';
import { Container } from './index';
import { SlateTag } from '@/components/Projects/SlateTag';
import { pad2 } from '@/components/Projects/utils';
import { opacity, background } from '../utils/animation';
import MobileMenu from './MobileMenu';
import {
  navItems,
  isActiveRoute,
  type PanelName,
  type NavLinkGroup,
  type BlogPanelData,
  type ProjectsPanelData,
} from '@/lib/navigation';

// Same curve as the shared `height` variant, tuned faster for a dropdown.
const panelTransition = { duration: 0.5, ease: [0.76, 0, 0.24, 1] as const };
const panelHeight: Variants = {
  initial: { height: 0 },
  enter: { height: 'auto', transition: panelTransition },
  exit: { height: 0, transition: panelTransition },
};

const columnReveal = (i: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: 0.12 + i * 0.04 },
  },
});

const NavbarClient = ({
  serviceGroups,
  blogPanel,
  projectsPanel,
}: {
  serviceGroups: NavLinkGroup[];
  blogPanel: BlogPanelData;
  projectsPanel: ProjectsPanelData;
}) => {
  const [openPanel, setOpenPanel] = useState<PanelName | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const pathname = usePathname();

  const cancelScheduledClose = () => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const schedulePanelClose = (delay = 150) => {
    cancelScheduledClose();
    closeTimer.current = window.setTimeout(() => setOpenPanel(null), delay);
  };

  const showPanel = (name: PanelName) => {
    cancelScheduledClose();
    setOpenPanel(name);
  };

  useEffect(() => {
    setOpenPanel(null);
    setMenuOpen(false);
  }, [pathname]);

  // Stale-state guard: the hamburger menu only exists below xl and the mega
  // panels only exist from xl, but their open flags survive a window resize.
  // Without this, opening the menu and then widening past xl leaves
  // `menuOpen` stuck true — the controls cluster stays faded out and the
  // page dim keeps eating clicks. 80rem must match Tailwind's `xl`.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 80rem)');
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setMenuOpen(false);
      else setOpenPanel(null);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!openPanel && !menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenPanel(null);
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openPanel, menuOpen]);

  const isActive = (href: string) => isActiveRoute(pathname, href);

  // Match the mobile sheet's type voice (sentence-case, medium) and read more
  // confidently than the old faint caps. Hover *softens* the link (lower
  // contrast); the current route stays near-black with a thin underline.
  const linkClass = (href: string) =>
    `relative text-[13px] font-medium tracking-tight transition-colors duration-200 ${
      isActive(href)
        ? 'text-black underline decoration-1 underline-offset-8 decoration-black/40 hover:text-black/70'
        : 'text-black/80 hover:text-black/40'
    }`;

  return (
    <>
      <header
        className="fixed z-98 w-full border-b border-black/10 bg-background-contrast/90 backdrop-blur-xl sm:px-6 px-4"
        onMouseLeave={() => openPanel && schedulePanelClose()}
      >
      <Container>
        <nav className="relative flex h-(--header-row-height) items-center justify-between">
          <Link href="/" className="shrink-0">
            <span className="sr-only">Back to homepage</span>
            {/* Monochrome logo inverted in dark mode (one asset → no size
                jump). The source PNG is mostly empty padding, so extract just
                the wordmark region (bbox of the artwork in the 752x920 file)
                — otherwise the visible logo renders tiny. */}
            <ImageKit
              src="/logo-black.png"
              alt="website logo"
              width={94}
              height={32}
              loading="eager"
              transformation={[
                { cropMode: 'extract', x: 25, y: 355, width: 702, height: 240 },
              ]}
              className="dark:invert h-8 w-auto"
            />
          </Link>

          {/* Desktop links — true-centered. Only shown from xl, where the
              centered row, the logo, the controls cluster AND the theme
              switcher's leftward tray all fit; below xl the hamburger menu
              takes over. */}
          <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 xl:flex">
            {navItems.map((item) =>
              item.panel ? (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-haspopup="true"
                  aria-expanded={openPanel === item.panel}
                  onMouseEnter={() => showPanel(item.panel!)}
                  onFocus={() => showPanel(item.panel!)}
                  onClick={() => setOpenPanel(null)}
                  className={linkClass(item.href)}
                >
                  {item.label}
                </Link>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  onMouseEnter={() => schedulePanelClose(80)}
                  className={linkClass(item.href)}
                >
                  {item.label}
                </Link>
              ),
            )}
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <motion.div
              variants={opacity}
              animate={!menuOpen ? 'open' : 'closed'}
              className={`flex items-center gap-3 sm:gap-5 ${
                menuOpen ? 'pointer-events-none' : ''
              }`}
            >
              <ThemeSwitcher />
              <Link href="/contact" className="hidden xl:block cursor-pointer">
                <Button size="small" className="border-0 py-2.5 px-5">
                  Get In Touch With Us
                </Button>
              </Link>
            </motion.div>

            {/* Mobile menu toggle */}
            <div
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex cursor-pointer items-center justify-center gap-2 xl:hidden"
            >
              {/* 600ms must track MobileMenu's sheet open/close (0.6s) so the
                  icon morph and the sheet finish together; shared easing curve. */}
              <div
                className={`w-[22.5px] pointer-events-none relative ${
                  menuOpen
                    ? 'after:rotate-45 after:-top-px before:-rotate-45 before:top-px'
                    : 'after:-top-1 before:top-1'
                } after:block after:h-0.5 after:w-full after:bg-foreground after:relative after:transition-all after:duration-[600ms] after:ease-[cubic-bezier(0.76,0,0.24,1)]
              before:block before:h-0.5 before:w-full before:bg-foreground before:relative before:transition-all before:duration-[600ms] before:ease-[cubic-bezier(0.76,0,0.24,1)]`}
              ></div>
              <div className="relative flex h-full items-center text-xs uppercase text-foreground">
                <motion.p
                  variants={opacity}
                  animate={!menuOpen ? 'open' : 'closed'}
                >
                  Menu
                </motion.p>
                <motion.p
                  variants={opacity}
                  animate={menuOpen ? 'open' : 'closed'}
                  className="absolute opacity-0"
                >
                  Close
                </motion.p>
              </div>
            </div>
          </div>
        </nav>
      </Container>

      {/* Page dim while a desktop mega-panel is open. The mobile sheet is its
          own opaque backdrop (and renders outside this header), so it does not
          drive the dim. */}
      <motion.div
        className="absolute left-0 top-full h-full w-full bg-background/30"
        variants={background}
        initial={false}
        animate={openPanel ? 'open' : 'closed'}
        onClick={() => setOpenPanel(null)}
      />

      {/* Mega-panels (desktop) */}
      <AnimatePresence mode="wait">
        {openPanel === 'services' && (
          <motion.div
            key="services"
            variants={panelHeight}
            initial="initial"
            animate="enter"
            exit="exit"
            onMouseEnter={cancelScheduledClose}
            className="hidden overflow-hidden xl:block"
          >
            <Container>
              <div className="grid grid-cols-5 gap-x-10 pt-7 pb-8">
                {serviceGroups.map((group, i) => (
                  <motion.div key={group.title} {...columnReveal(i)}>
                    <Link
                      href={group.href ?? '/services'}
                      className="font-mono text-[11px] tracking-[0.2em] uppercase text-black/50 transition-colors duration-200 hover:text-black"
                    >
                      {group.title}
                    </Link>
                    <ul className="mt-4 space-y-2.5 text-[13px] tracking-tighter text-black/60">
                      {group.links.map((link) => (
                        <li key={link.href}>
                          <Link
                            href={link.href}
                            className="inline-block transition-all duration-200 hover:text-black hover:translate-x-0.5"
                          >
                            {link.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                ))}
              </div>
              <div className="mb-3 flex items-center justify-between border-t border-black/10 pt-4 pb-2">
                <Link
                  href="/services"
                  className="text-[13px] font-medium tracking-tighter text-black/80 transition-colors duration-200 hover:text-black"
                >
                  All Services →
                </Link>
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-black/40">
                  {serviceGroups.reduce((n, g) => n + g.links.length, 0)}{' '}
                  services · {serviceGroups.length} disciplines
                </span>
              </div>
            </Container>
          </motion.div>
        )}

        {openPanel === 'blogs' && (
          <motion.div
            key="blogs"
            variants={panelHeight}
            initial="initial"
            animate="enter"
            exit="exit"
            onMouseEnter={cancelScheduledClose}
            className="hidden overflow-hidden xl:block"
          >
            <Container>
              <div className="grid grid-cols-4 gap-x-10 pt-7 pb-8">
                {blogPanel.categories.map((cat, i) => (
                  <motion.div key={cat.href} {...columnReveal(i)}>
                    <Link
                      href={cat.href}
                      className="font-mono text-[11px] tracking-[0.2em] uppercase text-black/50 transition-colors duration-200 hover:text-black"
                    >
                      {cat.name}
                    </Link>
                    {/* Featured — the latest post, the column's cover */}
                    <Link
                      href={cat.featured.href}
                      className="group mt-4 block"
                    >
                      <div className="aspect-video overflow-hidden rounded-md">
                        <ImageKit
                          src={cat.featured.image}
                          alt={cat.featured.imageAlt}
                          width={480}
                          height={270}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        />
                      </div>
                      <p className="mt-3 line-clamp-2 text-[13px] font-medium tracking-tighter text-black/80 transition-colors duration-200 group-hover:text-black">
                        {cat.featured.title}
                      </p>
                      <p className="mt-1.5 font-mono text-[10px] tracking-[0.15em] uppercase text-black/40">
                        {cat.featured.date}
                      </p>
                    </Link>

                    {/* Journal index — the next few headlines, ruled like a
                        contents page. Thin categories with no further posts
                        simply end at the featured cover. */}
                    {cat.more.length > 0 && (
                      <ul className="mt-5 divide-y divide-black/[0.07] border-t border-black/[0.07]">
                        {cat.more.map((post) => (
                          <li key={post.href}>
                            <Link
                              href={post.href}
                              className="group/row flex items-baseline justify-between gap-3 py-2.5 outline-none"
                            >
                              <span className="min-w-0 flex-1 line-clamp-1 text-[12px] tracking-tight text-black/65 transition-all duration-200 group-hover/row:translate-x-0.5 group-hover/row:text-black group-focus-visible/row:translate-x-0.5 group-focus-visible/row:text-black">
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
                  </motion.div>
                ))}
              </div>
              <div className="mb-3 flex items-center justify-between border-t border-black/10 pt-4 pb-2">
                <div className="flex items-center gap-6">
                  <Link
                    href="/blogs"
                    className="text-[13px] font-medium tracking-tighter text-black/80 transition-colors duration-200 hover:text-black"
                  >
                    All Articles →
                  </Link>
                  <Link
                    href="/blogs/authors"
                    className="text-[13px] tracking-tighter text-black/60 transition-colors duration-200 hover:text-black"
                  >
                    Authors
                  </Link>
                </div>
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-black/40">
                  {blogPanel.total} articles · {blogPanel.categories.length}{' '}
                  categories
                </span>
              </div>
            </Container>
          </motion.div>
        )}

        {openPanel === 'projects' && (
          // The reel: a horizontal filmstrip ledger — five disciplines, each
          // with its latest covers. Same light header-backdrop surface and
          // theme-aware ink as the Services/Blogs panels; the horizontal-strip
          // layout (not the surface) is what sets it apart. Only the small
          // cover frames carry a dark scrim plate, so the white-wordmark
          // placeholder covers stay legible until real shots land.
          <motion.div
            key="projects"
            variants={panelHeight}
            initial="initial"
            animate="enter"
            exit="exit"
            onMouseEnter={cancelScheduledClose}
            className="hidden overflow-hidden xl:block"
          >
            <Container>
              <ul className="group/reel flex flex-col divide-y divide-black/[0.07] pt-6 pb-1">
                {projectsPanel.categories.map((cat, i) => (
                  <motion.li
                    key={cat.href}
                    {...columnReveal(i)}
                    className="group/row transition-opacity duration-500 ease-out group-has-[li:hover]/reel:not-[&:hover]:opacity-45"
                  >
                    <div className="flex items-center gap-6 py-3">
                      {/* Discipline — index + title, links to the showcase */}
                      <Link
                        href={cat.href}
                        className="group/disc flex w-60 shrink-0 items-baseline gap-3 outline-none"
                      >
                        <SlateTag className="text-black/35 transition-colors group-hover/row:text-black/60">
                          {pad2(i + 1)}
                        </SlateTag>
                        <span className="text-base font-semibold tracking-tighter text-black/80 transition-colors group-hover/row:text-black">
                          {cat.title}
                        </span>
                        <ArrowUpRight className="size-3.5 -translate-x-1 text-black/0 transition-all duration-300 group-hover/row:translate-x-0 group-hover/row:text-black/55 group-focus-visible/disc:translate-x-0 group-focus-visible/disc:text-black/55 motion-reduce:transition-none" />
                      </Link>

                      {/* Filmstrip — latest covers, each its own frame.
                          overflow-hidden lets trailing frames clip rather than
                          break the row on tight widths. */}
                      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                        {cat.covers.map((cover) => (
                          <Link
                            key={`${cover.href}-${cover.title}`}
                            href={cover.href}
                            aria-label={cover.title}
                            className="group/frame relative aspect-video w-[88px] shrink-0 overflow-hidden rounded-md bg-scrim outline-none ring-1 ring-inset ring-black/10 transition-[box-shadow] duration-300 hover:ring-black/25 focus-visible:ring-2 focus-visible:ring-black/50"
                          >
                            <ImageKit
                              src={cover.src}
                              alt=""
                              fill
                              sizes="88px"
                              className="rounded-none object-cover transition-transform duration-500 ease-out group-hover/frame:scale-[1.06]"
                            />
                            {/* Title caption — slides up over the frame on hover/focus */}
                            <span
                              aria-hidden
                              className="absolute inset-x-0 bottom-0 translate-y-full bg-linear-to-t from-scrim/90 to-transparent px-1.5 pb-1 pt-3 transition-transform duration-300 ease-out group-hover/frame:translate-y-0 group-focus-visible/frame:translate-y-0 motion-reduce:translate-y-0"
                            >
                              <span className="block truncate text-[10px] font-medium tracking-tight text-on-media">
                                {cover.title}
                              </span>
                            </span>
                          </Link>
                        ))}
                      </div>

                      {/* Tally — count + year range */}
                      <SlateTag
                        size="xs"
                        tracking="15"
                        className="shrink-0 whitespace-nowrap text-black/40 transition-colors group-hover/row:text-black/65"
                      >
                        {cat.meta}
                      </SlateTag>
                    </div>
                  </motion.li>
                ))}
              </ul>

              <div className="mb-3 flex items-center justify-between gap-4 border-t border-black/10 pt-4 pb-2">
                <Link
                  href="/projects"
                  className="text-[13px] font-medium tracking-tighter text-black/80 transition-colors duration-200 hover:text-black"
                >
                  All projects →
                </Link>
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-black/40">
                  {projectsPanel.totalProjects} projects ·{' '}
                  {projectsPanel.totalCategories} disciplines
                </span>
              </div>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>

      </header>

      {/* Full-screen menu (mobile). Rendered as a sibling OUTSIDE the header on
          purpose: the header's `backdrop-blur` (a backdrop-filter) makes it the
          containing block for fixed-position descendants, which would collapse
          this viewport-height sheet to the header's ~80px box. Out here, the
          sheet's `fixed` inset resolves against the viewport. */}
      <AnimatePresence mode="wait">
        {menuOpen && (
          <MobileMenu
            serviceGroups={serviceGroups}
            blogPanel={blogPanel}
            projectsPanel={projectsPanel}
            onNavigate={() => setMenuOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default NavbarClient;
