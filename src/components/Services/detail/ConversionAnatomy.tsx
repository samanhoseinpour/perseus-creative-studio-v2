import type { WebsiteServiceContent } from '../types';

type Anatomy = NonNullable<WebsiteServiceContent['conversionAnatomy']>;

/** Skeleton heights per block index, so the wireframe reads like a real page. */
const SHAPE = [
  'h-20',
  'h-10',
  'h-14',
  'h-12',
  'h-10',
];

/**
 * Landing Pages signature — an annotated conversion wireframe. A stacked page of
 * numbered skeleton blocks on the left, with the matching numbered rationale on
 * the right, so the anatomy of a page that converts is visible. Static (server
 * component); pure studio tokens — hairline frame, mono numbers, skeleton fills.
 */
const ConversionAnatomy = ({ blocks }: Anatomy) => (
  <div className="grid gap-6 lg:grid-cols-[0.85fr_1fr] lg:gap-10">
    {/* Wireframe */}
    <div className="rounded-2xl bg-background-contrast p-5 sm:p-6">
      <div className="mx-auto flex max-w-sm flex-col gap-3">
        {blocks.map((b, i) => (
          <div
            key={b.label}
            className={`relative flex ${SHAPE[i % SHAPE.length]} flex-col justify-center gap-2 rounded-lg bg-black/[0.05] px-4`}
          >
            <span className="absolute -left-2.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full bg-black font-mono text-[11px] font-semibold tabular-nums text-white">
              {i + 1}
            </span>
            <span className="ml-3 block h-2 w-1/2 rounded-full bg-black/15" />
            <span className="ml-3 block h-2 w-3/4 rounded-full bg-black/10" />
          </div>
        ))}
      </div>
    </div>

    {/* Annotations */}
    <ol className="flex flex-col border-t border-black/10">
      {blocks.map((b, i) => (
        <li
          key={b.label}
          className="flex items-baseline gap-4 border-b border-black/10 py-5"
        >
          <span className="font-mono text-[11px] tabular-nums text-black/35">
            {String(i + 1).padStart(2, '0')}
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-semibold tracking-tight">{b.label}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-black/60">
              {b.note}
            </p>
          </div>
        </li>
      ))}
    </ol>
  </div>
);

export default ConversionAnatomy;
