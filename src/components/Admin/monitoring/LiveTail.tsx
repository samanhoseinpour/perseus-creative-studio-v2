'use client';

import { useState, useTransition } from 'react';
import { LuRadio } from 'react-icons/lu';

import {
  tailRuntimeLogs,
  type TailResult,
  type TailRowView,
} from '@/app/(admin)/admin/(protected)/_actions/monitoring';
import Button from '@/components/Button';
import CopyChip from '@/components/Admin/CopyChip';
import { glassChip } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';

/**
 * The one client-rendered panel on /admin/monitoring: a live sample of the
 * current deployment's runtime logs, fetched on demand through the server
 * action and shown here. Never on render, never on a timer — one click, one
 * sample. The rows arrive already filtered to the allowlist (see the action),
 * so this component renders fields, never free text.
 */

const LEVEL_TONE: Record<TailRowView['level'], string> = {
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

export default function LiveTail({
  configured,
  onVercel,
  seconds,
}: {
  configured: boolean;
  onVercel: boolean;
  seconds: number;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<TailResult | null>(null);

  if (!configured) {
    return (
      <p className="text-sm text-muted-foreground">
        Not configured. Add <code className="font-mono text-xs">VERCEL_API_TOKEN</code> — a
        Vercel access token scoped to this team — to sample the live runtime logs from here.
        Until then, the “Runtime logs” link above opens them on Vercel.
      </p>
    );
  }
  if (!onVercel) {
    return (
      <p className="text-sm text-muted-foreground">
        Only available on Vercel — a local server has no deployment to tail.
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
          icon={LuRadio}
          iconPosition="left"
          disabled={pending}
          aria-busy={pending}
          onClick={() =>
            startTransition(async () => {
              setResult(await tailRuntimeLogs());
            })
          }
        >
          {pending ? `Listening for ${seconds} s…` : `Tail live logs · ${seconds} s`}
        </Button>
        <p className="text-xs text-muted-foreground">
          A sample of what Vercel streams while you listen — live traffic, not history, and
          never a rate.
        </p>
      </div>

      {result && !result.ok && (
        <p className="text-sm text-muted-foreground" role="status">
          {result.reason === 'unconfigured'
            ? 'VERCEL_API_TOKEN is not set.'
            : result.reason === 'not-on-vercel'
              ? 'Only available on Vercel.'
              : `Vercel did not answer${result.status ? ` (HTTP ${result.status})` : ''}${result.errorName ? ` · ${result.errorName}` : ''}. The token may lack access to this team.`}
        </p>
      )}

      {result && result.ok && (
        <div className="flex flex-col gap-3" role="status">
          <div className="flex flex-wrap items-center gap-1.5">
            <Stat label="lines" value={result.summary.rows} />
            <Stat label="requests" value={result.summary.requests} />
            <Stat label="2xx" value={result.summary.byClass['2xx']} />
            <Stat label="3xx" value={result.summary.byClass['3xx']} />
            <Stat label="4xx" value={result.summary.byClass['4xx']} />
            <Stat label="5xx" value={result.summary.byClass['5xx']} />
            <Stat label="function errors" value={result.summary.functionErrors} />
            {result.summary.redacted > 0 && (
              <Stat label="lines withheld (not ours)" value={result.summary.redacted} />
            )}
            <span className="text-xs text-muted-foreground">
              over {result.summary.seconds} s · deployment{' '}
              <CopyChip value={result.deployment} label="deployment id" className="max-w-[10rem]" />
            </span>
          </div>

          {result.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing arrived in {result.summary.seconds} seconds — quiet is a reading too.
            </p>
          ) : (
            <ol className="max-h-96 divide-y divide-white/40 overflow-y-auto overscroll-contain rounded-xl border border-white/40 dark:divide-white/10 dark:border-white/10">
              {result.rows.map((row, i) => (
                <li key={`${row.at}-${i}`} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 text-xs">
                  <span className="font-mono tabular-nums text-muted-foreground">{row.atLabel}</span>
                  <span className={cn(chip, LEVEL_TONE[row.level])}>{row.level}</span>
                  {row.source === 'request' ? (
                    <>
                      {row.method && <span className="font-mono text-foreground">{row.method}</span>}
                      {row.path && <span className="min-w-0 break-all font-mono text-foreground">{row.path}</span>}
                      {row.status !== null && (
                        <span className={cn('font-mono tabular-nums', row.status >= 500 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground')}>
                          {row.status}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="text-muted-foreground">{row.source}</span>
                      {row.message && <span className="text-foreground">{row.message}</span>}
                      {row.event && <span className={cn(chip, 'border-transparent', glassChip)}>{row.event}</span>}
                      {row.errorName && <span className="font-mono text-foreground">{row.errorName}</span>}
                      {row.routePath && <span className="font-mono text-muted-foreground">{row.routePath}</span>}
                      {row.job && <span className="text-muted-foreground">{row.job}</span>}
                      {row.redacted && (
                        <span className="text-muted-foreground/70">text withheld — not one of our lines</span>
                      )}
                    </>
                  )}
                  {row.requestId && <CopyChip value={row.requestId} label="request id" className="max-w-[8rem]" />}
                  {row.digest && <CopyChip value={row.digest} label="error id" className="max-w-[6rem]" />}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
