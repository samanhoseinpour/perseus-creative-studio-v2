// No 'use client' directive on purpose: a leaf of the client TaskBoard entry
// (TaskBulkBar precedent).
import { useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';

/**
 * The "select every task on this page" tick box.
 *
 * It lives here rather than inline because TWO surfaces now draw it: the
 * desktop table's own header cell, which is where a table's select-all
 * belongs, and TaskBulkBar, which is the only one the phone has (the card
 * list has no `<thead>` to put it in). The part that would drift is not the
 * markup — it is the effect below: `indeterminate` is a DOM PROPERTY with no
 * attribute behind it, so React cannot set it from JSX and each copy would
 * need its own ref and its own effect. Two of those is how one of them ends
 * up never showing the partial state.
 */
export default function SelectAllCheckbox({
  allChecked,
  someChecked,
  onToggleAll,
  className,
}: {
  allChecked: boolean;
  someChecked: boolean;
  onToggleAll: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = someChecked && !allChecked;
  }, [someChecked, allChecked]);

  return (
    <label className={cn('flex cursor-pointer items-center', className)}>
      <input
        ref={ref}
        type="checkbox"
        checked={allChecked}
        onChange={onToggleAll}
        aria-label="Select all on this page"
        className="size-4 accent-foreground"
      />
    </label>
  );
}
