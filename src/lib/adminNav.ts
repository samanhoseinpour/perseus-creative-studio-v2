import type { IconType } from 'react-icons';
import {
  LuLayoutDashboard,
  LuUserRound,
  LuUsersRound,
  LuInbox,
  LuBriefcaseBusiness,
  LuBug,
  LuThumbsUp,
} from 'react-icons/lu';

import type { AdminArea } from '@/lib/adminAreas';

/**
 * The one map of the `/admin` route tree — labels, hrefs, icons, and which
 * inbox counter badges a route. Consumed by the sidebar rail, the mobile sheet,
 * the ⌘K palette, and the sidebar's per-page title, so a new admin page is added
 * in exactly one place.
 */

/**
 * Which live tally a nav item badges, if any. `project`/`career` come from
 * `getNewSubmissionCounts()`; `ticket` is the open-ticket count from
 * `getTicketStatusCounts()`, populated by the protected layout only for
 * superadmins (members with the tickets area badge their own open count).
 */
export type AdminNavCountKey = 'project' | 'career' | 'ticket';

export type AdminNavItem = {
  label: string;
  href: string;
  icon: IconType;
  badge?: AdminNavCountKey;
  /**
   * Superadmin-only surface (Users). Hiding here is cosmetic — the page itself
   * must also gate with `requireSuperadmin()` from src/lib/adminAccess.ts.
   */
  superadmin?: true;
  /**
   * Requires this grantable area (src/lib/adminAreas.ts). Cosmetic, same as
   * above — the page gates with `requireArea()`. Items with neither flag
   * (Overview, Profile) are visible to every signed-in admin.
   */
  area?: AdminArea;
};

/** The per-viewer access shape the protected layout threads into the chrome. */
export type NavAccess = { superadmin: boolean; areas: AdminArea[] };

/** Whether one viewer's chrome should show a nav item. */
export function canSeeNavItem(item: AdminNavItem, access: NavAccess): boolean {
  if (item.superadmin) return access.superadmin;
  if (item.area) return access.superadmin || access.areas.includes(item.area);
  return true;
}

const OVERVIEW: AdminNavItem = {
  label: 'Overview',
  href: '/admin',
  icon: LuLayoutDashboard,
};
const TICKETS: AdminNavItem = {
  label: 'Tickets',
  href: '/admin/tickets',
  icon: LuBug,
  badge: 'ticket',
  area: 'tickets',
};
const PROFILE: AdminNavItem = {
  label: 'Profile',
  href: '/admin/profile',
  icon: LuUserRound,
};
const USERS: AdminNavItem = {
  label: 'Users',
  href: '/admin/users',
  icon: LuUsersRound,
  superadmin: true,
};
// Analytics surface, not an inbox — votes aren't triaged, so no badge.
const FEEDBACK: AdminNavItem = {
  label: 'Feedback',
  href: '/admin/feedback',
  icon: LuThumbsUp,
  area: 'feedback',
};
const INQUIRIES: AdminNavItem = {
  label: 'Inquiries',
  href: '/admin/inquiries',
  icon: LuInbox,
  badge: 'project',
  area: 'inquiries',
};
const APPLICATIONS: AdminNavItem = {
  label: 'Applications',
  href: '/admin/applications',
  icon: LuBriefcaseBusiness,
  badge: 'career',
  area: 'applications',
};

/** The rail's primary group. */
export const ADMIN_NAV: AdminNavItem[] = [
  OVERVIEW,
  TICKETS,
  FEEDBACK,
  PROFILE,
  USERS,
];

/**
 * The submissions inbox, grouped under its own header. Badges show the untriaged
 * ('new') count per kind, kept live by the inbox actions'
 * `revalidatePath('/admin', 'layout')`.
 */
export const ADMIN_INBOX: AdminNavItem[] = [INQUIRIES, APPLICATIONS];

/** Every route, in the order the ⌘K palette lists them (inbox before profile). */
export const ADMIN_ROUTES: AdminNavItem[] = [
  OVERVIEW,
  INQUIRIES,
  APPLICATIONS,
  TICKETS,
  FEEDBACK,
  PROFILE,
  USERS,
];

/** `/admin` matches exactly (it's the parent of everything); the rest by prefix. */
export function isAdminRouteActive(href: string, pathname: string): boolean {
  return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
}

/**
 * Singular titles for the detail/sub routes, which have no nav entry of their
 * own. First match wins, so `/admin/tickets/new` must sit above the
 * `/admin/tickets` catch-all it would otherwise prefix-match into.
 */
const DETAIL_LABELS: Record<string, string> = {
  '/admin/inquiries': 'Inquiry',
  '/admin/applications': 'Application',
  '/admin/tickets/new': 'New ticket',
  '/admin/tickets': 'Ticket',
};

/**
 * The current page's short title, for the sidebar's brand slot. Longest-prefix
 * match, so `/admin/inquiries/<id>` reads "Inquiry" rather than "Inquiries".
 * Falls back to "Admin" for any route not in the map.
 */
export function adminRouteLabel(pathname: string): string {
  const exact = ADMIN_ROUTES.find((r) => r.href === pathname);
  if (exact) return exact.label;

  for (const [href, label] of Object.entries(DETAIL_LABELS)) {
    if (pathname === href || pathname.startsWith(`${href}/`)) return label;
  }
  return 'Admin';
}
