import type { IconType } from 'react-icons';
import {
  LuLayoutDashboard,
  LuUserRound,
  LuInbox,
  LuBriefcaseBusiness,
  LuDatabase,
} from 'react-icons/lu';

/**
 * The one map of the `/admin` route tree — labels, hrefs, icons, and which
 * inbox counter badges a route. Consumed by the sidebar rail, the mobile sheet,
 * the ⌘K palette, and the sidebar's per-page title, so a new admin page is added
 * in exactly one place.
 */

/** Which `getNewSubmissionCounts()` tally a nav item badges, if any. */
export type AdminNavCountKey = 'project' | 'career';

export type AdminNavItem = {
  label: string;
  href: string;
  icon: IconType;
  badge?: AdminNavCountKey;
};

/** The rail's primary group. */
export const ADMIN_NAV: AdminNavItem[] = [
  { label: 'Overview', href: '/admin', icon: LuLayoutDashboard },
  { label: 'Profile', href: '/admin/profile', icon: LuUserRound },
  { label: 'Database', href: '/admin/database', icon: LuDatabase },
];

/**
 * The submissions inbox, grouped under its own header. Badges show the untriaged
 * ('new') count per kind, kept live by the inbox actions'
 * `revalidatePath('/admin', 'layout')`.
 */
export const ADMIN_INBOX: AdminNavItem[] = [
  {
    label: 'Inquiries',
    href: '/admin/inquiries',
    icon: LuInbox,
    badge: 'project',
  },
  {
    label: 'Applications',
    href: '/admin/applications',
    icon: LuBriefcaseBusiness,
    badge: 'career',
  },
];

/** Every route, in the order the ⌘K palette lists them (inbox before profile). */
export const ADMIN_ROUTES: AdminNavItem[] = [
  ADMIN_NAV[0],
  ...ADMIN_INBOX,
  ADMIN_NAV[1],
  ADMIN_NAV[2],
];

/** `/admin` matches exactly (it's the parent of everything); the rest by prefix. */
export function isAdminRouteActive(href: string, pathname: string): boolean {
  return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
}

/** Singular titles for the detail routes, which have no nav entry of their own. */
const DETAIL_LABELS: Record<string, string> = {
  '/admin/inquiries': 'Inquiry',
  '/admin/applications': 'Application',
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
    if (pathname.startsWith(`${href}/`)) return label;
  }
  return 'Admin';
}
