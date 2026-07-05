'use client';

import { Fragment, useState, type ReactNode } from 'react';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Client island for the careers page: only the category filter is interactive,
// so only the filter lives in the client bundle. The job groups arrive fully
// server-rendered as ReactNodes (see Careers.tsx) — the listings data, card
// markup, and icons never ship as JavaScript; this component just chooses which
// groups to mount. Values here must stay in sync with CATEGORY_VALUE_MAP in
// Careers.tsx.
const options = [
  {
    label: 'All Open Roles',
    value: 'all',
  },
  {
    label: 'Social Media',
    value: 'social_media',
  },
  {
    label: 'Performance Marketing',
    value: 'performance_marketing',
  },
  {
    label: 'Design',
    value: 'design',
  },
  {
    label: 'Strategy & Operations',
    value: 'strategy_and_operations',
  },
  {
    label: 'SEO',
    value: 'seo',
  },
  {
    label: 'Video Production',
    value: 'video_production',
  },
  {
    label: 'Web / Dev',
    value: 'web_and_dev',
  },
];

export interface CareersRoleGroup {
  /** The select value this group belongs to (CATEGORY_VALUE_MAP entry). */
  value: string;
  /** Server-rendered group markup. */
  node: ReactNode;
}

const CareersRoles = ({ groups }: { groups: CareersRoleGroup[] }) => {
  const [filterValue, setFilterValue] = useState(options[0].value);

  const visible =
    filterValue === 'all'
      ? groups
      : groups.filter((group) => group.value === filterValue);

  return (
    <>
      <div className="flex flex-wrap items-center justify-start gap-5 tracking-tighter">
        <Label htmlFor="terms" className="text-md text-black/70">
          Browse roles by category:
        </Label>
        <Select
          value={filterValue}
          onValueChange={(value) => setFilterValue(value)}
        >
          <SelectTrigger className="w-62.5">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <p className="text-sm text-black/50">
          Choose a category to narrow the list, or view all open roles at
          once.
        </p>
      </div>
      {visible.length === 0 && (
        <div className="rounded-2xl border border-dashed border-foreground/15 bg-background p-8 text-center">
          <h2 className="text-2xl font-semibold tracking-tighter">
            No roles in this category right now
          </h2>
          <p className="mt-3 text-black/60">
            If you think you would be a strong fit for Perseus Creative
            Studio, reach out through the contact page anyway.
          </p>
        </div>
      )}
      <div className="flex flex-col gap-16">
        {visible.map((group) => (
          <Fragment key={group.value}>{group.node}</Fragment>
        ))}
      </div>
    </>
  );
};

export default CareersRoles;
