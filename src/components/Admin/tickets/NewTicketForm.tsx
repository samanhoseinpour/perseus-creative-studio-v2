'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import Button from '@/components/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GlassPanel } from '@/components/Admin/Glass';
import ScreenshotDropzone, { type ShotState } from './ScreenshotDropzone';
import { createTicket } from '@/app/(admin)/admin/(protected)/_actions/tickets';
import { reduceScreenshot } from '@/lib/reduceScreenshot';
import { useFocusOnMount } from '@/hooks/useSearchFocus';
import {
  MAX_SCREENSHOT_BYTES,
  SCREENSHOT_ACCEPT,
  SCREENSHOT_BAD_TYPE,
  screenshotInputProblem,
  sniffScreenshotKind,
  TICKET_DESCRIPTION_MAX,
  TICKET_SEVERITY_LABELS,
  TICKET_SEVERITY_SLUGS,
  TICKET_TITLE_MAX,
  type TicketAreaGroup,
  type TicketSeveritySlug,
} from '@/lib/ticketFields';
import { cn } from '@/lib/utils';

// The Input primitive's look, applied to a native textarea (there's no shared
// textarea primitive, and the admin must stay off heavier form deps).
const textareaClasses =
  'placeholder:text-muted-foreground border-input flex w-full min-w-0 resize-y rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[1px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive';

// One capless section: a three-chip wrap row, which is what a single unlabelled
// group renders as.
const SEVERITY_GROUPS = [
  {
    label: null,
    options: TICKET_SEVERITY_SLUGS.map((slug) => ({
      slug,
      label: TICKET_SEVERITY_LABELS[slug],
    })),
  },
];

/** Issue keys with a render slot; anything else folds into the form-level error. */
const RENDERED_ISSUE_KEYS = new Set([
  'title',
  'description',
  'severity',
  'area',
  'screenshot',
  '_form',
]);

/**
 * Server issues arrive keyed by zod path. Fold any key without a render slot
 * into `_form` so a validation failure can never show the "check the
 * highlighted fields" toast with nothing highlighted.
 */
function withRenderableIssues(
  issues: Record<string, string>,
): Record<string, string> {
  const next: Record<string, string> = {};
  const orphans: string[] = [];
  for (const [key, message] of Object.entries(issues)) {
    if (RENDERED_ISSUE_KEYS.has(key)) next[key] = message;
    else orphans.push(`${key}: ${message}`);
  }
  if (orphans.length > 0) {
    next._form = [next._form, ...orphans].filter(Boolean).join(' · ');
  }
  return next;
}

/** Visual required marker; the inputs carry `required` for assistive tech. */
const RequiredMark = () => (
  <span aria-hidden="true" className="text-destructive">
    {' '}
    *
  </span>
);

/**
 * The "report a bug" form. Validation is server-authoritative (zod lives in
 * the createTicket action only — this module must stay zod-free for chunk
 * hygiene); the client does native required/maxLength plus the shared
 * screenshot pre-checks. A picked screenshot is downscaled/re-encoded in the
 * browser (reduceScreenshot) before it ever enters form state, with a visible
 * optimizing phase and a before → after size line — submit stays disabled
 * until the image is ready.
 */
