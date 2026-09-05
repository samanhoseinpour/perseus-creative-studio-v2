import type { AdminHelpKey } from '@/lib/adminHelp';
import type { NavGate } from '@/lib/adminNav';

/**
 * The release-notes vocabulary — the version sequence, the entry shape, and
 * the pure predicates behind "what's new".
 *
 * A zero-dependency, client-safe leaf (the adminAreas.ts / taskTagFields.ts
 * split): the dialog and the profile card render from these types, while the
 * CONTENT and the gating live in the `server-only` src/lib/adminReleases.ts.
 * Every import above is `import type` on purpose — type imports erase at
 * build, so this module stays runtime-dependency-free even though adminNav.ts,
 * whose NavGate it borrows, pulls twenty react-icons at its top. Same
 * discipline HelpButton.tsx uses for AdminHelpTopic.
 *
 * RELEASE_VERSIONS is the single source of truth for the version string, and
 * the registry is typed `Record<ReleaseVersion, Release>` on this tuple — so a
 * version with no entry, or an entry with no version, is a TYPE ERROR at
 * `npm run build` rather than a footer quietly disagreeing with the changelog.
 * That is the AdminHelpKey mechanism.
 *
 * AdminPage reads CURRENT_VERSION from HERE and never from the registry:
 * AdminSkeletons.tsx imports AdminPage, and its header contract forbids
 * `server-only` modules and the registries anywhere in that import graph.
 */

/**
 * Every shipped release, NEWEST FIRST. Prepend on release; never reorder, edit
 * or remove a published one (see the append-only rule in CLAUDE.md — everyone
 * whose watermark has passed a release will never see a correction to it).
 * Strictly descending order is pinned by scripts/check-releases.mts.
 *
 * ── CALVER: `YYYY.M.N` ──────────────────────────────────────────────────────
 *
 * Year, month, and the Nth release OF THAT MONTH — so N resets on the 1st and
 * the number can never run away to 1.200.0 the way one-minor-per-push does.
 *
 * SemVer was the wrong instrument here, not a badly-used one. MAJOR/MINOR/PATCH
 * is a compatibility promise to somebody who has to decide whether to upgrade,
 * and this dashboard has no such reader: there is no API, no consumer and no
 * version anyone can choose to stay on. What the seven people reading the
 * footer actually want to know is how fresh the thing in front of them is, and
 * a date answers that in the number itself. The kind of each change is already
 * carried, per entry, by the New / Improved / Fixed chip — which is finer than
 * a single number over a whole release could ever be.
 *
 * NO LEADING ZEROS — `2026.8.1`, never `2026.08.1`. The watermark is compared
 * numerically by compareVersions but STORED as a string in
 * user.release_seen_version, so two spellings of one release would be two
 * different watermarks. One spelling removes the question.
 *
 * Everything downstream is untouched by the change of scheme: still three
 * numeric segments, so VERSION_RE, parseVersion, compareVersions and the
 * `Record<ReleaseVersion, Release>` typing all keep working as they were. The
 * five releases below were renumbered from 1.5.0–1.8.0 on 2026-08-26, paired
 * with drizzle/0037 resetting every stored watermark — without that migration a
 * '1.8.0' watermark sorts below '2026.8.1' and every member is handed the whole
 * history as unread.
 */
export const RELEASE_VERSIONS = [
  // The first DOUBLE-DIGIT N this repo has shipped, and worth naming because
  // it is exactly the pair a string compare gets backwards: '2026.9.10' sorts
  // BELOW '2026.9.9' as strings and above it as numbers. compareVersions
  // parses to a numeric triple, and scripts/check-releases.mts pins the tuple
  // in strictly descending order, so this entry is also the proof.
  '2026.9.10',
  '2026.9.9',
  '2026.9.8',
  '2026.9.7',
  '2026.9.6',
  '2026.9.5',
  '2026.9.4',
  '2026.9.3',
  '2026.9.2',
  '2026.9.1',
  '2026.8.24',
  '2026.8.23',
  '2026.8.22',
  '2026.8.21',
  '2026.8.20',
  '2026.8.19',
  '2026.8.18',
  '2026.8.16',
  '2026.8.15',
  '2026.8.14',
  '2026.8.13',
  '2026.8.12',
  '2026.8.11',
  '2026.8.10',
  '2026.8.9',
  '2026.8.8',
  '2026.8.7',
  '2026.8.6',
  '2026.8.5',
  '2026.8.4',
  '2026.8.3',
  '2026.8.2',
  '2026.8.1',
] as const;

