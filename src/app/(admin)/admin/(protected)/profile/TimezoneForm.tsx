'use client';

import { useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';

import Button from '@/components/Button';
import { Label } from '@/components/ui/label';
import { GlassPanel } from '@/components/Admin/Glass';
import { cellField } from '@/components/Admin/tasks/menu';
import { setTimezone } from '@/app/(admin)/admin/(protected)/_actions/timezone';
import { cn } from '@/lib/utils';

/**
 * The manual override for the viewer's clock.
 *
 * Normally nothing here needs touching — TimezoneSync follows the browser, and
 * for everyone who works from one place that is simply correct. This card is
 * for the cases detection gets wrong: a VPN reporting the exit node's zone, a
 * laptop whose clock is off, or someone travelling who would rather keep
 * reading the dashboard on studio time than have every date shift under them.
 *
 * Picking a zone sets `timezone_auto = false`, which is what makes the choice
 * survive the next page load — otherwise the sync would overwrite it
 * immediately. "Follow this device" hands control back.
 *
 * No live clock ticking here: the current time is formatted on the SERVER and
 * passed down (`nowLabel`), the same no-Date-math-in-a-client-component rule
 * the session list and the inbox follow. A ticking readout would be the one
 * thing on the page that could hydrate differently than it rendered.
 */
/** The zone never changes within a page's life, so there is nothing to
 *  subscribe to — but the store contract wants an unsubscriber, and these have
 *  to be module-stable or React resubscribes on every render. */
const subscribeNever = () => () => {};
const readTimeZone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || '';
/** Server + hydration snapshot: no hint, so the two renders agree. */
const readServerTimeZone = () => '';

export default function TimezoneForm({
  zone,
  auto,
  nowLabel,
  zones,
}: {
  /** The zone in effect right now (already resolved — never null). */
  zone: string;
  auto: boolean;
  /** Current time in `zone`, server-formatted. */
  nowLabel: string;
  /** Every IANA zone the runtime knows, for the picker. */
  zones: string[];
}) {
  const [choice, setChoice] = useState(zone);
  const [pending, setPending] = useState(false);

  // The browser's own zone, for the "(this device)" hint. It MUST NOT be read
  // during render: this component is SSR'd, and on the server
  // `resolvedOptions().timeZone` is the RUNTIME's zone (UTC on Vercel), so the
  // hint would land on a different option in the server HTML than in the
  // hydrated tree — React would report a mismatch and throw the whole boundary
  // away. `useSyncExternalStore` exists for exactly this: it renders the
  // server snapshot ('' — no hint) through hydration, then swaps to the real
  // value. Same reason `nowLabel` is formatted server-side and handed down.
  const detected = useSyncExternalStore(
    subscribeNever,
    readTimeZone,
    readServerTimeZone,
  );

  async function save(nextAuto: boolean) {
    setPending(true);
    try {
      const res = await setTimezone(nextAuto ? '' : choice, nextAuto);
      if (!res.ok) {
        toast.error(
          res.error === 'invalid'
            ? 'That timezone isn’t one this browser recognises.'
            : 'Could not save your timezone.',
        );
        return;
      }
      toast.success(
        nextAuto ? 'Following this device again.' : 'Timezone updated.',
      );
    } catch {
      toast.error('Couldn’t reach the server — check your connection.');
    } finally {
      setPending(false);
    }
  }

  return (
    <GlassPanel as="section" className="p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">Timezone</h2>
        <p className="text-xs text-muted-foreground">
          Every date in the dashboard — task dates, the digest’s day headings,
          overdue marks — is worked out on this clock.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
        <span className="font-medium text-foreground">{zone}</span>
        <span className="text-muted-foreground">· {nowLabel} for you now</span>
        {auto && (
          <span className="text-xs text-muted-foreground">
            (following this device)
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="timezone" className="sr-only">
            Timezone
          </Label>
          <select
            id="timezone"
            value={choice}
            onChange={(e) => setChoice(e.target.value)}
            disabled={pending}
            className={cn(cellField, 'h-9 cursor-pointer px-2.5 text-sm')}
          >
            {zones.map((z) => (
              <option key={z} value={z}>
                {z}
                {z === detected ? ' (this device)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="small"
            shimmer={false}
            showIcon={false}
            disabled={pending || (!auto && choice === zone)}
            onClick={() => save(false)}
            className="sm:w-auto"
          >
            {pending ? 'Saving…' : 'Use this'}
          </Button>
          {!auto && (
            <Button
              type="button"
              size="small"
              variant="secondary"
              shimmer={false}
              showIcon={false}
              disabled={pending}
              onClick={() => save(true)}
              className="sm:w-auto"
            >
              Follow this device
            </Button>
          )}
        </div>
      </div>
    </GlassPanel>
  );
}
