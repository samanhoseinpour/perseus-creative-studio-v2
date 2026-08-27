'use client';

import { useState } from 'react';
import { LuDownload } from 'react-icons/lu';

import { DropdownMenu } from '@/components/Admin/DropdownMenu';
import Button from '@/components/Button';
import { GlassRim } from '@/components/Admin/Glass';
import { dropdownMenuContent, menuItem } from '@/components/Admin/menu';
import { cn } from '@/lib/utils';

// Tokens must match RANGE_LABELS in src/lib/adminExport.ts, which validates
// them and names the downloaded file.
const PRESETS = [
  { range: 'today', label: 'Today' },
  { range: '7d', label: 'Last 7 days' },
  { range: '30d', label: 'Last 30 days' },
  { range: '90d', label: 'Last 90 days' },
  { range: 'all', label: 'All time' },
] as const;

/**
 * The admin's local calendar date for the filename stamp — an evening export
 * shouldn't be stamped with UTC's tomorrow.
 */
function localDateStamp(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
}

/**
 * Preset hrefs seed from the list's canonical filter qs (search/facet/source/
 * sort ride along) and override the date window with the preset token — the
 * window itself resolves server-side from `range` at request time.
 */
function presetHref(
  endpoint: string,
  filterQs: string,
  range: string,
  localDate: string,
): string {
  const params = new URLSearchParams(filterQs);
  params.delete('range');
  params.delete('from');
  params.delete('to');
  params.set('range', range);
  params.set('d', localDate);
  return `${endpoint}?${params}`;
}

/**
 * "Export" dropdown for an inbox view — each preset is a plain anchor to the
 * area-gated CSV route (deliberately NOT next/link: prefetch would fire the
 * export query). Exports ignore the open tab (dataset downloads, not view
 * snapshots) but honor the list's search/filters via `filterQs`; "Current view
 * dates" keeps the list's own date window too. Glass menu recipe mirrors the
 * avatar menu in profile/ProfileHeader.tsx.
 */
export default function ExportMenu({
  endpoint,
  filterQs = '',
  hasDateFilter = false,
}: {
  endpoint: string;
  /** Canonical status-less filter qs from inboxListQs('inbox', params). */
  filterQs?: string;
  /** True when the list has an active date window (range or from/to). */
  hasDateFilter?: boolean;
}) {
  // Controlled so opening re-renders the items: the hrefs embed "now"-derived
  // dates, and an uncontrolled Content would keep the ones computed at page
  // load — a tab left open past midnight would export yesterday's "Today".
  const [open, setOpen] = useState(false);
  const localDate = localDateStamp();

  const currentViewParams = new URLSearchParams(filterQs);
  currentViewParams.set('d', localDate);

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
          data-lenis-prevent
          className={dropdownMenuContent}
        >
          <GlassRim />
          <DropdownMenu.Label className="px-3 pt-2 pb-1 text-[0.6rem] font-medium tracking-[0.2em] text-muted-foreground uppercase select-none">
            CSV export
          </DropdownMenu.Label>
          {hasDateFilter && (
            <DropdownMenu.Item asChild>
              <a
                href={`${endpoint}?${currentViewParams}`}
                className={cn(menuItem, 'text-foreground')}
              >
                Current view dates
              </a>
            </DropdownMenu.Item>
          )}
          {PRESETS.map(({ range, label }) => (
            <DropdownMenu.Item key={range} asChild>
              <a
                href={presetHref(endpoint, filterQs, range, localDate)}
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
