'use client';

import { LuSearch } from 'react-icons/lu';

import { glassField } from '@/components/Admin/Glass';
import Kbd from '@/components/Admin/Kbd';
import { openAdminSearch } from '@/lib/adminSearch';
import { cn } from '@/lib/utils';

/**
 * The overview's door into the ⌘K palette — the one new client leaf on the
 * page. It owns no state: like the sidebar's search row, it just dispatches
 * the palette's window event (sibling islands, no shared client parent).
 */
export default function SearchTrigger() {
  return (
    <button
      type="button"
      aria-label="Search"
      aria-keyshortcuts="Meta+K"
      onClick={openAdminSearch}
      className={cn(
        glassField,
        'flex h-9 w-full items-center gap-2 pl-3 pr-2 text-sm',
        // After glassField so tailwind-merge lets the muted resting ink win
        // over the field skin's text-foreground (it's a prompt, not a value).
        'text-muted-foreground transition-colors hover:text-foreground',
      )}
    >
      <LuSearch aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate text-left">
        Search anything…
      </span>
      <Kbd>⌘K</Kbd>
    </button>
  );
}