export type ReleaseVersion = (typeof RELEASE_VERSIONS)[number];

/** The version in the page footer, and the watermark a dismissal writes. */
export const CURRENT_VERSION: ReleaseVersion = RELEASE_VERSIONS[0];

export const RELEASE_KINDS = ['added', 'improved', 'fixed'] as const;

export type ReleaseKind = (typeof RELEASE_KINDS)[number];

/** The chip word. "New" rather than "Added" — it is what people say. */
export const RELEASE_KIND_LABELS: Record<ReleaseKind, string> = {
  added: 'New',
  improved: 'Improved',
  fixed: 'Fixed',
};

/**
 * One INK ramp, darkest to lightest — never a hue.
 *
 * The admin theme carries no chroma (`--primary` is a zero-chroma oklch) and
 * every bar in the dashboard is ink, quietened with opacity where something is
 * secondary. A green/blue/amber kind chip would be the first colour in the
 * whole dashboard, and it would be carrying a *category*, not a quantity or a
 * state — which is exactly the drift the leaderboard's gold was moved off the
 * bars to avoid. The ramp survives dark mode and a colour-blind reader with no
 * second palette.
 */
export const RELEASE_KIND_TONES: Record<ReleaseKind, string> = {
  added: 'bg-foreground/[0.10] text-foreground ring-1 ring-foreground/15',
  improved:
    'bg-foreground/[0.06] text-foreground/80 ring-1 ring-foreground/10',
  fixed: 'bg-foreground/[0.04] text-muted-foreground ring-1 ring-foreground/10',
};

/**
 * One thing that changed, and who it changed for.
 *
 * The audience rides {@link NavGate} — the rail's own vocabulary — so the
 * changelog and the sidebar can never disagree about who holds what, and so an
 * entry can express the combination gates a single `area` field cannot: Spend
 * needs `areasAll: ['payroll', 'costs']`, Commitments `areasAny`, My pay
 * `payrollSelf`, Users `superadmin`. **No gate fields at all = everyone**,
 * which is right for shell-wide changes (session expiry, the theme switcher).
 */
export type ReleaseEntry = NavGate & {
  /**
   * Stable forever and never reused, formatted `${version}/${slug}` — which
   * makes "unique across all releases" a structural property rather than a
   * claim, and makes a moved entry visibly a different entry.
   */
  id: string;
  kind: ReleaseKind;
  /** Sentence case, no trailing period. Kept short — it is a heading. */
  title: string;
  /** ONE plain sentence: what it is. Not how it was built. */
  what: string;
  /** How to use it, in order. Omit for most `fixed` entries. */
  steps?: string[];
  /**
   * Deep link into the section. Must be an exact ADMIN_ROUTES href (a query
   * may follow), and the route's gate must be one this entry's own audience
   * satisfies — otherwise the link bounces the reader to Overview with nothing
   * on screen to explain why. Both pinned by scripts/check-releases.mts.
   */
  href?: string;
  /** The ⓘ guide that now documents this. Rendered on the profile card only. */
  help?: AdminHelpKey;
};

export type Release = {
  version: ReleaseVersion;
  /**
   * YYYY-MM-DD — a calendar DAY with no instant behind it. Format it pinned to
   * 'UTC' (never viewerZone), or a Tehran reader sees yesterday.
   */
  date: string;
  /** Optional one-liner above the entries. */
  headline?: string;
  /**
   * 'notice' interrupts everyone holding the area with a one-time dialog and
   * is for a change someone has to be TOLD about. 'quiet' is the default and
   * leaves only the dot on the identity block.
   */
  announce: 'notice' | 'quiet';
  entries: ReleaseEntry[];
};

