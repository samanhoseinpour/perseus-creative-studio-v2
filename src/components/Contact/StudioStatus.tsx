'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Live "Open now / Closed" pill for the studio's local business hours
 * (America/Vancouver, Mon–Fri 8am–6pm). Rendered inside the otherwise-server
 * contact rail as the page's only new client island.
 *
 * Hydration-safe: the server render and the first client paint both emit the
 * neutral placeholder (a muted dot, no live label); the real status is computed
 * in an effect after mount. Time is read through `Intl` with an IANA zone, never
 * a fixed UTC offset, so it stays correct across the PST↔PDT switch. A 60s
 * interval flips a long-lived tab across the 8am / 6pm boundary.
 */

type Status = { open: boolean; label: string };

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const closedHint = (weekday: string, hour: number): string => {
  if (WEEKDAYS.includes(weekday) && hour < 8) return 'back today 8am';
  if (weekday === 'Fri' || weekday === 'Sat' || weekday === 'Sun') return 'back Mon 8am';
  return 'back tomorrow 8am'; // Mon–Thu after hours
};

const computeStatus = (): Status => {
  // Studio-local weekday + hour, DST-correct via the IANA zone.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Vancouver',
    weekday: 'short',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(new Date());
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
  let hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  if (hour === 24) hour = 0; // some ICU builds emit '24' for midnight

  const open = WEEKDAYS.includes(weekday) && hour >= 8 && hour < 18;
  return open
    ? { open: true, label: 'Open now · replies fast' }
    : { open: false, label: `Closed · ${closedHint(weekday, hour)}` };
};

const StudioStatus = () => {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    setStatus(computeStatus());
    const id = setInterval(() => setStatus(computeStatus()), 60_000);
    return () => clearInterval(id);
  }, []);

  const open = status?.open ?? false;

  return (
    <div className="flex items-center gap-2.5">
      <span className="relative flex size-2" aria-hidden="true">
        {open && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500/60 motion-reduce:hidden" />
        )}
        <span
          className={cn(
            'relative inline-flex size-2 rounded-full transition-colors',
            !status && 'bg-black/20',
            status && (open ? 'bg-emerald-500' : 'bg-black/30'),
          )}
        />
      </span>
      <span className="text-sm text-black/70">
        {status ? status.label : 'Mon–Fri 8–6 PST'}
      </span>
    </div>
  );
};

export default StudioStatus;
