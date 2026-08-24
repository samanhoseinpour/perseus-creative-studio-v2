import { GlassPanel, GlassRim, glassCard } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';

/**
 * The presentational sections for /admin/costs.
 *
 * Written fresh rather than shared with PayrollSections.tsx, and the reason is
 * structural rather than stylistic: those components take a `tone` prop so they
 * can render onto the printed payslip, and nothing here does. Having no print
 * variant is what makes it IMPOSSIBLE to put the company's cost base on a sheet
 * that leaves the building — the InternalKpiPanel / ReportReadiness rule,
 * applied to the one dataset that is even more internal than the others.
 *
 * Bars are plain divs: there is no chart library in this repo and none is
 * wanted. Every number arrives PRE-FORMATTED from the server, so nothing here
 * does money math, and every figure is visible text as well as being in the
 * aria-label — a bar is redundant decoration, never the only carrier of a value.
 */

export function CostSection({
  title,
  aside,
  inset = false,
  children,
}: {
  title: string;
  /** Right-aligned sub-label on the heading row (a total, a caveat). */
  aside?: string;
  /** Move the heading inside the glass, so a section sharing a grid row with
   *  another panel lines up (the PayrollSection rule). */
  inset?: boolean;
  children: React.ReactNode;
}) {
  const heading = (
    <div
      className={cn(
        'flex items-baseline justify-between gap-3',
        inset ? 'mb-5' : 'mb-3 px-1',
      )}
    >
      <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {aside && (
        <span className="text-xs tabular-nums text-muted-foreground">
          {aside}
        </span>
      )}
    </div>
  );

  if (inset) {
    return (
      <GlassPanel as="section" className="flex h-full flex-col p-5 sm:p-6">
        {heading}
        {children}
      </GlassPanel>
    );
  }

  return (
    <section className="mt-6">
      {heading}
      <GlassPanel className="p-5 sm:p-6">{children}</GlassPanel>
    </section>
  );
}

export function CostTile({
  label,
  value,
  reading,
  hint,
  muted,
}: {
  label: string;
  value: string;
  /** An interpretation of the number directly above it — its own line. */
  reading?: string;
  /** The vs-previous-month comparison. */
  hint?: string;
  /** Dim the value when it's a placeholder ('—') rather than a real figure. */
  muted?: boolean;
}) {
  return (
    <div className={cn(glassCard, 'flex flex-col gap-1 p-5')}>
      <GlassRim />
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          'text-3xl font-semibold tabular-nums',
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

export type CostBarRow = {
  key: string;
  label: string;
  /** Pre-formatted amount, or '—' when there is nothing to show. */
  valueLabel: string;
  /** 0–100, scaled to the biggest row (2% floor so a sliver stays visible). */
  pct: number;
  /** The row the page is currently about — the selected month, say. */
  current?: boolean;
  /** A second label beside the first (a count, a share). */
  note?: string;
};

/**
 * A labelled bar strip. Used for both the 12-month trend (newest first, reading
 * top to bottom) and the category split. A zero row keeps a dashed rule rather
 * than a zero-width fill: an empty month is a fact worth seeing, and a bar of
 * nothing reads as a rendering bug.
 */
export function CostBars({
  rows,
  emptyLabel = 'nothing recorded',
}: {
  rows: CostBarRow[];
  /** What the aria-label says for a zero row. */
  emptyLabel?: string;
}) {
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
              {row.note && (
                <span className="ml-1.5 text-muted-foreground">
                  · {row.note}
                </span>
              )}
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
          {row.pct > 0 ? (
            <div
              role="img"
              aria-label={`${row.label}: ${row.valueLabel}`}
              className="mt-1 h-1.5 overflow-hidden rounded-full bg-foreground/[0.08]"
            >
              <div
                className={cn(
                  'h-full rounded-full',
                  row.current ? 'bg-foreground' : 'bg-foreground/40',
                )}
                style={{ width: `${row.pct}%` }}
              />
            </div>
          ) : (
            <div
              role="img"
              aria-label={`${row.label}: ${emptyLabel}`}
              className="mt-1 h-1.5 border-t border-dashed border-foreground/20"
            />
          )}
        </div>
      ))}
    </div>
  );
}

export type CostDetailRow = { label: string; value: string };

/** A plain label/value list — the plan dialog's history, the month's working. */
export function CostDetailList({ rows }: { rows: CostDetailRow[] }) {
  return (
    <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-3">
          <dt className="text-xs text-muted-foreground">{row.label}</dt>
          <dd className="text-sm tabular-nums text-foreground">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
