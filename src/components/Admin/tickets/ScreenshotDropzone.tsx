'use client';

import { useEffect, useRef, useState } from 'react';
import { LuLoaderCircle, LuPaperclip, LuUpload, LuX } from 'react-icons/lu';

import { cn } from '@/lib/utils';

/**
 * Screenshot attach control for the ticket form: drag & drop, click to
 * browse, or paste from the clipboard. Dumb and controlled like the contact
 * page's ResumeDropzone — the parent validates every pick (type/size +
 * magic-byte sniff) and runs the reduce step, so this only renders the three
 * phases it's handed: the dashed drop zone (idle), an "Optimizing…" chip with
 * a spinner (processing, X cancels), and the picked-file chip with the
 * before → after size line (ready).
 */

export type ShotState =
  | { phase: 'idle' }
  | { phase: 'processing'; name: string }
  | { phase: 'ready'; file: File; originalBytes: number; kept: boolean };

const fmtSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

function sizeLine(state: Extract<ShotState, { phase: 'ready' }>): string {
  const pct = Math.round(100 * (1 - state.file.size / state.originalBytes));
  if (state.kept || pct < 1) return `${fmtSize(state.file.size)} · already optimized`;
  return `${fmtSize(state.originalBytes)} → ${fmtSize(state.file.size)} · ${pct}% smaller`;
}

interface ScreenshotDropzoneProps {
  state: ShotState;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPick: (file: File | null) => void;
  onClear: () => void;
  accept: string;
  hint: string;
  labelledBy?: string;
  describedBy?: string;
  invalid?: boolean;
  disabled?: boolean;
}

const ScreenshotDropzone = ({
  state,
  inputRef,
  onPick,
  onClear,
  accept,
  hint,
  labelledBy,
  describedBy,
  invalid,
  disabled,
}: ScreenshotDropzoneProps) => {
  const [dragActive, setDragActive] = useState(false);
  // `dragleave` fires every time the pointer crosses a child element, so a
  // plain boolean flickers. Count enter/leave depth; deactivate only at zero.
  const depth = useRef(0);

  const hasFiles = (e: React.DragEvent) =>
    e.dataTransfer.types.includes('Files');

  const onDragEnter = (e: React.DragEvent) => {
    if (disabled || !hasFiles(e)) return;
    e.preventDefault();
    depth.current += 1;
    setDragActive(true);
  };
  const onDragOver = (e: React.DragEvent) => {
    if (disabled || !hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };
  const onDragLeave = (e: React.DragEvent) => {
    if (disabled || !hasFiles(e)) return;
    e.preventDefault();
    depth.current -= 1;
    if (depth.current <= 0) {
      depth.current = 0;
      setDragActive(false);
    }
  };
  const onDrop = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    depth.current = 0;
    setDragActive(false);
    onPick(e.dataTransfer.files?.[0] ?? null);
  };

  // Screenshots usually live in the clipboard — accept a paste anywhere on
  // the page while the form is up.
  //
  // Guard: a copy from Excel/Numbers/Word puts BOTH an image file and text on
  // the clipboard. Intercepting that inside a text field would swallow the
  // paste the user actually meant and silently attach a picture of their
  // spreadsheet, so a text-carrying paste aimed at a text field is left alone.
  // A bare screenshot (image, no text) still attaches from anywhere.
  useEffect(() => {
    if (disabled) return;
    function onPaste(e: ClipboardEvent) {
      const image = Array.from(e.clipboardData?.files ?? []).find((f) =>
        f.type.startsWith('image/'),
      );
      if (!image) return;

      const target = e.target as HTMLElement | null;
      const intoTextField = !!target?.closest?.(
        'input, textarea, [contenteditable]',
      );
      if (intoTextField && e.clipboardData?.getData('text/plain')) return;

      e.preventDefault();
      onPick(image);
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [disabled, onPick]);

  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {state.phase === 'processing' ? (
        <div className="flex w-full items-center justify-between gap-3 rounded-md border border-foreground/15 bg-white/40 px-3 py-2.5 dark:bg-white/10">
          <span
            role="status"
            className="inline-flex min-w-0 items-center gap-2 text-sm text-foreground"
          >
            <LuLoaderCircle
              className="h-4 w-4 shrink-0 animate-spin"
              aria-hidden="true"
            />
            <span className="truncate">Optimizing {state.name}…</span>
          </span>
          <button
            type="button"
            onClick={onClear}
            aria-label="Cancel and remove screenshot"
            className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
          >
            <LuX className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : state.phase === 'ready' ? (
        <div
          className={cn(
            'flex w-full items-center justify-between gap-3 rounded-md border bg-white/40 px-3 py-2.5 transition-colors dark:bg-white/10',
            dragActive ? 'border-ring bg-foreground/5' : 'border-foreground/15',
          )}
        >
          <span role="status" className="inline-flex min-w-0 items-center gap-2">
            <LuPaperclip
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="min-w-0">
              <span className="block truncate text-sm text-foreground">
                {state.file.name}
              </span>
              <span className="block text-xs tabular-nums text-muted-foreground">
                {sizeLine(state)}
              </span>
            </span>
          </span>
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            aria-label="Remove screenshot"
            className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            <LuX className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex w-full cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed px-6 py-6 text-center text-sm transition-colors',
            'focus-visible:border-ring focus-visible:ring-[1px] focus-visible:ring-ring/40 focus-visible:outline-none',
            'disabled:pointer-events-none disabled:opacity-50',
            dragActive
              ? 'border-ring bg-foreground/5 text-foreground'
              : invalid
                ? 'border-destructive/40 text-muted-foreground hover:border-destructive/60'
                : 'border-foreground/20 text-muted-foreground hover:border-foreground/40 hover:text-foreground',
          )}
        >
          <LuUpload className="size-5" aria-hidden="true" />
          <span>
            <span className="font-medium text-foreground">
              {dragActive ? 'Drop to attach' : 'Drag & drop a screenshot'}
            </span>
            {!dragActive && <span> — click to browse, or paste it</span>}
          </span>
          <span className="text-xs">{hint}</span>
        </button>
      )}
      <input
        ref={inputRef}
        id="screenshot-input"
        aria-label="Screenshot file"
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(e) => {
          const picked = e.target.files?.[0] ?? null;
          // Reset so re-picking the same filename fires onChange again.
          e.target.value = '';
          onPick(picked);
        }}
        className="sr-only"
        tabIndex={-1}
      />
    </div>
  );
};

export default ScreenshotDropzone;
