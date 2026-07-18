'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  LuChevronRight,
  LuLogOut,
  LuPanelLeft,
  LuPanelLeftClose,
} from 'react-icons/lu';
import { Tooltip } from 'radix-ui';

import Button from '@/components/Button';
import HamburgerButton from '@/components/HamburgerButton';
import ImgClient from '@/components/ImgClient';
import MobileSheet from '@/components/MobileSheet';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import AdminAvatar from '@/components/Admin/AdminAvatar';
import {
  glassSurface,
  glassCard,
  glassChip,
  glassRowHover,
  GlassRim,
} from '@/components/Admin/Glass';
import { authClient } from '@/lib/auth-client';
import {
  ADMIN_NAV,
  ADMIN_INBOX,
  adminRouteLabel,
  canSeeNavItem,
  isAdminRouteActive,
  type AdminNavItem,
  type NavAccess,
} from '@/lib/adminNav';
import { cn } from '@/lib/utils';
import { PERSEUS_LOGO } from '@/constants';

/** Ties the mobile top bar's hamburger `aria-controls` to the sheet it opens. */
const ADMIN_MENU_ID = 'admin-menu';

/** Ties the collapse toggle's `aria-controls` to the desktop rail. */
const SIDEBAR_ID = 'admin-sidebar';

/**
 * Mirrors the rail's collapse state for the protected layout's server read, so
 * a full load paints the correct rail width with no flash. Scoped to /admin —
 * it's a dashboard preference, not a site cookie.
 */
const COLLAPSE_COOKIE = 'perseus.admin-sidebar';

/**
 * Icon-rail tooltip. Portals to <body> because the aside's glassSurface
 * (overflow-hidden + backdrop-blur) both clips anything poking past the rail
 * edge and becomes the containing block for fixed descendants — the same
 * gotcha the MobileSheet comment below documents. The trigger child must
 * accept a ref (Button forwards one; next/link does natively — which is why
 * the footer avatar's host is its profile Link, AdminAvatar itself doesn't).
 */
function RailTip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          sideOffset={12}
          className={cn(
            glassCard,
            'z-50 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground',
            'data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95',
          )}
        >
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

type AdminSidebarProps = {
  name: string;
  email: string;
  avatar: { src: string; blur?: string; mark?: boolean } | null;
  // `ticket` is the all-open tally — 0 for members (the layout only queries it
  // for superadmins), which hides the badge; inbox counts are zeroed per
  // missing area the same way.
  counts?: { project: number; career: number; ticket?: number };
  /** Layout-computed access profile — decides which nav items this viewer sees. */
  access: NavAccess;
  /** Server-read collapse preference (COLLAPSE_COOKIE) so SSR paints the right rail width. */
  defaultCollapsed?: boolean;
};

