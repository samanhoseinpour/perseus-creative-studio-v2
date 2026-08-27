'use client';

import { useEffect, useState } from 'react';
import { LuCheck, LuCopy } from 'react-icons/lu';

import { glassChip } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';

/**
 * An opaque id you can copy in one click — a Vercel request id, a deployment
 * id, an error digest. The whole reason these ids are stored (activity_log's
 * `request_id`, monitoring's `last_request_id`) is to be pasted into Vercel's
 * runtime-log search, and a value that has to be selected by hand out of a
 * monospace run is one nobody pastes.
 *
 * A client leaf, imported by direct path from both logs/ and monitoring/ (the
 * barrel rule). Reads nothing but its props; the clipboard call is wrapped
 * because an insecure context or a denied permission throws, and a copy chip
 * that crashes a row is worse than one that silently does nothing.
 */
export default function CopyChip({
  value,
  label,
  className,
}: {
  value: string;
  /** Screen-reader name for what is being copied ("request id"). */
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        } catch {
          /* unavailable clipboard — the value is still on screen */
        }
      }}
      title={value}
      aria-label={copied ? `${label} copied` : `Copy ${label} ${value}`}
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[0.65rem] tabular-nums transition-colors hover:text-foreground',
        glassChip,
        className,
      )}
    >
      <span className="truncate">{value}</span>
      {copied ? (
        <LuCheck aria-hidden="true" className="size-3 shrink-0" />
      ) : (
        <LuCopy aria-hidden="true" className="size-3 shrink-0 opacity-70" />
      )}
    </button>
  );
}
