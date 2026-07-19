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
  disabled = false,
  open,
  onOpenChange,
}: {
  label: string;
  children: React.ReactNode;
  /**
   * Keeps the trigger wiring mounted while never opening. Rail elements are
   * ALWAYS wrapped (disabled while expanded) — conditionally unwrapping would
   * change the element type at that tree position, remount the Link/Button,
   * and kill every collapse/expand transition on it mid-flight.
   */
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  // The Root is ALWAYS controlled: `disabled ? false : open` alone would flip
  // it controlled↔uncontrolled as the rail toggles (Radix warns, and a tip
  // that was open at the flip can resurrect from stale internal state). The
  // internal mirror stands in when no parent `open` is supplied, and resets
  // whenever the tip is disabled so nothing survives a flip.
  const [innerOpen, setInnerOpen] = useState(false);
  const [wasDisabled, setWasDisabled] = useState(disabled);
  if (wasDisabled !== disabled) {
    setWasDisabled(disabled);
    if (disabled && innerOpen) setInnerOpen(false);
  }
  return (
    <Tooltip.Root
      open={disabled ? false : (open ?? innerOpen)}
      onOpenChange={(next) => {
        if (!disabled) setInnerOpen(next);
        onOpenChange?.(next);
      }}
    >
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
  // Controlled so a flip (click or ⌘B) closes it — uncontrolled, Radix keeps
  // it open through the transition with its label swapping mid-flight.
  const [toggleTipOpen, setToggleTipOpen] = useState(false);

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
        setToggleTipOpen(false);
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
    // below (always-mounted choreographed label, constant accessible name
    // that folds the badge count in when the label text is hidden).
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

    // Rail rows keep ONE static layout in both states (px-3, gap-3, in-flow
    // label) so nothing re-justifies at the flip: the icon's residual 1.5px
    // drift eases on the wrapper margin, the always-mounted label fades and
    // hard-clips (no text-overflow — an ellipsis would flash mid-tween), and
    // the trailing badge sits out of flow so the narrowing row can't crush it.
    return (
      <RailTip key={href} disabled={!isCollapsed} label={accessibleName}>
        <Link
          href={href}
          onClick={onNavigate}
          aria-current={active ? 'page' : undefined}
          aria-label={accessibleName}
          className={cn(
            'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            active
              ? 'bg-foreground text-background'
              : cn('text-muted-foreground hover:text-foreground', glassRowHover),
          )}
        >
          <span
            className={cn(
              'relative flex shrink-0',
              'transition-[margin] duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] motion-reduce:transition-none',
              isCollapsed && 'ml-[1.5px]',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {/* Collapsed count: a mini-chip pinned to the icon's corner. It
                lives INSIDE the link, well within the 68px rail, so the aside's
                overflow-hidden can't clip it; aria-hidden because the count is
                already in the link's accessible name. Cross-fades against the
                trailing badge — out by 100ms, in from 150ms, never both. */}
            {n > 0 && (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute -right-2 -top-1.5 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-1 text-[0.5rem] font-semibold tabular-nums',
                  active ? 'bg-background/20 text-background' : glassChip,
                  'transition-opacity ease-out motion-reduce:transition-none',
                  isCollapsed
                    ? 'opacity-100 delay-150 duration-150'
                    : 'opacity-0 duration-100',
                )}
              >
                {n > 9 ? '9+' : n}
              </span>
            )}
          </span>
          <span
            className={cn(
              'min-w-0 overflow-hidden whitespace-nowrap',
              isCollapsed
                ? 'h-4 opacity-0 [transition:height_300ms_cubic-bezier(0.76,0,0.24,1),opacity_100ms_ease-out]'
                : 'h-5 opacity-100 [transition:height_300ms_cubic-bezier(0.76,0,0.24,1),opacity_200ms_ease-out_100ms]',
              'motion-reduce:[transition:none]',
            )}
          >
            {label}
          </span>
          {badge && n > 0 && (
            <span
              aria-hidden="true"
              className={cn(
                'absolute right-3 top-1/2 inline-flex h-5 min-w-5 -translate-y-1/2 items-center justify-center rounded-full px-1.5 text-[0.6rem] font-semibold tabular-nums',
                active ? 'bg-background/20 text-background' : glassChip,
                'transition-opacity ease-out motion-reduce:transition-none',
                isCollapsed
                  ? 'opacity-0 duration-100'
                  : 'opacity-100 delay-150 duration-150',
              )}
            >
              {n}
            </span>
          )}
        </Link>
      </RailTip>
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
        (rail ? (
          // The group label has no room at 68px — on the rail it cross-fades
          // against a centered hairline inside one height-animating wrapper
          // (the text stays mounted at opacity-0, so screen readers keep it).
          // The auto↔1px height tween needs interpolate-size (Chromium);
          // elsewhere the height snaps exactly as before, never overlaps.
          <div
            className={cn(
              'relative my-2 flex items-center overflow-hidden [interpolate-size:allow-keywords]',
              'transition-[height] duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] motion-reduce:transition-none',
              isCollapsed && 'h-px',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'absolute left-1/2 top-1/2 h-px w-6 -translate-x-1/2 -translate-y-1/2 bg-foreground/15',
                'transition-opacity ease-out motion-reduce:transition-none',
                isCollapsed
                  ? 'opacity-100 delay-150 duration-150'
                  : 'opacity-0 duration-100',
              )}
            />
            <span
              className={cn(
                'whitespace-nowrap px-3 text-[0.6rem] font-medium uppercase tracking-[0.18em] text-muted-foreground/70',
                'transition-opacity ease-out motion-reduce:transition-none',
                isCollapsed
                  ? 'opacity-0 duration-100'
                  : 'opacity-100 delay-100 duration-200',
              )}
            >
              Inbox
            </span>
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
  // The mobile sheet gets the pre-collapse markup verbatim (!rail); the rail
  // renders ONE morphing subtree so the avatar never remounts — text, chevron
  // and ThemeSwitcher fade-and-clip on the shared choreography and the
  // sign-out Button morphs full-width ↔ 34px icon square in place.
  const footer = (
    isCollapsed = false,
    onNavigate?: () => void,
    rail = false,
  ) => {
    if (!rail) {
      return (
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
    }
    return (
      <div className="border-t border-white/60 p-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] dark:border-white/12">
        <div className="flex items-center">
          <RailTip disabled={!isCollapsed} label={`Profile — ${name}`}>
            <Link
              href="/admin/profile"
              aria-label={`Profile — ${name}`}
              aria-current={profileActive ? 'page' : undefined}
              className={cn(
                'group flex min-w-0 flex-1 items-center gap-3 rounded-lg',
                // px 6→3.5 keeps the avatar gliding to dead center of the 67px
                // rail ((67−36)/2 = 15.5 = footer p-3 12 + 3.5); py 6→0 takes
                // the row from today's 48px card to the bare 36px avatar.
                isCollapsed
                  ? 'px-[3.5px] py-0'
                  : cn('px-1.5 py-1.5', glassRowHover),
                // After glassRowHover so this transition-property list wins the
                // tailwind-merge conflict with its transition-colors — hover
                // washes still animate (background-color/color are in the list).
                'transition-[padding,background-color,color] duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] motion-reduce:transition-none',
              )}
            >
              <span
                className={cn(
                  'inline-flex shrink-0 rounded-full',
                  // Collapsed, the row's box is wider than the avatar, so the
                  // hover ring hugs this span instead of the Link.
                  isCollapsed &&
                    'transition-shadow group-hover:ring-2 group-hover:ring-foreground/25',
                )}
              >
                <AdminAvatar
                  src={avatar?.src}
                  blur={avatar?.blur}
                  mark={avatar?.mark}
                  name={name}
                  size={36}
                />
              </span>
              <span
                className={cn(
                  'min-w-0 flex-1 transition-opacity ease-out motion-reduce:transition-none',
                  isCollapsed
                    ? 'opacity-0 duration-100'
                    : 'opacity-100 delay-100 duration-200',
                )}
              >
                <span className="block truncate text-sm font-medium text-foreground">
                  {name}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {email}
                </span>
              </span>
              {/* The "this row goes somewhere" signifier — the whole reason the
                  chip is discoverable as the Profile entry now that the nav row
                  is gone. Brightens and nudges on hover. */}
              <span
                className={cn(
                  'flex shrink-0 transition-opacity ease-out motion-reduce:transition-none',
                  isCollapsed
                    ? 'opacity-0 duration-100'
                    : 'opacity-100 delay-150 duration-150',
                )}
              >
                <LuChevronRight
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-muted-foreground/70 transition-[color,transform] duration-200 group-hover:translate-x-0.5 group-hover:text-foreground motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                />
              </span>
            </Link>
          </RailTip>
          {/* ThemeSwitcher's option tray renders inline beside the 34px pill,
              so this shroud is only allowed to clip while collapsed — at
              expanded rest the tray must escape it. ml-1.5 stands in for the
              row's old gap-1.5 so the phantom gap wipes away with the pill.
              `inert` while collapsed: opacity/max-width hide it visually but
              its trigger would otherwise stay in the tab order — an invisible
              focusable "Change theme" button the pre-choreography rail never
              had. */}
          <span
            inert={isCollapsed}
            className={cn(
              'flex shrink-0',
              isCollapsed
                ? 'ml-0 max-w-0 overflow-hidden opacity-0 [transition:max-width_300ms_cubic-bezier(0.76,0,0.24,1),margin_300ms_cubic-bezier(0.76,0,0.24,1),opacity_100ms_ease-out]'
                : 'ml-1.5 max-w-9 opacity-100 [transition:max-width_300ms_cubic-bezier(0.76,0,0.24,1),margin_300ms_cubic-bezier(0.76,0,0.24,1),opacity_150ms_ease-out_150ms]',
              'motion-reduce:[transition:none]',
            )}
          >
            <ThemeSwitcher direction="left" className="shrink-0" />
          </span>
        </div>
        <RailTip
          disabled={!isCollapsed}
          label={signingOut ? 'Signing out…' : 'Sign out'}
        >
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={signOut}
            disabled={signingOut}
            icon={LuLogOut}
            iconPosition="left"
            aria-label={signingOut ? 'Signing out…' : 'Sign out'}
            className={cn(
              // mx-auto in BOTH states: auto resolves to 0 under w-full, so the
              // expanded end state is untouched, while auto↔0 as a class flip
              // would snap (margin can't interpolate from the auto keyword —
              // kept as auto it re-resolves every frame of the width tween).
              'mx-auto mt-2 ease-[cubic-bezier(0.76,0,0.24,1)] motion-reduce:transition-none',
              isCollapsed ? 'w-[34px] px-2' : 'w-full',
            )}
          >
            <span
              className={cn(
                'overflow-hidden whitespace-nowrap',
                // -ml-2.5 cancels the Button's internal gap so the lone icon
                // sits dead-center in the 34px square.
                isCollapsed
                  ? '-ml-2.5 max-w-0 opacity-0 [transition:max-width_300ms_cubic-bezier(0.76,0,0.24,1),margin_300ms_cubic-bezier(0.76,0,0.24,1),opacity_100ms_ease-out]'
                  : 'ml-0 max-w-24 opacity-100 [transition:max-width_300ms_cubic-bezier(0.76,0,0.24,1),margin_300ms_cubic-bezier(0.76,0,0.24,1),opacity_200ms_ease-out_100ms]',
                'motion-reduce:[transition:none]',
              )}
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </span>
          </Button>
        </RailTip>
      </div>
    );
  };

  // The mark links back out to the site; the label beside it names the page and
  // swaps as you navigate. Deliberately chrome-scaled (small, tracked caps) so it
  // reads as a location breadcrumb rather than competing with the page's own h1.
  // Mobile top bar only — the desktop rail header builds its own choreographed
  // version of this block inline in the aside.
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

  const toggleButton = (
    <Button
      type="button"
      variant="secondary"
      size="small"
      icon={collapsed ? LuPanelLeft : LuPanelLeftClose}
      iconPosition="left"
      onClick={() => {
        setToggleTipOpen(false);
        setCollapsed((v) => !v);
      }}
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
          Collapses to a 68px icon rail. The width tween and every piece of
          content choreography share one 300ms curve; text fades out in the
          first 100ms and back in from 100–150ms so nothing pops mid-flight. */}
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
            <body> and swallow the aria-expanded announcement. Row↔column
            can't interpolate, so the header is a positioning context and the
            two blocks glide between absolutely-positioned end states
            (expanded: brand left / toggle right in the h-16 row; collapsed:
            logo above toggle, centered in the h-28 column — side by side
            they'd crush each other at 68px). Offsets derive from the toggle's
            34px box (Button size="small" + px-2 + borders) and the 26×30
            logo: column block = 30 + gap 12 + 34 = 76, inset (112−76)/2 = 18
            → logo top = 50%−38px, toggle top = 50%+4px. */}
        <div
          className={cn(
            'relative border-b border-white/60 dark:border-white/12',
            'transition-[height] duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] motion-reduce:transition-none',
            collapsed ? 'h-28' : 'h-16',
          )}
        >
          <div
            className={cn(
              'absolute flex min-w-0 items-center',
              'transition-[left,top,translate] duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] motion-reduce:transition-none',
              collapsed
                ? 'left-1/2 top-[calc(50%_-_38px)] -translate-x-1/2 translate-y-0'
                : 'left-5 top-1/2 translate-x-0 -translate-y-1/2',
            )}
          >
            <Link
              href="/"
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
            {/* The wordmark reveals under its own clipped edge (max-width
                wipe) and is gone within 100ms of a collapse, so the in-flight
                toggle can never cross visible text; the page-change crossfade
                inside is untouched. ml-2.5 stands in for the old gap-2.5 so
                the collapsed brand box is exactly the 26px logo and left-1/2
                truly centers it. aria-hidden while collapsed restores the old
                semantics — the unmounted label was silent, opacity-0 isn't. */}
            <span
              aria-hidden={collapsed}
              className={cn(
                'min-w-0 overflow-hidden whitespace-nowrap',
                collapsed
                  ? 'ml-0 max-w-0 opacity-0 [transition:max-width_300ms_cubic-bezier(0.76,0,0.24,1),margin_300ms_cubic-bezier(0.76,0,0.24,1),opacity_100ms_ease-out]'
                  : 'ml-2.5 max-w-36 opacity-100 [transition:max-width_300ms_cubic-bezier(0.76,0,0.24,1),margin_300ms_cubic-bezier(0.76,0,0.24,1),opacity_200ms_ease-out_100ms]',
                'motion-reduce:[transition:none]',
              )}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={pageLabel}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.18 }}
                  className="block text-xs font-semibold uppercase tracking-[0.16em] text-foreground"
                >
                  {pageLabel}
                </motion.span>
              </AnimatePresence>
            </span>
          </div>
          <div
            className={cn(
              'absolute z-10',
              'transition-[left,top,translate] duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] motion-reduce:transition-none',
              collapsed
                ? 'left-1/2 top-[calc(50%_+_4px)] -translate-x-1/2 translate-y-0'
                : 'left-[calc(100%_-_1.25rem)] top-1/2 -translate-x-full -translate-y-1/2',
            )}
          >
            <RailTip
              label={collapsed ? 'Expand sidebar (⌘B)' : 'Collapse sidebar (⌘B)'}
              open={toggleTipOpen}
              onOpenChange={setToggleTipOpen}
            >
              {toggleButton}
            </RailTip>
          </div>
        </div>
        {nav({ rail: true, collapsed })}
        {footer(collapsed, undefined, true)}
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
