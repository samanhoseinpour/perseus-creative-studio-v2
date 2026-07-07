'use client';

import { useRef, useState } from 'react';
import {
  LuPaperclip as Paperclip,
  LuUpload as Upload,
  LuX as X,
} from 'react-icons/lu';
import { cn } from '@/lib/utils';

/**
 * Resume attach control: drag & drop onto the zone or click to browse. Dumb
 * and controlled — the file lives in ContactHub, which validates every pick
 * (type/size + magic-byte sniff) before storing, so a bad file never reaches
 * state or the offline queue. The empty zone is a real <button> wrapping the
 * hidden file input, so it's keyboard-operable for free.
 */

interface ResumeDropzoneProps {
  file: File | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPick: (file: File | null) => void;
  onClear: () => void;
  accept: string;
  hint: string;
  labelledBy?: string;
  describedBy?: string;
  invalid?: boolean;
}

const ResumeDropzone = ({
  file,
  inputRef,
  onPick,
  onClear,
  accept,
  hint,
  labelledBy,
  describedBy,
  invalid,
}: ResumeDropzoneProps) => {
  const [dragActive, setDragActive] = useState(false);
  // `dragleave` fires every time the pointer crosses a child element, so a
  // plain boolean flickers. Count enter/leave depth; deactivate only at zero.
  const depth = useRef(0);

  const hasFiles = (e: React.DragEvent) =>
    e.dataTransfer.types.includes('Files');

  const onDragEnter = (e: React.DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth.current += 1;
    setDragActive(true);
  };
  const onDragOver = (e: React.DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };
  const onDragLeave = (e: React.DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth.current -= 1;
    if (depth.current <= 0) {
      depth.current = 0;
      setDragActive(false);
    }
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    depth.current = 0;
    setDragActive(false);
    onPick(e.dataTransfer.files?.[0] ?? null);
  };

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
      {file ? (
        <div
          className={cn(
            'flex w-full items-center justify-between gap-3 rounded-2xl border bg-background-contrast px-4 py-3.5 text-sm text-black transition-colors',
            dragActive
              ? 'border-foreground/50 bg-foreground/5'
              : 'border-foreground/10',
          )}
        >
          <span className="inline-flex min-w-0 items-center gap-2">
            <Paperclip className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{file.name}</span>
            <span className="shrink-0 text-xs text-black/40 tabular-nums">
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </span>
          </span>
          <button
            type="button"
            onClick={onClear}
            aria-label="Remove resume"
            className="cursor-pointer text-black/50 transition-colors hover:text-black"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex w-full cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
            dragActive
              ? 'border-foreground/50 bg-foreground/5 text-black'
              : invalid
                ? 'border-destructive/40 bg-background-contrast/50 text-black/50 hover:border-destructive/60'
                : 'border-foreground/15 bg-background-contrast/50 text-black/40 hover:border-foreground/30 hover:text-black',
          )}
        >
          <Upload className="size-5" aria-hidden="true" />
          <span>
            <span className="font-medium text-black">
              {dragActive ? 'Drop to attach' : 'Drag & drop your resume'}
            </span>
            {!dragActive && (
              <span className="text-black/40"> or click to browse</span>
            )}
          </span>
          <span className="text-xs text-black/35">{hint}</span>
        </button>
      )}
      <input
        ref={inputRef}
        id="resume-input"
        aria-label="Resume file"
        type="file"
        accept={accept}
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        className="sr-only"
        tabIndex={-1}
      />
    </div>
  );
};

export default ResumeDropzone;
