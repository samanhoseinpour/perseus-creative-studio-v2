'use client';

import { useMemo } from 'react';
import { motion } from 'motion/react';

import { passwordStrength } from '@/lib/passwordStrength';
import { cn } from '@/lib/utils';

// Decorative strength read-out for the reset + change-password forms. It never
// gates submission — zod (`authSchema`) and Better Auth are the enforcement;
// this only tells the user how they're doing as they type. Slim leaf imports
// only (scorer + motion + cn), so it stays out of the login chunk.

// Fill colour per score. Index 0/1 share red (both "weak"); the bar count still
// communicates the difference.
const FILL = [
  'bg-red-500',
  'bg-red-500',
  'bg-amber-500',
  'bg-sky-500',
  'bg-emerald-500',
] as const;

type Props = {
  password: string;
  /** Optional identity context so the scorer can penalise name/email reuse. */
  email?: string;
  name?: string;
  className?: string;
};

export default function PasswordStrengthMeter({
  password,
  email,
  name,
  className,
}: Props) {
  const { score, label, suggestions } = useMemo(
    () => passwordStrength(password, { email, name }),
    [password, email, name],
  );

  if (!password) return null;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex gap-1" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10"
          >
            <motion.span
              className={cn('block h-full rounded-full', FILL[score])}
              initial={false}
              animate={{ width: i < score ? '100%' : '0%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            />
          </span>
        ))}
      </div>
      {/* Decorative read-out (bars are aria-hidden above). Intentionally NOT a
          live region: the element mounts only once the user types, so an
          aria-live here would drop its initial state and can't announce
          reliably. The authoritative, announced feedback is the role="alert"
          zod error on the field; this text is supplementary reading-order copy. */}
      <p className="px-1 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{label}</span>
        {suggestions[0] ? ` — ${suggestions[0]}` : ''}
      </p>
    </div>
  );
}
