'use client';

import { glassChip } from '@/components/Admin/Glass';
import { useUnreadReleases } from '@/components/Admin/UnreadReleases';
import { CURRENT_VERSION, openReleaseHistory } from '@/lib/releaseFields';
import { cn } from '@/lib/utils';

/**
 * The build stamp at the foot of every protected page — a colophon, not page
 * chrome.
 *
 * A dimension-line tick anchors the left end of a hairline that spans the
 * column, with the wordmark under it and a two-cell pressable chip at the
 * right. The anchoring is the point: AdminPage has three width tokens, and the
 * previous treatment (a lone right-aligned text link) read as a stray element
 * on a 2100px `table` page because nothing tied it to the column. A rule with
 * both ends held cannot drift.
 *
 * It OPENS THE HISTORY IN PLACE rather than linking to /admin/profile#whats-new,
 * which is why the doubled fragment is gone: there is no navigation. (The
 * double `#whats-new#whats-new` was an upstream Next 16.2.10 bug —
 * segment-cache/navigation.js:156 appends `url.hash` to a cached canonicalUrl
 * whose cache key deliberately omits the fragment — so it would have hit any
 * Link carrying one.)
 *
 * Ink only: `glassChip` plus the chipButton hover vocabulary HelpButton uses.
 * The unread dot is byte-identical to the sidebar's, so the two doors to the
 * same news look like the same news.
 */
export default function VersionStamp() {
  const unread = useUnreadReleases();

  return (
    <div className="mt-10 lg:mt-14 print:hidden">
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-2.5 w-px shrink-0 bg-foreground/25" />
        <span className="h-px flex-1 bg-foreground/10" />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-[0.7rem] font-medium tracking-[0.16em] text-muted-foreground uppercase">
          Perseus Dashboard
        </p>

        <button
          type="button"
          onClick={openReleaseHistory}
          aria-label={
            unread > 0
              ? `What’s new — version ${CURRENT_VERSION} — ${unread} unread update${unread === 1 ? '' : 's'}`
              : `What’s new — version ${CURRENT_VERSION}`
          }
          className={cn(
            'group relative inline-flex items-center gap-2.5 rounded-full px-3 py-1.5 text-xs',
            glassChip,
            'transition-[color,background-color,box-shadow] duration-200 ease-out',
            'hover:bg-foreground/10 hover:text-foreground hover:ring-foreground/20',
            'focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none',
          )}
        >
          <span className="font-medium tabular-nums text-foreground">
            {CURRENT_VERSION}
          </span>
          <span aria-hidden="true" className="h-3 w-px bg-foreground/15" />
          <span>What’s new</span>
          {unread > 0 && (
            <span
              aria-hidden="true"
              className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-foreground ring-2 ring-white/80 dark:ring-white/25"
            />
          )}
        </button>
      </div>
    </div>
  );
}
