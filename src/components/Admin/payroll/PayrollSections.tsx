import { LuInfo, LuTriangleAlert } from 'react-icons/lu';

import { GlassPanel, GlassRim, glassCard } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';

/**
 * Payroll's presentational sections, shared verbatim between the glass dashboards
 * and the /print payslip (the ReportSections.tsx contract): print tone uses
 * LITERAL neutrals so `dark:` never applies and backgrounds survive printing
 * without color-adjust hacks, and every number arrives PRE-FORMATTED from the
 * server, so the printed sheet shows the exact strings the dashboard did.
 *
 * Bars are plain divs — there is no chart library in this repo and none is
 * wanted. The numbers are visible text as well as being in the aria-label, so a
 * bar is redundant decoration rather than the only carrier of the value.
 */

export type PayrollTone = 'glass' | 'print';

/*
 * Print tone = theme tokens on SCREEN, literal neutrals on PAPER.
 *
 * It used to return the literal neutrals unconditionally, on the reasoning that
 * a printed sheet must not follow the theme. That was right about paper and
 * wrong about the screen: the sheet is read in the browser long before anyone
 * prints it, and `--color-white`/`--color-black` are FLIP tokens here, so the
 * page around this ink turned near-black in dark mode while the ink stayed
 * near-black. The `print:` half keeps the printer honest — `text-foreground`
 * sent to a printer from dark mode would be white ink on white paper.
 */
const track = (tone: PayrollTone) =>
  tone === 'print'
    ? 'bg-foreground/[0.08] print:bg-neutral-100'
    : 'bg-foreground/[0.08]';
const fill = (tone: PayrollTone) =>
  tone === 'print' ? 'bg-foreground print:bg-neutral-900' : 'bg-foreground';
const baseFill = (tone: PayrollTone) =>
  tone === 'print'
    ? 'bg-foreground/40 print:bg-neutral-400'
    : 'bg-foreground/40';
const primaryText = (tone: PayrollTone) =>
  tone === 'print'
    ? 'text-foreground print:text-neutral-900'
    : 'text-foreground';
const mutedText = (tone: PayrollTone) =>
  tone === 'print'
    ? 'text-muted-foreground print:text-neutral-500'
    : 'text-muted-foreground';

