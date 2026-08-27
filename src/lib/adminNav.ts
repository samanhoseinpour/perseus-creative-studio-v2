import type { IconType } from 'react-icons';
import {
  LuLayoutDashboard,
  LuUserRound,
  LuUsersRound,
  LuInbox,
  LuBriefcaseBusiness,
  LuBug,
  LuThumbsUp,
  LuClapperboard,
  LuBuilding2,
  LuListChecks,
  LuChartColumn,
  LuTrophy,
  LuScrollText,
  LuWallet,
  LuBanknote,
  LuReceipt,
  LuMegaphone,
  LuCoins,
  LuRepeat,
  LuHeartPulse,
} from 'react-icons/lu';

import type { AdminArea } from '@/lib/adminAreas';

/**
 * The one map of the `/admin` route tree — labels, hrefs, icons, and which
 * inbox counter badges a route. Consumed by the sidebar rail, the mobile sheet,
 * the mobile bottom bar, the ⌘K palette, and the sidebar's per-page title, so a
 * new admin page is added in exactly one place and every surface — bottom bar
 * included — picks it up automatically, gated per viewer by `canSeeNavItem`.
 */

/**
 * Which live tally a nav item badges, if any. `project`/`career` come from
 * `getNewSubmissionCounts()`; `ticket` is the open-ticket count from
 * `getTicketStatusCounts()`, populated by the protected layout only for
 * superadmins (members with the tickets area badge their own open count);
 * `task` is the viewer's own open-task count from `countOpenTasks(userId)` —
 * personal, because a badge is a "you have work" signal (team-wide numbers
 * live inside /admin/tasks).
 */
export type AdminNavCountKey = 'project' | 'career' | 'ticket' | 'task';

/**
 * Who may see a thing — the five flags, split out from {@link AdminNavItem} so
 * anything else that needs an audience can declare one in the SAME vocabulary
 * and be filtered by the SAME function. Release entries (src/lib/releaseFields.ts)
 * are the second user: a changelog that decided visibility its own way could
 * disagree with the rail about who holds what, and an entry filed under a
 * single area could not express Spend at all (it needs `areasAll`).
 *
 * Declaring none of these means "everyone" — see canSeeNavItem's final
 * `return true`.
 */
export type NavGate = {
  /**
   * Superadmin-only surface (Users). Hiding here is cosmetic — the page itself
   * must also gate with `requireSuperadmin()` from src/lib/adminAccess.ts.
   */
  superadmin?: true;
  /**
   * Requires this grantable area (src/lib/adminAreas.ts). Cosmetic, same as
   * above — the page gates with `requireArea()`. Items with none of the three
   * area flags (Overview, Profile) are visible to every signed-in admin.
   */
  area?: AdminArea;
  /**
   * Requires ALL of these areas. Spend is the only row that needs it: it is
   * the one screen claiming to show the whole of the company's money, so a
   * viewer holding half the grants must not be offered it (they would read a
   * partial total under a complete label). Cosmetic like the rest — the page
   * gates with `requireSpendOverview()`.
   */
  areasAll?: AdminArea[];
  /**
   * Requires ANY of these areas — the commitments roster, which renders only
   * the half the viewer holds. Gated by `requireCommitments()`.
   */
  areasAny?: AdminArea[];
  /**
   * The member's own pay history — shown only to an account that HAS a payroll
   * record with self-view enabled, superadmin or not (a superadmin who isn't on
   * the payroll has no own pay to look at). Cosmetic like the flags above; the
   * page gates with `requireOwnPayroll()`.
   */
  payrollSelf?: true;
};

export type AdminNavItem = NavGate & {
  label: string;
  href: string;
  icon: IconType;
  badge?: AdminNavCountKey;
  /**
   * Synonyms the ⌘K palette also matches for "Go to" — what people call the
   * surface, not what the rail labels it ("jobs" → Applications). Never
   * rendered; keep each lowercase.
   */
  keywords?: string[];
};

/** The per-viewer access shape the protected layout threads into the chrome. */
export type NavAccess = {
  superadmin: boolean;
  areas: AdminArea[];
  /** AccessProfile.payrollSelf — has a payroll record with self-view enabled. */
  payrollSelf: boolean;
};

/**
 * Whether one viewer may see a gated thing — a nav item, or anything else
 * carrying a {@link NavGate} (release entries). Takes the gate rather than the
 * whole item so the changelog and the rail can never drift apart on who sees
 * what.
 */
export function canSeeNavItem(item: NavGate, access: NavAccess): boolean {
  // Checked before `superadmin`, because this flag is about having own pay to
  // see, which superadmin status neither grants nor implies.
  if (item.payrollSelf) return access.payrollSelf;
  if (item.superadmin) return access.superadmin;
  // No superadmin bypass: area rows follow the STORED grants for superadmins
  // too, so the owner's toggles change their rail. The owner needs no special
  // case — getAccessProfile materializes every area into their `areas`.
  if (item.areasAll)
    return item.areasAll.every((a) => access.areas.includes(a));
  if (item.areasAny) return item.areasAny.some((a) => access.areas.includes(a));
  if (item.area) return access.areas.includes(item.area);
  return true;
}

