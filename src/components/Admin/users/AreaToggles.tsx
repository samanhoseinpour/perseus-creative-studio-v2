'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LuCheck, LuPlus, LuX } from 'react-icons/lu';
import { toast } from 'sonner';

import { safeAction } from '@/components/Admin/inbox/safeAction';
import { setUserAreas } from '@/app/(admin)/admin/(protected)/_actions/users';
import {
  ADMIN_AREAS,
  ADMIN_AREA_LABELS,
  type AdminArea,
} from '@/lib/adminAreas';
import { cn } from '@/lib/utils';

/**
 * One access chip — the multi-select sibling of NewTicketForm's radio
 * ChipGroup (same pill anatomy, `aria-pressed` instead of a radio). Shared by
 * the per-row toggles below and the add-user dialog's grant picker.
 *
 * `disabled` renders as aria-disabled + a click guard rather than the native
 * attribute: a natively-disabled button is unfocusable, so the chip a
 * keyboard user just activated would evict focus to <body> while its save is
 * in flight. (Inside the add-user dialog's <fieldset disabled> the native
 * behavior still applies — that's the conventional whole-form pending state.)
 *
 * The `title` is a supplementary pointer hint only — the accessible name must
 * stay the bare area label with `aria-pressed` carrying the granted state, so
 * don't move the grant/remove wording into an aria-label.
 */
export function AreaChipButton({
  area,
  active,
  disabled,
  onToggle,
}: {
  area: AdminArea;
  active: boolean;
  disabled?: boolean;
  onToggle: (area: AdminArea) => void;
}) {
  const label = ADMIN_AREA_LABELS[area];
  const interactive = !disabled;
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-disabled={disabled || undefined}
      title={active ? `Remove ${label} access` : `Grant ${label} access`}
      onClick={() => {
        if (!disabled) onToggle(area);
      }}
      className={cn(
        'group/chip inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-[1.5px] focus-visible:ring-ring',
        active
          ? 'border-transparent bg-foreground text-background'
          : 'border-foreground/15 bg-white/40 text-muted-foreground hover:text-foreground dark:bg-white/10',
        // Removal preview keeps `text-background` on the destructive fill: the
        // ink stays theme-correct (white-on-red light, dark-on-red dark), so
        // don't "fix" it with text-white.
        active && interactive && 'hover:bg-destructive focus-visible:bg-destructive',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      {active ? (
        <>
          <LuCheck
            aria-hidden="true"
            className={cn(
              'size-3 shrink-0',
              interactive && 'group-hover/chip:hidden group-focus-visible/chip:hidden',
            )}
          />
          <LuX
            aria-hidden="true"
            className={cn(
              'hidden size-3 shrink-0',
              interactive && 'group-hover/chip:block group-focus-visible/chip:block',
            )}
          />
        </>
      ) : (
        <LuPlus aria-hidden="true" className="size-3 shrink-0" />
      )}
      {label}
    </button>
  );
}

/**
 * A member row's live access editor: flipping a chip saves immediately
 * (optimistic, rolled back on failure). Server truth arriving via
 * router.refresh() is adopted with the render-time prop-sync pattern (React's
 * "adjusting state when props change") instead of a key-remount, so the DOM
 * nodes — and the keyboard focus on the chip that was just flipped — survive
 * the save round-trip.
 */
export default function AreaToggles({
  userId,
  areas,
}: {
  userId: string;
  areas: AdminArea[];
}) {
  const router = useRouter();
  const [current, setCurrent] = useState<AdminArea[]>(areas);
  const [saving, setSaving] = useState(false);

  const serverKey = areas.join(',');
  const [seenServerKey, setSeenServerKey] = useState(serverKey);
  if (serverKey !== seenServerKey) {
    setSeenServerKey(serverKey);
    setCurrent(areas);
  }

  async function toggle(area: AdminArea) {
    if (saving) return;
    const previous = current;
    const next = previous.includes(area)
      ? previous.filter((a) => a !== area)
      : [...previous, area];
    setCurrent(next);
    setSaving(true);
    const res = await safeAction(setUserAreas(userId, next));
    setSaving(false);
    if (!res.ok) {
      setCurrent(previous);
      toast.error(res.error);
      return;
    }
    toast.success('Access updated.');
    router.refresh();
  }

  return (
    <div
      role="group"
      aria-label="Admin areas this account can open"
      className="flex flex-wrap items-center gap-1.5"
    >
      {ADMIN_AREAS.map((area) => (
        <AreaChipButton
          key={area}
          area={area}
          active={current.includes(area)}
          disabled={saving}
          onToggle={toggle}
        />
      ))}
    </div>
  );
}
