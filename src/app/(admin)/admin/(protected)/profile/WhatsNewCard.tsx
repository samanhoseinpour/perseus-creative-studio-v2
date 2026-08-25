import { GlassPanel } from '@/components/Admin/Glass';
import ReleaseList from '@/components/Admin/ReleaseList';
import { ADMIN_HELP, type AdminHelpTopic } from '@/lib/adminHelp';
import type { Release } from '@/lib/releaseFields';
import MarkUpdatesRead from './MarkUpdatesRead';

/**
 * Every change this member can read about, newest first — the durable half of
 * "what's new", and the reason there is no /admin/whats-new route.
 *
 * It is a SERVER component: there is nothing to interact with but the ⓘ buttons
 * and the mark-read leaf, both of which bring their own client boundary. The
 * TimezoneCard precedent — a readout costs zero client JavaScript and cannot
 * hydrate differently than it rendered.
 *
 * DELIBERATELY NOT WATERMARK-FILTERED. The watermark gates the announcement;
 * the areas gate the content; they are independent. So a member granted an area
 * today is not retro-announced its history — but the whole of it is here for
 * them to read the moment the grant lands, which is what makes "no retro
 * announcements" a reasonable rule rather than a hole.
 */

/** Full detail for the newest few; the rest folds behind a disclosure. */
const OPEN_RELEASES = 5;

export default function WhatsNewCard({
  releases,
  watermark,
  unseenCount,
}: {
  /** Already filtered to this viewer's areas by visibleReleases(). */
  releases: Release[];
  /** Resolved (never null) — releases above it are marked "New". */
  watermark: string;
  unseenCount: number;
}) {
  if (releases.length === 0) return null;

  const recent = releases.slice(0, OPEN_RELEASES);
  const earlier = releases.slice(OPEN_RELEASES);

  // Built here rather than inside ReleaseList so the dialog, which shares that
  // component, never drags whole help topics into the layout's RSC payload.
  // ADMIN_HELP is `server-only`; this component is the boundary that may read
  // it, and only the topics actually referenced cross to the client.
  const helpTopics: Record<string, AdminHelpTopic> = {};
  for (const release of releases)
    for (const entry of release.entries)
      if (entry.help) helpTopics[entry.id] = ADMIN_HELP[entry.help];

  return (
    <GlassPanel as="section" id="whats-new" className="scroll-mt-8 p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">What’s new</h2>
          <p className="text-xs text-muted-foreground">
            Everything that has changed in the parts of the dashboard you can
            open, newest first.
          </p>
        </div>
        <MarkUpdatesRead count={unseenCount} />
      </div>

      <ReleaseList
        releases={recent}
        helpTopics={helpTopics}
        newerThan={watermark}
      />

      {earlier.length > 0 && (
        // A native <details>: zero JavaScript, keyboard-accessible, and the
        // summary NAMES what is folded rather than silently truncating.
        <details className="group mt-7 border-t border-foreground/10 pt-4">
          <summary className="cursor-pointer list-none text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
            {earlier.length === 1
              ? '1 earlier update'
              : `${earlier.length} earlier updates`}
            <span className="ml-1 inline-block transition-transform group-open:rotate-90">
              ›
            </span>
          </summary>
          <ReleaseList
            releases={earlier}
            helpTopics={helpTopics}
            newerThan={watermark}
            className="mt-5"
          />
        </details>
      )}
    </GlassPanel>
  );
}
