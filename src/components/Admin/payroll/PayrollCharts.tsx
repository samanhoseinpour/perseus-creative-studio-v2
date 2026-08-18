import { GlassRim, glassCard } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';

import type { PayChart, SalaryTrack } from './payrollData';

/**
 * The two member-facing payroll visuals. Server components on purpose — the
 * readouts are CSS `group-hover`, so nothing here reaches the client bundle.
 *
 * Bars and paths are plain markup, not a chart library: there is none in this
 * repo and none is wanted (see PayrollSections.tsx). Every figure is also
 * present as text and in an aria-label, so height is never the only carrier of
 * a value — and every number arrives PRE-FORMATTED from the server, so these
 * components do no money math.
 *
 * Glass tone only. The printed payslip keeps PayrollSections.tsx, whose literal
 * neutrals survive `dark:` and printing; nothing here is print-safe.
 */

function ChartFrame({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: string | null;
  children: React.ReactNode;
}) {
  return (
    <section className={cn(glassCard, 'flex flex-col p-5 sm:p-6')}>
      <GlassRim />
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
        {aside && (
          <span className="text-xs tabular-nums text-muted-foreground">
            {aside}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

/**
 * Month columns, oldest to newest. A month with no payment renders an empty slot
 * with a dotted baseline rather than a zero-height bar — the gap is the honest
 * reading, and it's the reason this is a column chart and not a curve.
 *
 * The plot box is one positioning context: column heights and the average rule
 * are both percentages of it, so they are guaranteed to share an axis. The
 * month labels sit OUTSIDE it, or they would eat into that scale.
 */
export function PayColumns({
  title,
  chart,
}: {
  title: string;
  chart: PayChart;
}) {
  const { columns, currencyLabel, averagePct, averageLabel } = chart;

  return (
    <ChartFrame title={title} aside={currencyLabel}>
      <div className="relative h-40 sm:h-48">
        {averagePct !== null && averageLabel && (
          <div
            className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-foreground/25"
            style={{ bottom: `${averagePct}%` }}
          >
            <span className="absolute -top-2.5 right-0 rounded-full bg-background/70 px-1.5 text-[0.65rem] tabular-nums text-muted-foreground backdrop-blur-sm">
              avg {averageLabel}
            </span>
          </div>
        )}

        <div className="flex h-full items-end gap-1 sm:gap-1.5">
          {columns.map((col) => (
            <div key={col.month} className="group flex h-full flex-1 items-end">
              <div
                className="relative w-full"
                style={{ height: col.pct > 0 ? `${col.pct}%` : undefined }}
              >
                {/* Readout on hover — the figures are all in the list below, so
                    this is an affordance, not the only way to read the chart. */}
                <span
                  className={cn(
                    'pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 w-max max-w-none -translate-x-1/2',
                    'rounded-md bg-foreground px-1.5 py-0.5 text-[0.65rem] font-medium tabular-nums text-background',
                    'opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100',
                    'motion-reduce:transition-none',
                  )}
                >
                  {col.valueLabel}
                </span>

                {col.pct > 0 ? (
                  <div
                    role="img"
                    aria-label={`${col.label}: ${col.valueLabel}${
                      col.partialLabel ? `, ${col.partialLabel}` : ''
                    }`}
                    className={cn(
                      'h-full w-full rounded-t-md transition-colors duration-200 motion-reduce:transition-none',
                      col.current
                        ? 'bg-foreground'
                        : 'bg-foreground/25 group-hover:bg-foreground/45',
                    )}
                  />
                ) : (
                  <div
                    role="img"
                    aria-label={`${col.label}: nothing paid`}
                    className="w-full border-t border-dashed border-foreground/20"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 flex gap-1 sm:gap-1.5">
        {columns.map((col) => (
          <span
            key={col.month}
            aria-hidden="true"
            className={cn(
              'flex-1 truncate text-center text-[0.65rem]',
              col.current
                ? 'font-semibold text-foreground'
                : 'text-muted-foreground',
            )}
          >
            {col.label}
          </span>
        ))}
      </div>
    </ChartFrame>
  );
}

/**
 * The standing-salary history as a step line — the raises, in order. x is the
 * term index rather than a date axis, so two terms a year apart and two a month
 * apart read the same: this answers "has it gone up?", not "when exactly".
 *
 * Falls back to the list alone when the terms span more than one anchor
 * currency, because two currencies share no y axis.
 */
export function SalarySteps({
  title,
  track,
  showList = true,
}: {
  title: string;
  track: SalaryTrack;
  /**
   * The admin member page renders its own term list (with the internal note and
   * who set it), so it takes the chart alone rather than showing terms twice.
   */
  showList?: boolean;
}) {
  const { steps, currencyLabel, chartable, raisesLabel } = track;
  const plottable = chartable && steps.length > 1;

  // A single term has no step to draw, and terms in two currencies share no
  // axis. Either way the caller that suppressed the list would be left with an
  // empty frame, so say what's there instead.
  if (steps.length === 0 || (!plottable && !showList)) {
    return (
      <ChartFrame title={title} aside={steps.length > 0 ? currencyLabel : undefined}>
        <p className="text-sm text-muted-foreground">
          {steps.length === 0
            ? 'Salary history will appear here once a figure is on file.'
            : steps.length === 1
              ? `One figure on file: ${steps[0].amountLabel}, from ${steps[0].label}.`
              : 'The figures on file span two currencies, so they share no chart.'}
        </p>
      </ChartFrame>
    );
  }

  return (
    <ChartFrame title={title} aside={raisesLabel ?? currencyLabel}>
      {plottable && <StepPlot steps={steps} />}

      {showList && (
      <dl className="mt-5 divide-y divide-white/40 dark:divide-white/10">
        {steps
          .slice()
          .reverse()
          .map((step) => (
            <div
              key={step.key}
              className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
            >
              <dt className="text-sm text-muted-foreground">{step.label}</dt>
              <dd className="flex items-baseline gap-2 text-right">
                {step.changeLabel && (
                  <span className="rounded-full bg-foreground/[0.06] px-1.5 py-0.5 text-[0.65rem] tabular-nums text-muted-foreground ring-1 ring-foreground/10">
                    {step.changeLabel}
                  </span>
                )}
                <span className="text-sm font-medium tabular-nums text-foreground">
                  {step.amountLabel}
                </span>
              </dd>
            </div>
          ))}
      </dl>
      )}
    </ChartFrame>
  );
}

/**
 * The step path. A 100x40 viewBox stretched to the panel width with
 * `preserveAspectRatio="none"`, so the geometry is pure percentages — but that
 * same scaling turns circles into ellipses, so the step dots are positioned HTML
 * over the SVG rather than <circle>s in it, off the identical maths.
 * `vector-effect` holds the stroke at 1.5px whatever the width.
 *
 * Decorative: every figure is in the list below it.
 */
function StepPlot({ steps }: { steps: { key: string; pct: number }[] }) {
  const w = 100;
  const h = 40;
  const pad = 4;
  const span = (w - pad * 2) / (steps.length - 1);
  // pct 0-100 -> y, inverted, with headroom so the top step isn't on the edge.
  const y = (pct: number) => h - pad - (pct / 100) * (h - pad * 2);
  // The last step runs to the right edge, so its dot sits there rather than one
  // span short — the flat run after a raise is the current salary.
  const x = (i: number) => (i === steps.length - 1 ? w - pad : pad + span * i);

  let d = `M ${pad} ${y(steps[0].pct)}`;
  for (let i = 1; i < steps.length; i += 1) {
    d += ` H ${pad + span * i} V ${y(steps[i].pct)}`;
  }
  d += ` H ${w - pad}`;

  return (
    <div className="relative h-24 w-full sm:h-28">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        className="h-full w-full"
      >
        <path
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          className="text-foreground"
        />
      </svg>
      {steps.map((step, i) => (
        <span
          key={step.key}
          aria-hidden="true"
          className="absolute size-2 -translate-x-1/2 translate-y-1/2 rounded-full border-[1.5px] border-foreground bg-background"
          style={{
            left: `${(x(i) / w) * 100}%`,
            bottom: `${((h - y(step.pct)) / h) * 100}%`,
          }}
        />
      ))}
    </div>
  );
}
