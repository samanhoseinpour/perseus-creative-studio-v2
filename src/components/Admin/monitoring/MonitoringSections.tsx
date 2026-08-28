import {
  LuArrowUpRight,
  LuCircleCheck,
  LuHeartPulse,
  LuSiren,
} from 'react-icons/lu';

import CopyChip from '@/components/Admin/CopyChip';
import EmptyState from '@/components/Admin/EmptyState';
import { GlassPanel, GlassRim, adminLink, glassCard, glassChip } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';
import type {
  ChipData,
  CronRow,
  DependencyRow,
  GroupRow,
  IncidentRow,
  MonitoringTile,
  MonitoringView,
  RouteRow,
  SeriesColumn,
  SloViewRow,
  VercelLinkRow,
} from './types';

/**
 * The presentational sections for /admin/monitoring. Server components
 * throughout — the page's only client leaves are CheckNowButton and CopyChip.
 *
 * Written on the CostSections.tsx pattern and, like it, with NO `tone` prop:
 * having no print variant is what makes it impossible to put the operational
 * picture — every route that ever threw, every service the studio runs on —
 * onto a sheet that leaves the building.
 *
 * Bars and columns are plain divs (there is no chart library in this repo and
 * none is wanted); every figure is visible text and in an aria-label, so a
 * bar is decoration, never the only carrier of a value. Status is never colour
 * alone: every chip carries its word. Progressive disclosure is the native
 * <details> element, so the first screen is the summary and the ids an
 * operator pastes into Vercel are one click away without any JavaScript.
 */

