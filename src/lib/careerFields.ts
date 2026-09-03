/**
 * Shared vocabulary for the careers domain — the job openings and categories
 * managed from /admin/careers and rendered on /contact/careers, the contact
 * form's "Join the team" role select, and the JobPosting JSON-LD.
 *
 * Deliberately zod-free and client-safe (the portfolioFields.ts split): the
 * admin dialogs import this for labels, option tuples, and instant pre-checks;
 * the authoritative validation lives in src/lib/careersSchema.ts, imported
 * only by the server actions. The public pages import the copy composers
 * below — this module must never grow a dependency that would drag data into
 * a client chunk.
 *
 * The value tuples mirror the pgEnums in src/db/schema.ts (job_status /
 * job_employment_type / job_pay_unit) — keep the two in sync; the enum is the
 * DB gate, this is the UI + zod vocabulary.
 */

// ── Status ──────────────────────────────────────────────────────────────────

export const JOB_STATUSES = ['open', 'filled', 'draft'] as const;

export type JobStatusField = (typeof JOB_STATUSES)[number];

export const JOB_STATUS_LABELS: Record<JobStatusField, string> = {
  open: 'Open',
  filled: 'Filled',
  draft: 'Draft',
};

/** One-line explanation per state, shown under the form control. */
export const JOB_STATUS_HELP: Record<JobStatusField, string> = {
  open: 'On the site as "Available". People can apply, and it carries a JobPosting for Google Jobs.',
  filled: 'Still on the site, marked "Position filled". Nobody can apply.',
  draft: 'Not on the site at all. Only visible here.',
};

// ── Employment type ─────────────────────────────────────────────────────────

export const JOB_EMPLOYMENT_TYPES = [
  'full_time',
  'part_time',
  'subcontract',
] as const;

export type JobEmploymentTypeField = (typeof JOB_EMPLOYMENT_TYPES)[number];

export const JOB_EMPLOYMENT_TYPE_LABELS: Record<JobEmploymentTypeField, string> =
  {
    full_time: 'Full-time',
    part_time: 'Part-time',
    subcontract: 'Subcontract',
  };

/** schema.org employmentType for the JobPosting node. */
export const SCHEMA_EMPLOYMENT_TYPE: Record<JobEmploymentTypeField, string> = {
  full_time: 'FULL_TIME',
  part_time: 'PART_TIME',
  subcontract: 'CONTRACTOR',
};

// ── Pay ─────────────────────────────────────────────────────────────────────

export const JOB_PAY_UNITS = ['HOUR', 'DAY', 'YEAR'] as const;

export type JobPayUnitField = (typeof JOB_PAY_UNITS)[number];

export const JOB_PAY_UNIT_LABELS: Record<JobPayUnitField, string> = {
  HOUR: 'Per hour',
  DAY: 'Per day',
  YEAR: 'Per year',
};

/** Largest whole-dollar figure a pay field accepts (a typo guard, not policy). */
export const JOB_PAY_MAX_VALUE = 1_000_000;

export type JobPay = { min: number; max: number; unit: JobPayUnitField };

/**
 * Human-readable pay for a listing chip — "$30–45 / hour", "$650–900 / day",
 * or "$30 / hour" when the range is a single figure. Thousands are grouped for
 * annual salaries, where the numbers are long enough to need it.
 *
 * The one place pay becomes a string. The JobPosting JSON-LD takes the raw
 * numbers instead, so the two can never disagree about the figure — only
 * about how it reads. (Whole CAD dollars — public display copy, never
 * payroll money; see the column comment in src/db/schema.ts.)
 */
export function formatPay(pay: JobPay): string {
  const n = (v: number) => v.toLocaleString('en-CA');
  const amount =
    pay.min === pay.max ? `$${n(pay.min)}` : `$${n(pay.min)}–${n(pay.max)}`;
  const per = { HOUR: 'hour', DAY: 'day', YEAR: 'year' }[pay.unit];
  return `${amount} / ${per}`;
}

/** The stored triple as one value, or null when any part is missing. */
export function payFrom(
  min: number | null | undefined,
  max: number | null | undefined,
  unit: JobPayUnitField | null | undefined,
): JobPay | null {
  return min != null && max != null && unit ? { min, max, unit } : null;
}

// ── Category icons ──────────────────────────────────────────────────────────
// The fixed icon vocabulary behind job_categories.icon. The key → component
// map lives in src/lib/jobCategoryIcons.ts (react-icons), kept separate so
// this leaf stays dependency-free.

