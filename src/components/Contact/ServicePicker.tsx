'use client';

import { useState } from 'react';
import { LuCheck as Check, LuChevronDown as ChevronDown } from 'react-icons/lu';
import { cn } from '@/lib/utils';
import { OTHER_SERVICE_SLUG } from '@/lib/contactSchema';

/**
 * Service picker for the 29-service catalog: five category tiles plus a
 * "Not sure yet" escape hatch. Tapping a tile expands only that category's
 * services as toggleable chips, so the whole catalog is never dumped at once —
 * the mess the flat chip grid used to create. Multiple tiles can be open, and
 * a tile that already holds a selection auto-expands so a tab switch or a
 * validation re-render never hides an active pick.
 *
 * Fully controlled — selections live in ContactHub's state (`string[]` of
 * service slugs) so they survive tab switches. `groups` is the slim projection
 * derived server-side in app/contact/page.tsx; this module must never import
 * the services registry itself.
 */

export interface ServiceGroupService {
  slug: string;
  title: string;
}

export interface ServiceGroup {
  category: string;
  title: string;
  services: ServiceGroupService[];
}

interface ServicePickerProps {
  groups: ServiceGroup[];
  value: string[];
  onChange: (next: string[]) => void;
  /** id of the visible label naming this composite (aria-labelledby). */
  labelledBy?: string;
  /** id(s) describing it — e.g. the field error (aria-describedby). */
  describedBy?: string;
}

const tileClass = (active: boolean) =>
  cn(
    'flex cursor-pointer items-center justify-between gap-2 rounded-xl border p-3 text-left text-sm transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
    active
      ? 'border-foreground/40 bg-foreground/5'
      : 'border-foreground/10 bg-background-contrast hover:border-foreground/30',
  );

const chipClass = (selected: boolean) =>
  cn(
    'inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
    selected
      ? 'bg-foreground text-background'
      : 'bg-foreground/5 text-foreground/70 hover:bg-foreground/10 hover:text-foreground',
  );

const ServicePicker = ({
  groups,
  value,
  onChange,
  labelledBy,
  describedBy,
}: ServicePickerProps) => {
  const countIn = (group: ServiceGroup) =>
    group.services.filter((s) => value.includes(s.slug)).length;

  // Categories the visitor has open. Seeded with any category that already
  // holds a selection so an active pick is never hidden after a remount.
  const [expanded, setExpanded] = useState<string[]>(() =>
    groups.filter((g) => countIn(g) > 0).map((g) => g.category),
  );

  const toggleService = (slug: string) => {
    onChange(
      value.includes(slug) ? value.filter((s) => s !== slug) : [...value, slug],
    );
  };

  const toggleExpanded = (slug: string) => {
    setExpanded((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  };

  const notSure = value.includes(OTHER_SERVICE_SLUG);

  return (
    <div role="group" aria-labelledby={labelledBy} aria-describedby={describedBy}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {groups.map((group) => {
          const count = countIn(group);
          const open = expanded.includes(group.category);
          return (
            <button
              key={group.category}
              type="button"
              onClick={() => toggleExpanded(group.category)}
              aria-expanded={open}
              aria-controls={`svc-panel-${group.category}`}
              className={tileClass(open)}
            >
              <span className="min-w-0 truncate font-medium text-black">
                {group.title}
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                {count > 0 && (
                  <span className="rounded-full bg-foreground px-1.5 text-[10px] leading-4 text-background tabular-nums">
                    {count}
                  </span>
                )}
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    'size-4 text-black/40 transition-transform duration-300',
                    open && 'rotate-180',
                  )}
                />
              </span>
            </button>
          );
        })}

        {/* "Not sure yet" is itself a selection (the `other` slug), not an
            expander — so it toggles pressed state rather than a panel. */}
        <button
          type="button"
          onClick={() => toggleService(OTHER_SERVICE_SLUG)}
          aria-pressed={notSure}
          className={cn(
            tileClass(false),
            notSure &&
              'border-transparent bg-foreground text-background hover:border-transparent',
          )}
        >
          <span
            className={cn(
              'min-w-0 truncate font-medium',
              notSure ? 'text-background' : 'text-black',
            )}
          >
            Not sure yet
          </span>
          {notSure && <Check className="size-4 shrink-0" aria-hidden="true" />}
        </button>
      </div>

      {groups.map((group) =>
        expanded.includes(group.category) ? (
          <div
            key={group.category}
            id={`svc-panel-${group.category}`}
            className="mt-4"
          >
            <p className="eyebrow mb-2 px-1 text-[10px] text-black/40">
              {group.title}
            </p>
            <div className="flex flex-wrap gap-2">
              {group.services.map((service) => {
                const selected = value.includes(service.slug);
                return (
                  <button
                    key={service.slug}
                    type="button"
                    onClick={() => toggleService(service.slug)}
                    aria-pressed={selected}
                    className={chipClass(selected)}
                  >
                    {selected && (
                      <Check className="size-3.5" aria-hidden="true" />
                    )}
                    {service.title}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null,
      )}

      {value.length > 0 && (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-foreground/10 pt-3">
          <span className="text-xs text-black/50 tabular-nums">
            {value.length} selected
          </span>
          <button
            type="button"
            onClick={() => onChange([])}
            className="cursor-pointer text-xs text-black/50 underline transition-colors hover:text-black"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};

export default ServicePicker;