export function MonitoringSection({
  title,
  aside,
  inset = false,
  children,
}: {
  title: string;
  aside?: string;
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
        <span className="text-xs tabular-nums text-muted-foreground">{aside}</span>
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

const chipBase =
  'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-medium';

export function StatusChip({
  chip,
  className,
}: {
  chip: ChipData;
  className?: string;
}) {
  return <span className={cn(chipBase, chip.tone, className)}>{chip.label}</span>;
}

/** The headline tile: the derived status, its word, and why. */
export function StatusTile({ status }: { status: MonitoringView['status'] }) {
  const Icon = status.status === 'healthy' ? LuCircleCheck : status.status === 'incident' ? LuSiren : LuHeartPulse;
  return (
    <div className={cn(glassCard, 'flex flex-col gap-2 p-5')}>
      <GlassRim />
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        System status
      </span>
      <span className="flex items-center gap-2">
        <Icon aria-hidden="true" className="size-5 shrink-0 text-foreground" />
        <StatusChip chip={status.chip} className="px-3 py-1 text-sm" />
      </span>
      <span className="text-xs text-muted-foreground">{status.reason}</span>
    </div>
  );
}

export function MonitoringTileCard({ tile }: { tile: MonitoringTile }) {
  return (
    <div className={cn(glassCard, 'flex flex-col gap-1 p-5')}>
      <GlassRim />
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {tile.label}
      </span>
      <span
        className={cn(
          'text-3xl font-semibold tabular-nums',
          tile.muted ? 'text-muted-foreground' : 'text-foreground',
        )}
      >
        {tile.value}
      </span>
      {tile.reading && (
        <span className="text-xs tabular-nums text-foreground/70">{tile.reading}</span>
      )}
      {tile.hint && (
        <span className="text-xs tabular-nums text-muted-foreground">{tile.hint}</span>
      )}
    </div>
  );
}

/** A section whose read threw — named, never silently blank. */
export function SectionUnavailable({ name }: { name: string }) {
  return (
    <div className="border-t border-dashed border-foreground/20 pt-3 text-xs text-muted-foreground">
      Couldn’t load {name}. The headline above is marked unknown until this read succeeds.
    </div>
  );
}

/**
 * Server errors over time — the PayColumns technique: a plot box that is one
 * positioning context, columns as percentages of it, a CSS group-hover
 * readout that is aria-hidden because the sr-only table below carries every
 * figure for a screen reader.
 */
export function ErrorColumns({
  columns,
  totalLabel,
  rangeLabel,
  hasErrors,
}: {
  columns: SeriesColumn[];
  totalLabel: string;
  rangeLabel: string;
  hasErrors: boolean;
}) {
  return (
    <div>
      <div className="relative h-40 sm:h-48">
        <div className="flex h-full items-end gap-1 sm:gap-1.5">
          {columns.map((col) => (
            <div key={col.key} className="group flex h-full flex-1 items-end">
              <div
                className="relative w-full"
                style={{ height: col.pct > 0 ? `${col.pct}%` : undefined }}
              >
                <span
                  aria-hidden="true"
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
                    aria-hidden="true"
                    className={cn(
                      'h-full w-full rounded-t-md transition-colors duration-200 motion-reduce:transition-none',
                      col.current
                        ? 'bg-foreground'
                        : 'bg-foreground/25 group-hover:bg-foreground/45',
                    )}
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="w-full border-t border-dashed border-foreground/20"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex gap-1 sm:gap-1.5" aria-hidden="true">
        {columns.map((col, i) => (
          <span
            key={col.key}
            className={cn(
              'flex-1 truncate text-center text-[0.6rem]',
              col.current ? 'font-semibold text-foreground' : 'text-muted-foreground',
              // Thin the labels so they never overlap: every column keeps its
              // slot, only every Nth prints its label.
              i % Math.max(1, Math.ceil(columns.length / 8)) !== 0 && i !== columns.length - 1 && 'invisible',
            )}
          >
            {col.label}
          </span>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {hasErrors ? `${totalLabel} in the ${rangeLabel.toLowerCase()}` : `No server errors in the ${rangeLabel.toLowerCase()}`}
      </p>
      <table className="sr-only">
        <caption>Server errors by period, {rangeLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Period starting</th>
            <th scope="col">Errors</th>
          </tr>
        </thead>
        <tbody>
          {columns.map((col) => (
            <tr key={col.key}>
              <td>{col.label}</td>
              <td>{col.valueLabel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The opaque ids that lead into Vercel's runtime logs, each one copyable. */
function IdChips({
  deployment,
  requestId,
  digest,
}: {
  deployment: string | null;
  requestId: string | null;
  digest: string | null;
}) {
  if (!deployment && !requestId && !digest) {
    return <span className="text-xs text-muted-foreground">No ids recorded.</span>;
  }
  return (
    <dl className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
      {requestId && (
        <div className="flex min-w-0 items-center gap-1.5">
          <dt className="text-muted-foreground">Request</dt>
          <dd className="min-w-0">
            <CopyChip value={requestId} label="request id" />
          </dd>
        </div>
      )}
      {digest && (
        <div className="flex min-w-0 items-center gap-1.5">
          <dt className="text-muted-foreground">Error id</dt>
          <dd className="min-w-0">
            <CopyChip value={digest} label="error id" />
          </dd>
        </div>
      )}
      {deployment && (
        <div className="flex min-w-0 items-center gap-1.5">
          <dt className="text-muted-foreground">Deployment</dt>
          <dd className="min-w-0">
            <CopyChip value={deployment} label="deployment id" />
          </dd>
        </div>
      )}
    </dl>
  );
}

const detailsSummary =
  'cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden';

export function GroupList({ rows }: { rows: GroupRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No error groups in this window.</p>;
  }
  return (
    <ol className="divide-y divide-white/40 dark:divide-white/10">
      {rows.map((row) => (
        <li key={row.key} className="py-3 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="min-w-0 break-all text-sm font-medium text-foreground">{row.title}</p>
            <span className="text-sm tabular-nums text-foreground">{row.countLabel}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span>{row.sourceLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{row.firstSeenLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{row.lastSeenLabel}</span>
            {row.newInDeployment && (
              <span className={cn(chipBase, 'border-transparent bg-foreground text-background')}>
                New in this build
              </span>
            )}
            {row.code && <span className={cn(chipBase, 'border-transparent', glassChip)}>{row.code}</span>}
            {row.componentLabel && (
              <span className={cn(chipBase, 'border-transparent', glassChip)}>{row.componentLabel}</span>
            )}
          </div>
          <details className="mt-1.5">
            <summary className={detailsSummary}>Ids for Vercel logs</summary>
            <div className="mt-2">
              <IdChips deployment={row.deployment} requestId={row.requestId} digest={row.digest} />
            </div>
          </details>
        </li>
      ))}
    </ol>
  );
}

export function RouteBars({ rows }: { rows: RouteRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No page or route errors in this window.</p>;
  }
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <div key={row.key}>
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="min-w-0 break-all text-foreground">
              {row.label}
              {row.note && <span className="ml-1.5 text-muted-foreground">· {row.note}</span>}
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{row.countLabel}</span>
          </div>
          <div
            role="img"
            aria-label={`${row.label}: ${row.countLabel}`}
            className="mt-1 h-1.5 overflow-hidden rounded-full bg-foreground/[0.08]"
          >
            <div className="h-full rounded-full bg-foreground/40" style={{ width: `${row.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DependencyList({ rows }: { rows: DependencyRow[] }) {
  return (
    <ul className="divide-y divide-white/40 dark:divide-white/10">
      {rows.map((row) => (
        <li key={row.key} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className="text-sm font-medium text-foreground">{row.label}</span>
            <span className="flex items-center gap-2">
              {row.latencyLabel && (
                <span className="text-xs tabular-nums text-muted-foreground">{row.latencyLabel}</span>
              )}
              <StatusChip chip={row.status} />
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{row.hint}</p>
          <p className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            {row.detail && <span className="text-foreground/80">{row.detail}</span>}
            <span>{row.checkedLabel}</span>
            {row.streakLabel && <span className="text-foreground/80">{row.streakLabel}</span>}
            {row.observedLabel && <span className="text-foreground/80">{row.observedLabel}</span>}
            {row.lastFailedLabel && <span>{row.lastFailedLabel}</span>}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function CronList({ rows }: { rows: CronRow[] }) {
  return (
    <ul className="divide-y divide-white/40 dark:divide-white/10">
      {rows.map((row) => (
        <li key={row.key} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className="text-sm font-medium text-foreground">{row.label}</span>
            <StatusChip chip={row.state} />
          </div>
          <p className="text-xs text-muted-foreground">
            {row.description} · {row.scheduleLabel}
          </p>
          <p className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span className={cn(row.missed && 'font-medium text-foreground')}>{row.lastRunLabel}</span>
            {row.durationLabel && <span className="tabular-nums">{row.durationLabel}</span>}
            {row.summary && <span className="text-foreground/80">{row.summary}</span>}
            <span>{row.nextLabel}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}

export function IncidentList({
  rows,
  empty,
}: {
  rows: IncidentRow[];
  empty: { title: string; description: string };
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={LuCircleCheck}
        title={empty.title}
        description={empty.description}
        className="py-8"
      />
    );
  }
  return (
    <ol className="divide-y divide-white/40 dark:divide-white/10">
      {rows.map((row) => (
        <li key={row.id} className="py-3 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <div className="min-w-0">
              <p className="break-words text-sm font-medium text-foreground">{row.title}</p>
              {row.detail && <p className="mt-0.5 text-xs text-muted-foreground">{row.detail}</p>}
            </div>
            <span className="flex shrink-0 items-center gap-2">
              <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground/70">
                {row.kindLabel}
              </span>
              <StatusChip chip={row.severity} />
            </span>
          </div>
          <p className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span>{row.startedLabel}</span>
            {row.open ? <span>{row.lastSeenLabel}</span> : <span>{row.resolvedLabel}</span>}
            <span>{row.occurrenceLabel}</span>
            <span>{row.alertedLabel}</span>
          </p>
          <details className="mt-1.5">
            <summary className={detailsSummary}>Ids for Vercel logs</summary>
            <div className="mt-2">
              <IdChips deployment={row.deployment} requestId={row.requestId} digest={row.digest} />
            </div>
          </details>
        </li>
      ))}
    </ol>
  );
}

/** Vercel-owned signals live on Vercel. Said plainly, and linked. */
export function VercelLinks({ links }: { links: VercelLinkRow[] }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Latency, function duration and the full request log are measured by Vercel, not by
        this page. Those numbers live there. The request-success figure under Service
        levels is folded from Vercel’s own counts.
      </p>
      <ul className="flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener"
              className={cn('inline-flex items-center gap-1 text-sm font-medium text-foreground', adminLink)}
            >
              {link.label}
              <LuArrowUpRight aria-hidden="true" className="size-3.5" />
            </a>
            <p className="text-xs text-muted-foreground">{link.hint}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The three in-app SLIs, each over a denominator the app owns or can name;
 *  a bar per row in the house ink, and "Not enough data" rather than a figure
 *  over noise. */
export function SloList({ rows }: { rows: SloViewRow[] }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Requests = production responses that were not a server error, counted by Vercel and
        folded here every 15 minutes; availability = probes that passed; reliability =
        scheduled runs that happened and succeeded. Latency and volume still live on Vercel.
      </p>
      <ul className="divide-y divide-white/40 dark:divide-white/10">
        {rows.map((row) => (
          <li key={row.key} className="py-2.5 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs">
              <span className="text-sm font-medium text-foreground">
                {row.label}
                <span className="ml-1.5 text-xs text-muted-foreground">· {row.kindLabel}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="tabular-nums text-foreground">{row.measuredLabel}</span>
                <span className="tabular-nums text-muted-foreground">target {row.targetLabel}</span>
                <StatusChip chip={row.status} />
              </span>
            </div>
            {row.pct === null ? (
              <div
                role="img"
                aria-label={`${row.label}: not enough data`}
                className="mt-1 h-1.5 border-t border-dashed border-foreground/20"
              />
            ) : (
              <div
                role="img"
                aria-label={`${row.label}: ${row.measuredLabel} against a ${row.targetLabel} target`}
                className="mt-1 h-1.5 overflow-hidden rounded-full bg-foreground/[0.08]"
              >
                <div
                  className={cn('h-full rounded-full', row.status.label === 'Met' ? 'bg-foreground' : 'bg-foreground/40')}
                  style={{ width: `${row.pct}%` }}
                />
              </div>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {row.sampleLabel} · {row.budgetLabel}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