export default function AdminSidebar({
  name,
  email,
  avatar,
  counts,
  access,
  defaultCollapsed = false,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const pageLabel = adminRouteLabel(pathname);
  // Profile has no rail row — the identity footer is its entry point, so it
  // carries the active state a nav link would otherwise show.
  const profileActive = isAdminRouteActive('/admin/profile', pathname);

  // State is the source of truth; the cookie mirrors it so the server layout
  // renders the correct rail width on the next full load. The mount-time
  // rewrite of the same value is harmless — it just refreshes the 1-year TTL.
  useEffect(() => {
    document.cookie = `${COLLAPSE_COOKIE}=${collapsed ? 'collapsed' : 'expanded'}; path=/admin; max-age=31536000; samesite=lax`;
  }, [collapsed]);

  // ⌘B / Ctrl+B toggles the rail — the palette's ⌘K convention (modifier
  // combos fire from inputs too, so no focus guard is needed). Shift/Alt are
  // excluded so Ctrl+Shift+B (Chromium's bookmarks bar) still reaches the
  // browser, and `repeat` so a held chord can't strobe the width transition.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        !e.altKey &&
        (e.key === 'b' || e.key === 'B')
      ) {
        if (e.repeat) return;
        // The rail only exists at lg+; below that the toggle would silently
        // flip the cookie with nothing on screen to show for it.
        if (!window.matchMedia('(min-width: 64rem)').matches) return;
        e.preventDefault();
        setCollapsed((v) => !v);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  async function signOut() {
    setSigningOut(true);
    await authClient.signOut();
    router.push('/admin/login');
    router.refresh();
  }

  const renderLink = (
    { label, href, icon: Icon, badge }: AdminNavItem,
    opts: { onNavigate?: () => void; rail?: boolean; collapsed?: boolean } = {},
  ) => {
    const { onNavigate, rail = false, collapsed: isCollapsed = false } = opts;
    const active = isAdminRouteActive(href, pathname);
    const n = badge ? (counts?.[badge] ?? 0) : 0;

    // The mobile sheet keeps the pre-collapse markup untouched: no aria-label
    // override, bare wrapping label. Only the desktop rail gets the additions
    // below (truncate against mid-transition wrapping, constant accessible
    // name that folds the badge count in when the label text is hidden).
    if (!rail) {
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
              : cn(
                  'text-muted-foreground hover:text-foreground',
                  glassRowHover,
                ),
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
    }

    const accessibleName = n > 0 ? `${label} — ${n} new` : label;

    const link = (
      <Link
        key={href}
        href={href}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        aria-label={accessibleName}
        className={cn(
          'flex items-center rounded-lg py-2 text-sm font-medium transition-colors',
          isCollapsed ? 'justify-center px-0' : 'justify-between gap-3 px-3',
          active
            ? 'bg-foreground text-background'
            : cn('text-muted-foreground hover:text-foreground', glassRowHover),
        )}
      >
        <span
          className={cn(
            'flex min-w-0 items-center',
            isCollapsed ? 'relative' : 'gap-3',
          )}
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {!isCollapsed && <span className="truncate">{label}</span>}
          {/* Collapsed count: a mini-chip pinned to the icon's corner. It
              lives INSIDE the link, well within the 68px rail, so the aside's
              overflow-hidden can't clip it; aria-hidden because the count is
              already in the link's accessible name. */}
          {isCollapsed && n > 0 && (
            <span
              aria-hidden="true"
              className={cn(
                'absolute -right-2 -top-1.5 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-1 text-[0.5rem] font-semibold tabular-nums',
                active ? 'bg-background/20 text-background' : glassChip,
              )}
            >
              {n > 9 ? '9+' : n}
            </span>
          )}
        </span>
        {!isCollapsed && badge && n > 0 && (
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

    return isCollapsed ? (
      <RailTip key={href} label={accessibleName}>
        {link}
      </RailTip>
    ) : (
      link
    );
  };

  const visibleNav = ADMIN_NAV.filter((item) => canSeeNavItem(item, access));
  const visibleInbox = ADMIN_INBOX.filter((item) =>
    canSeeNavItem(item, access),
  );

  const nav = ({
    onNavigate,
    rail = false,
    collapsed: isCollapsed = false,
  }: {
    onNavigate?: () => void;
    rail?: boolean;
    collapsed?: boolean;
  } = {}) => (
    <nav
      data-lenis-prevent
      className="flex flex-1 flex-col gap-1 overflow-y-auto overscroll-contain p-3"
    >
      {visibleNav.map((item) =>
        renderLink(item, { onNavigate, rail, collapsed: isCollapsed }),
      )}

      {visibleInbox.length > 0 &&
        (isCollapsed ? (
          // The group label has no room at 68px — a hairline keeps the visual
          // break, the sr-only text keeps it for screen readers.
          <div className="my-2 flex items-center justify-center">
            <span aria-hidden="true" className="h-px w-6 bg-foreground/15" />
            <span className="sr-only">Inbox</span>
          </div>
        ) : (
          <span className="my-2 px-3 text-[0.6rem] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
            Inbox
          </span>
        ))}
      {visibleInbox.map((item) =>
        renderLink(item, { onNavigate, rail, collapsed: isCollapsed }),
      )}
    </nav>
  );

  // The identity block IS the way to Profile (it has no rail row) — the
  // Notion/Linear pattern: nav rows are work surfaces, the chip at the bottom
  // is the account entry point. `onNavigate` lets the mobile sheet close on tap.
  const footer = (isCollapsed = false, onNavigate?: () => void) =>
    isCollapsed ? (
      <div className="flex flex-col items-center gap-2 border-t border-white/60 p-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] dark:border-white/12">
        <RailTip label={`Profile — ${name}`}>
          <Link
            href="/admin/profile"
            aria-label={`Profile — ${name}`}
            aria-current={profileActive ? 'page' : undefined}
            className={cn(
              'inline-flex rounded-full transition-shadow hover:ring-2 hover:ring-foreground/25',
            )}
          >
            <AdminAvatar
              src={avatar?.src}
              blur={avatar?.blur}
              mark={avatar?.mark}
              name={name}
              size={36}
            />
          </Link>
        </RailTip>
        {/* ThemeSwitcher is expanded-only: its option tray renders inline
            (absolutely positioned beside the 32px trigger), and the 68px
            rail's overflow-hidden clips it in either direction. Theme stays
            one step away — ⌘K "Toggle theme", or expand the rail. */}
        <RailTip label={signingOut ? 'Signing out…' : 'Sign out'}>
          <Button
            type="button"
            variant="secondary"
            size="small"
            icon={LuLogOut}
            iconPosition="left"
            onClick={signOut}
            disabled={signingOut}
            className="px-2"
          >
            <span className="sr-only">
              {signingOut ? 'Signing out…' : 'Sign out'}
            </span>
          </Button>
        </RailTip>
      </div>
    ) : (
      <div className="border-t border-white/60 p-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] dark:border-white/12">
        <div className="flex items-center gap-1.5">
          {/* ThemeSwitcher stays a sibling — interactive controls can't nest
              inside a link. Deliberately NO visual active state (Saman: any
              highlight on a 52px identity block reads as a glaring pill) —
              aria-current alone carries "you are here" for screen readers. */}
          <Link
            href="/admin/profile"
            onClick={onNavigate}
            aria-label={`Profile — ${name}`}
            aria-current={profileActive ? 'page' : undefined}
            className={cn(
              'group flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1.5 py-1.5',
              glassRowHover,
            )}
          >
            <AdminAvatar
              src={avatar?.src}
              blur={avatar?.blur}
              mark={avatar?.mark}
              name={name}
              size={36}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">
                {name}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {email}
              </span>
            </span>
            {/* The "this row goes somewhere" signifier — the whole reason the
                chip is discoverable as the Profile entry now that the nav row
                is gone. Always visible; brightens and nudges on hover. */}
            <LuChevronRight
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-muted-foreground/70 transition-[color,transform] duration-200 group-hover:translate-x-0.5 group-hover:text-foreground motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
            />
          </Link>
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
  // Collapsed, only the mark survives — the rail is too narrow for the label.
  const brand = (onClose?: () => void, isCollapsed = false) => (
    <div
      className={cn(
        'flex min-w-0 items-center',
        isCollapsed ? 'justify-center' : 'gap-2.5',
      )}
    >
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
      {!isCollapsed && (
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
      )}
    </div>
  );

  const toggleButton = (
    <Button
      type="button"
      variant="secondary"
      size="small"
      icon={collapsed ? LuPanelLeft : LuPanelLeftClose}
      iconPosition="left"
      onClick={() => setCollapsed((v) => !v)}
      aria-expanded={!collapsed}
      aria-controls={SIDEBAR_ID}
      aria-keyshortcuts="Meta+B"
      className="shrink-0 px-2"
    >
      <span className="sr-only">
        {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      </span>
    </Button>
  );

  return (
    <Tooltip.Provider delayDuration={200} skipDelayDuration={500}>
      {/* Desktop rail — crisp frosted glass matching the dashboard cards/panels
          (glassSurface), full-bleed so its card rounding is dropped and only the
          right edge keeps a hairline; a specular rim lights its top edge.
          Collapses to a 68px icon rail; glassSurface's overflow-hidden clips
          the outgoing labels cleanly mid-transition. */}
      <aside
        id={SIDEBAR_ID}
        className={cn(
          'sticky top-0 hidden h-svh shrink-0 flex-col lg:flex',
          collapsed ? 'w-17' : 'w-64',
          'transition-[width] duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] motion-reduce:transition-none',
          glassSurface,
          'rounded-none border-y-0 border-l-0',
        )}
      >
        <GlassRim />
        {/* Brand and toggle keep their exact tree positions across the flip —
            remounting the button elsewhere would drop keyboard focus to
            <body> and swallow the aria-expanded announcement. Collapsed, the
            row becomes a column (logo above toggle — side by side they crush
            each other at 68px), and the height animates between the two fixed
            rows in the same curve as the rail width so nothing below lurches. */}
        <div
          className={cn(
            'flex items-center border-b border-white/60 dark:border-white/12',
            'transition-[height] duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] motion-reduce:transition-none',
            collapsed
              ? 'h-28 flex-col justify-center gap-3'
              : 'h-16 justify-between px-5',
          )}
        >
          {brand(undefined, collapsed)}
          <RailTip
            label={collapsed ? 'Expand sidebar (⌘B)' : 'Collapse sidebar (⌘B)'}
          >
            {toggleButton}
          </RailTip>
        </div>
        {nav({ rail: true, collapsed })}
        {footer(collapsed)}
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
            footer={footer(false, () => setOpen(false))}
          >
            {/* nav() owns the scrolling (`flex-1 overflow-y-auto`); the
                data-lenis-prevent lives on this ancestor, which is where Lenis
                looks when it decides whether to swallow a wheel event. */}
            <div
              data-lenis-prevent
              className="absolute inset-0 flex flex-col overscroll-contain"
            >
              {nav({ onNavigate: () => setOpen(false) })}
            </div>
          </MobileSheet>
        )}
      </AnimatePresence>
    </Tooltip.Provider>
  );
}
