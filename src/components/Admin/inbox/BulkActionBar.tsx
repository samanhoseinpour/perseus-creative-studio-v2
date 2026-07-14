// No 'use client' directive on purpose: this is a leaf of the client
// InboxKeyboardList (the entry that owns the state), same as InboxRow — adding
// the directive here would make its function props a client-entry violation.
import { useEffect, useRef } from 'react';
import type { IconType } from 'react-icons';
import {
  LuArchive,
  LuArchiveRestore,
  LuMail,
  LuMailOpen,
  LuShieldAlert,
  LuShieldCheck,
} from 'react-icons/lu';

import type { ContactSubmission } from '@/db/schema';
import type { InboxView } from '@/db/adminQueries';
import Button from '@/components/Button';

type Status = ContactSubmission['status'];
type BulkAction = { status: Status; label: string; icon: IconType };

// Status-change actions only — bulk delete is deliberately absent (deleting
// stays one-at-a-time on the detail page behind its confirm).
const VIEW_ACTIONS: Record<InboxView, BulkAction[]> = {
  inbox: [
    { status: 'read', label: 'Mark read', icon: LuMailOpen },
    { status: 'new', label: 'Mark unread', icon: LuMail },
    { status: 'archived', label: 'Archive', icon: LuArchive },
    { status: 'spam', label: 'Spam', icon: LuShieldAlert },
  ],
  archived: [{ status: 'read', label: 'Move to inbox', icon: LuArchiveRestore }],
  spam: [{ status: 'new', label: 'Not spam', icon: LuShieldCheck }],
};

/**
 * The select-all + bulk-triage row above the inbox list. Always rendered (it
 * hosts the select-all checkbox); the action buttons appear once anything is
 * selected. State lives in InboxKeyboardList — this is presentation only.
 */
export default function BulkActionBar({
  view,
  count,
  allChecked,
  someChecked,
  pending,
  onToggleAll,
  onClear,
  onAction,
}: {
  view: InboxView;
  count: number;
  allChecked: boolean;
  someChecked: boolean;
  pending: boolean;
  onToggleAll: () => void;
  onClear: () => void;
  onAction: (status: Status, label: string) => void;
}) {
  // `indeterminate` is a DOM property, not an attribute — set it imperatively.
  const checkboxRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = someChecked && !allChecked;
    }
  }, [someChecked, allChecked]);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-white/40 px-4 py-2 sm:px-5 dark:border-white/10">
      <label className="flex cursor-pointer items-center">
        <input
          ref={checkboxRef}
          type="checkbox"
          checked={allChecked}
          onChange={onToggleAll}
          aria-label="Select all on this page"
          className="size-4 accent-foreground"
        />
      </label>
      {count > 0 ? (
        <>
          <span className="text-xs font-medium tabular-nums text-muted-foreground">
            {count} selected
          </span>
          <span className="flex flex-wrap items-center gap-1.5">
            {VIEW_ACTIONS[view].map(({ status, label, icon }) => (
              <Button
                key={label}
                type="button"
                size="small"
                variant="secondary"
                icon={icon}
                iconPosition="left"
                disabled={pending}
                onClick={() => onAction(status, label)}
              >
                {label}
              </Button>
            ))}
            <Button
              type="button"
              size="small"
              variant="secondary"
              showIcon={false}
              disabled={pending}
              onClick={onClear}
            >
              Clear
            </Button>
          </span>
        </>
      ) : (
        <span className="text-xs text-muted-foreground">Select all</span>
      )}
    </div>
  );
}