export default function NewTicketForm({
  areas,
}: {
  areas: TicketAreaGroup[];
}) {
  const router = useRouter();
  const titleRef = useRef<HTMLInputElement>(null);
  // No `/` and no Escape-blur here: a title field must not claim the search
  // key, and a form has no j/k list to hand the keyboard back to.
  useFocusOnMount(titleRef);
  const [severity, setSeverity] = useState<TicketSeveritySlug>('medium');
  const [area, setArea] = useState<string>('other');
  const [shot, setShot] = useState<ShotState>({ phase: 'idle' });
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Generation counter: remove/replace while a reduce is in flight bumps it,
  // so the stale async result self-discards instead of resurrecting a file.
  const shotGen = useRef(0);

  const processing = shot.phase === 'processing';

  function clearIssue(key: string) {
    setIssues((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function onPickScreenshot(picked: File | null) {
    if (!picked || pending) return;
    const gen = ++shotGen.current;

    const problem = screenshotInputProblem(picked);
    const kind = problem ? null : await sniffScreenshotKind(picked);
    if (gen !== shotGen.current) return;
    if (problem || !kind) {
      setShot({ phase: 'idle' });
      setIssues((prev) => ({
        ...prev,
        screenshot: problem ?? SCREENSHOT_BAD_TYPE,
      }));
      return;
    }

    clearIssue('screenshot');
    setShot({ phase: 'processing', name: picked.name });
    const result = await reduceScreenshot(picked, kind);
    if (gen !== shotGen.current) return; // removed/replaced meanwhile

    if (result.file.size > MAX_SCREENSHOT_BYTES) {
      setShot({ phase: 'idle' });
      setIssues((prev) => ({
        ...prev,
        screenshot:
          'Screenshot is still over 4 MB after optimizing. Attach a smaller image.',
      }));
      return;
    }
    setShot({ phase: 'ready', ...result });
  }

  function onClearScreenshot() {
    shotGen.current++; // an in-flight reduce can't resurrect the file
    setShot({ phase: 'idle' });
    clearIssue('screenshot');
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending || processing) return;
    const form = e.currentTarget;
    const fd = new FormData();
    fd.set('title', (form.elements.namedItem('title') as HTMLInputElement).value);
    fd.set(
      'description',
      (form.elements.namedItem('description') as HTMLTextAreaElement).value,
    );
    fd.set('severity', severity);
    fd.set('area', area);
    if (shot.phase === 'ready') fd.set('screenshot', shot.file);

    setPending(true);
    let res: Awaited<ReturnType<typeof createTicket>>;
    try {
      // `??` covers session expiry: a redirect() inside the action resolves
      // the promise without a value while the router navigates to login
      // (same rationale as the inbox's safeAction wrapper).
      res = (await createTicket(fd)) ?? { ok: false, error: 'server' };
    } catch {
      setPending(false);
      toast.error('Something went wrong. Try again.');
      return;
    }

    if (res.ok) {
      toast.success('Ticket submitted.');
      // Keep `pending` on while the redirect lands — no double submits.
      router.push(`/admin/tickets/${res.id}`);
      return;
    }
    setPending(false);
    if (res.error === 'validation') {
      setIssues(withRenderableIssues(res.issues));
      toast.error('Check the highlighted fields.');
      return;
    }
    toast.error('Could not submit the ticket. Try again.');
  }

  return (
    <GlassPanel as="section" className="p-5 sm:p-6">
      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ticket-title">
            Title
            <RequiredMark />
          </Label>
          <Input
            id="ticket-title"
            ref={titleRef}
            name="title"
            required
            minLength={3}
            maxLength={TICKET_TITLE_MAX}
            placeholder="Short summary of the problem"
            disabled={pending}
            onChange={() => clearIssue('title')}
            aria-invalid={issues.title ? true : undefined}
            aria-describedby={issues.title ? 'ticket-title-error' : undefined}
          />
          {issues.title && (
            <p
              id="ticket-title-error"
              role="alert"
              className="px-1 text-xs text-destructive"
            >
              {issues.title}
            </p>
          )}
        </div>

        <ChipGroup
          legend="Severity"
          groups={SEVERITY_GROUPS}
          value={severity}
          onChange={(next) => {
            clearIssue('severity');
            setSeverity(next);
          }}
          disabled={pending}
          error={issues.severity}
        />

        <ChipGroup
          legend="Where did you see it?"
          groups={areas.map((group) => ({
            label: group.label,
            options: group.areas,
          }))}
          value={area}
          onChange={(next) => {
            clearIssue('area');
            setArea(next);
          }}
          disabled={pending}
          error={issues.area}
        />

        <div className="flex flex-col gap-2">
          <Label htmlFor="ticket-description">
            What happened?
            <RequiredMark />
          </Label>
          <textarea
            id="ticket-description"
            name="description"
            data-lenis-prevent
            required
            rows={6}
            maxLength={TICKET_DESCRIPTION_MAX}
            placeholder="What did you do, what did you expect, and what happened instead?"
            disabled={pending}
            onChange={() => clearIssue('description')}
            aria-invalid={issues.description ? true : undefined}
            aria-describedby={
              issues.description ? 'ticket-description-error' : undefined
            }
            className={cn(textareaClasses, 'min-h-32')}
          />
          {issues.description && (
            <p
              id="ticket-description-error"
              role="alert"
              className="px-1 text-xs text-destructive"
            >
              {issues.description}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span
            id="ticket-screenshot-label"
            className="text-sm font-medium text-foreground"
          >
            Screenshot <span className="text-muted-foreground">(optional)</span>
          </span>
          <ScreenshotDropzone
            state={shot}
            inputRef={fileInputRef}
            onPick={onPickScreenshot}
            onClear={onClearScreenshot}
            accept={SCREENSHOT_ACCEPT}
            hint="PNG, JPEG, WebP, or AVIF. Up to 15 MB, optimized before upload"
            labelledBy="ticket-screenshot-label"
            describedBy={issues.screenshot ? 'ticket-screenshot-error' : undefined}
            invalid={!!issues.screenshot}
            disabled={pending}
          />
          {issues.screenshot && (
            <p
              id="ticket-screenshot-error"
              role="alert"
              className="px-1 text-xs text-destructive"
            >
              {issues.screenshot}
            </p>
          )}
        </div>

        {issues._form && (
          <p role="alert" className="text-xs text-destructive">
            {issues._form}
          </p>
        )}

        <div className="flex justify-end border-t border-white/40 pt-4 dark:border-white/10">
          <Button
            type="submit"
            size="small"
            showIcon={false}
            disabled={pending || processing}
          >
            {pending
              ? 'Submitting…'
              : processing
                ? 'Optimizing image…'
                : 'Submit ticket'}
          </Button>
        </div>
      </form>
    </GlassPanel>
  );
}

/**
 * A single-choice chip field, laid out as captioned wrapping runs.
 *
 * WRAPPING, never a scroll rail. This was a `no-scrollbar` horizontal rail with
 * an edge fade, which was fine at eight areas and a trap at twenty one: only
 * the first eleven fitted, a hidden scrollbar left nothing on screen to say the
 * rest existed, and the owner read a picker with no "Monitoring" in it as an
 * access problem rather than a clipped list. Height is the cheap axis on a
 * form; an option nobody can find is not.
 *
 * The captions come from the rail's own groups, so a reporter looks for a page
 * where their eye already knows it lives.
 */
function ChipGroup<T extends string>({
  legend,
  groups,
  value,
  onChange,
  disabled,
  error,
}: {
  legend: string;
  /** Captioned runs. A lone `label: null` section is a plain wrap row. */
  groups: readonly {
    label: string | null;
    options: readonly { slug: T; label: string }[];
  }[];
  value: T;
  onChange: (next: T) => void;
  disabled?: boolean;
  error?: string;
}) {
  const fieldId = legend.replace(/\W+/g, '-').toLowerCase();
  const errorId = `${fieldId}-error`;

  return (
    <fieldset disabled={disabled} aria-describedby={error ? errorId : undefined}>
      <legend className="mb-2 text-sm font-medium text-foreground">
        {legend}
      </legend>
      <div className="flex flex-col gap-3">
        {groups.map((group, index) => {
          // role="group" only where there is a caption to name it: an unnamed
          // group is a landmark that announces nothing.
          const captionId = group.label ? `${fieldId}-${index}` : undefined;
          return (
            <div
              key={group.label ?? `_${index}`}
              {...(captionId
                ? { role: 'group', 'aria-labelledby': captionId }
                : {})}
            >
              {group.label && (
                <p
                  id={captionId}
                  className="mb-1.5 px-1 text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground"
                >
                  {group.label}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {group.options.map(({ slug, label }) => (
                  <label
                    key={slug}
                    className={cn(
                      'cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
                      'has-[:focus-visible]:ring-[1.5px] has-[:focus-visible]:ring-ring',
                      value === slug
                        ? 'border-transparent bg-foreground text-background'
                        : 'border-foreground/15 bg-white/40 text-muted-foreground hover:text-foreground dark:bg-white/10',
                      disabled && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <input
                      type="radio"
                      name={legend}
                      value={slug}
                      checked={value === slug}
                      onChange={() => onChange(slug)}
                      className="sr-only"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-2 px-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
