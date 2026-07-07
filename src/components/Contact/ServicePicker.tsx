'use client';

import { useState } from 'react';
import { LuCheck as Check, LuX as X } from 'react-icons/lu';
import { cn } from '@/lib/utils';
import FilterRail from '@/components/FilterRail';
import { OTHER_SERVICE_SLUG } from '@/lib/contactSchema';

/**
 * Multi-select picker for the 29-service catalog: a category rail over a
 * toggleable chip grid, with a removable summary row so cross-category picks
 * never get lost when the rail switches. The rail deliberately starts on
 * "All" — seeing the whole catalog invites cross-category picks; the
 * per-category pills are the compact browsing mode.
 *
 * Fully controlled — selections live in ContactHub's state so they survive
 * category and tab switches. `groups` is the slim projection derived
 * server-side in app/contact/page.tsx; this module must never import the
 * services registry itself.
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

const OTHER_OPTION: ServiceGroupService = {
  slug: OTHER_SERVICE_SLUG,
  title: 'Something else / not sure',
};

const railPillClass = (active: boolean) =>
  cn(
    'inline-flex shrink-0 cursor-pointer snap-start items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs whitespace-nowrap transition-colors duration-300',
    active
      ? 'bg-foreground text-background'
      : 'bg-foreground/5 text-foreground/70 hover:bg-foreground/10 hover:text-foreground',
  );

const chipClass = (selected: boolean) =>
  cn(
    'inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition-colors duration-300',
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
  const [activeCategory, setActiveCategory] = useState('all');

  const titleBySlug = new Map<string, string>([
    ...groups.flatMap((g) => g.services.map((s) => [s.slug, s.title] as const)),
    [OTHER_OPTION.slug, OTHER_OPTION.title],
  ]);

  const activeGroup = groups.find((g) => g.category === activeCategory);
  // "Something else" trails every view so the escape hatch is always in reach.
  const visibleServices = [
    ...(activeGroup ? activeGroup.services : groups.flatMap((g) => g.services)),
    OTHER_OPTION,
  ];

  const toggle = (slug: string) => {
    onChange(
      value.includes(slug) ? value.filter((s) => s !== slug) : [...value, slug],
    );
  };

  const countIn = (group: ServiceGroup) =>
    group.services.filter((s) => value.includes(s.slug)).length;

  return (
    <div role="group" aria-labelledby={labelledBy} aria-describedby={describedBy}>
      {/* Category rail — FilterRail (shared with blog/projects filters) owns
          the scroll strip, edge-fade masks, and active-pill re-centering. */}
      <div role="group" aria-label="Service category">
        <FilterRail activeSlug={activeCategory}>
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            aria-pressed={activeCategory === 'all'}
            data-active={activeCategory === 'all'}
            className={railPillClass(activeCategory === 'all')}
          >
            All
          </button>
          {groups.map((group) => {
            const count = countIn(group);
            return (
              <button
                key={group.category}
                type="button"
                onClick={() => setActiveCategory(group.category)}
                aria-pressed={activeCategory === group.category}
                data-active={activeCategory === group.category}
                className={railPillClass(activeCategory === group.category)}
              >
                {group.title}
                {count > 0 && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 text-[10px] tabular-nums',
                      activeCategory === group.category
                        ? 'bg-background/20'
                        : 'bg-foreground/10',
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </FilterRail>
      </div>

      {/* Service chips for the active view */}
      <div className="mt-3 flex flex-wrap gap-2">
        {visibleServices.map((service) => {
          const selected = value.includes(service.slug);
          return (
            <button
              key={service.slug}
              type="button"
              onClick={() => toggle(service.slug)}
              aria-pressed={selected}
              className={chipClass(selected)}
            >
              {selected && <Check className="size-3.5" aria-hidden="true" />}
              {service.title}
            </button>
          );
        })}
      </div>

      {/* Selected summary — visible regardless of which category the rail shows */}
      {value.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-foreground/10 pt-4">
          <span className="text-xs text-black/50 tabular-nums">
            {value.length} selected
          </span>
          {value.map((slug) => (
            <button
              key={slug}
              type="button"
              onClick={() => toggle(slug)}
              aria-label={`Remove ${titleBySlug.get(slug) ?? slug}`}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-foreground text-background px-3 py-1 text-xs transition-opacity hover:opacity-80"
            >
              {titleBySlug.get(slug) ?? slug}
              <X className="size-3" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ServicePicker;
