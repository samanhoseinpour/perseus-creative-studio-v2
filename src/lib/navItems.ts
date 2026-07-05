/**
 * Client-safe navigation primitives: the primary nav list, the active-route
 * test, and the mega-panel *type* contracts.
 *
 * This module exists so the client chrome (NavbarClient, MobileMenu) can
 * import `navItems`/`isActiveRoute` without touching ./navigation.ts — whose
 * module top-level derives the mega-panel data from the (large) services,
 * blogs, and projects registries. A value import of that module from any
 * client component would evaluate those derivations in the browser bundle and
 * ship the whole content DB as JavaScript on every page. Keep this file free
 * of registry imports.
 */

export interface NavLinkGroup {
  title: string;
  href?: string;
  links: { name: string; href: string }[];
}

// Primary navigation, in order. The single source of truth for both the
// desktop centered row and the mobile sheet — so a destination (e.g. Services)
// can never be present on one and missing from the other. Items with a `panel`
// open a mega-panel on desktop (hover/focus) and an accordion section on mobile;
// the rest navigate straight to their hub.
export type PanelName = 'services' | 'projects' | 'blogs';

export interface NavItem {
  label: string;
  href: string;
  panel?: PanelName;
}

export const navItems: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '/services', panel: 'services' },
  { label: 'Projects', href: '/projects', panel: 'projects' },
  { label: 'Blogs', href: '/blogs', panel: 'blogs' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

// Active-route test, shared by the desktop row and the mobile sheet so both
// mark "you are here" the same way. Home matches only the exact root; every
// other destination matches its whole subtree (so /projects/branding still
// lights the Projects entry). Path-based only — query-state hubs like
// /blogs?category= resolve to their bare path here.
export const isActiveRoute = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname.startsWith(href);

export interface BlogPanelLink {
  title: string;
  href: string;
  /** Compact dateline for the index rows, e.g. "Feb 21". */
  dateLabel: string;
}

export interface BlogPanelCategory {
  name: string;
  href: string;
  /** Total posts on file in this category (not the capped panel length). */
  count: number;
  /** The latest post — the column's cover. */
  featured: {
    title: string;
    href: string;
    image: string;
    imageAlt: string;
    /** Blur-up placeholder for the cover, looked up server-side (blurFor). */
    imageBlur?: string;
    /** Full display date, e.g. "February 21, 2026". */
    date: string;
  };
  /** The next few headlines after the featured, newest-first, capped. */
  more: BlogPanelLink[];
}

export interface BlogPanelData {
  categories: BlogPanelCategory[];
  total: number;
}

export interface ProjectsPanelCover {
  /** Project title — the hover caption and the link's accessible name. */
  title: string;
  /** Gated: the detail page when live, else the category showcase. */
  href: string;
  /** Cover image path. */
  src: string;
  alt: string;
  /** Blur-up placeholder for the cover, looked up server-side (blurFor). */
  blur?: string;
}

export interface ProjectsPanelCategory {
  title: string;
  /** The category showcase — the row's header link. */
  href: string;
  /** Total projects on file (not the capped strip length). */
  count: number;
  /** Slate register line, e.g. "06 films · 2023–2024". */
  meta: string;
  /** Latest covers, newest-first, capped at LATEST_PER_CATEGORY. */
  covers: ProjectsPanelCover[];
}

export interface ProjectsPanelData {
  categories: ProjectsPanelCategory[];
  totalProjects: number;
  totalCategories: number;
}
