'use server';

/**
 * The changelog, fetched ON DEMAND.
 *
 * The point of this action is what it keeps OUT of the RSC payload. The
 * protected layout renders on every admin page, and the history only grows —
 * at this studio's pace a year is roughly 18 releases and 70+ entries. Shipping
 * that with every render (or folding it inside a `<details>`, which hides
 * HEIGHT but not payload) would tax every page load for something almost
 * nobody opens. Fetched here, it costs nothing until someone clicks.
 *
 * SECURITY: takes no arguments and re-derives the audience from the session,
 * exactly as the page render does. A client cannot ask for another viewer's
 * changelog because there is no parameter in which to name one.
 */
import { getAccessProfile, navAccess } from '@/lib/adminAccess';
import { visibleReleases } from '@/lib/adminReleases';
import { resolveWatermark, type Release } from '@/lib/releaseFields';
import { logError } from '@/lib/log';

export type ReleaseHistory = {
  releases: Release[];
  /** Releases above this are marked unread. Resolved, never null. */
  watermark: string;
};

export async function getReleaseHistory(): Promise<ReleaseHistory> {
  // Gate OUTSIDE the try: getAccessProfile() signals "signed out" by calling
  // redirect(), which works by THROWING NEXT_REDIRECT.
  const profile = await getAccessProfile();

  try {
    return {
      releases: visibleReleases(navAccess(profile)),
      watermark: resolveWatermark(profile.releaseSeenVersion),
    };
  } catch (error) {
    logError('[releases] getReleaseHistory failed', error);
    // An empty history renders "nothing yet" rather than an error state — the
    // changelog is never load-bearing enough to interrupt someone over.
    return { releases: [], watermark: '' };
  }
}
