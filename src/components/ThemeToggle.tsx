'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { LuSun, LuMoon } from 'react-icons/lu';

import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
}

/**
 * Minimal light/dark switch. Reads the *resolved* theme (so "system" maps to a
 * concrete light/dark) and flips to the opposite on click. Renders a neutral,
 * same-sized placeholder until mounted to avoid a hydration mismatch / icon
 * flash, since the theme is only known on the client.
 */
const ThemeToggle = ({ className }: ThemeToggleProps) => {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === 'dark';

  const base = cn(
    'inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground',
    'ring-1 ring-inset ring-foreground/15 transition-colors',
    'hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40',
    className,
  );

  if (!mounted) {
    // Keep layout stable before hydration; no icon to avoid a wrong-state flash.
    return <span className={base} aria-hidden="true" />;
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={base}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <LuSun className="h-4 w-4" aria-hidden="true" />
      ) : (
        <LuMoon className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
};

export default ThemeToggle;