export const JOB_CATEGORY_ICON_KEYS = [
  'briefcase',
  'instagram',
  'chart',
  'layout',
  'search',
  'video',
  'camera',
  'pen',
  'code',
  'megaphone',
  'palette',
  'globe',
  'sparkles',
  'users',
] as const;

export type JobCategoryIconKey = (typeof JOB_CATEGORY_ICON_KEYS)[number];

export const JOB_CATEGORY_ICON_LABELS: Record<JobCategoryIconKey, string> = {
  briefcase: 'Briefcase',
  instagram: 'Instagram',
  chart: 'Chart',
  layout: 'Layout',
  search: 'Search',
  video: 'Video',
  camera: 'Camera',
  pen: 'Pen',
  code: 'Code',
  megaphone: 'Megaphone',
  palette: 'Palette',
  globe: 'Globe',
  sparkles: 'Sparkles',
  users: 'People',
};

/** The key every unknown/legacy icon value renders as. */
export const JOB_CATEGORY_ICON_FALLBACK: JobCategoryIconKey = 'briefcase';

export function isJobCategoryIconKey(
  value: unknown,
): value is JobCategoryIconKey {
  return (
    typeof value === 'string' &&
    (JOB_CATEGORY_ICON_KEYS as readonly string[]).includes(value)
  );
}

// ── Field limits ────────────────────────────────────────────────────────────

/**
 * Also the inbox URL contract's slug cap (src/lib/inboxFilters.ts derives its
 * SLUG_RE from this): a role slug longer than the inbox accepts would make the
 * roster's "N applications" link land on the UNFILTERED list.
 */
export const JOB_SLUG_MAX = 60;
export const JOB_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const JOB_TITLE_MAX = 80;
export const JOB_LOCATION_MAX = 60;
export const JOB_LEVEL_MAX = 40;
export const JOB_CADENCE_MAX = 40;
export const JOB_FIT_MAX = 200;
export const JOB_SUMMARY_MAX = 240;
export const JOB_TAG_MAX = 30;
export const JOB_TAGS_MAX = 6;
export const JOB_CATEGORY_NAME_MAX = 40;

/** The location value that makes a listing TELECOMMUTE (case-insensitive). */
export const JOB_REMOTE_LOCATION = 'Remote';

export function isRemoteLocation(location: string): boolean {
  return location.trim().toLowerCase() === JOB_REMOTE_LOCATION.toLowerCase();
}

// ── General application ─────────────────────────────────────────────────────

/**
 * Fallback option on the careers tab for applicants without a listed role.
 * A pseudo-role: never a job_openings row, so its slug is reserved — a real
 * listing slugged this way would be shadowed in the contact form.
 */
export const GENERAL_APPLICATION = {
  slug: 'general-application',
  title: 'General application',
} as const;

export const RESERVED_JOB_SLUGS = [GENERAL_APPLICATION.slug] as const;

/**
 * The careers page filter's select value for a category. Prefixed so a
 * category slugged 'all' or 'open' can never collide with the availability
 * sentinels CareersRoles.tsx reserves for itself.
 */
export const careersFilterValue = (categorySlug: string) =>
  `category:${categorySlug}`;

/**
 * Human label for a stored role slug. The snapshot stored on the application
 * wins (it is what the applicant saw); the general-application sentinel is
 * known here; anything else renders raw — replay tolerance, the
 * referralLabel precedent. Synchronous on purpose: the inbox's row preview
 * runs inside a list render and must never need a DB read.
 */
export function roleLabel(
  slug: string,
  snapshotTitle?: string | null,
): string {
  if (snapshotTitle) return snapshotTitle;
  if (slug === GENERAL_APPLICATION.slug) return GENERAL_APPLICATION.title;
  return slug;
}

// ── Public fingerprint ──────────────────────────────────────────────────────

/** The public-facing fields of one listing, for change detection. */
export type OpeningPublicFields = {
  title: string;
  categoryName: string;
  location: string;
  employmentType: string;
  level: string;
  cadence: string;
  fit: string;
  summary: string;
  tags: readonly string[];
  status: string;
  datePosted: string | null;
  validThrough: string | null;
  payMin: number | null;
  payMax: number | null;
  payUnit: string | null;
};

/**
 * A stable string over everything a visitor (or a crawler) can see of one
 * listing — and nothing else. The server actions compare the fingerprint
 * before and after a write to decide whether /contact/careers actually
 * changed: a reorder, a category icon swap, or a draft edit must never ping
 * IndexNow (false freshness is a Bing spam signal), while a pay or title
 * change on a live listing must.
 */