/**
 * No prerelease, no build metadata — three numbers, and that is the grammar.
 * Under CalVer they read year . month . Nth-of-that-month; the shape (year not
 * in the past, month 1–12, N ≥ 1, no leading zeros) is pinned by
 * scripts/check-releases.mts rather than by a tighter regex, because this one
 * also has to accept the pre-CalVer watermarks still sitting in the column.
 */
export const VERSION_RE = /^\d+\.\d+\.\d+$/;

/** A title longer than this is a paragraph wearing a heading's clothes. */
export const RELEASE_TITLE_MAX = 60;

/** The bridge from the dialog to the sidebar's dot — see markReleasesSeen. */
export const RELEASES_SEEN_EVENT = 'perseus:admin-releases-seen';

/**
 * "Open the changelog" — dispatched by the footer stamp and the profile card,
 * heard by the one ReleaseHistoryDialog mounted in the protected layout.
 *
 * A window event rather than a shared parent, because those three are sibling
 * islands with no client ancestor between them — the same bridge the ⌘K
 * palette uses (ADMIN_SEARCH_OPEN_EVENT). It is also what lets the footer stop
 * being a LINK: there is no navigation, so there is no fragment, so Next
 * 16.2.10's segment-cache bug (navigation.js:156 appends `url.hash` to a
 * canonicalUrl whose cache key deliberately excludes the fragment, so a second
 * visit to the same path yields `#whats-new#whats-new`) cannot bite us.
 */
export const RELEASES_OPEN_EVENT = 'perseus:admin-releases-open';

/** What {@link openReleaseHistory} carries: one version to open on, or nothing
 *  for the whole history. */
export type ReleasesOpenDetail = { version?: string };

/**
 * Ask the dashboard to show the changelog. Safe to call from any island.
 *
 * With a `version` the dialog opens on THAT release alone — the profile card's
 * recent rows, where the whole point is reading one entry without hunting for
 * it down a list that only grows. Without one it opens the full history, which
 * is what the footer stamp and "Read all updates" ask for. A CustomEvent rather
 * than a second event name so there stays exactly one door into the dialog.
 */
export function openReleaseHistory(version?: string): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<ReleasesOpenDetail>(RELEASES_OPEN_EVENT, {
        detail: { version },
      }),
    );
  }
}

/** `'1.10.0'` → `[1, 10, 0]`; anything else → null. */
export function parseVersion(
  value: unknown,
): [number, number, number] | null {
  if (typeof value !== 'string' || !VERSION_RE.test(value)) return null;
  const [major, minor, patch] = value.split('.').map(Number);
  return [major, minor, patch];
}

/**
 * Numeric per segment, never a string compare — `'1.9.0' < '1.10.0'` is true
 * as numbers and false as strings, and getting it backwards would hide every
 * release from the tenth minor onwards with nothing on screen to say so.
 * An unparseable version sorts BELOW every real one, so junk in the column can
 * only ever show too much, never too little.
 */
export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left && !right) return 0;
  if (!left) return -1;
  if (!right) return 1;
  for (let i = 0; i < 3; i += 1) {
    if (left[i] !== right[i]) return left[i] < right[i] ? -1 : 1;
  }
  return 0;
}

/**
 * The stored watermark, or a clean slate.
 *
 * NULL means "joined before this account had seen anything" and resolves to
 * CURRENT_VERSION, so a new member is never handed a wall of history. The
 * protected layout MATERIALIZES that null on first sight (the presence-floor
 * pattern) — without the write, a member who never dismisses anything would
 * resolve to the then-current version for ever and never see a single release.
 *
 * Junk degrades the same way rather than throwing: a bad value can hide a
 * dialog, but never a release, because /admin/profile's history is not
 * watermark-filtered.
 *
 * Junk does NOT self-heal on its own — degrading to CURRENT_VERSION means
 * unseenFor finds nothing, so no dialog opens and no dismissal is ever made to
 * correct it. The repair is the layout's catch-up write, which fires precisely
 * because there is nothing unseen and the stored value is not CURRENT_VERSION.
 */
export function resolveWatermark(stored: string | null | undefined): string {
  return typeof stored === 'string' && parseVersion(stored)
    ? stored
    : CURRENT_VERSION;
}
