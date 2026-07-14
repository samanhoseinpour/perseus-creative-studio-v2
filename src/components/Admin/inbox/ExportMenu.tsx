'use client';

import { useState } from 'react';
import { DropdownMenu } from 'radix-ui';
import { LuDownload } from 'react-icons/lu';

import Button from '@/components/Button';
import { glassSurface, GlassRim } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';

/** Menu items share the row recipe; radix flags hover AND keyboard focus as `data-highlighted`. */
const menuItem =
  'flex cursor-pointer select-none items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium outline-none data-[highlighted]:bg-white/45 dark:data-[highlighted]:bg-white/10';

// Tokens must match RANGE_LABELS in src/lib/adminExport.ts, which validates
// them and names the downloaded file.
const PRESETS = [
  { range: 'today', label: 'Today', days: 1 },
  { range: '7d', label: 'Last 7 days', days: 7 },
  { range: '30d', label: 'Last 30 days', days: 30 },
  { range: '90d', label: 'Last 90 days', days: 90 },
  { range: 'all', label: 'All time', days: null },
] as const;

/**
 * A window of N days means "from local midnight N−1 days back" — so Today is
 * the admin's calendar today, not UTC's. `setDate` rollback, never ms math
 * (DST days aren't 24h). The `d` param carries the same local date for the
 * server to stamp into the filename.
 */
function presetHref(
  endpoint: string,
  range: string,
  days: number | null,
): string {
  const now = new Date();
  const localDate = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');

  const params = new URLSearchParams({ range, d: localDate });
  if (days !== null) {
    const since = new Date(now);
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (days - 1));
    params.set('since', since.toISOString());
  }
  return `${endpoint}?${params}`;
}

/**
 * "Export" dropdown for an inbox view — each preset is a plain anchor to the
 * area-gated CSV route (deliberately NOT next/link: prefetch would fire the
 * export query). Glass menu recipe mirrors the avatar menu in
 * profile/ProfileHeader.tsx.
 */
export default function ExportMenu({ endpoint }: { endpoint: string }) {
  // Controlled so opening re-renders the items: the hrefs embed "now"-derived
  // dates, and an uncontrolled Content would keep the ones computed at page
  // load — a tab left open past midnight would export yesterday's "Today".
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <Button
          type="button"
          size="small"
          variant="secondary"
          icon={LuDownload}
          iconPosition="left"
        >
          Export
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className={cn(
            'relative z-50 min-w-44 p-1.5',
            glassSurface,
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          )}
        >
          <GlassRim />
          <DropdownMenu.Label className="px-3 pt-2 pb-1 text-[0.6rem] font-medium tracking-[0.2em] text-muted-foreground uppercase select-none">
            CSV export
          </DropdownMenu.Label>
          {PRESETS.map(({ range, label, days }) => (
            <DropdownMenu.Item key={range} asChild>
              <a
                href={presetHref(endpoint, range, days)}
                className={cn(menuItem, 'text-foreground')}
              >
                {label}
              </a>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
