'use client';

import { Dialog } from 'radix-ui';

import Button from '@/components/Button';
import GlassDialog from '@/components/Admin/GlassDialog';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/Admin/careers/FormField';
import ScheduleFields from '@/components/Admin/blogs/ScheduleFields';
import type { BlogPrimaryAction } from '@/lib/blogEditorFields';

/** Every dialog the bar can open. `schedule` is a draft being given a time;
 *  `reschedule` is a scheduled post being moved. */
export type PublishMode = BlogPrimaryAction | 'schedule' | 'publish-now';

const COPY: Record<PublishMode, { title: string; body: string; confirm: string }> = {
  publish: {
    title: 'Publish this post',
    body: 'It goes live right away. The blog index, the sitemaps and the navigation panel pick it up with it, and Bing is told the URL is new.',
    confirm: 'Publish now',
  },
  update: {
    title: 'Publish these changes',
    body: 'The live article is replaced by the working copy, so everything you have written since the last publish goes out. The publication date does not move.',
    confirm: 'Publish the update',
  },
  schedule: {
    title: 'Schedule this post',
    body: 'Nothing goes live until the time you pick. What publishes is the post exactly as it stands now, so anything you write afterwards needs the schedule moving to pick it up.',
    confirm: 'Schedule it',
  },
  reschedule: {
    title: 'Move the schedule',
    body: 'The post is snapshotted again, so the edits you have made since scheduling are the ones that go live at the new time.',
    confirm: 'Save the new time',
  },
  'publish-now': {
    title: 'Publish this post now',
    body: 'The schedule is dropped and the post goes live immediately, carrying the working copy rather than whatever was snapshotted when you scheduled it.',
    confirm: 'Publish now',
  },
};

const NEEDS_TIME: PublishMode[] = ['schedule', 'reschedule'];

/**
 * The confirm in front of every move that changes what the public can see.
 *
 * ONE DIALOG FOR ALL FIVE, because the shape is identical and the difference
 * is a sentence: a title, what the move really does, and a button. Five
 * dialogs would be five places for that sentence to go stale.
 *
 * The two schedule modes mount `ScheduleFields`, whose readout is the only
 * control against a writer in Tehran picking a time that lands on the previous
 * Vancouver day. Everything else is a plain confirm.
 *
 * `error` is whatever the door refused with, keyed `_form` or `publishAt`, and
 * the dialog stays OPEN on a refusal: closing it would hide the sentence that
 * explains why nothing happened.
 */
export default function PublishDialog({
  mode,
  tz,
  schedule,
  onScheduleChange,
  onConfirm,
  onClose,
  pending,
  error,
}: {
  mode: PublishMode | null;
  tz: string;
  schedule: { dayKey: string; minutes: number };
  onScheduleChange: (next: { dayKey: string; minutes: number }) => void;
  onConfirm: () => void;
  onClose: () => void;
  pending: boolean;
  error?: string;
}) {
  const copy = mode ? COPY[mode] : null;
  const needsTime = mode !== null && NEEDS_TIME.includes(mode);
  const missingDay = needsTime && schedule.dayKey === '';

  return (
    <GlassDialog
      open={mode !== null}
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
      maxWidth={needsTime ? '30rem' : '24rem'}
    >
      <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
        {copy?.title ?? ''}
      </Dialog.Title>
      <Dialog.Description className="mt-1 text-sm text-muted-foreground">
        {copy?.body ?? ''}
      </Dialog.Description>

      {needsTime && (
        <div className="mt-5">
          <ScheduleFields
            idPrefix="blog-schedule"
            tz={tz}
            dayKey={schedule.dayKey}
            minutes={schedule.minutes}
            onChange={onScheduleChange}
            disabled={pending}
            error={error}
          />
        </div>
      )}

      {!needsTime && error && (
        <p role="alert" className="mt-4 text-xs text-destructive">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
        <Button
          type="button"
          size="small"
          shimmer={false}
          showIcon={false}
          onClick={onConfirm}
          disabled={pending || missingDay}
          className="w-full sm:w-auto"
        >
          {pending ? 'Working…' : (copy?.confirm ?? '')}
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
    </GlassDialog>
  );
}

/**
 * Re-dating a live post.
 *
 * A DAY ONLY, AND IT IS THE STUDIO'S DAY, which is the whole difference from
 * the schedule control above. A publication date is what the article SAYS
 * about itself: every date the public blog prints is a STUDIO_TZ day key, all
 * 38 imported rows are noon-anchored, and `amendPublishedDate` stores the key
 * through `dayNoonIn(STUDIO_TZ, ...)`. Offering a time here would invite a
 * writer to pick one, and a morning time chosen in Tehran reads back as the
 * previous day. So there is no time to pick, and the label says whose day it
 * is.
 */
export function AmendDateDialog({
  open,
  dayKey,
  currentLabel,
  onChange,
  onConfirm,
  onClose,
  pending,
  error,
}: {
  open: boolean;
  dayKey: string;
  /** What the post says today, already formatted. */
  currentLabel: string;
  onChange: (dayKey: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  pending: boolean;
  error?: string;
}) {
  return (
    <GlassDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !pending) onClose();
      }}
      maxWidth="26rem"
    >
      <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
        Change the publication date
      </Dialog.Title>
      <Dialog.Description className="mt-1 text-sm text-muted-foreground">
        This is the date the article says it went out, and the blog is ordered
        by it. Changing it moves the post in the public listing, in the sitemap
        and in its structured data. The post says {currentLabel || 'nothing yet'}.
      </Dialog.Description>

      <div className="mt-5">
        <Field
          id="blog-amend-date"
          label="Publication date"
          hint="Vancouver time, which is the clock every date on the public blog is printed in."
          error={error}
        >
          <Input
            id="blog-amend-date"
            type="date"
            value={dayKey}
            disabled={pending}
            aria-invalid={error ? true : undefined}
            onChange={(e) => onChange(e.target.value)}
          />
        </Field>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
        <Button
          type="button"
          size="small"
          shimmer={false}
          showIcon={false}
          onClick={onConfirm}
          disabled={pending || dayKey === ''}
          className="w-full sm:w-auto"
        >
          {pending ? 'Working…' : 'Save the date'}
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
    </GlassDialog>
  );
}
