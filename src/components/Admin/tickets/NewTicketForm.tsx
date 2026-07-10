'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LuImagePlus } from 'react-icons/lu';

import Button from '@/components/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GlassPanel } from '@/components/Admin/Glass';
import { createTicket } from '@/app/(admin)/admin/(protected)/_actions/tickets';
import {
  SCREENSHOT_ACCEPT,
  screenshotProblem,
  sniffScreenshotKind,
  TICKET_AREA_LABELS,
  TICKET_AREA_SLUGS,
  TICKET_DESCRIPTION_MAX,
  TICKET_SEVERITY_LABELS,
  TICKET_SEVERITY_SLUGS,
  TICKET_TITLE_MAX,
  type TicketAreaSlug,
  type TicketSeveritySlug,
} from '@/lib/ticketFields';
import { cn } from '@/lib/utils';

// The Input primitive's look, applied to a native textarea (there's no shared
// textarea primitive, and the admin must stay off heavier form deps).
const textareaClasses =
  'placeholder:text-muted-foreground border-input flex w-full min-w-0 resize-y rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[1px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive';

/**
 * The "report a bug" form. Validation is server-authoritative (zod lives in
 * the createTicket action only — this module must stay zod-free for chunk
 * hygiene); the client does native required/maxLength plus the shared
 * screenshot pre-checks so obvious problems surface before a round-trip.
 */
export default function NewTicketForm() {
  const router = useRouter();
  const [severity, setSeverity] = useState<TicketSeveritySlug>('medium');
  const [area, setArea] = useState<TicketAreaSlug>('other');
  const [file, setFile] = useState<File | null>(null);
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  function clearIssue(key: string) {
    setIssues((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    // Allow re-picking the same filename later.
    e.target.value = '';
    if (!picked) return;
    const problem =
      screenshotProblem(picked) ??
      ((await sniffScreenshotKind(picked))
        ? null
        : 'Screenshot must be a PNG, JPEG, or WebP image.');
    if (problem) {
      setFile(null);
      setIssues((prev) => ({ ...prev, screenshot: problem }));
      return;
    }
    clearIssue('screenshot');
    setFile(picked);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData();
    fd.set('title', (form.elements.namedItem('title') as HTMLInputElement).value);
    fd.set(
      'description',
      (form.elements.namedItem('description') as HTMLTextAreaElement).value,
    );
    fd.set('severity', severity);
    fd.set('area', area);
    if (file) fd.set('screenshot', file);

    setPending(true);
    let res: Awaited<ReturnType<typeof createTicket>>;
    try {
      // `??` covers session expiry: a redirect() inside the action resolves
      // the promise without a value while the router navigates to login
      // (same rationale as the inbox's safeAction wrapper).
      res = (await createTicket(fd)) ?? { ok: false, error: 'server' };
    } catch {
      setPending(false);
      toast.error('Something went wrong — try again.');
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
      setIssues(res.issues);
      toast.error('Check the highlighted fields.');
      return;
    }
    toast.error('Could not submit the ticket — try again.');
  }

  return (
    <GlassPanel as="section" className="p-5 sm:p-6">
      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ticket-title">Title</Label>
          <Input
            id="ticket-title"
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
          options={TICKET_SEVERITY_SLUGS}
          labels={TICKET_SEVERITY_LABELS}
          value={severity}
          onChange={setSeverity}
          disabled={pending}
        />

        <ChipGroup
          legend="Where did you see it?"
          options={TICKET_AREA_SLUGS}
          labels={TICKET_AREA_LABELS}
          value={area}
          onChange={setArea}
          disabled={pending}
        />

        <div className="flex flex-col gap-2">
          <Label htmlFor="ticket-description">What happened?</Label>
          <textarea
            id="ticket-description"
            name="description"
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
          <span className="text-sm font-medium text-foreground">
            Screenshot <span className="text-muted-foreground">(optional)</span>
          </span>
          {file ? (
            <div className="flex items-center justify-between gap-3 rounded-md border border-foreground/15 bg-white/40 px-3 py-2 dark:bg-white/10">
              <span className="min-w-0 truncate text-sm text-foreground">
                {file.name}{' '}
                <span className="text-muted-foreground">
                  ({(file.size / 1024 / 1024).toFixed(1)} MB)
                </span>
              </span>
              <Button
                type="button"
                size="small"
                variant="secondary"
                showIcon={false}
                disabled={pending}
                onClick={() => setFile(null)}
              >
                Remove
              </Button>
            </div>
          ) : (
            <label
              className={cn(
                'flex cursor-pointer items-center gap-2.5 rounded-md border border-dashed border-foreground/20 px-3 py-3 text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground',
                'has-[:focus-visible]:border-ring has-[:focus-visible]:ring-[1px] has-[:focus-visible]:ring-ring/40',
                pending && 'pointer-events-none opacity-50',
              )}
            >
              <LuImagePlus className="h-4 w-4 shrink-0" aria-hidden="true" />
              Attach a screenshot — PNG, JPEG, or WebP, up to 4 MB
              <input
                type="file"
                accept={SCREENSHOT_ACCEPT}
                className="sr-only"
                disabled={pending}
                onChange={onFileChange}
              />
            </label>
          )}
          {issues.screenshot && (
            <p role="alert" className="px-1 text-xs text-destructive">
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
          <Button type="submit" size="small" showIcon={false} disabled={pending}>
            {pending ? 'Submitting…' : 'Submit ticket'}
          </Button>
        </div>
      </form>
    </GlassPanel>
  );
}

function ChipGroup<T extends string>({
  legend,
  options,
  labels,
  value,
  onChange,
  disabled,
}: {
  legend: string;
  options: readonly T[];
  labels: Record<T, string>;
  value: T;
  onChange: (next: T) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled}>
      <legend className="mb-2 text-sm font-medium text-foreground">
        {legend}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((slug) => (
          <label
            key={slug}
            className={cn(
              'cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
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
            {labels[slug]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
