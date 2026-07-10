'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { LuLogOut } from 'react-icons/lu';

import Button from '@/components/Button';
import HamburgerButton from '@/components/HamburgerButton';
import ImgClient from '@/components/ImgClient';
import MobileSheet from '@/components/MobileSheet';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import AdminAvatar from '@/components/Admin/AdminAvatar';
import {
  glassSurface,
  glassChip,
  glassRowHover,
  GlassRim,
} from '@/components/Admin/Glass';
import { authClient } from '@/lib/auth-client';
import {
  ADMIN_NAV,
  ADMIN_INBOX,
  adminRouteLabel,
  isAdminRouteActive,
  type AdminNavItem,
} from '@/lib/adminNav';
import { cn } from '@/lib/utils';
import { PERSEUS_LOGO } from '@/constants';

/** Ties the mobile top bar's hamburger `aria-controls` to the sheet it opens. */
const ADMIN_MENU_ID = 'admin-menu';

type AdminSidebarProps = {
  name: string;
  email: string;
  avatar: { src: string; blur?: string } | null;
  // `ticket` is the open-ticket tally — 0 for everyone outside the privileged
  // allow-list (the layout only queries it for them), which hides the badge.
  counts?: { project: number; career: number; ticket?: number };
  /** Layout-computed isPrivilegedAdmin — reveals privileged-only nav items. */
  privileged?: boolean;
};

export default function AdminSidebar({
  name,
  email,
  avatar,
  counts,
  privileged,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const pageLabel = adminRouteLabel(pathname);

  async function signOut() {
    setSigningOut(true);
    await authClient.signOut();
    router.push('/admin/login');
    router.refresh();
  }

  const renderLink = (
    { label, href, icon: Icon, badge }: AdminNavItem,
    onNavigate?: () => void,
  ) => {
    const active = isAdminRouteActive(href, pathname);
    const n = badge ? (counts?.[badge] ?? 0) : 0;
    return (
      <Link
        key={href}
        href={href}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          active
            ? 'bg-foreground text-background'
            : cn('text-muted-foreground hover:text-foreground', glassRowHover),
        )}
      >
        <span className="flex items-center gap-3">
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {label}
        </span>
        {badge && n > 0 && (
          <span
            className={cn(
              'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.6rem] font-semibold tabular-nums',
              active ? 'bg-background/20 text-background' : glassChip,
            )}
          >
            {n}
          </span>
        )}
      </Link>
    );
  };

  const visibleNav = ADMIN_NAV.filter((item) => !item.privileged || privileged);

  const nav = (onNavigate?: () => void) => (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
      {visibleNav.map((item) => renderLink(item, onNavigate))}

      <span className="my-2 px-3 text-[0.6rem] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
        Inbox
      </span>
      {ADMIN_INBOX.map((item) => renderLink(item, onNavigate))}
    </nav>
  );

  const footer = (
    <div className="border-t border-white/60 p-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] dark:border-white/12">
      <div className="flex items-center gap-3 px-1 py-1">
        <AdminAvatar src={avatar?.src} blur={avatar?.blur} name={name} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
        <ThemeSwitcher direction="left" className="shrink-0" />
      </div>
      <Button
        type="button"
        variant="secondary"
        size="small"
        onClick={signOut}
        disabled={signingOut}
        icon={LuLogOut}
        iconPosition="left"
        className="mt-2 w-full"
      >
        {signingOut ? 'Signing out…' : 'Sign out'}
      </Button>
    </div>
  );

  // The mark links back out to the site; the label beside it names the page and
  // swaps as you navigate. Deliberately chrome-scaled (small, tracked caps) so it
  // reads as a location breadcrumb rather than competing with the page's own h1.
  const brand = (onClose?: () => void) => (
    <div className="flex min-w-0 items-center gap-2.5">
      <Link
        href="/"
        onClick={onClose}
        aria-label="Perseus Creative Studio — view the website"
        className="shrink-0"
      >
        <ImgClient
          src={PERSEUS_LOGO}
          alt="Perseus Creative Studio"
          width={26}
          height={30}
          className="rounded-none dark:invert"
        />
      </Link>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={pageLabel}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.18 }}
          className="min-w-0 truncate text-xs font-semibold uppercase tracking-[0.16em] text-foreground"
        >
          {pageLabel}
        </motion.span>
      </AnimatePresence>
    </div>
  );

  return (
    <>
      {/* Desktop rail — crisp frosted glass matching the dashboard cards/panels
          (glassSurface), full-bleed so its card rounding is dropped and only the
          right edge keeps a hairline; a specular rim lights its top edge. */}
      <aside
        className={cn(
          'sticky top-0 hidden h-svh w-64 shrink-0 flex-col lg:flex',
          glassSurface,
          'rounded-none border-y-0 border-l-0',
        )}
      >
        <GlassRim />
        <div className="flex h-16 items-center border-b border-white/60 px-5 dark:border-white/12">
          {brand()}
        </div>
        {nav()}
        {footer}
      </aside>

      {/* Mobile top bar. Stays put while the sheet is open — the hamburger morphs
          into an X and doubles as the close affordance, exactly as on the site. */}
      <header
        className={cn(
          'sticky top-0 z-30 flex h-14 items-center justify-between px-4 lg:hidden',
          glassSurface,
          'rounded-none border-x-0 border-t-0',
        )}
      >
        <GlassRim />
        {brand()}
        <HamburgerButton
          open={open}
          onToggle={() => setOpen((v) => !v)}
          controls={ADMIN_MENU_ID}
        />
      </header>

      {/* Mobile sheet. A sibling of the header on purpose: the header's
          `backdrop-blur` (a backdrop-filter) makes it the containing block for
          fixed-position descendants, which would collapse this full-height sheet
          into the bar's own 56px box. */}
      <AnimatePresence>
        {open && (
          <MobileSheet
            id={ADMIN_MENU_ID}
            label="Admin menu"
            onClose={() => setOpen(false)}
            className={cn(
              'top-14 z-40 lg:hidden',
              glassSurface,
              // No border of its own — the top bar's bottom hairline is already
              // the divider, and a second one right under it reads as a seam.
              'rounded-none border-0',
            )}
            footer={footer}
          >
            {/* nav() owns the scrolling (`flex-1 overflow-y-auto`); the
                data-lenis-prevent lives on this ancestor, which is where Lenis
                looks when it decides whether to swallow a wheel event. */}
            <div
              data-lenis-prevent
              className="absolute inset-0 flex flex-col overscroll-contain"
            >
              {nav(() => setOpen(false))}
            </div>
          </MobileSheet>
        )}
      </AnimatePresence>
    </>
  );
}
