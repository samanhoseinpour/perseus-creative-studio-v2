'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  LuArrowDown,
  LuArrowUp,
  LuImagePlus,
  LuLoaderCircle,
  LuTrash2,
} from 'react-icons/lu';

import Button from '@/components/Button';
import { Input } from '@/components/ui/input';
import { glassChip } from '@/components/Admin/Glass';
import ConfirmDialog from '@/components/Admin/ConfirmDialog';
import {
  removeProjectMedia,
  saveMediaOrder,
  updateProjectMediaAlt,
  uploadProjectMedia,
} from '@/app/(admin)/admin/(protected)/_actions/projects';
import { reduceProjectImage } from '@/lib/reduceScreenshot';
import {
  MAX_PROJECT_UPLOAD_BYTES,
  PROJECT_IMAGE_ACCEPT,
  PROJECT_IMAGE_FULL_MAX,
  PROJECT_IMAGE_RUNGS,
  projectImageInputProblem,
} from '@/lib/portfolioFields';
import { sniffScreenshotKind } from '@/lib/ticketFields';
import { cn } from '@/lib/utils';

/** One stored gallery image, serialized by the editor page. */
export type GalleryItem = {
  id: string;
  thumbUrl: string;
  alt: string;
};

// Indices stay stable for the whole run ('done' rows just stop rendering) —
// removing rows mid-run would shift the per-file index the loop writes to.
type QueueRow = {
  name: string;
  status: 'optimizing' | 'uploading' | 'done' | 'error';
  message?: string;
};

/**
 * The detail page's stills grid, managed: multi-pick uploads processed
 * SEQUENTIALLY (one browser reduce + one action call at a time — bounds
 * memory on big picks, keeps every request under the body cap, and gives
 * per-image progress), inline alt text (saves on blur), up/down reordering
 * (optimistic, persisted whole via a debounced saveMediaOrder), and
 * per-image delete. No router.refresh() anywhere: every action here ends in
 * revalidatePath('/admin', 'layout'), so the re-rendered page rides the
 * action's own response — a refresh would render the route a second time.
 */
