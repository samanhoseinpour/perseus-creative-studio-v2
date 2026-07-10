/**
 * "How did you hear about us?" options — single source of truth shared by the
 * client chip row (ReferralChips), the server action's email label lookup, and
 * the /admin inbox. Deliberately a zero-import leaf so any consumer (client,
 * server, admin) can read the labels without dragging zod or the contact
 * schema into its chunk.
 *
 * Slugs must stay lowercase-alphanumeric-hyphen (≤40 chars) to pass the
 * `referral_source` shape check in contactSchema.ts. Removing/renaming a slug
 * is safe: stored rows and queued offline replays carrying an old slug are
 * kept raw and rendered as-is, never rejected.
 */
export const REFERRAL_OPTIONS = [
  { slug: 'google', label: 'Google' },
  { slug: 'ai-assistant', label: 'AI assistant (ChatGPT, Claude…)' },
  { slug: 'instagram', label: 'Instagram' },
  { slug: 'linkedin', label: 'LinkedIn' },
  { slug: 'referral', label: 'Referral' },
  { slug: 'saw-our-work', label: 'Saw our work' },
  { slug: 'other', label: 'Other' },
] as const;

export type ReferralSlug = (typeof REFERRAL_OPTIONS)[number]['slug'];

export const REFERRAL_LABELS: ReadonlyMap<string, string> = new Map(
  REFERRAL_OPTIONS.map((o) => [o.slug, o.label]),
);

/** Human label for a stored slug; unknown slugs render raw (replay tolerance). */
export const referralLabel = (slug: string): string =>
  REFERRAL_LABELS.get(slug) ?? slug;
