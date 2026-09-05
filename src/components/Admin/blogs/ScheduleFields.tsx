// No 'use client' directive: a leaf of PublishDialog, which is a client entry
// (the BlogRowMenu precedent).
import { Input } from '@/components/ui/input';
import { Field } from '@/components/Admin/careers/FormField';
import {
  clampDayMinutes,
  dayLengthMinutes,
  minutesToTimeValue,
  scheduleInstant,
  studioDayFor,
  timeValueToMinutes,
} from '@/lib/blogEditorFields';
import { STUDIO_TZ, zonedFormat } from '@/lib/calendar';

const WHEN_OPTS: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
};

const DAY_OPTS: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
};

/**
 * When a scheduled post goes live: a day and a time, in the WRITER's own zone,
 * with a live readout of what that means on the studio's clock.
 *
 * THE READOUT IS THE CONTROL, not decoration. The team is split between
 * Vancouver and Tehran, 10.5 to 11.5 hours apart, so a Tehran writer picking
 * nine in the morning is picking the PREVIOUS Vancouver day, and every date the
 * public blog prints is a STUDIO_TZ day key. Without the line, the only symptom
 * is a post dated a day earlier than the writer chose, discovered on the live
 * page. `dayTimeIn` is the only thing that turns the pair into an instant, and
 * it takes the writer's zone precisely so two people picking 09:00 on the same
 * day from two cities get two different instants.
 *
 * THE TIME IS BOUNDED BY THE DAY'S OWN LENGTH. `dayTimeIn` adds elapsed
 * minutes to the day's first moment, so on the 23-hour spring-forward day
 * 23:00 is 24 hours in and lands on the NEXT day (pinned in section 10 of
 * scripts/check-blogs.mts, which says outright that whatever offers a time
 * picker has to bound it). `clampDayMinutes` is that bound, and because the
 * readout below states the resolved instant, a clamped pick is visible rather
 * than silent.
 */
export default function ScheduleFields({
  idPrefix,
  tz,
  dayKey,
  minutes,
  onChange,
  disabled,
  error,
}: {
  idPrefix: string;
  /** The writer's own zone, from `viewerZone()` on the server. */
  tz: string;
  dayKey: string;
  minutes: number;
  onChange: (next: { dayKey: string; minutes: number }) => void;
  disabled?: boolean;
  error?: string;
}) {
  const bounded = dayKey ? clampDayMinutes(tz, dayKey, minutes) : minutes;
  const at = dayKey ? scheduleInstant(tz, dayKey, minutes) : null;
  const studioDay = at ? studioDayFor(at) : '';
  const sameDay = studioDay === dayKey;
  const shortened = dayKey ? dayLengthMinutes(tz, dayKey) < 1440 : false;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field id={`${idPrefix}-date`} label="Date">
          <Input
            id={`${idPrefix}-date`}
            type="date"
            value={dayKey}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            onChange={(e) => onChange({ dayKey: e.target.value, minutes })}
          />
        </Field>
        <Field id={`${idPrefix}-time`} label="Time">
          <Input
            id={`${idPrefix}-time`}
            type="time"
            value={minutesToTimeValue(bounded)}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            onChange={(e) => {
              const picked = timeValueToMinutes(e.target.value);
              if (picked !== null) onChange({ dayKey, minutes: picked });
            }}
          />
        </Field>
      </div>

      {at && (
        <div className="flex flex-col gap-1 rounded-xl border border-foreground/10 bg-foreground/[0.03] px-3 py-2">
          <p className="text-xs text-foreground">
            Goes live {zonedFormat(tz, WHEN_OPTS).format(at)} on your clock.
          </p>
          <p className="text-xs text-muted-foreground">
            {sameDay
              ? `The post will be dated ${zonedFormat(STUDIO_TZ, DAY_OPTS).format(at)}, Vancouver time.`
              : `Careful: on the studio's Vancouver clock that is ${zonedFormat(STUDIO_TZ, DAY_OPTS).format(at)}, and that is the date the post will carry.`}
          </p>
          {shortened && (
            <p className="text-xs text-muted-foreground">
              The clocks change on this day, so it is short an hour. Times past
              the end of it are pulled back to the last minute the day has.
            </p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="px-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
