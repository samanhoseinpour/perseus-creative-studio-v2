'use client';

import { useEffect, useRef, useState } from 'react';
import { LuLoaderCircle, LuPaperclip, LuUpload, LuX } from 'react-icons/lu';

import { glassChip } from '@/components/Admin/Glass';
import { useObjectUrl } from '@/hooks/useObjectUrl';
import { reducedSizeLine } from '@/lib/formatBytes';
import { cn } from '@/lib/utils';

/**
 * Screenshot attach control for the ticket form: drag & drop, click to
 * browse, or paste from the clipboard. Dumb and controlled like the contact
 * page's ResumeDropzone — the parent validates every pick (type/size +
 * magic-byte sniff) and runs the reduce step, so this only renders the three
 * phases it's handed: the dashed drop zone (idle), an "Optimizing…" chip with
 * a spinner (processing, X cancels), and the picked-file chip with a
 * thumbnail and the before → after size line (ready).
 */

export type ShotState =
  | { phase: 'idle' }
  | { phase: 'processing'; name: string }
  | { phase: 'ready'; file: File; originalBytes: number; kept: boolean };

const sizeLine = (state: Extract<ShotState, { phase: 'ready' }>) =>
  reducedSizeLine(state.file.size, state.originalBytes, state.kept);

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
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Thumbnail for the ready chip. The hook's cleanup revokes the URL on
  // clear, replace, and unmount; the parent's generation counter means a
  // stale reduce never reaches `ready`, so no stale URL is ever created.
  // Load/error flags are keyed BY URL (derived, no reset effect needed):
  // a decode failure just falls back to the paperclip — exactly the old chip.
  const previewUrl = useObjectUrl(state.phase === 'ready' ? state.file : null);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  const showThumb = previewUrl !== null && brokenUrl !== previewUrl;

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
      // The project editor mounts this (cover) beside the gallery's own
      // paste zone — a paste aimed inside a foreign zone belongs to it.
      const zone = target?.closest?.('[data-paste-zone]');
      if (zone && zone !== rootRef.current) return;

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
      ref={rootRef}
      data-paste-zone
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
            'flex w-full items-center justify-between gap-3 rounded-md border bg-white/40 px-3 py-2 transition-colors dark:bg-white/10',
            dragActive ? 'border-ring bg-foreground/5' : 'border-foreground/15',
          )}
        >
          <span role="status" className="inline-flex min-w-0 items-center gap-2.5">
            {showThumb ? (
              <span
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg',
                  glassChip,
                )}
              >
                {/* The optimized bytes themselves (object URL) — decorative;
                    the filename beside it is the accessible label. The chip
                    tint floors transparent PNGs on both themes. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt=""
                  width={40}
                  height={40}
                  draggable={false}
                  onLoad={() => setLoadedUrl(previewUrl)}
                  onError={() => setBrokenUrl(previewUrl)}
                  className={cn(
                    'h-full w-full object-cover transition-opacity duration-300',
                    loadedUrl === previewUrl ? 'opacity-100' : 'opacity-0',
                  )}
                />
              </span>
            ) : (
              <LuPaperclip
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            )}
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
