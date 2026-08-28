// No 'use client' directive on purpose: a leaf of the client TaskBoard entry
// (TaskRowMenu precedent) — adding it would make the function props a
// client-entry violation.
import { LuExternalLink, LuLink } from 'react-icons/lu';

import { DropdownMenu } from '@/components/Admin/DropdownMenu';
import { GlassRim } from '@/components/Admin/Glass';
import { linkLabelFor, type TaskLink } from '@/lib/taskFields';
import { cn } from '@/lib/utils';
import { dropdownMenuContent, menuItem } from './menu';

/**
 * A task's deliverable links in the board's title cell.
 *
 * ONE link renders as the bare glyph it always did — a straight anchor, one
 * click to the file, no menu in the way. Two or more fold into a counted glyph
 * that opens the list, because a shoot with a gallery, selects and a vertical
 * crop would otherwise put three anonymous chain icons in a row and the member
 * would have to hover each to tell them apart.
 *
 * Built on Admin/DropdownMenu rather than a tooltip, and that is the point of
 * the component: the contents are LINKS, so they have to survive keyboard and
 * touch. A tooltip is hover-shaped and reaches neither. The house door also
 * brings the click fallback for machines where `pointerdown` never lands.
 *
 * Radix portals the panel, which is the hard requirement here rather than a
 * preference: the tasks table sits inside `overflow-x-auto`, and anything
 * positioned within that wrapper is clipped at the cell edge (the
 * TaskTagOverflow rule).
 */
export default function TaskLinksMenu({
  title,
  links,
}: {
  title: string;
  links: TaskLink[];
}) {
  if (links.length === 0) return null;

  if (links.length === 1) {
    return (
      <a
        href={links[0].url}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open ${linkLabelFor(links[0])} for ${title}`}
        className="-m-1.5 shrink-0 p-1.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        <LuLink aria-hidden="true" className="size-3.5" />
      </a>
    );
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`${links.length} deliverable links for ${title}`}
          className="-m-1 inline-flex shrink-0 cursor-pointer items-center gap-0.5 rounded-md p-1 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/40 data-[state=open]:text-foreground"
        >
          <LuLink aria-hidden="true" className="size-3.5" />
          <span className="text-[0.65rem] leading-none font-medium tabular-nums">
            {links.length}
          </span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          data-lenis-prevent
          className={cn(dropdownMenuContent, 'max-w-72')}
        >
          <GlassRim />
          {links.map((link) => (
            // asChild so the row IS the anchor: middle-click, ⌘-click and
            // "copy link address" all have to work on a deliverable.
            <DropdownMenu.Item key={link.url} asChild className={menuItem}>
              <a href={link.url} target="_blank" rel="noreferrer">
                <LuExternalLink
                  aria-hidden="true"
                  className="size-3.5 shrink-0 text-muted-foreground"
                />
                <span className="min-w-0 truncate text-foreground">
                  {linkLabelFor(link)}
                </span>
              </a>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
