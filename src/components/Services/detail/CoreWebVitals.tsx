import type { WebsiteServiceContent } from '../types';

type Vitals = NonNullable<WebsiteServiceContent['coreWebVitals']>;

const RATING = {
  good: { label: 'Good', color: '#0cce6b' },
  'needs-improvement': { label: 'Needs work', color: '#ffa400' },
  poor: { label: 'Poor', color: '#ff4e42' },
} as const;

/**
 * Performance & SEO Audit signature — a Core Web Vitals panel. Each metric sits
 * on a good / needs-improvement / poor scale with the measured value marked, so
 * the audit reads like the report Google grades you on. Static (server
 * component). Studio tokens + the Lighthouse colour bands used across the site.
 */
const CoreWebVitals = ({ metrics }: Vitals) => (
  <div className="rounded-3xl p-6 sm:p-8 lg:p-10">
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-[0.14em] text-black/45">
      {Object.values(RATING).map((r) => (
        <span key={r.label} className="flex items-center gap-2">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: r.color }}
          />
          {r.label}
        </span>
      ))}
    </div>

    <div className="mt-8 flex flex-col gap-7">
      {metrics.map((m) => {
        const r = RATING[m.rating];
        return (
          <div key={m.label}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium tracking-tight text-black/75">
                {m.label}
              </span>
              <span className="flex items-baseline gap-2.5">
                <span
                  className="rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white"
                  style={{ backgroundColor: r.color }}
                >
                  {r.label}
                </span>
                <span className="font-mono text-[14px] tabular-nums text-black/70">
                  {m.value}
                </span>
              </span>
            </div>

            {/* Scale with zones + marker */}
            <div className="relative mt-3 h-2.5 w-full overflow-hidden rounded-full">
              <div className="absolute inset-0 flex">
                <span
                  className="h-full w-1/2"
                  style={{ backgroundColor: '#0cce6b', opacity: 0.85 }}
                />
                <span
                  className="h-full w-1/4"
                  style={{ backgroundColor: '#ffa400', opacity: 0.85 }}
                />
                <span
                  className="h-full w-1/4"
                  style={{ backgroundColor: '#ff4e42', opacity: 0.85 }}
                />
              </div>
              <span
                className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-black shadow-sm"
                style={{ left: `${Math.min(Math.max(m.position, 2), 98)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export default CoreWebVitals;
