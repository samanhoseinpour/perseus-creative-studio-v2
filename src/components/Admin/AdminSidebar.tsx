'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  LuChevronRight,
  LuLogOut,
  LuPanelLeft,
  LuPanelLeftClose,
  LuSearch,
} from 'react-icons/lu';
import { Tooltip } from 'radix-ui';

import Button from '@/components/Button';
import HamburgerButton from '@/components/HamburgerButton';
import ImgClient from '@/components/ImgClient';
import MobileSheet from '@/components/MobileSheet';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import AdminAvatar from '@/components/Admin/AdminAvatar';
import CountBadge from '@/components/Admin/CountBadge';
import AdminBottomBar from '@/components/Admin/AdminBottomBar';
import {
  glassSurface,
  glassCard,
  glassChip,
  glassField,
  glassRowHover,
  GlassRim,
} from '@/components/Admin/Glass';
import Kbd from '@/components/Admin/Kbd';
import { openAdminSearch } from '@/lib/adminSearch';
import { RELEASES_SEEN_EVENT } from '@/lib/releaseFields';
import { authClient } from '@/lib/auth-client';
import {
  ADMIN_NAV_GROUPS,
  ADMIN_NAV_TOP,
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

/**
 * A rail section heading ("Work", "Inbox", …). The label has no room at 68px, so
 * on the rail it cross-fades against a centered hairline inside ONE
 * height-animating wrapper — the text stays mounted at opacity-0, so screen
 * readers keep the section names when the rail is collapsed. The auto↔1px height
 * tween needs interpolate-size (Chromium); elsewhere the height snaps exactly as
 * it did before, and the two states never overlap.
 *
 * Typography is shared by both branches via HEADING_TYPE so the mobile sheet and
 * the rail can't drift. It is deliberately NOT smaller than 11px: at the old
 * 0.6rem/0.18em the tracked caps disintegrated (WEBSITE read as "WEBSIIE"), and
 * dropping the /70 on an already-muted token is what makes them legible at all.
 * Margins are asymmetric on purpose — a heading owns the group BELOW it, so the
 * air goes above; symmetric margins made the list read as one undifferentiated
 * run with noise wedged between the rows.
 *
 * `shrink-0` is load-bearing, not tidiness. The nav is a column flex container
 * whose content overflows once the viewer sees enough rows, and a flex item
 * whose overflow isn't `visible` has min-height:0 — so these wrappers were the
 * only shrinkable children and silently absorbed the whole overflow, crushing
 * a 16px label to ~1px behind its own overflow-hidden while the nav's
 * overflow-y-auto never got to scroll. The rows themselves are safe (overflow
 * visible ⇒ automatic minimum size), which is why only the headings sheared.
 */
const HEADING_TYPE =
  'text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground';
function GroupHeading({
  label,
  rail,
  collapsed,
}: {
  label: string;
  rail: boolean;
  collapsed: boolean;
}) {
  if (!rail) {
    return (
      <span className={cn('mb-1 mt-4 shrink-0 px-3', HEADING_TYPE)}>
        {label}
      </span>
    );
  }
  return (
    <div
      className={cn(
        'relative mb-1 mt-4 flex shrink-0 items-center overflow-hidden [interpolate-size:allow-keywords]',
        'transition-[height] duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] motion-reduce:transition-none',
        collapsed && 'h-px',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute left-1/2 top-1/2 h-px w-6 -translate-x-1/2 -translate-y-1/2 bg-foreground/15',
          'transition-opacity ease-out motion-reduce:transition-none',
          collapsed
            ? 'opacity-100 delay-150 duration-150'
            : 'opacity-0 duration-100',
        )}
      />
      <span
        className={cn(
          'whitespace-nowrap px-3',
          HEADING_TYPE,
          'transition-opacity ease-out motion-reduce:transition-none',
          collapsed
            ? 'opacity-0 duration-100'
            : 'opacity-100 delay-100 duration-200',
        )}
      >
        {label}
      </span>
    </div>
  );
}


/**
 * The identity block's avatar, carrying the unseen-updates dot.
 *
 * The dot goes on the AVATAR because that is the only element present in all
 * three states of the identity block — mobile sheet, rail expanded, rail
 * collapsed. The chevron animates to opacity-0 when collapsed and the name and
 * email clip away entirely, so a dot hung on either vanishes on a 68px rail.
 * It is absolutely positioned, so it contributes no layout and cannot disturb
 * the px-[3.5px] centring the collapsed rail's choreography depends on.
 *
 * INK, never a hue. The admin theme carries no chroma (`--primary` is a
 * zero-chroma oklch) and a rose or blue notification dot would be the first
 * colour in the entire dashboard. `aria-hidden` because the count already
 * rides the Link's accessible name.
 *
 * Note this is only ever rendered as the FIRST child of its Link in both
 * branches — the element type at that tree position is unchanged from the bare
 * <span> it replaces, so the collapse transitions do not remount.
 */
function IdentityAvatar({
  avatar,
  name,
  unseen,
  ringClass,
}: {
  avatar: { src: string; blur?: string; mark?: boolean } | null;
  name: string;
  unseen: number;
  ringClass?: string;
}) {
  return (
    <span
      className={cn('relative inline-flex shrink-0 rounded-full', ringClass)}
    >
      <AdminAvatar
        src={avatar?.src}
        blur={avatar?.blur}
        mark={avatar?.mark}
        name={name}
        size={36}
      />
      {/* A real badge with the NUMBER on it, pinned to the avatar's corner.
          Absolutely positioned, so it adds no layout and cannot disturb the
          px-[3.5px] centring the collapsed rail depends on. */}
      <CountBadge count={unseen} className="absolute -top-1 -right-1" />
    </span>
  );
}

type AdminSidebarProps = {
  name: string;
  email: string;
  avatar: { src: string; blur?: string; mark?: boolean } | null;
  // `ticket` is the all-open tally for superadmins and the viewer's OWN open
  // count for members holding the tickets area; 0 without it, which hides the
  // badge. Inbox counts are zeroed per missing area the same way.
  counts?: { project: number; career: number; ticket?: number; task?: number };
  /** Layout-computed access profile — decides which nav items this viewer sees. */
  access: NavAccess;
  /** Server-read collapse preference (COLLAPSE_COOKIE) so SSR paints the right rail width. */
  defaultCollapsed?: boolean;
  /**
   * Unseen release entries for this viewer, already area-filtered server-side.
   * 0 hides the dot. A count rather than a boolean only so the identity link's
   * accessible name can say how many — the dot itself never renders a number.
   *
   * Deliberately NOT folded into `counts`: that map is AdminNavCountKey, for
   * badges on nav ROWS, and Profile has no nav row — the identity block at the
   * bottom is its entry point.
   */
  unseenUpdates?: number;
};

export default function AdminSidebar({
  name,
  email,
  avatar,
  counts,
  access,
  defaultCollapsed = false,
  unseenUpdates = 0,
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

  // The notice dialog clears the dot through a window event rather than
  // revalidating the admin layout, which would cost roughly ten Neon round
  // trips for a render we already have (see markReleasesSeen). The two are
  // sibling islands with no shared client parent — the same situation the ⌘K
  // palette's open event solves.
  //
  // Mirrored DURING RENDER rather than in an effect (the `wasDisabled` pattern
  // in RailTip above): a fresh nonzero count arriving from the server after the
  // next release must re-light the dot, and an effect would do it a paint late.
  const [seenLocally, setSeenLocally] = useState(false);
  const [lastUnseen, setLastUnseen] = useState(unseenUpdates);
  if (lastUnseen !== unseenUpdates) {
    setLastUnseen(unseenUpdates);
    setSeenLocally(false);
  }
  useEffect(() => {
    const clear = () => setSeenLocally(true);
    window.addEventListener(RELEASES_SEEN_EVENT, clear);
    return () => window.removeEventListener(RELEASES_SEEN_EVENT, clear);
  }, []);
  const unseen = seenLocally ? 0 : unseenUpdates;

  // Computed ONCE, above footer(), so the two branches and the rail tooltip
  // can't drift — the `accessibleName` precedent on the nav rows.
  const profileLabel =
    unseen > 0
      ? `Profile — ${name} — ${unseen} new update${unseen === 1 ? '' : 's'}`
      : `Profile — ${name}`;

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
            // Glass active, not the inverted pill (that stark block read as
            // damage between the rail's frosted elements): the ⌘K palette's
            // active-row wash a step stronger than glassRowHover, plus the ink
            // tick on the left as the landmark. NO outline of any kind — the
            // hairline inset ring this used to carry read as a drawn border
            // around the row (Saman, 2026-08-20). The wash and the tick are
            // the whole active state. The mobile sheet keeps its full-width
            // pill — a roomy list wears it fine; a 68px rail doesn't.
            active
              ? 'bg-white/70 text-foreground dark:bg-white/15'
              : cn('text-muted-foreground hover:text-foreground', glassRowHover),
          )}
        >
          {active && (
            <span
              aria-hidden="true"
              className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-foreground"
            />
          )}
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
                  // glassChip in BOTH states — the glass active wash keeps
                  // foreground ink, so the old inverted chip has no contrast
                  // to earn anymore.
                  glassChip,
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
                glassChip,
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

  const topItems = ADMIN_NAV_TOP.filter((item) => canSeeNavItem(item, access));
  const groups = ADMIN_NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.items.filter((item) => canSeeNavItem(item, access)),
  })).filter((group) => group.items.length > 0);

  // The visible door to the ⌘K palette — a field-look row above the nav so
  // search is discoverable without knowing the chord. It reaches the palette
  // (a sibling client island) through openAdminSearch()'s window event, never
  // by importing it. The rail branch copies renderLink's one-static-layout
  // choreography: the always-mounted label fades and clips, the Kbd hint sits
  // out of flow like the trailing badges, and RailTip names the collapsed
  // square. glassField (not a bare row wash) so it reads as "type here" — but
  // the border/wash FADE OUT on the collapsed rail, where a lone boxed icon
  // among borderless rows read as damage: collapsed, this is just another
  // icon row (h-8 keeps the rail's added height to one compact row).
  const searchRow = (opts: {
    onNavigate?: () => void;
    rail?: boolean;
    collapsed?: boolean;
  }) => {
    const { onNavigate, rail = false, collapsed: isCollapsed = false } = opts;
    const button = (
      <button
        type="button"
        aria-label="Search"
        aria-keyshortcuts="Meta+K"
        onClick={() => {
          // Close the mobile sheet first so it isn't left open under the
          // palette when the hit navigates.
          onNavigate?.();
          openAdminSearch();
        }}
        className={cn(
          'relative flex w-full shrink-0 items-center gap-3 rounded-lg px-3 text-sm font-medium',
          rail ? 'h-8' : 'h-9',
          glassField,
          glassRowHover,
          // After glassField so tailwind-merge lets these win: the muted
          // resting ink beats the field skin's text-foreground (this row is a
          // prompt, not a typed value), and the field dissolves into a plain
          // icon row while the rail is collapsed.
          'text-muted-foreground transition-colors hover:text-foreground',
          rail && isCollapsed && 'border-transparent bg-transparent',
        )}
      >
        <span
          className={cn(
            'flex shrink-0',
            rail &&
              'transition-[margin] duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] motion-reduce:transition-none',
            rail && isCollapsed && 'ml-[1.5px]',
          )}
        >
          <LuSearch className="h-4 w-4 shrink-0" aria-hidden="true" />
        </span>
        <span
          className={cn(
            'min-w-0 flex-1 overflow-hidden whitespace-nowrap text-left',
            rail &&
              (isCollapsed
                ? 'h-4 opacity-0 [transition:height_300ms_cubic-bezier(0.76,0,0.24,1),opacity_100ms_ease-out]'
                : 'h-5 opacity-100 [transition:height_300ms_cubic-bezier(0.76,0,0.24,1),opacity_200ms_ease-out_100ms]'),
            rail && 'motion-reduce:[transition:none]',
          )}
        >
          Search
        </span>
        {rail && (
          <span
            aria-hidden="true"
            className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2',
              'transition-opacity ease-out motion-reduce:transition-none',
              isCollapsed
                ? 'opacity-0 duration-100'
                : 'opacity-100 delay-150 duration-150',
            )}
          >
            <Kbd>⌘K</Kbd>
          </span>
        )}
      </button>
    );
    if (!rail) return button;
    return (
      <RailTip disabled={!isCollapsed} label="Search (⌘K)">
        {button}
      </RailTip>
    );
  };

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
      className="scrollbar-slim flex flex-1 flex-col gap-1 overflow-y-auto overscroll-contain p-3"
    >
      {searchRow({ onNavigate, rail, collapsed: isCollapsed })}

      {topItems.map((item) =>
        renderLink(item, { onNavigate, rail, collapsed: isCollapsed }),
      )}

      {groups.map((group) => (
        <Fragment key={group.label}>
          <GroupHeading
            label={group.label}
            rail={rail}
            collapsed={isCollapsed}
          />
          {group.items.map((item) =>
            renderLink(item, { onNavigate, rail, collapsed: isCollapsed }),
          )}
        </Fragment>
      ))}
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
              aria-label={profileLabel}
              aria-current={profileActive ? 'page' : undefined}
              className={cn(
                'group flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1.5 py-1.5',
                glassRowHover,
              )}
            >
              <IdentityAvatar avatar={avatar} name={name} unseen={unseen} />
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
          <RailTip disabled={!isCollapsed} label={profileLabel}>
            <Link
              href="/admin/profile"
              aria-label={profileLabel}
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
              <IdentityAvatar
                avatar={avatar}
                name={name}
                unseen={unseen}
                // Collapsed, the row's box is wider than the avatar, so the
                // hover ring hugs this span instead of the Link.
                ringClass={
                  isCollapsed
                    ? 'transition-shadow group-hover:ring-2 group-hover:ring-foreground/25'
                    : undefined
                }
              />
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

  // The mark goes to Overview, NOT to the public site: /admin is its own
  // installable app (public/dashboard.webmanifest, scope "/admin"), so a link to
  // '/' here would eject a member out of the app into a browser tab on a
  // mis-tap. Going out is still offered explicitly on Overview. The label beside
  // it names the page and
  // swaps as you navigate. Deliberately chrome-scaled (small, tracked caps) so it
  // reads as a location breadcrumb rather than competing with the page's own h1.
  // Mobile top bar only — the desktop rail header builds its own choreographed
  // version of this block inline in the aside.
  const brand = (onClose?: () => void) => (
    <div className="flex min-w-0 items-center gap-2.5">
      <Link
        href="/admin"
        onClick={onClose}
        aria-label="Perseus Creative Studio — dashboard home"
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
              href="/admin"
              aria-label="Perseus Creative Studio — dashboard home"
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
          // The height carries the top safe-area inset ON TOP of its 56px bar,
          // and pads the content down past it. In a browser tab the inset is 0
          // and this is byte-identical to h-14; in the INSTALLED dashboard app
          // there is no browser chrome, so the inset is real (~47-59px on a
          // notched iPhone) and without this the mark, page label and hamburger
          // sit under the status bar / Dynamic Island. The root layout's
          // viewportFit: 'cover' is what makes env() resolve at all.
          // MobileSheet's 'top' below must move with this — they are siblings on
          // purpose (see the note there), so neither derives its offset.
          'sticky top-0 z-30 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between px-4 pt-[env(safe-area-inset-top)] lg:hidden',
          glassSurface,
          'rounded-none border-x-0 border-t-0',
        )}
      >
        <GlassRim />
        {brand()}
        <div className="flex shrink-0 items-center gap-1">
          <HamburgerButton
            open={open}
            onToggle={() => setOpen((v) => !v)}
            controls={ADMIN_MENU_ID}
          />
        </div>
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
              // Kept in lockstep with the top bar's height above.
              'top-[calc(3.5rem+env(safe-area-inset-top))] z-40 lg:hidden',
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

      {/* Mobile bottom bar — the everyday quick nav (the sheet stays the full
          grouped map). A sibling of the header for the same containing-block
          reason as the sheet; z-30 keeps it under the sheet's z-40, and
          `inert` while the sheet is open fades it and pulls its tabs from the
          tab order — the recipe the top bar's search glyph used before search
          moved down here. Flattening the filtered structures keeps registry
          order and excludes Profile by construction (footer parity). */}
      <AdminBottomBar
        items={[...topItems, ...groups.flatMap((group) => group.items)]}
        counts={counts}
        inert={open}
      />
    </Tooltip.Provider>
  );
}
