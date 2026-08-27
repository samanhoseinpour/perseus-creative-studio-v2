'use client';

import { useState, useTransition } from 'react';
import { LuScrollText } from 'react-icons/lu';

import {
  recentRuntimeLogs,
  type RecentLogsResult,
  type RequestRowView,
} from '@/app/(admin)/admin/(protected)/_actions/monitoring';
import Button from '@/components/Button';
import CopyChip from '@/components/Admin/CopyChip';
import { glassChip } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';

/**
 * The one client-rendered panel on /admin/monitoring: the last few minutes
 * of the current deployment's request log, fetched on demand through the
 * server action and shown here. Never on render, never on a timer — one
 * click, one read. The rows arrive already reduced to the allowlist (see the
 * action), so this component renders fields, never free text.
 */

const LEVEL_TONE: Record<RequestRowView['lines'][number]['level'], string> = {
  error: 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-400',
  fatal: 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-400',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  info: 'border-foreground/15 bg-foreground/[0.06] text-muted-foreground',
  debug: 'border-foreground/15 bg-foreground/[0.06] text-muted-foreground',
  trace: 'border-foreground/15 bg-foreground/[0.06] text-muted-foreground',
};

const chip = 'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-medium';

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className={cn(chip, 'border-transparent gap-1', glassChip)}>
      <span className="tabular-nums text-foreground">{value}</span>
      <span>{label}</span>
    </span>
  );
}

export default function RecentLogs({
  configured,
  onVercel,
  minutes,
  timeoutSeconds,
}: {
  configured: boolean;
  onVercel: boolean;
  minutes: number;
  timeoutSeconds: number;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<RecentLogsResult | null>(null);

  if (!configured) {
    return (
      <p className="text-sm text-muted-foreground">
        Not configured. Add <code className="font-mono text-xs">VERCEL_API_TOKEN</code> — a
        Vercel account token scoped to this team (a project token is refused by these reads) —
        to read the last few minutes of the request log from here. Until then, the “Runtime
        logs” link above opens them on Vercel.
      </p>
    );
  }
  if (!onVercel) {
    return (
      <p className="text-sm text-muted-foreground">
        Only available on Vercel — a local server has no deployment to read.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="small"
          icon={LuScrollText}
          iconPosition="left"
          disabled={pending}
          aria-busy={pending}
          onClick={() =>
            startTransition(async () => {
              setResult(await recentRuntimeLogs());
            })
          }
        >
          {pending ? 'Asking Vercel…' : `Show the last ${minutes} minutes`}
        </Button>
        <p className="text-xs text-muted-foreground">
          What Vercel recorded for the build serving this page — each request with its status,
          and our own log lines beneath it. A window, not history, and never a rate.
        </p>
      </div>

      {result && !result.ok && (
        <p className="text-sm text-muted-foreground" role="status">
          {result.reason === 'unconfigured'
            ? 'VERCEL_API_TOKEN is not set.'
            : result.reason === 'not-on-vercel'
              ? 'Only available on Vercel.'
              : result.reason === 'silent'
                ? `Vercel did not answer within ${timeoutSeconds} seconds — no response at all, which is not the same as no traffic. The “Runtime logs” link above opens the same logs on Vercel.`
                : result.reason === 'timeout'
                  ? `Vercel started answering but did not finish within ${timeoutSeconds} seconds. Try again, or open the “Runtime logs” link above.`
                  : result.status === 401 || result.status === 403
                    ? `Vercel refused the request (HTTP ${result.status}). The token needs to be an account token scoped to this team — a project token is refused here.`
                    : result.errorName === 'VercelAnswerError'
                      ? 'Vercel answered in a shape this panel does not read. The “Runtime logs” link above still opens the same logs on Vercel.'
                      : `The read failed${result.status ? ` (HTTP ${result.status})` : ''}${result.errorName ? ` · ${result.errorName}` : ''}. The “Runtime logs” link above opens the same logs on Vercel.`}
        </p>
      )}

      {result && result.ok && (
        <div className="flex flex-col gap-3" role="status">
          <div className="flex flex-wrap items-center gap-1.5">
            <Stat label="requests" value={result.summary.requests} />
            <Stat label="2xx" value={result.summary.byClass['2xx']} />
            <Stat label="3xx" value={result.summary.byClass['3xx']} />
            <Stat label="4xx" value={result.summary.byClass['4xx']} />
            <Stat label="5xx" value={result.summary.byClass['5xx']} />
            <Stat label="function errors" value={result.summary.functionErrors} />
            {result.summary.withheld > 0 && (
              <Stat label="lines withheld (not ours)" value={result.summary.withheld} />
            )}
            <span className="text-xs text-muted-foreground">
              {result.fromLabel}–{result.toLabel} · deployment{' '}
              <CopyChip value={result.deployment} label="deployment id" className="max-w-[10rem]" />
            </span>
          </div>

          {result.summary.truncated && (
            <p className="text-xs text-muted-foreground">
              The window held more than this — these are the newest {result.summary.requests}{' '}
              requests, and the counts above are of them, not of the whole {minutes} minutes.
              The “Runtime logs” link above has the rest.
            </p>
          )}

          {result.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing recorded in the last {minutes} minutes — quiet is a reading too.
            </p>
          ) : (
            <ol className="max-h-96 divide-y divide-white/40 overflow-y-auto overscroll-contain rounded-xl border border-white/40 dark:divide-white/10 dark:border-white/10">
              {result.rows.map((row, i) => (
                <li key={`${row.at}-${i}`} className="px-3 py-2 text-xs">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-mono tabular-nums text-muted-foreground">{row.atLabel}</span>
                    {row.method && <span className="font-mono text-foreground">{row.method}</span>}
                    {row.path && <span className="min-w-0 break-all font-mono text-foreground">{row.path}</span>}
                    {row.status !== null && (
                      <span
                        className={cn(
                          'font-mono tabular-nums',
                          row.status >= 500 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground',
                        )}
                      >
                        {row.status}
                      </span>
                    )}
                    <span className="text-muted-foreground">{row.source}</span>
                    {row.requestId && <CopyChip value={row.requestId} label="request id" className="max-w-[8rem]" />}
                  </div>
                  {(row.lines.length > 0 || row.withheld > 0) && (
                    <ul className="mt-1 flex flex-col gap-1 pl-3">
                      {row.lines.map((line, j) => (
                        <li key={j} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className={cn(chip, LEVEL_TONE[line.level])}>{line.level}</span>
                          <span className="text-foreground">{line.message}</span>
                          {line.event && <span className={cn(chip, 'border-transparent', glassChip)}>{line.event}</span>}
                          {line.errorName && <span className="font-mono text-foreground">{line.errorName}</span>}
                          {line.routePath && <span className="font-mono text-muted-foreground">{line.routePath}</span>}
                          {line.job && <span className="text-muted-foreground">{line.job}</span>}
                          {line.digest && <CopyChip value={line.digest} label="error id" className="max-w-[6rem]" />}
                        </li>
                      ))}
                      {row.withheld > 0 && (
                        <li className="text-muted-foreground/70">
                          {row.withheld === 1 ? '1 line withheld' : `${row.withheld} lines withheld`} — not ours
                        </li>
                      )}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