const OVERVIEW: AdminNavItem = {
  label: 'Overview',
  href: '/admin',
  icon: LuLayoutDashboard,
};
// The team's work log — replaces the Telegram daily-digest thread.
const TASKS: AdminNavItem = {
  label: 'Tasks',
  href: '/admin/tasks',
  icon: LuListChecks,
  badge: 'task',
  area: 'tasks',
  keywords: ['todo', 'work log'],
};
// The studio leaderboard — the team's own monthly standing. Its own grant
// (split from 'tasks' so the two can be granted separately) and no badge:
// it's a scoreboard, not an inbox.
const LEADERBOARD: AdminNavItem = {
  label: 'Leaderboard',
  href: '/admin/leaderboard',
  icon: LuTrophy,
  area: 'leaderboard',
};
// Per-client monthly reporting. Analytics surface (feedback precedent), so no
// badge — nothing to triage.
const REPORTS: AdminNavItem = {
  label: 'Reports',
  href: '/admin/reports',
  icon: LuChartColumn,
  area: 'reports',
};
const TICKETS: AdminNavItem = {
  label: 'Tickets',
  href: '/admin/tickets',
  icon: LuBug,
  badge: 'ticket',
  area: 'tickets',
};
// Not a rail row: the sidebar's identity footer (avatar + name) is the way to
// Profile. Stays in ADMIN_ROUTES so the ⌘K palette and route labels keep it.
const PROFILE: AdminNavItem = {
  label: 'Profile',
  href: '/admin/profile',
  icon: LuUserRound,
};
/**
 * The audit trail. A SENSITIVE area: grantable (so its chip shows on
 * /admin/users), never in the explicit DEFAULT_AREAS, and only the owner can
 * flip it — an audit trail the audited can hand out to each other is a weaker
 * control.
 */
const LOGS: AdminNavItem = {
  label: 'Activity',
  href: '/admin/logs',
  icon: LuScrollText,
  area: 'logs',
  keywords: ['logs', 'audit', 'history'],
};
const USERS: AdminNavItem = {
  label: 'Users',
  href: '/admin/users',
  icon: LuUsersRound,
  superadmin: true,
  keywords: ['team', 'accounts'],
};
/**
 * Operational health: is the system up, what is erroring, did the crons run.
 * A SENSITIVE area beside Activity (owner-flipped only, never pre-ticked), with
 * the gate spelled as exactly `area: 'monitoring'` — check-releases.mts proves
 * every release href is reachable by its entry's own least-privileged viewer,
 * and that proof reads this field. No badge, for payroll's reason: the layout
 * computes tallies for every viewer and masks after, and an open-incident
 * count is not something to compute on a member's render. Unlike payroll and
 * costs it DOES appear in the ⌘K "Go to" list — their exclusion is a privacy
 * mechanism (a search path routes around the own-vs-admin split) and this
 * page has no such split to protect.
 */
const MONITORING: AdminNavItem = {
  label: 'Monitoring',
  href: '/admin/monitoring',
  icon: LuHeartPulse,
  area: 'monitoring',
  keywords: [
    'health',
    'status',
    'errors',
    'incidents',
    'uptime',
    'observability',
    'alerts',
    'crons',
  ],
};
// Everyone's salaries. A SENSITIVE area like 'logs' (owner-flipped only), and
// no badge on purpose: the protected layout computes its tallies for every
// viewer and masks the ones they can't open, which would mean counting other
// people's pay rows on a member's render.
const PAYROLL: AdminNavItem = {
  label: 'Payroll',
  href: '/admin/payroll',
  icon: LuWallet,
  area: 'payroll',
};
// What the studio spends on itself. Labelled "Bills" rather than "Costs"
// because Spend now sits beside it and means the whole of the company's money:
// two rows both called some flavour of "cost" is exactly the ambiguity that
// made payroll and costs read as two unrelated islands. The href is unchanged,
// so every existing deep link still lands. No badge: "6 active plans" is a
// readout, not a queue, and payroll's no-badge reasoning (the layout computes
// tallies for every viewer and masks after) applies here too.
const BILLS: AdminNavItem = {
  label: 'Bills',
  href: '/admin/costs',
  icon: LuReceipt,
  area: 'costs',
  keywords: [
    'costs',
    'subscriptions',
    'expenses',
    'vendors',
    'tools',
    'invoices',
    'charges',
  ],
};
/**
 * The composed view: everything leaving the company in one month, salaries and
 * bills together. Needs BOTH money grants — see requireSpendOverview() for why
 * that is a correctness rule and not only a privacy one. No badge, for the same
 * reason payroll has none.
 */
const SPEND: AdminNavItem = {
  label: 'Spend',
  href: '/admin/spend',
  icon: LuCoins,
  areasAll: ['payroll', 'costs'],
  keywords: ['money', 'burn', 'outgoings', 'company cost', 'total'],
};
/**
 * The merged roster — every member and every recurring cost as one sorted list
 * of monthly commitments. Deliberately NOT a rail row (the PROFILE precedent):
 * it is reached from Spend and from both month screens, so the rail grows by
 * one row rather than three. It stays here so the ⌘K palette and the route
 * label still find it.
 */