export function openingFingerprint(o: OpeningPublicFields): string {
  return JSON.stringify([
    o.title,
    o.categoryName,
    o.location,
    o.employmentType,
    o.level,
    o.cadence,
    o.fit,
    o.summary,
    [...o.tags],
    o.status,
    o.datePosted,
    o.validThrough,
    o.payMin,
    o.payMax,
    o.payUnit,
  ]);
}

// ── Copy composers ──────────────────────────────────────────────────────────
// The ONE place the open roles are spelled into prose. The careers hero, the
// page's meta/OG description, the FAQ answers, and the WebPage JSON-LD all
// call these with the live open set, so none of them can drift from the
// listings the way the hand-written copy used to (it named four roles while
// the FAQ named three). Pure functions of titles — testable without a DB
// (scripts/check-careers.mts).

const NUMBER_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
];

/** "four" for small counts, digits beyond ten. */
export function countWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

/** Oxford-comma list: "A", "A and B", "A, B, and C". */
export function listTitles(titles: readonly string[]): string {
  if (titles.length <= 1) return titles[0] ?? '';
  if (titles.length === 2) return `${titles[0]} and ${titles[1]}`;
  return `${titles.slice(0, -1).join(', ')}, and ${titles[titles.length - 1]}`;
}

const FILLED_TAIL =
  'Every other listing below is filled. We leave them up so you can see how the team is built. If one of those is your strength, send a general application through our contact page and we’ll come back to it when the seat opens.';

/**
 * The careers hero paragraph. `allRemote` drops the word "remote" when an
 * open listing has a non-Remote location, so the sentence stays true.
 */
export function composeHiringIntro(
  titles: readonly string[],
  allRemote = true,
): string {
  if (titles.length === 0) {
    return `No roles are open right now. Every listing below is filled, and we leave them up so you can see how the team is built. If one of them is your strength, send a general application through our contact page and we’ll come back to it when the seat opens.`;
  }
  const n = titles.length;
  const noun = `${allRemote ? 'remote ' : ''}role${n === 1 ? '' : 's'}`;
  return `We’re hiring ${countWord(n)} ${noun} right now: ${listTitles(titles)}. ${FILLED_TAIL}`;
}

/** Search snippets truncate past this; the composer stays under it. */
export const META_DESCRIPTION_MAX = 160;

/**
 * The page's meta + OG description. Names roles while the 160-character
 * budget allows, then folds the rest into "and N more" — a long open list
 * must never produce a snippet Google cuts mid-title.
 */
export function composeHiringMeta(
  titles: readonly string[],
  allRemote = true,
): string {
  if (titles.length === 0) {
    return 'Perseus Creative Studio has no open roles right now. Browse every past listing and send a general application through our contact page.';
  }
  const tail = `${allRemote ? ', all remote' : ''}. See the listings and apply.`;
  const build = (shown: readonly string[], hidden: number) => {
    const list = listTitles(
      hidden > 0 ? [...shown, `${hidden} more`] : shown,
    );
    return `Perseus Creative Studio is hiring: ${list}${tail}`;
  };
  let shown = titles.length;
  let text = build(titles, 0);
  while (text.length > META_DESCRIPTION_MAX && shown > 1) {
    shown -= 1;
    text = build(titles.slice(0, shown), titles.length - shown);
  }
  return text;
}

/** The "Are you hiring?" FAQ answer. */
export function composeHiringFaq(
  titles: readonly string[],
  allRemote = true,
): string {
  const kept =
    'Roles we’ve already filled stay on the page marked “Position filled” rather than disappearing, so you can see what the team looks like. You just can’t apply into a posting that’s closed.';
  if (titles.length === 0) {
    return `Not right now. Every listing is filled. ${kept} A general application through the contact page is read first when a seat opens.`;
  }
  const n = titles.length;
  const verb = n === 1 ? 'is' : 'are';
  return `Yes, ${countWord(n)} role${n === 1 ? '' : 's'} ${verb} open right now: ${listTitles(titles)}${allRemote ? ', all remote' : ''}. Each listing shows the location, type, level, and who the role suits. ${kept}`;
}

/** The "Are the roles remote?" FAQ answer. */
export function composeRemoteFaq(allListedRemote: boolean): string {
  return allListedRemote
    ? 'Every role we list is remote, and each listing states whether it’s full-time, part-time, or subcontract, along with its level and expected start. Production roles involve on-location work depending on where the shoot is.'
    : 'Most roles are remote. Each listing states its location, whether it’s full-time, part-time, or subcontract, its level, and expected start. Production roles involve on-location work depending on where the shoot is.';
}
