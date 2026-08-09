'use client';

import { Fragment, useState, type ReactNode } from 'react';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Client island for the careers page: only the filter is interactive, so only
// the filter lives in the client bundle. The job groups arrive fully
// server-rendered as ReactNodes (see Careers.tsx) — the listings data, card
// markup, and icons never ship as JavaScript; this component just chooses which
// groups to mount, and which of a group's two variants (every listing, or the
// open ones only) to show. Category options are derived from the groups, so
// there's no second label list to keep in sync.

/** Availability filters, above the category list in the select. */
const ALL = 'all';
const OPEN = 'open';

const SELECT_ID = 'careers-role-filter';

export interface CareersRoleGroup {
  /** The select value this group belongs to (CATEGORY_VALUE_MAP entry). */
  value: string;
  /** Category name, used as the select option label. */
  label: string;
  /** How many listings in this group are still accepting applications. */
  openCount: number;
  /** Server-rendered group markup — every listing, open ones first. */
  node: ReactNode;
  /** Same group with the filled listings dropped; null when nothing is open. */
  openNode: ReactNode;
}

const CareersRoles = ({ groups }: { groups: CareersRoleGroup[] }) => {
  const [filterValue, setFilterValue] = useState<string>(ALL);

  const totalOpen = groups.reduce((sum, group) => sum + group.openCount, 0);

  const visible =
    filterValue === ALL
      ? groups.map((group) => ({ key: group.value, node: group.node }))
      : filterValue === OPEN
        ? groups
            .filter((group) => group.openCount > 0)
            .map((group) => ({ key: group.value, node: group.openNode }))
        : groups
            .filter((group) => group.value === filterValue)
            .map((group) => ({ key: group.value, node: group.node }));

  return (
    <>
      <div className="flex flex-wrap items-center justify-start gap-5 tracking-tighter">
        <Label htmlFor={SELECT_ID} className="text-md text-black/70">
          Filter roles:
        </Label>
        <Select
          value={filterValue}
          onValueChange={(value) => setFilterValue(value)}
        >
          <SelectTrigger id={SELECT_ID} className="w-62.5">
            <SelectValue placeholder="Select a filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Availability</SelectLabel>
              <SelectItem value={ALL}>All roles</SelectItem>
              <SelectItem value={OPEN} disabled={totalOpen === 0}>
                Open roles
                <span className="text-foreground/50">({totalOpen})</span>
              </SelectItem>
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>Category</SelectLabel>
              {groups.map((group) => (
                <SelectItem key={group.value} value={group.value}>
                  {group.label}
                  {group.openCount > 0 && (
                    <span className="text-foreground/50">
                      ({group.openCount} open)
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <p className="text-sm text-black/50">
          {filterValue === OPEN
            ? 'Showing only the roles accepting applications right now.'
            : 'Jump straight to what we’re hiring for, or browse a single category.'}
        </p>
      </div>
      {visible.length === 0 && (
        <div className="rounded-2xl border border-dashed border-foreground/15 bg-background p-8 text-center">
          <h2 className="text-2xl font-semibold tracking-tighter">
            {filterValue === OPEN
              ? 'No roles are open right now'
              : 'No roles in this category right now'}
          </h2>
          <p className="mt-3 text-black/60">
            If you think you would be a strong fit for Perseus Creative
            Studio, reach out through the contact page anyway.
          </p>
        </div>
      )}
      <div className="flex flex-col gap-16">
        {visible.map((group) => (
          <Fragment key={group.key}>{group.node}</Fragment>
        ))}
      </div>
    </>
  );
};

export default CareersRoles;
