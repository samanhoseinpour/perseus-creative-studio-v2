import { LuSparkles } from 'react-icons/lu';

import { GlassPanel, glassChip } from '@/components/Admin/Glass';
import { zonedFormat } from '@/lib/calendar';
import {
  RELEASE_KIND_TONES,
  compareVersions,
  type Release,
} from '@/lib/releaseFields';
import { cn } from '@/lib/utils';
import OpenReleaseHistory from './OpenReleaseHistory';

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
 * shows the newest release as proof-of-life and hands the rest to
 * ReleaseHistoryDialog, which fetches on open. This card is the same height at
 * one release or two hundred.
 */

const DAY_OPTS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
};

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

  const latest = releases[0];
  const headline = latest.entries[0];
  const total = releases.reduce((n, r) => n + r.entries.length, 0);
  const isNew = compareVersions(latest.version, watermark) > 0;
  // A calendar KEY, not an instant — pinned to UTC, never viewerZone, or a
  // Tehran reader sees yesterday.
  const day = zonedFormat('UTC', DAY_OPTS).format(
    new Date(`${latest.date}T00:00:00Z`),
  );

  return (
    // The id outlives the links that used to point at it: an old
    // /admin/profile#whats-new bookmark should still land here.
    <GlassPanel as="section" id="whats-new" className="p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">What’s new</h2>
        <p className="text-xs text-muted-foreground">
          Everything that has changed in the parts of the dashboard you can
          open.
        </p>
      </div>

      <div className="flex items-start gap-3">
        <span
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-full',
            glassChip,
          )}
          aria-hidden="true"
        >
          <LuSparkles className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="font-medium tabular-nums text-foreground">
              {latest.version}
            </span>
            <span aria-hidden="true">·</span>
            <span>{day}</span>
            <span aria-hidden="true">·</span>
            <span>
              {total} update{total === 1 ? '' : 's'} in all
            </span>
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {headline.title}
            </span>
            {isNew && (
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[0.65rem] font-medium',
                  RELEASE_KIND_TONES.added,
                )}
              >
                {unseenCount > 0
                  ? `${unseenCount} unread`
                  : 'Unread'}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <OpenReleaseHistory unseenCount={unseenCount} />
      </div>
    </GlassPanel>
  );
}
