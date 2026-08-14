// No 'use client' directive on purpose: a leaf of the client TaskBoard entry
// (TaskStatusMenu precedent) — adding it would make the function props a
// client-entry violation.
import { useRef, useState } from 'react';
import { LuLink, LuMaximize2 } from 'react-icons/lu';

import { TASK_TITLE_MAX } from '@/lib/taskFields';

/**
 * The Notion title cell: clicking the text edits it in place (Enter commits,
 * Escape reverts, blur commits a real change), while a row-hover "Open" pill
 * (always visible on touch — pointer-coarse) opens the full editor dialog.
 * The description preview (muted, one line) rides under the title; editing
 * state lives here so a rename in one row can't leak into another. Focus
 * returns to the title button after the input unmounts — the board's other
 * editors all restore focus to their trigger, and this one must match.
 */
export default function TitleCell({
  title,
  notes,
  deliverableUrl,
  selected,
  onCommit,
  onOpen,
}: {
  title: string;
  notes: string;
  deliverableUrl: string;
  selected?: boolean;
  /** Called with the trimmed new title — only on a real change. */
  onCommit: (title: string) => void;
  onOpen: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [error, setError] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Escape must revert on the SAME blur it triggers — a ref, not state.
  const cancelled = useRef(false);

  function start() {
    setValue(title);
    setError(null);
    cancelled.current = false;
    setEditing(true);
  }

  function close() {
    setEditing(false);
    setError(null);
    // The input unmounts and focus would drop to <body> — put it back on the
    // title button so Tab and the j/k layer resume where the user was.
    requestAnimationFrame(() => buttonRef.current?.focus());
  }

  function finish() {
    if (cancelled.current) {
      close();
      return;
    }
    const trimmed = value.trim();
    if (trimmed === title || trimmed === '') {
      // Unchanged or fully cleared → quiet revert (the Notion-ism).
      close();
      return;
    }
    if (trimmed.length < 2) {
      // A deliberate 1-char rename must not vanish silently — the full
      // dialog surfaces this rule loudly, so the inline door does too.
      setError('Titles need at least 2 characters.');
      return;
    }
    close();
    onCommit(trimmed);
  }

  if (editing) {
    return (
      <span className="flex min-w-0 flex-col">
        <input
          autoFocus
          value={value}
          maxLength={TASK_TITLE_MAX}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          onBlur={finish}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              finish();
            } else if (e.key === 'Escape') {
              cancelled.current = true;
              close();
            }
          }}
          aria-label="Task title"
          aria-invalid={error ? true : undefined}
          className="w-full min-w-0 rounded-md border border-white/60 bg-white/50 px-1.5 py-0.5 text-sm font-medium text-foreground outline-none dark:border-white/20 dark:bg-white/10"
        />
        {error && (
          <span role="alert" className="mt-0.5 text-xs text-destructive">
            {error}
          </span>
        )}
      </span>
    );
  }

  return (
    <span className="flex min-w-0 flex-col">
      <span className="flex items-center gap-1.5">
        <button
          ref={buttonRef}
          type="button"
          onClick={start}
          aria-current={selected ? true : undefined}
          title="Click to rename"
          className="min-w-0 cursor-text truncate rounded-sm text-left text-sm font-medium text-foreground outline-none focus-visible:underline"
        >
          {title}
        </button>
        {deliverableUrl && (
          <a
            href={deliverableUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open deliverable for ${title}`}
            className="-m-1.5 shrink-0 p-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <LuLink aria-hidden="true" className="size-3.5" />
          </a>
        )}
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Open ${title}`}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-white/50 bg-white/50 px-1.5 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover/row:opacity-100 pointer-coarse:opacity-100 dark:border-white/15 dark:bg-white/10"
        >
          <LuMaximize2 aria-hidden="true" className="size-2.5" />
          Open
        </button>
      </span>
      {notes && (
        <span className="mt-0.5 line-clamp-1 max-w-80 text-xs text-muted-foreground">
          {notes}
        </span>
      )}
    </span>
  );
}
