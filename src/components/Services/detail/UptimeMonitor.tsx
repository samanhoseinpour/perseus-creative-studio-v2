import type { WebsiteServiceContent } from '../types';

type Uptime = NonNullable<WebsiteServiceContent['uptimeMonitor']>;

/** Status-page colour banding (matches the Lighthouse palette used elsewhere). */
const barColor = (v: number) => {
  if (v >= 99) return '#0cce6b';
  if (v >= 90) return '#ffa400';
  return '#ff4e42';
};

/**
 * Website Maintenance signature — a status-page panel: an "operational" header
 * with overall uptime, a per-service status list, and a 90-day uptime strip.
 * Static (server component). Studio tokens with status-green/amber/red dots
 * (the one allowed colour exception, consistent with MetricGauge).
 */
const UptimeMonitor = ({
  uptime,
  services,
  history,
  chips,
}: Uptime) => (
  <div className="rounded-3xl p-6 ring-1 ring-inset ring-black/10 sm:p-8">
    {/* Header */}
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-2.5">
        <span className="relative flex size-2.5">
          <span
            className="absolute inline-flex size-full animate-ping rounded-full opacity-60"
            style={{ backgroundColor: '#0cce6b' }}
          />
          <span
            className="relative inline-flex size-2.5 rounded-full"
            style={{ backgroundColor: '#0cce6b' }}
          />
        </span>
        <span className="text-sm font-semibold tracking-tight text-black/85">
          All systems operational
        </span>
      </div>
      <span className="font-mono text-[13px] tabular-nums text-black/60">
        {uptime} uptime
      </span>
    </div>

    {/* 90-day strip */}
    <div className="mt-7">
      <div className="flex items-end gap-[2px]">
        {history.map((v, i) => (
          <div
            key={i}
            className="h-8 flex-1 rounded-[1px]"
            style={{ backgroundColor: barColor(v), opacity: v >= 99 ? 0.9 : 1 }}
            title={`Day ${i + 1}: ${v}%`}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-black/35">
        <span>90 days ago</span>
        <span>Today</span>
      </div>
    </div>

    {/* Service list */}
    <ul className="mt-7 grid border-t border-black/10 sm:grid-cols-2">
      {services.map((s, i) => (
        <li
          key={s.name}
          className={[
            'flex items-center justify-between border-b border-black/10 py-3.5 sm:px-5',
            i % 2 === 0 ? 'sm:border-r sm:border-black/10 sm:pl-0' : '',
          ].join(' ')}
        >
          <span className="text-sm tracking-tight text-black/75">{s.name}</span>
          <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-black/45">
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: '#0cce6b' }}
            />
            {s.status}
          </span>
        </li>
      ))}
    </ul>

    {chips && chips.length > 0 && (
      <div className="mt-6 flex flex-wrap gap-2">
        {chips.map((c) => (
          <span
            key={c}
            className="rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-black/55 ring-1 ring-inset ring-black/15"
          >
            {c}
          </span>
        ))}
      </div>
    )}
  </div>
);

export default UptimeMonitor;
