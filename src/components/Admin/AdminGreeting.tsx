'use client';

import { useEffect, useState } from 'react';

import { greetingWord, firstNameOf } from '@/lib/greeting';
import { cn } from '@/lib/utils';

/**
 * The dashboard's time-aware greeting text. The salutation depends on the
 * viewer's local clock, which the server can't know — so render a stable neutral
 * line on the server + first client paint, then swap in the time-aware word after
 * mount (same pattern as ThemeSwitcher / the sidebar). Keeps hydration identical.
 * Renders a bare <span>; the caller wraps it in the heading element it needs.
 */
export default function AdminGreeting({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const first = firstNameOf(name);
  const suffix = first ? `, ${first}` : '';
  const text = mounted
    ? `${greetingWord(new Date().getHours())}${suffix}`
    : `Welcome back${suffix}`;

  return <span className={cn(className)}>{text}</span>;
}
