import { GlassPanel } from '@/components/Admin/Glass';
import { zonedFormat } from '@/lib/calendar';
import { compareVersions, type Release } from '@/lib/releaseFields';
import OpenReleaseHistory from './OpenReleaseHistory';
import RecentReleaseRows from './RecentReleaseRows';

/**
 * "What's new", as a FIXED-HEIGHT readout — last in the profile stack.
 *
 * Two decisions, both the owner's and both right.
 *
 * LAST, not first: account settings outrank release news. The card used to sit
 * above Display name, which put the changelog between someone and their own
 * password.
 *
 * A READOUT, not the history: the history only grows. At this studio's pace a
 * year is roughly 18 releases and 70-odd entries, which renders 8,000–11,000px
 * — and an inline list pays that in HEIGHT on this page and in PAYLOAD on every
 * load, since a `<details>` hides the first but not the second. So the page
 * shows the newest releases as proof-of-life and hands the rest to
 * ReleaseHistoryDialog, which fetches on open.
 *
 * FIVE ROWS, not one. Showing only the newest release meant every older one was
 * reachable only by opening the whole history and scrolling past everything
 * after it — so a release you half-remember was harder to find the more the
 * studio shipped. Each row opens that release ALONE. Five keeps the card the
 * same height it has always been: at one release or two hundred, this panel
 * cannot grow past five rows plus its buttons, which was the original
 * constraint and is the reason a `<details>` was rejected.
 */

const DAY_OPTS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
};

/** How many rows the card offers. The cap IS the fixed height — see above. */
const RECENT_ROWS = 5;

export default function WhatsNewCard({
  releases,
  watermark,
  unseenCount,
}: {
  releases: Release[];
  watermark: string;
  unseenCount: number;
}) {
  if (releases.length === 0) return null;

  const total = releases.reduce((n, r) => n + r.entries.length, 0);
  // A calendar KEY, not an instant — pinned to UTC, never viewerZone, or a
  // Tehran reader sees yesterday. Formatted HERE so the client leaf below
  // receives strings and never has to reach for a timezone.
  const day = zonedFormat('UTC', DAY_OPTS);

  const rows = releases.slice(0, RECENT_ROWS).map((release) => ({
    version: release.version,
    day: day.format(new Date(`${release.date}T00:00:00Z`)),
    // The first entry stands for the release. `narrow()` has already dropped
    // everything this viewer may not read, so the title on the row is always
    // one they can actually open.
    title: release.entries[0].title,
    unread: compareVersions(release.version, watermark) > 0,
  }));

  return (
    // The id outlives the links that used to point at it: an old
    // /admin/profile#whats-new bookmark should still land here.
    <GlassPanel as="section" id="whats-new" className="p-5 sm:p-6">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-foreground">What’s new</h2>
        <p className="text-xs text-muted-foreground">
          Everything that has changed in the parts of the dashboard you can
          open: {total} update{total === 1 ? '' : 's'} in all.
        </p>
      </div>

      <RecentReleaseRows rows={rows} />

      <div className="mt-4 flex justify-end">
        <OpenReleaseHistory unseenCount={unseenCount} />
      </div>
    </GlassPanel>
  );
}
