'use client';

import { LuCheck as Check } from 'react-icons/lu';
import { cn } from '@/lib/utils';
import { REFERRAL_OPTIONS } from '@/lib/contactSchema';

/**
 * "How did you hear about us?" — optional single-select chip row shown on both
 * tabs. Same pill vocabulary as the service chips. Tapping the active chip
 * clears the selection (the field is optional). Value is a referral slug, or
 * '' for "not answered".
 */

interface ReferralChipsProps {
  value: string;
  onChange: (next: string) => void;
  /** id of the visible label naming this composite (aria-labelledby). */
  labelledBy?: string;
}

const chipClass = (selected: boolean) =>
  cn(
    'inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
    selected
      ? 'bg-foreground text-background'
      : 'bg-foreground/5 text-foreground/70 hover:bg-foreground/10 hover:text-foreground',
  );

const ReferralChips = ({ value, onChange, labelledBy }: ReferralChipsProps) => (
  <div role="group" aria-labelledby={labelledBy} className="flex flex-wrap gap-2">
    {REFERRAL_OPTIONS.map((option) => {
      const selected = value === option.slug;
      return (
        <button
          key={option.slug}
          type="button"
          onClick={() => onChange(selected ? '' : option.slug)}
          aria-pressed={selected}
          className={chipClass(selected)}
        >
          {selected && <Check className="size-3.5" aria-hidden="true" />}
          {option.label}
        </button>
      );
    })}
  </div>
);

export default ReferralChips;
