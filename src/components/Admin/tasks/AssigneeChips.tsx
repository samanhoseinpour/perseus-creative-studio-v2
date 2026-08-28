'use client';

import { cn } from '@/lib/utils';
import AdminAvatar from '@/components/Admin/AdminAvatar';
import { chipClasses } from '@/components/Admin/portfolio/PortfolioChips';
import { TASK_ASSIGNEE_MAX } from '@/lib/taskAssigneeFields';
import type { PickerOption } from './types';

/**
 * The full-fidelity assignee picker for the task and template dialogs —
 * MultiChipGroup's checkbox semantics, with faces.
 *
 * Its own component rather than a widened MultiChipGroup for two reasons: that
 * one takes bare strings as both value and label (right for the portfolio's
 * vocabularies, wrong for id/name pairs), and a member chip without a face
 * makes the picker a wall of similar words — this is the one surface showing
 * the whole roster at once, so the faces are what make it scannable.
 *
 * The cap is SILENT, the TagPicker rule: an unticked chip past the cap simply
 * stops responding and the counter underneath says why. A disabled-looking
 * chip with no explanation reads as a bug.
 */
export function AssigneeChips({
  legend,
  options,
  values,
  onChange,
  disabled,
  error,
  help,
  className,
}: {
  legend: string;
  options: readonly PickerOption[];
  values: readonly string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  error?: string;
  /** Caller's own line — replaces the default explanation when set. */
  help?: string;
  className?: string;
}) {
  const errorId = `${legend.replace(/\W+/g, '-').toLowerCase()}-error`;
  const full = values.length >= TASK_ASSIGNEE_MAX;

  const toggle = (id: string) => {
    if (values.includes(id)) onChange(values.filter((v) => v !== id));
    else if (!full) onChange([...values, id]);
  };

  // Said exactly where the decision is made. Someone adding a second name is
  // owed the counting rule at that moment — otherwise they meet it later as a
  // number on the leaderboard that looks halved for no reason.
  const shared =
    values.length > 1
      ? `${values.length} members: the hours split evenly between them, and each is credited the delivery.`
      : '';

  return (
    <fieldset
      disabled={disabled}
      aria-describedby={error ? errorId : undefined}
      className={className}
    >
      <legend className="mb-2 text-sm font-medium text-foreground">
        {legend}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = values.includes(option.value);
          return (
            <label
              key={option.value}
              className={cn(
                chipClasses(active, disabled),
                'inline-flex items-center gap-1.5',
                !active && full && 'cursor-not-allowed opacity-50',
              )}
            >
              <input
                type="checkbox"
                checked={active}
                disabled={!active && full}
                onChange={() => toggle(option.value)}
                className="sr-only"
              />
              <AdminAvatar
                name={option.label}
                size={16}
                {...(option.avatar ?? {})}
              />
              {option.label}
            </label>
          );
        })}
      </div>
      {!error && (help || shared) && (
        <p className="mt-2 px-1 text-xs text-muted-foreground">
          {help || shared}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-2 px-1 text-xs text-destructive"
        >
          {error}
        </p>
      )}
    </fieldset>
  );
}
