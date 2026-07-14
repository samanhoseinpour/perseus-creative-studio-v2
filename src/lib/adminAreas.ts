/**
 * The grantable admin areas — the vocabulary of the per-user access toggles on
 * /admin/users. Deliberately a zero-dependency, client-safe leaf (same split
 * as ticketFields.ts): the sidebar/⌘K palette, the add-user form, and the
 * users-page chips all need these values, while the authorization gates that
 * consume them live in the `server-only` src/lib/adminAccess.ts.
 *
 * Not listed here (by design):
 * - Overview + Profile — always accessible to any signed-in admin.
 * - Users + Database — superadmin-only surfaces, never grantable (the database
 *   browser auto-discovers every table, so a grant would bypass area limits).
 */
export const ADMIN_AREAS = [
  'inquiries',
  'applications',
  'tickets',
  'feedback',
] as const;

export type AdminArea = (typeof ADMIN_AREAS)[number];

export const ADMIN_AREA_LABELS: Record<AdminArea, string> = {
  inquiries: 'Inquiries',
  applications: 'Applications',
  tickets: 'Tickets',
  feedback: 'Feedback',
};

/** Pre-checked grants in the add-user form — untick rather than opt in. */
export const DEFAULT_AREAS: AdminArea[] = [...ADMIN_AREAS];

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
 */
export function sanitizeAreas(value: unknown): AdminArea[] {
  return Array.isArray(value) ? [...new Set(value.filter(isAdminArea))] : [];
}