export default function GalleryManager({
  projectId,
  items,
}: {
  projectId: string;
  items: GalleryItem[];
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [uploading, setUploading] = useState(false);
  // Local order (optimistic) — the action-response re-render replaces it via
  // props when reset to null; keyed by items identity so external changes win.
  const [order, setOrder] = useState<string[] | null>(null);
  const [deleting, setDeleting] = useState<GalleryItem | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const orderedItems = order
    ? [...items].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
    : items;

  async function onPickFiles(picked: File[]) {
    if (picked.length === 0 || uploading) return;
    setUploading(true);
    setQueue(picked.map((f) => ({ name: f.name, status: 'optimizing' })));

    let stored = 0;
    for (const [index, file] of picked.entries()) {
      const setRow = (row: Partial<QueueRow>) =>
        setQueue((q) => q.map((r, i) => (i === index ? { ...r, ...row } : r)));

      const problem = projectImageInputProblem(file);
      const kind = problem ? null : await sniffScreenshotKind(file);
      if (problem || !kind) {
        setRow({ status: 'error', message: problem ?? 'Not a supported image.' });
        continue;
      }

      const reduced = await reduceProjectImage(file, kind, {
        fullMax: PROJECT_IMAGE_FULL_MAX,
        rungWidths: PROJECT_IMAGE_RUNGS,
      });
      if (!reduced) {
        setRow({ status: 'error', message: 'Could not read this image.' });
        continue;
      }
      const totalBytes =
        reduced.full.file.size +
        reduced.rungs.reduce((sum, r) => sum + r.file.size, 0);
      if (totalBytes > MAX_PROJECT_UPLOAD_BYTES) {
        setRow({ status: 'error', message: 'Still over 4 MB after optimizing.' });
        continue;
      }

      setRow({ status: 'uploading' });
      const fd = new FormData();
      fd.set('projectId', projectId);
      fd.set('slot', 'gallery');
      fd.set('alt', '');
      fd.set('blur', reduced.blurDataUrl);
      fd.set('fullWidth', String(reduced.full.width));
      fd.set('fullHeight', String(reduced.full.height));
      fd.set('full', reduced.full.file);
      for (const rung of reduced.rungs) fd.set(`w${rung.width}`, rung.file);

      let res: Awaited<ReturnType<typeof uploadProjectMedia>>;
      try {
        res = (await uploadProjectMedia(fd)) ?? {
          ok: false,
          error: 'Upload failed.',
        };
      } catch {
        res = { ok: false, error: 'Upload failed.' };
      }
      if (!res.ok) {
        setRow({ status: 'error', message: res.error });
        continue;
      }
      stored += 1;
      setRow({ status: 'done' });
    }

    setUploading(false);
    setQueue((q) => q.filter((r) => r.status === 'error'));
    if (stored > 0) {
      setOrder(null); // fresh server order includes the new rows
      toast.success(
        stored === 1 ? 'Image added.' : `${stored} images added.`,
      );
    }
  }

  // Reorder is optimistic and NON-blocking: each arrow click swaps the local
  // order immediately (arrows stay enabled — moving an image N positions is
  // N instant clicks, not N click-wait cycles of a saveMediaOrder round
  // trip), and the whole-list persist fires ~500ms after the LAST click.
  // Clicks landing while a persist is in flight coalesce into one follow-up
  // save; a failed persist reverts to the server's order.
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingOrder = useRef<string[] | null>(null);
  const persisting = useRef(false);

  const persistOrder = useCallback(async function persist(): Promise<void> {
    if (persisting.current) return; // the in-flight run re-checks when done
    const next = pendingOrder.current;
    if (!next) return;
    pendingOrder.current = null;
    persisting.current = true;
    let res: Awaited<ReturnType<typeof saveMediaOrder>>;
    try {
      res = (await saveMediaOrder(projectId, next)) ?? {
        ok: false,
        error: 'Reorder failed. Try again.',
      };
    } catch {
      res = { ok: false, error: 'Reorder failed. Try again.' };
    }
    persisting.current = false;
    if (!res.ok) {
      pendingOrder.current = null;
      setOrder(null); // fall back to the server's order
      toast.error(res.error);
      return;
    }
    // More clicks landed while this save was in flight — persist those too.
    if (pendingOrder.current) void persist();
  }, [projectId]);

  // Unmount mid-debounce FLUSHES the pending persist instead of discarding
  // it: the server action completes even after unmount, and silently
  // dropping a reorder the user just watched happen would lose it with zero
  // signal (the next visit would show the old order).
  useEffect(
    () => () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
      if (pendingOrder.current) void persistOrder();
    },
    [persistOrder],
  );

  function move(id: string, delta: -1 | 1) {
    if (uploading) return;
    const current = orderedItems.map((i) => i.id);
    const from = current.indexOf(id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= current.length) return;
    const next = [...current];
    [next[from], next[to]] = [next[to], next[from]];

    setOrder(next);
    pendingOrder.current = next;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => void persistOrder(), 500);
  }

  async function saveAlt(item: GalleryItem, value: string) {
    // item.alt re-syncs from the action response's re-render, so this no-op
    // guard heals itself without any client-side bookkeeping.
    if (value === item.alt) return;
    let res: Awaited<ReturnType<typeof updateProjectMediaAlt>>;
    try {
      res = (await updateProjectMediaAlt(item.id, value)) ?? {
        ok: false,
        error: 'Save failed. Try again.',
      };
    } catch {
      res = { ok: false, error: 'Save failed. Try again.' };
    }
    if (!res.ok) {
      toast.error(res.error);
    }
  }

  async function onDelete() {
    if (!deleting) return;
    setDeletePending(true);
    let res: Awaited<ReturnType<typeof removeProjectMedia>>;
    try {
      res = (await removeProjectMedia(deleting.id)) ?? {
        ok: false,
        error: 'Delete failed. Try again.',
      };
    } catch {
      res = { ok: false, error: 'Delete failed. Try again.' };
    }
    setDeletePending(false);
    setDeleting(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    // A queued reorder still naming the deleted row would trip
    // saveMediaOrder's exact-cover guard with a misleading "list changed"
    // toast — rewrite it without the deleted id and flush now, so the
    // surviving moves persist instead of being dropped.
    if (persistTimer.current) clearTimeout(persistTimer.current);
    if (pendingOrder.current) {
      const remaining = pendingOrder.current.filter(
        (mediaId) => mediaId !== deleting.id,
      );
      pendingOrder.current = remaining.length > 0 ? remaining : null;
      if (pendingOrder.current) void persistOrder();
    }
    setOrder(null);
    toast.success('Image removed.');
  }

  // Paste reaches this handler only when focus sits inside the section
  // (the root div is click-focusable via tabIndex) — ScreenshotDropzone's
  // page-wide listener yields to foreign paste zones, so one ⌘V can't
  // become both the cover and a gallery still. Same guard as the dropzone:
  // a text-carrying paste aimed at the alt inputs stays a text paste.
  function onPaste(e: React.ClipboardEvent) {
    const images = Array.from(e.clipboardData?.files ?? []).filter((f) =>
      f.type.startsWith('image/'),
    );
    if (images.length === 0) return;
    const target = e.target as HTMLElement | null;
    const intoTextField = !!target?.closest?.(
      'input, textarea, [contenteditable]',
    );
    if (intoTextField && e.clipboardData?.getData('text/plain')) return;
    e.preventDefault();
    onPickFiles(images);
  }

  return (
    <div
      data-paste-zone
      tabIndex={-1}
      onPaste={onPaste}
      className="flex flex-col gap-4 outline-none"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {items.length === 0
            ? 'No stills yet. Add images or click this panel and paste a screenshot; the detail page shows a gallery once images land.'
            : `${items.length} image${items.length === 1 ? '' : 's'}. Top of the list renders first. Click the panel to paste more.`}
        </p>
        <Button
          type="button"
          variant="secondary"
          size="small"
          icon={LuImagePlus}
          iconPosition="left"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? 'Uploading…' : 'Add images'}
        </Button>
      </div>

      {queue.some((r) => r.status !== 'done') && (
        <ul className="flex flex-col gap-1.5">
          {queue.map((row, i) =>
            row.status === 'done' ? null : (
            <li
              key={`${row.name}-${i}`}
              className="flex items-center gap-2 rounded-md border border-foreground/15 bg-white/40 px-3 py-2 text-xs dark:bg-white/10"
            >
              {row.status === 'error' ? (
                <span className="text-destructive">
                  {row.name}: {row.message}
                </span>
              ) : (
                <>
                  <LuLoaderCircle className="size-3.5 shrink-0 animate-spin" aria-hidden="true" />
                  <span className="truncate text-muted-foreground">
                    {row.status === 'optimizing' ? 'Optimizing' : 'Uploading'} {row.name}…
                  </span>
                </>
              )}
            </li>
            ),
          )}
        </ul>
      )}

      {orderedItems.length > 0 && (
        <ul className="flex flex-col gap-2">
          {orderedItems.map((item, index) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-lg border border-foreground/10 bg-white/30 p-2 dark:bg-white/5"
            >
              <span
                className={cn(
                  'flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md',
                  glassChip,
                )}
              >
                {/* Stored rung bytes (public CDN) — alt is the editable
                    field beside it, not this decorative thumb. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.thumbUrl}
                  alt=""
                  width={56}
                  height={56}
                  loading="lazy"
                  draggable={false}
                  className="h-full w-full object-cover"
                />
              </span>

              <Input
                aria-label={`Describe image ${index + 1}`}
                defaultValue={item.alt}
                placeholder="Describe the image (alt text)"
                maxLength={300}
                disabled={uploading}
                onBlur={(e) => saveAlt(item, e.target.value.trim())}
                className="flex-1"
              />

              <div className="flex shrink-0 items-center gap-1">
                <IconAction
                  label={`Move image ${index + 1} up`}
                  disabled={index === 0 || uploading}
                  onClick={() => move(item.id, -1)}
                >
                  <LuArrowUp className="size-4" aria-hidden="true" />
                </IconAction>
                <IconAction
                  label={`Move image ${index + 1} down`}
                  disabled={index === orderedItems.length - 1 || uploading}
                  onClick={() => move(item.id, 1)}
                >
                  <LuArrowDown className="size-4" aria-hidden="true" />
                </IconAction>
                <IconAction
                  label={`Remove image ${index + 1}`}
                  disabled={uploading}
                  onClick={() => setDeleting(item)}
                  destructive
                >
                  <LuTrash2 className="size-4" aria-hidden="true" />
                </IconAction>
              </div>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={PROJECT_IMAGE_ACCEPT}
        multiple
        aria-label="Gallery image files"
        disabled={uploading}
        onChange={(e) => {
          // Copy out of the live FileList BEFORE resetting the input —
          // `value = ''` empties that list in place, which used to hand
          // onPickFiles zero files and silently do nothing.
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          onPickFiles(files);
        }}
        className="sr-only"
        tabIndex={-1}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(next) => !deletePending && !next && setDeleting(null)}
        title="Remove this image?"
        description="It disappears from the gallery immediately. This can’t be undone."
        confirmLabel="Remove image"
        onConfirm={onDelete}
        destructive
        pending={deletePending}
      />
    </div>
  );
}

function IconAction({
  label,
  disabled,
  onClick,
  destructive,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors',
        destructive ? 'hover:text-destructive' : 'hover:text-foreground',
        'disabled:pointer-events-none disabled:opacity-40',
      )}
    >
      {children}
    </button>
  );
}
