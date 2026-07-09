'use client';

import { useEffect, useState } from 'react';

import {
  greetingWord,
  firstNameOf,
  msUntilNextGreetingChange,
} from '@/lib/greeting';
import { cn } from '@/lib/utils';

/**
 * The dashboard's time-aware greeting text. The salutation depends on the
 * viewer's local clock, which the server can't know — so render a stable neutral
 * line on the server + first client paint, then swap in the time-aware word after
 * mount (same pattern as ThemeSwitcher). Keeps hydration identical.
 *
 * A self-rescheduling timer lands on each band boundary (05/12/17/22) so a tab
 * left open overnight doesn't keep saying "Good morning" — it re-renders once per
 * band, not on a poll. Renders a bare <span>; the caller wraps it in the heading
 * element it needs.
 */
export default function AdminGreeting({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  // null until mounted — the server has no clock to agree with.
  const [hour, setHour] = useState<number | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const now = new Date();
      setHour(now.getHours());
      timer = setTimeout(tick, msUntilNextGreetingChange(now));
    };
    tick();
    return () => clearTimeout(timer);
  }, []);

  const first = firstNameOf(name);
  const suffix = first ? `, ${first}` : '';
  const text =
    hour === null ? `Welcome back${suffix}` : `${greetingWord(hour)}${suffix}`;

  return <span className={cn(className)}>{text}</span>;
}
