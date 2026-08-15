'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from 'radix-ui';
import { toast } from 'sonner';
import { LuPencilLine } from 'react-icons/lu';

import { saveReportNote } from '@/app/(admin)/admin/(protected)/_actions/tasks';
import { REPORT_NOTE_MAX } from '@/lib/taskFields';
import Button from '@/components/Button';
import GlassDialog from '@/components/Admin/GlassDialog';
import { GlassPanel } from '@/components/Admin/Glass';
import { Label } from '@/components/ui/label';

// The Input primitive's look on a native textarea (TaskDialog's idiom).
const textareaClasses =
  'placeholder:text-muted-foreground border-input flex w-full min-w-0 resize-y rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[1px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive';

/**
 * The month's written "highlights" — the human story on top of the report's
 * numbers, saved per (client, month) and rendered on the dashboard AND at the
 * top of the print PDF. Owns its section chrome and the edit dialog
 * (RetainerDialog recipe); glass tone only — the print page renders the note
 * itself in its literal-neutral styles.
 */
export default function ReportHighlights({
  clientId,
  month,
  monthLabelText,
  note,
}: {
  clientId: string;
  month: string;
  monthLabelText: string;
  /** The saved note; '' when none. */
  note: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(note);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void (async () => {
      setPending(true);
      const res = await saveReportNote({ clientId, month, body: draft }).catch(
        () => null,
      );
      setPending(false);
      if (!res?.ok) {
        if (res && res.error === 'validation') {
          setError(Object.values(res.issues)[0] ?? 'Check the text.');
        } else {
          toast.error('Could not save the highlights — try again.');
        }
        return;
      }
      toast.success(draft.trim() ? 'Highlights saved.' : 'Highlights cleared.');
      setOpen(false);
      router.refresh();
    })();
  }

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Month highlights
        </h2>
        <Button
          type="button"
          size="small"
          variant="secondary"
          icon={LuPencilLine}
          iconPosition="left"
          onClick={() => {
            setDraft(note);
            setError(null);
            setOpen(true);
          }}
        >
          {note ? 'Edit' : 'Write highlights'}
        </Button>
      </div>
      <GlassPanel className="p-5 sm:p-6">
        {note ? (
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
            {note}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            A few sentences on what shipped and why it mattered — they lead the
            print report for {monthLabelText}.
          </p>
        )}
      </GlassPanel>

      <GlassDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
          Month highlights
        </Dialog.Title>
        <Dialog.Description className="mt-1 text-sm text-muted-foreground">
          {monthLabelText} — client-facing copy: it appears on the print
          report. Clearing the text removes the section.
        </Dialog.Description>

        <form onSubmit={onSubmit} className="mt-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="report-note">Highlights</Label>
            <textarea
              id="report-note"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setError(null);
              }}
              rows={6}
              maxLength={REPORT_NOTE_MAX}
              placeholder="e.g. Launched the spring campaign — 3 reels shipped, site traffic up…"
              disabled={pending}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'report-note-error' : undefined}
              className={textareaClasses}
            />
            {error && (
              <p
                id="report-note-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {error}
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
            <Button
              type="submit"
              size="small"
              shimmer={false}
              showIcon={false}
              disabled={pending}
              className="w-full sm:w-auto"
            >
              {pending ? 'Saving…' : 'Save highlights'}
            </Button>
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="secondary"
                size="small"
                showIcon={false}
                disabled={pending}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
            </Dialog.Close>
          </div>
        </form>
      </GlassDialog>
    </section>
  );
}
