import type { ServiceIncludedItem } from '../types';

/** Clapperboard stripe — a thin diagonal black/white band across the slate. */
const CLAPPER = {
  backgroundImage:
    'repeating-linear-gradient(-45deg, #fff 0 12px, #111 12px 24px)',
};

/**
 * Production Scope signature — a film call sheet, not a generic grid. A clapper-
 * striped slate header (Production · Call sheet · Rev) over a manifest of numbered
 * line items, each tagged with a frame number ("01A") in the ContactSheet's film
 * language, so "what's included" reads like a shoot document. Static server
 * component; studio tokens with the one film accent (the slate).
 */
const ProductionCallSheet = ({ items }: { items: ServiceIncludedItem[] }) => (
  <div className="overflow-hidden rounded-3xl ring-1 ring-inset ring-black/10">
    {/* Slate header */}
    <div className="bg-black text-white">
      <div className="h-2.5 w-full" style={CLAPPER} />
      <div className="flex items-center justify-between px-6 py-4 sm:px-8">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/70">
          Production · Call sheet
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
          Rev A · {String(items.length).padStart(2, '0')} items
        </span>
      </div>
    </div>

    {/* Manifest */}
    <ol>
      {items.map((item, i) => {
        const frame = `${String(i + 1).padStart(2, '0')}${String.fromCharCode(
          65 + (i % 3),
        )}`;
        return (
          <li
            key={item.title}
            className="flex gap-4 border-t border-black/10 px-6 py-6 first:border-t-0 sm:gap-6 sm:px-8"
          >
            <span className="mt-0.5 shrink-0 rounded-md bg-black/[0.04] px-2 py-1 font-mono text-[11px] tabular-nums tracking-tight text-black/55 ring-1 ring-inset ring-black/10">
              {frame}
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold tracking-tight sm:text-lg">
                {item.title}
              </h3>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-black/60">
                {item.description}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  </div>
);

export default ProductionCallSheet;
