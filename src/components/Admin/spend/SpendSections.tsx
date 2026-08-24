import Link from 'next/link';

import { GlassPanel, GlassRim, glassCard } from '@/components/Admin/Glass';
import type {
  SpendBarRow,
  SpendLineGroup,
  SpendLineRow,
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
 * The bars are INK, not hues. The admin theme carries no chroma of its own
 * (--primary is a zero-chroma oklch), and /admin/costs, /admin/reports and the
 * leaderboard all draw a bar the same way: an 8%-foreground track under a
 * foreground fill, quietened with opacity where something is secondary. Spend
 * was the one money screen spending indigo and violet on it, which read as a
 * different product sitting one rail row above Bills.
 *
 * So the four buckets are one ink ramp ordered darkest-to-lightest — salaries,
 * wire fees, recurring costs, one-offs — and the split still reads with no
 * colour at all. Opacity is doing the same job hue was, and it survives dark
 * mode, print and a colour-blind reader without a second palette. Literal
 * class strings — Tailwind's scanner cannot see a computed name.
 */

const PEOPLE_FILL = 'bg-foreground';
const PEOPLE_FILL_SOFT = 'bg-foreground/70';
const TOOLS_FILL = 'bg-foreground/40';
const TOOLS_FILL_SOFT = 'bg-foreground/20';

/** A Where-it-went line. The biggest row in a group is full ink; the rest step
 *  back so the ranking reads before a figure does. */
const LINE_FILL_TOP = 'bg-foreground';
const LINE_FILL = 'bg-foreground/45';

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
  className,
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
  /** Grid placement from the caller (the emphasis tile spans two columns).
   *  Layout only — never a colour or a type size, which belong here. */
  className?: string;
}) {
  return (
    <div className={cn(glassCard, 'flex h-full flex-col gap-1 p-5', className)}>
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

/**
 * Who and what, under the split — the people on one side, the bills on the
 * other. The aggregate bars above say how much left; these say whose salary
 * and which subscription it was.
 *
 * Two columns from `md` up, each an independent grid cell, so a month with
 * twelve bills beside three people simply makes one side taller instead of
 * pushing the other out of shape. Rows are the MemberBars grammar (label left,
 * figures right, bar under) and the same ink ramp as everything else: within a
 * group the biggest row is full foreground and the rest step down, so the
 * ranking reads before any number is parsed.
 *
 * Every row scales against ITS OWN group's biggest, never across both. Scaled
 * together, a CA$30 subscription beside a salary would be a hairline nobody
 * could compare with the charge under it — and comparing the bills with each
 * other is the entire reason this list exists.
 */
export function SpendLines({ groups }: { groups: SpendLineGroup[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 md:gap-x-8">
      {groups.map((group) => (
        <section key={group.key} className="min-w-0">
          <div className="mb-2.5 flex items-baseline justify-between gap-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {group.title}
            </h3>
            <span className="text-xs tabular-nums text-muted-foreground">
              {group.aside}
            </span>
          </div>
          {group.rows.length === 0 ? (
            <p className="text-xs text-muted-foreground">{group.emptyLabel}</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {group.rows.map((row) => (
                <li key={row.key} className="min-w-0">
                  {/* min-w-0 + truncate on the name and shrink-0 on the figure:
                      a long vendor name shortens itself rather than pushing the
                      amount out of the row. The list has to survive a name
                      nobody has typed yet. */}
                  <div className="flex items-baseline justify-between gap-3 text-xs">
                    <span className="flex min-w-0 items-baseline gap-1.5">
                      <SpendLineName row={row} />
                      {row.meta && (
                        <span className="shrink-0 truncate text-muted-foreground">
                          · {row.meta}
                        </span>
                      )}
                      {row.chipLabel && (
                        <span
                          className={cn(
                            'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[0.65rem] font-medium',
                            row.chipTone,
                          )}
                        >
                          {row.chipLabel}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 tabular-nums text-foreground">
                      {row.shareLabel && (
                        <span className="mr-1.5 text-muted-foreground">
                          {row.shareLabel}
                        </span>
                      )}
                      {row.valueLabel}
                    </span>
                  </div>
                  <div
                    role="img"
                    aria-label={`${row.name}: ${row.valueLabel}`}
                    className="mt-1 h-1.5 overflow-hidden rounded-full bg-foreground/[0.08]"
                  >
                    <div
                      className={cn(
                        'h-full rounded-full',
                        row.pct >= 100 ? LINE_FILL_TOP : LINE_FILL,
                      )}
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
          {group.remainder && (
            // Carries its AMOUNT, not just a count: the rows above plus this
            // line still add to the bucket, so a capped list can never be
            // mistaken for the whole of it.
            <Link
              href={group.remainder.href}
              className="mt-2.5 inline-block text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              {group.remainder.label}
            </Link>
          )}
        </section>
      ))}
    </div>
  );
}

/** The row's name — a link where there is somewhere to go, plain text where
 *  there is not, and truncating either way. */
function SpendLineName({ row }: { row: SpendLineRow }) {
  if (!row.href) {
    return <span className="truncate text-foreground">{row.name}</span>;
  }
  return (
    <Link
      href={row.href}
      className="truncate text-foreground underline-offset-2 hover:underline"
    >
      {row.name}
    </Link>
  );
}

/** The key the split and the trend share. Text as well as swatch — the shade
 *  is never the only thing saying which segment is which, which matters more
 *  now that the two differ by opacity rather than by hue. */
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