export function PayrollSection({
  tone,
  title,
  aside,
  inset = false,
  children,
}: {
  tone: PayrollTone;
  title: string;
  /** Right-aligned sub-label on the heading row (a total, a caveat). */
  aside?: string;
  /**
   * Move the heading INSIDE the glass (the {@link ChartFrame} anatomy). The
   * default keeps it above the panel, which is right for a stacked page — but
   * puts the glass ~24px lower than a chart's in the SAME grid row, so the two
   * rectangles never line up. Set this when a section shares a row with a
   * chart. Ignored in print tone, where sections are stacked on paper.
   */
  inset?: boolean;
  children: React.ReactNode;
}) {
  if (tone === 'print') {
    return (
      <section className="mt-8 break-inside-avoid">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground print:text-neutral-500">
            {title}
          </h2>
          {aside && (
            <span className="text-xs tabular-nums text-muted-foreground print:text-neutral-500">
              {aside}
            </span>
          )}
        </div>
        {children}
      </section>
    );
  }
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

/**
 * Headline stat tile. Same anatomy as the reports dashboard's tile, kept local
 * rather than imported so the payroll tree has no cross-domain dependency (the
 * de-barreling discipline) — a 20-line presentational duplicate is cheaper than
 * the coupling.
 */
export function PayrollTile({
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

export type PayrollTrendRow = {
  month: string;
  label: string;
  /** Pre-formatted amount, or '—'. */
  valueLabel: string;
  /** 0–100, scaled to the biggest row (2% floor so a sliver stays visible). */
  pct: number;
  current: boolean;
  /** Partial month — the bar is honestly shorter, so say why. */
  partialLabel?: string;
};

/** Month-by-month strip. Reads top-to-bottom, oldest last (newest first). */
export function PayrollTrend({
  tone,
  rows,
  title,
  aside,
}: {
  tone: PayrollTone;
  rows: PayrollTrendRow[];
  title: string;
  aside?: string;
}) {
  return (
    <PayrollSection tone={tone} title={title} aside={aside}>
      <div className="flex flex-col gap-2.5">
        {rows.map((row) => (
          <div key={row.month}>
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span
                className={
                  row.current
                    ? cn('font-semibold', primaryText(tone))
                    : mutedText(tone)
                }
              >
                {row.label}
                {row.partialLabel && (
                  <span className={cn('ml-1.5', mutedText(tone))}>
                    · {row.partialLabel}
                  </span>
                )}
              </span>
              <span
                className={cn(
                  'tabular-nums',
                  row.current ? primaryText(tone) : mutedText(tone),
                )}
              >
                {row.valueLabel}
              </span>
            </div>
            <div
              role="img"
              aria-label={`${row.label}: ${
                row.valueLabel === '—' ? 'nothing paid' : row.valueLabel
              }`}
              className={cn(
                'mt-1 h-1.5 overflow-hidden rounded-full',
                track(tone),
              )}
            >
              <div
                className={cn(
                  'h-full rounded-full',
                  row.current ? fill(tone) : baseFill(tone),
                )}
                style={{ width: `${row.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </PayrollSection>
  );
}

export type GrowthSplitProps = {
  tone: PayrollTone;
  /** 'vs July 2026' — names the month being compared against. */
  againstLabel: string;
  /** The delivered-amount change, pre-formatted ('+66.5%'). */
  paidPctLabel: string | null;
  /** Their own pay's contribution ('+55.6%'). */
  anchorPctLabel: string | null;
  /** The exchange rate's contribution ('+7.1%'). */
  ratePctLabel: string | null;
  /** Delivery currency label, for the sentence ('toman'). */
  currencyLabel: string;
  /**
   * True when paid = anchor x rate held exactly, so the split can be stated as
   * arithmetic. False when the delivered figure was overridden — the components
   * are still real, they just don't compose to the total.
   */
  exact: boolean;
  /** Either month was a partial month; the comparison needs the caveat. */
  partial: boolean;
  /** Heading inside the glass — set when sharing a grid row with a chart. */
  inset?: boolean;
};

/**
 * The feature's headline insight: a member paid in toman against a CAD figure
 * sees TWO things moving at once, and conflating them is the thing that makes
 * payroll feel arbitrary. Because paid = anchor x rate, the change decomposes
 * exactly — (1+d_anchor)(1+d_rate)-1 = d_paid — so this says which half did what.
 *
 * Renders nothing when there is no prior month to compare against.
 */
export function GrowthSplit({
  tone,
  againstLabel,
  paidPctLabel,
  anchorPctLabel,
  ratePctLabel,
  currencyLabel,
  exact,
  partial,
  inset = false,
}: GrowthSplitProps) {
  if (!paidPctLabel) return null;

  const hasSplit = Boolean(anchorPctLabel && ratePctLabel);

  return (
    <PayrollSection
      tone={tone}
      title="Change"
      aside={againstLabel}
      inset={inset}
    >
      <p
        className={cn(
          'text-2xl font-semibold tabular-nums',
          primaryText(tone),
        )}
      >
        {paidPctLabel}
        <span className={cn('ml-2 text-sm font-normal', mutedText(tone))}>
          {currencyLabel} received
        </span>
      </p>

      {hasSplit && (
        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:gap-4">
          <Contribution
            tone={tone}
            label="Your pay"
            value={anchorPctLabel!}
            note="the figure your salary is set in"
          />
          <Contribution
            tone={tone}
            label="Exchange rate"
            value={ratePctLabel!}
            note="CAD to toman, this month vs last"
          />
        </div>
      )}

      {hasSplit && exact && (
        <p className={cn('mt-4 text-xs', mutedText(tone))}>
          Those two multiply out to the total above, and nothing else moved.
        </p>
      )}
      {hasSplit && !exact && (
        <p className={cn('mt-4 flex gap-1.5 text-xs', mutedText(tone))}>
          <LuInfo className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>
            Both figures are exact, but they don’t multiply out to the total:
            the amount actually sent was rounded or adjusted.
          </span>
        </p>
      )}
      {partial && (
        <p
          className={cn(
            'mt-3 flex gap-1.5 text-xs',
            tone === 'print'
              ? 'text-amber-700 dark:text-amber-400 print:text-neutral-600'
              : 'text-amber-700 dark:text-amber-400',
          )}
        >
          <LuTriangleAlert
            className="mt-0.5 size-3.5 shrink-0"
            aria-hidden="true"
          />
          <span>
            One of these months was a partial month, so the comparison isn’t
            like-for-like.
          </span>
        </p>
      )}
    </PayrollSection>
  );
}

function Contribution({
  tone,
  label,
  value,
  note,
}: {
  tone: PayrollTone;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div
      className={cn(
        'flex-1 rounded-xl px-4 py-3',
        tone === 'print'
          ? 'bg-foreground/[0.04] print:border print:border-neutral-200 print:bg-transparent'
          : 'bg-foreground/[0.04] dark:bg-white/[0.06]',
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className={cn('text-xs font-medium', mutedText(tone))}>
          {label}
        </span>
        <span
          className={cn(
            'text-base font-semibold tabular-nums',
            primaryText(tone),
          )}
        >
          {value}
        </span>
      </div>
      <p className={cn('mt-0.5 text-[0.7rem]', mutedText(tone))}>{note}</p>
    </div>
  );
}

export type DetailRow = {
  label: string;
  value: string;
  /** Secondary line under the value (the proration working, the rate). */
  note?: string;
};

/** Label/value list — the payslip's body and the member's month breakdown. */
export function DetailList({
  tone,
  rows,
}: {
  tone: PayrollTone;
  rows: DetailRow[];
}) {
  return (
    <dl
      className={cn(
        'divide-y',
        tone === 'print'
          ? 'divide-foreground/10 print:divide-neutral-200'
          : 'divide-white/40 dark:divide-white/10',
      )}
    >
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
        >
          <dt className={cn('text-sm', mutedText(tone))}>{row.label}</dt>
          <dd className="text-right">
            <span
              className={cn(
                'text-sm font-medium tabular-nums',
                primaryText(tone),
              )}
            >
              {row.value}
            </span>
            {row.note && (
              <span className={cn('block text-xs', mutedText(tone))}>
                {row.note}
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
