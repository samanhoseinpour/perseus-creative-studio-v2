import { LuGlobe } from 'react-icons/lu';

import { GlassPanel } from '@/components/Admin/Glass';
import { zonedFormat } from '@/lib/calendar';

/**
 * The viewer's clock, read-only.
 *
 * A SERVER component on purpose — there is nothing to interact with, so it
 * costs zero client JavaScript and cannot hydrate differently than it
 * rendered. (Its predecessor was a 418-entry picker whose "(this device)" hint
 * was read during render, which tore hydration for every reader whose machine
 * was not on the server's zone.)
 *
 * Read-only is the design, not a shortcut. The zone is detected from the
 * browser, which reports the OPERATING SYSTEM's — so it already follows a real
 * move on its own. A pinnable setting could only ever make that worse: someone
 * pins a zone, relocates, and their dates are silently a day off with nothing
 * on screen to explain why. Nobody should have to think about this control,
 * which is why it is a readout instead of a form.
 */
export default function TimezoneCard({
  zone,
  now,
}: {
  /** The zone in effect — already resolved, never null. */
  zone: string;
  /** The render's instant; formatted here so no Date math reaches a browser. */
  now: Date;
}) {
  return (
    <GlassPanel as="section" className="p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">Timezone</h2>
        <p className="text-xs text-muted-foreground">
          Every date in the dashboard — task dates, the digest’s day headings,
          overdue marks — is worked out on this clock.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground/[0.06] text-muted-foreground"
          aria-hidden="true"
        >
          <LuGlobe className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{zone}</p>
          <p className="text-xs text-muted-foreground">
            {zonedFormat(zone, {
              weekday: 'long',
              hour: 'numeric',
              minute: '2-digit',
            }).format(now)}{' '}
            for you now
          </p>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Detected from this device and kept up to date automatically — if you
        move, your dates follow you.
      </p>
    </GlassPanel>
  );
}
