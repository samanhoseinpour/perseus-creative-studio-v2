import type { ComponentType } from 'react';
import { LuArrowUp, LuSearch, LuTrendingUp } from 'react-icons/lu';

import { cn } from '@/lib/utils';

/**
 * Cell-filling artifact visuals for the Digital Marketing category — the two
 * channels with no single honest brand mark (SEO is a discipline, CRO is a
 * method), distilled from their detail-page signatures: the SERP rank-climb
 * (`detail/SerpRankClimb.tsx`) and the conversion funnel (`detail/FunnelChart.tsx`).
 * The other four DM channels keep their real platform logos (Google Ads, Meta,
 * LinkedIn, GA4) via the card's `isBrandLogo` treatment.
 *
 * Pure media, no internal heading (the card footer names the service). Structure
 * uses only theme tokens, so the same component reads on the bento's adaptive
 * `bg-background-contrast` cell in light and dark. `ServiceBentoCard` resolves
 * one of these before its logo/photo treatment; merged in `visuals/index.ts`.
 */

// SEO — a faux SERP with the client's result pinned at #1, carrying a "#4 → #1"
// climb chip, over two faint skeleton results. The end-state of SerpRankClimb.
const SerpClimbVisual = () => (
  <div className="flex h-full w-full flex-col justify-center gap-2">
    {/* Search bar */}
    <div className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5">
      <LuSearch aria-hidden className="size-3 shrink-0 text-muted-foreground" />
      <span className="h-1.5 flex-1 rounded-full bg-foreground/15" />
    </div>

    {/* The #1 result — ink card */}
    <div className="rounded-lg bg-foreground p-2.5 text-background">
      <div className="flex items-center gap-1.5">
        <span className="grid size-4 shrink-0 place-items-center rounded-full bg-background text-[9px] font-semibold text-foreground">
          1
        </span>
        <span className="inline-flex items-center gap-0.5 rounded-full bg-background/20 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em]">
          <LuArrowUp aria-hidden className="size-2.5" />
          #4 → #1
        </span>
      </div>
      <div className="mt-2 space-y-1">
        <span className="block h-1.5 w-3/4 rounded-full bg-background/25" />
        <span className="block h-1.5 w-1/2 rounded-full bg-background/25" />
      </div>
    </div>

    {/* Faint runners-up */}
    {[2, 3].map((n) => (
      <div key={n} className="flex items-start gap-2 px-1">
        <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
          {n}
        </span>
        <div className="flex-1 space-y-1">
          <span className="block h-1.5 w-2/3 rounded-full bg-foreground/10" />
          <span className="block h-1.5 w-1/2 rounded-full bg-foreground/10" />
        </div>
      </div>
    ))}
  </div>
);

// CRO — a compact, centered conversion funnel: bars taper to the ink "converted"
// stage under a quiet uplift caption. Kept deliberately short (the cell can be a
// small bento tile) so it never crowds the card's title/tagline footer below it,
// and the caption stays muted so it doesn't compete with the title.
const FUNNEL = [100, 70, 44, 26] as const;

const FunnelVisual = () => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-1.5">
    <div className="flex w-full flex-col items-center gap-1">
      {FUNNEL.map((w, i) => (
        <span
          key={w}
          className={cn(
            'block h-2.5 rounded-[3px]',
            i === FUNNEL.length - 1 ? 'bg-foreground' : 'bg-foreground/20',
          )}
          style={{ width: `${w}%` }}
        />
      ))}
    </div>
    <span className="inline-flex items-center gap-1 font-mono text-[10px] tracking-tight text-muted-foreground">
      <LuTrendingUp aria-hidden className="size-3 text-foreground" />
      +73% conversions
    </span>
  </div>
);

// Registry keyed by `${categorySlug}/${serviceSlug}` (see socialBentoVisuals).
// Only these two DM services carry a visual; the rest fall through to their
// brand logo. Merged with the other categories' maps in `visuals/index.ts`.
export const MARKETING_BENTO_VISUALS: Record<string, ComponentType> = {
  'digital-marketing/seo': SerpClimbVisual,
  'digital-marketing/conversion-rate-optimization': FunnelVisual,
};
