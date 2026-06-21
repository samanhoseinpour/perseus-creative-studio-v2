'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { ImageKit, Button, ThemeSwitcher } from './';
import { Container } from './index';
import { opacity, height, translate, background } from '../utils/animation';
import type { NavLinkGroup, BlogPanelData } from '@/lib/navigation';
import type { TranslateParams } from '../utils/animation';

type PanelName = 'services' | 'blogs';

// Desktop link row, in order. `panel` items open a mega-panel on hover/focus
// and navigate to their hub page on click.
const navItems: {
  label: string;
  href: string;
  panel?: PanelName;
}[] = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '/services', panel: 'services' },
  { label: 'Projects', href: '/projects' },
  { label: 'Blogs', href: '/blogs', panel: 'blogs' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

const mobileLinks = [
  { title: 'Home', href: '/' },
  { title: 'Projects', href: '/projects' },
  { title: 'Blogs', href: '/blogs' },
  { title: 'About', href: '/about' },
  { title: 'Contact', href: '/contact' },
];

const socialRow = [
  { label: 'Instagram', href: 'https://www.instagram.com/perseustudio/' },
  { label: 'YouTube', href: 'https://www.youtube.com/@PerseusCreativeStudio' },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/perseus-creative-studio/',
  },
  { label: 'Email', href: 'mailto:info@perseustudio.com' },
  { label: 'Phone', href: 'tel:+17788878363' },
];

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
}: {
  serviceGroups: NavLinkGroup[];
  blogPanel: BlogPanelData;
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

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const linkClass = (href: string) =>
    `uppercase text-xs tracking-tight transition-colors duration-200 hover:text-black ${
      isActive(href) ? 'text-black' : 'text-black/60'
    }`;

  return (
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
              <Link href="/contact" className="hidden sm:block cursor-pointer">
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
              <div
                className={`w-[22.5px] pointer-events-none relative ${
                  menuOpen
                    ? 'after:rotate-45 after:-top-px before:-rotate-45 before:top-px'
                    : 'after:-top-1 before:top-1'
                } after:block after:h-0.5 after:w-full after:bg-foreground after:relative after:transition-all after:duration-1000 after:ease-[cubic-bezier(0.76,0,0.24,1)]
              before:block before:h-0.5 before:w-full before:bg-foreground before:relative before:transition-all before:duration-1000 before:ease-[cubic-bezier(0.76,0,0.24,1)]`}
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

      {/* Page dim while either panel is open */}
      <motion.div
        className="absolute left-0 top-full h-full w-full bg-background/30"
        variants={background}
        initial={false}
        animate={openPanel || menuOpen ? 'open' : 'closed'}
        onClick={() => {
          setOpenPanel(null);
          setMenuOpen(false);
        }}
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
      </AnimatePresence>

      {/* Full-screen menu (mobile) */}
      <AnimatePresence mode="wait">
        {menuOpen && <MobileNav serviceGroups={serviceGroups} />}
      </AnimatePresence>
    </header>
  );
};

const MobileNav = ({ serviceGroups }: { serviceGroups: NavLinkGroup[] }) => {
  const getChars = (word: string) => {
    return word.split('').map((char, i) => (
      <motion.span
        custom={[i * 0.02, (word.length - i) * 0.01] satisfies TranslateParams}
        variants={translate}
        initial="initial"
        animate="enter"
        exit="exit"
        key={char + i}
      >
        {char}
      </motion.span>
    ));
  };

  return (
    <Container>
      <motion.div
        variants={height}
        initial="initial"
        animate="enter"
        exit="exit"
        className="overflow-hidden xl:hidden"
      >
        <nav
          className="mt-8 flex flex-wrap text-foreground"
          aria-label="Main Navigation"
        >
          {mobileLinks.map((link) => (
            <Link key={link.href} href={link.href} className="uppercase">
              <p className="m-0 flex overflow-hidden pr-[30px] pt-2 text-[32px] font-light">
                {getChars(link.title)}
              </p>
            </Link>
          ))}
        </nav>

        {/* Service categories */}
        <div className="mt-8 overflow-hidden">
          <motion.div
            custom={[0.2, 0] satisfies TranslateParams}
            variants={translate}
            initial="initial"
            animate="enter"
            exit="exit"
          >
            <Link
              href="/services"
              className="font-mono text-[11px] tracking-[0.2em] uppercase text-black/50"
            >
              Services
            </Link>
            <ul className="mt-3 space-y-2 text-sm tracking-tighter text-black/70">
              {serviceGroups.map((group) => (
                <li key={group.title}>
                  <Link href={group.href ?? '/services'}>{group.title}</Link>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Socials + theme */}
        <div className="mt-10 mb-8 overflow-hidden">
          <motion.div
            custom={[0.3, 0] satisfies TranslateParams}
            variants={translate}
            initial="initial"
            animate="enter"
            exit="exit"
            className="flex flex-col gap-4"
          >
            <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] tracking-[0.15em] uppercase text-black/60">
              {socialRow.map((social, idx) => (
                <li key={social.label} className="flex items-center gap-3">
                  <a
                    href={social.href}
                    {...(social.href.startsWith('http')
                      ? { target: '_blank', rel: 'noopener noreferrer' }
                      : {})}
                  >
                    {social.label}
                  </a>
                  {idx !== socialRow.length - 1 && (
                    <span className="text-black/30">·</span>
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
        </div>
      </motion.div>
    </Container>
  );
};

export default NavbarClient;