const COMMITMENTS: AdminNavItem = {
  label: 'Commitments',
  href: '/admin/spend/commitments',
  icon: LuRepeat,
  areasAny: ['payroll', 'costs'],
  keywords: ['members', 'plans', 'recurring', 'roster', 'run-rate', 'salaries'],
};
// The member's own pay. Housed at /admin/my-pay, not /admin/pay, because
// isAdminRouteActive() is a prefix match and '/admin/pay' would light this row up
// while a payroll admin is looking at '/admin/payroll'.
const MY_PAY: AdminNavItem = {
  label: 'My pay',
  href: '/admin/my-pay',
  icon: LuBanknote,
  payrollSelf: true,
  keywords: ['salary', 'payslip'],
};
// Analytics surface, not an inbox — votes aren't triaged, so no badge.
const FEEDBACK: AdminNavItem = {
  label: 'Feedback',
  href: '/admin/feedback',
  icon: LuThumbsUp,
  area: 'feedback',
  keywords: ['votes', 'articles'],
};
// The two halves of the old 'portfolio' surface, each on its own grant.
const PROJECTS: AdminNavItem = {
  label: 'Projects',
  href: '/admin/projects',
  icon: LuClapperboard,
  area: 'projects',
};
const CLIENTS: AdminNavItem = {
  label: 'Clients',
  href: '/admin/clients',
  icon: LuBuilding2,
  area: 'clients',
};
// The job openings behind /contact/careers. Website content (it sits with
// Projects and Clients), and no badge: "N open roles" is a status readout,
// not a queue to triage — the Feedback/Reports reasoning. The megaphone is a
// posting; the briefcase beside it in Inbox is the applications that answer.
const CAREERS: AdminNavItem = {
  label: 'Careers',
  href: '/admin/careers',
  icon: LuMegaphone,
  area: 'careers',
  keywords: ['jobs', 'roles', 'openings', 'hiring', 'positions'],
};
const INQUIRIES: AdminNavItem = {
  label: 'Inquiries',
  href: '/admin/inquiries',
  icon: LuInbox,
  badge: 'project',
  area: 'inquiries',
  keywords: ['leads', 'contact'],
};
const APPLICATIONS: AdminNavItem = {
  label: 'Applications',
  href: '/admin/applications',
  icon: LuBriefcaseBusiness,
  badge: 'career',
  area: 'applications',
  keywords: ['jobs', 'hiring', 'candidates', 'resumes'],
};

/** A labelled run of rail rows. The label is a heading, not a link. */
export type AdminNavGroup = { label: string; items: AdminNavItem[] };

/**
 * Rows above the first group header. Overview is the dashboard root rather than
 * a member of any section, so it sits bare at the top of the rail.
 */
export const ADMIN_NAV_TOP: AdminNavItem[] = [OVERVIEW];

/**
 * The rail's sections, in order. Each header renders only when the viewer can
 * see at least one of its items, so a member holding just the tasks grant gets
 * "Work" and "Team" and never an empty heading.
 *
 * Tickets sit under Work rather than Inbox: they are internal issues the team
 * files against itself, where Inbox is strictly what arrives from outside.
 * Feedback sits under Website because it tallies blog votes — a signal about
 * published content, alongside the projects and clients that content is about.
 */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  { label: 'Work', items: [TASKS, LEADERBOARD, TICKETS, REPORTS] },
  { label: 'Inbox', items: [INQUIRIES, APPLICATIONS] },
  { label: 'Website', items: [PROJECTS, CLIENTS, CAREERS, FEEDBACK] },
  // Money is its own group rather than a corner of Team: Team is about people
  // and permissions, and these four rows are about where the money goes. Spend
  // leads because it is the view the other three feed.
  { label: 'Money', items: [SPEND, PAYROLL, BILLS, MY_PAY] },
  { label: 'Team', items: [USERS, LOGS, MONITORING] },
];

/**
 * Every route, flattened from the rail so there is ONE ordering to maintain.
 * Consumed by the ⌘K palette (src/components/Admin/CommandPalette.tsx), the
 * route-label lookup below, and the ticket "where did you see it?" area list
 * (src/lib/ticketFields.ts, which reads hrefs — order affects only chip order,
 * never a stored slug). Commitments and Profile trail the groups: neither has a
 * rail row, so neither belongs to a section.
 */
export const ADMIN_ROUTES: AdminNavItem[] = [
  ...ADMIN_NAV_TOP,
  ...ADMIN_NAV_GROUPS.flatMap((group) => group.items),
  COMMITMENTS,
  PROFILE,
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
  '/admin/projects/new': 'New project',
  '/admin/projects': 'Project',
  '/admin/clients': 'Client',
  '/admin/reports': 'Report',
  // Longest prefix first — '/admin/payroll' would otherwise swallow both.
  '/admin/payroll/payslip': 'Payslip',
  '/admin/payroll': 'Payroll member',
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
