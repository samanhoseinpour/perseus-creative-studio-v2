/**
 * The grantable admin areas — the vocabulary of the per-user access toggles on
 * /admin/users. Deliberately a zero-dependency, client-safe leaf (same split
 * as ticketFields.ts): the sidebar/⌘K palette, the add-user form, and the
 * users-page chips all need these values, while the authorization gates that
 * consume them live in the `server-only` src/lib/adminAccess.ts.
 *
 * Every area-gated surface has its own key — superadmins hold STORED grants
 * like everyone else (only the owner holds every area implicitly), so the
 * chips on /admin/users are the whole truth about who can open what.
 *
 * Not listed here (by design):
 * - Overview + Profile — always accessible to any signed-in admin.
 * - Users — a role-gated surface (superadmin/owner), never grantable.
 */
export const ADMIN_AREAS = [
  'inquiries',
  'applications',
  'tickets',
  'feedback',
  'projects',
  'clients',
  'careers',
  'tasks',
  'leaderboard',
  'reports',
  'payroll',
  'costs',
  'logs',
  // Sensitive areas stay CONTIGUOUS at the tail: AreaToggles draws its
  // divider before SENSITIVE_AREAS[0] and relies on the rest following.
  'monitoring',
] as const;

export type AdminArea = (typeof ADMIN_AREAS)[number];

export const ADMIN_AREA_LABELS: Record<AdminArea, string> = {
  inquiries: 'Inquiries',
  applications: 'Applications',
  tickets: 'Tickets',
  feedback: 'Feedback',
  // The two halves of the old 'portfolio' grant (/admin/projects and
  // /admin/clients), split so each can be granted on its own.
  projects: 'Projects',
  clients: 'Clients',
  // The job openings behind /contact/careers (/admin/careers) — website
  // content like the two above, so it sits with them.
  careers: 'Careers',
  tasks: 'Tasks',
  leaderboard: 'Leaderboard',
  // Per-client monthly reporting (/admin/reports) — the client-facing numbers.
  reports: 'Reports',
  payroll: 'Payroll',
  // What the studio spends on itself (/admin/costs) — the subscriptions and
  // other recurring bills. Sits beside payroll: both are company money.
  // 'Bills', not 'Costs': the rail row, the page's own <h1> and the help guide
  // were all renamed when /admin/spend took the general noun, and this chip
  // was missed. One name per section, or granting access means matching two
  // words to one screen.
  costs: 'Bills',
  // The nav row says "Activity"; the chip needs the noun.
  logs: 'Activity log',
  // Operational health (/admin/monitoring): error trends, dependency and
  // cron status, incidents. Names every route pattern that ever threw and
  // the services the studio runs on, which is an operator's view of the
  // system, not a member's.
  monitoring: 'Monitoring',
};

/**
 * Areas only the OWNER may grant or revoke — on any target, superadmins
 * included. The chips render for everyone who can open /admin/users (so the
 * grant state is never invisible), but flipping one is refused server-side in
 * _actions/users.ts for any non-owner caller. Payroll is the studio's most
 * private surface; the activity log is the audit trail — an audit trail the
 * audited can hand out to each other is a weaker control; costs is the
 * company's whole cost base, which is the owner's to share, not a manager's;
 * and monitoring is the operational picture — what is failing and where —
 * whose alerts go to whoever holds it.
 */
export const SENSITIVE_AREAS = ['payroll', 'costs', 'logs', 'monitoring'] as const;

export type SensitiveArea = (typeof SENSITIVE_AREAS)[number];

export function isSensitiveArea(area: AdminArea): area is SensitiveArea {
  return (SENSITIVE_AREAS as readonly string[]).includes(area);
}

/**
 * Pre-checked grants in the add-user form — untick rather than opt in.
 * An EXPLICIT list, not derived from ADMIN_AREAS, so adding a future area can
 * never silently pre-tick it for every new account. Opt-in by omission:
 * 'reports' (client-facing numbers), and every SENSITIVE_AREAS entry
 * (owner-granted only).
 */
export const DEFAULT_AREAS: AdminArea[] = [
  'inquiries',
  'applications',
  'tickets',
  'feedback',
  'projects',
  'clients',
  'careers',
  'tasks',
  'leaderboard',
];

export function isAdminArea(value: unknown): value is AdminArea {
  return (
    typeof value === 'string' &&
    (ADMIN_AREAS as readonly string[]).includes(value)
  );
}

/**
 * Coerce an untrusted value (jsonb column, action payload) into a clean,
 * deduped grant list — unknown slugs and non-arrays collapse to nothing
 * rather than throwing, so a bad row can never take the dashboard down.
 * Retired slugs (the pre-split 'portfolio'/'tasks'-era keys migration 0024
 * left in place for deploy-window safety) fall out here the same way.
 */
export function sanitizeAreas(value: unknown): AdminArea[] {
  return Array.isArray(value) ? [...new Set(value.filter(isAdminArea))] : [];
}
