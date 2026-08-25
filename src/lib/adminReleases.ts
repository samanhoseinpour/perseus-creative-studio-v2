import 'server-only';

import { canSeeNavItem, type NavAccess } from '@/lib/adminNav';
import {
  CURRENT_VERSION,
  RELEASE_VERSIONS,
  compareVersions,
  resolveWatermark,
  type Release,
  type ReleaseVersion,
} from '@/lib/releaseFields';

/**
 * What changed in the dashboard, and who it changed for — the CONTENT half of
 * "what's new". The vocabulary, the types and the version tuple live in the
 * client-safe leaf src/lib/releaseFields.ts.
 *
 * Content in CODE, not a table, and no /admin editor. The deploy IS the
 * trigger: a note that needed a separate DB write could ship out of step with
 * the feature it describes, and a member could read about a control that isn't
 * there yet. Same model as adminHelp.ts, which this file is shaped after.
 *
 * `Record<ReleaseVersion, Release>` keyed on RELEASE_VERSIONS is what stops the
 * two files drifting: a version in the tuple with no entry here is a type
 * error, and an entry here with no tuple slot is an excess-property error. So
 * `npm run build` enforces the seam and scripts/check-releases.mts only has to
 * enforce what types can't express — ordering, semver grammar, and that every
 * href is reachable by the audience that is offered it.
 *
 * TWO RULES WHEN ADDING A RELEASE:
 *
 *  1. **Append-only.** Never edit, reorder or delete a published release.
 *     Everyone whose watermark has passed it will never see the correction —
 *     ship a PATCH release saying the new thing instead.
 *  2. **Only what a member would notice.** A new control, a moved control, a
 *     changed default, a habit that no longer works, a fix they had learned to
 *     work around. Refactors and invisible work get nothing: a changelog that
 *     lists everything is one nobody reads.
 *
 * `server-only` because the whole registry would otherwise be a candidate for
 * a client chunk. The check script reads it with
 * `node --conditions=react-server`, which resolves `server-only` to an empty
 * module — see the script's header.
 */
export const RELEASES: Record<ReleaseVersion, Release> = {
  '1.5.0': {
    version: '1.5.0',
    date: '2026-08-25',
    announce: 'notice',
    headline: 'The dashboard can now tell you when something changes.',
    entries: [
      {
        // No gate fields: this one is for everybody.
        id: '1.5.0/whats-new',
        kind: 'added',
        title: 'Updates now come to you',
        what: 'When something in the dashboard changes, you get a short note explaining what it is and how to use it — covering only the parts of the dashboard you can open.',
        steps: [
          'Bigger changes open a one-time note like this one. Smaller ones just put a dot beside your name at the bottom of the sidebar.',
          'Every update is kept under “What’s new” on your profile, so you can go back and read one again later.',
          'The version number at the bottom of any page opens the same list.',
        ],
        href: '/admin/profile',
        help: 'profile',
      },
    ],
  },
};

/** Every release, newest first — the tuple's order, not an object's. */
export const RELEASE_LIST: Release[] = RELEASE_VERSIONS.map((v) => RELEASES[v]);

/**
 * Drop the entries this viewer may not see, and drop the release entirely if
 * nothing survives — which is what stops a payroll-only release lighting a dot,
 * or opening an empty dialog, for someone without the grant.
 *
 * Entries outside the viewer's areas are ABSENT, never counted. "3 changes you
 * can't see" leaks activity about a surface they don't hold — the same reading
 * that makes requireOwnPayroll() bounce rather than render an empty page — and
 * a count with no remedy can only produce a grant request nobody invited.
 * (Not a no-silent-truncation violation: that rule is about arithmetic which
 * must reconcile, and a release feed has no total to reconcile against.)
 */
function narrow(release: Release, access: NavAccess): Release | null {
  const entries = release.entries.filter((entry) =>
    canSeeNavItem(entry, access),
  );
  return entries.length ? { ...release, entries } : null;
}

/**
 * The whole history this viewer may read — deliberately NOT watermark-filtered.
 *
 * The watermark gates the ANNOUNCEMENT; the areas gate the CONTENT; they are
 * independent. So a member granted an area today is not retro-announced its
 * history (re-announcing months of a section is the same wall-of-history a new
 * account must not get, and the section's ⓘ guide is the right artifact for
 * "I'm new here") — but they can read all of it on their profile the moment
 * the grant lands.
 */
export function visibleReleases(
  access: NavAccess,
  releases: Release[] = RELEASE_LIST,
): Release[] {
  return releases
    .map((release) => narrow(release, access))
    .filter((release): release is Release => release !== null);
}

/**
 * What this viewer has not seen yet: the releases above their watermark, each
 * narrowed to the entries they may read, plus whether any of them asked to
 * interrupt.
 *
 * `count` is entries rather than releases, because that is what the dot's
 * accessible name says and what the profile card's button offers to clear.
 *
 * `releases` defaults to the real registry and is injectable ONLY so
 * scripts/check-releases.mts can run this against fixtures covering audiences
 * and watermarks the live registry does not yet contain. Never pass it in app
 * code — a second source of releases is a second answer to "what's new".
 */
export function unseenFor(
  access: NavAccess,
  stored: string | null | undefined,
  releases: Release[] = RELEASE_LIST,
): { releases: Release[]; count: number; announce: boolean } {
  const watermark = resolveWatermark(stored);
  const unseen = releases
    .filter((release) => compareVersions(release.version, watermark) > 0)
    .map((release) => narrow(release, access))
    .filter((release): release is Release => release !== null);

  return {
    releases: unseen,
    count: unseen.reduce((total, release) => total + release.entries.length, 0),
    announce: unseen.some((release) => release.announce === 'notice'),
  };
}

export { CURRENT_VERSION };
