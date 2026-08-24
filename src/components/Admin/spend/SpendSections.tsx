import { GlassPanel, GlassRim, glassCard } from '@/components/Admin/Glass';
import type {
  SpendBarRow,
  SpendTrendRow,
} from '@/components/Admin/spend/types';
import { cn } from '@/lib/utils';

/**
 * The presentational sections for /admin/spend.
 *
 * Written fresh rather than shared with PayrollSections.tsx, and the reason is
 * structural rather than stylistic: those components take a `tone` prop so they
 * can render onto the printed payslip, and NOTHING HERE DOES. Having no print
 * variant is what makes it impossible to put the company's whole cost base on a
 * sheet that leaves the building — the InternalKpiPanel / CostSections rule,
 * applied to the one dataset that is more internal than either half alone.
 *
 * Bars are plain divs: there is no chart library in this repo and none is
 * wanted. Every number arrives PRE-FORMATTED from the server, so nothing here
 * does money math, and every figure is visible text as well as being in the
 * aria-label — a bar is redundant decoration, never the only carrier of a value.
 *
 * Two hues carry the whole section, and they are the same two the commitment
 * kind chips use (indigo = people, violet = costs), so the split strip, the
 * stacked trend and a roster row all read as one system rather than three
 * colour schemes. Literal class strings — Tailwind's scanner cannot see a
 * computed name.
 */

const PEOPLE_FILL = 'bg-indigo-500 dark:bg-indigo-400';
const PEOPLE_FILL_SOFT = 'bg-indigo-500/45 dark:bg-indigo-400/45';
const TOOLS_FILL = 'bg-violet-500 dark:bg-violet-400';
const TOOLS_FILL_SOFT = 'bg-violet-500/45 dark:bg-violet-400/45';

const BUCKET_FILL: Record<string, string> = {
  people: PEOPLE_FILL,
  fee: PEOPLE_FILL_SOFT,
  tools: TOOLS_FILL,
  oneoff: TOOLS_FILL_SOFT,
};

export function SpendSection({
  title,
  aside,
  children,
}: {
  title: string;
  /** Right-aligned sub-label on the heading row (a total, a caveat). */
  aside?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
        {aside && (
          <span className="text-xs tabular-nums text-muted-foreground">
            {aside}
          </span>
        )}
      </div>
      <GlassPanel className="p-5 sm:p-6">{children}</GlassPanel>
    </section>
  );
}

export function SpendTile({
  label,
  value,
  reading,
  hint,
  muted,
  emphasis,
}: {
  label: string;
  value: string;
  /** An interpretation of the number directly above it — its own line. */
  reading?: string;
  /** The vs-previous-month comparison. */
  hint?: string;
  /** Dim the value when it's a placeholder ('—') rather than a real figure. */
  muted?: boolean;
  /** The headline figure of the page — one tile only. */
  emphasis?: boolean;
}) {
  return (
    <div className={cn(glassCard, 'flex flex-col gap-1 p-5')}>
      <GlassRim />
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          'font-semibold tabular-nums',
          emphasis ? 'text-4xl' : 'text-3xl',
          muted ? 'text-muted-foreground' : 'text-foreground',
        )}
      >
        {value}
      </span>
      {reading && (
        <span className="text-xs tabular-nums text-foreground/70">
          {reading}
        </span>
      )}
      {hint && (
        <span className="text-xs tabular-nums text-muted-foreground">
          {hint}
        </span>
      )}
    </div>
  );
}

/**
 * Where one month's money went. A zero row keeps a dashed rule rather than a
 * zero-width fill: a bucket with nothing in it is a fact worth seeing, and a
 * bar of nothing reads as a rendering bug (the CostBars rule).
 */
export function SpendSplit({ rows }: { rows: SpendBarRow[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <div key={row.key}>
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="text-foreground">
              {row.label}
              {row.note && (
                <span className="ml-1.5 text-muted-foreground">
                  · {row.note}
                </span>
              )}
            </span>
            <span className="tabular-nums text-foreground">
              {row.valueLabel}
            </span>
          </div>
          {row.pct > 0 ? (
            <div
              role="img"
              aria-label={`${row.label}: ${row.valueLabel}`}
              className="mt-1 h-1.5 overflow-hidden rounded-full bg-foreground/[0.08]"
            >
              <div
                className={cn(
                  'h-full rounded-full',
                  BUCKET_FILL[row.key] ?? 'bg-foreground/40',
                )}
                style={{ width: `${row.pct}%` }}
              />
            </div>
          ) : (
            <div
              role="img"
              aria-label={`${row.label}: nothing recorded`}
              className="mt-1 h-1.5 border-t border-dashed border-foreground/20"
            />
          )}
        </div>
      ))}
    </div>
  );
}

/** The two-hue key the split and the trend share. Text as well as swatch — the
 *  colour is never the only thing saying which segment is which. */
export function SpendLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className={cn('size-2 rounded-full', PEOPLE_FILL)}
        />
        People
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className={cn('size-2 rounded-full', TOOLS_FILL)}
        />
        Running costs
      </span>
    </div>
  );
}

/**
 * Twelve months of total outflow, each bar split where the money went.
 *
 * Both segments are scaled against the biggest month's TOTAL, so a bar's whole
 * width is that month's outflow and the seam inside it is the split — one
 * picture answering "are we spending more" and "on what" at once, which the two
 * separate strips this replaced could not do.
 */
export function SpendTrend({ rows }: { rows: SpendTrendRow[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <div key={row.key}>
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span
              className={
                row.current
                  ? 'font-semibold text-foreground'
                  : 'text-muted-foreground'
              }
            >
              {row.label}
            </span>
            <span
              className={cn(
                'tabular-nums',
                row.current ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {row.valueLabel}
            </span>
          </div>
          {row.peoplePct + row.toolsPct > 0 ? (
            <div
              role="img"
              aria-label={row.reading}
              className="mt-1 flex h-1.5 gap-px overflow-hidden rounded-full bg-foreground/[0.08]"
            >
              {row.peoplePct > 0 && (
                <div
                  className={cn('h-full', PEOPLE_FILL)}
                  style={{ width: `${row.peoplePct}%` }}
                />
              )}
              {row.toolsPct > 0 && (
                <div
                  className={cn('h-full', TOOLS_FILL)}
                  style={{ width: `${row.toolsPct}%` }}
                />
              )}
            </div>
          ) : (
            <div
              role="img"
              aria-label={row.reading}
              className="mt-1 h-1.5 border-t border-dashed border-foreground/20"
            />
          )}
        </div>
      ))}
    </div>
  );
}
