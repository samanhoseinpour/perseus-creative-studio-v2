'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { LuSun, LuMonitor, LuMoon } from 'react-icons/lu';

import { cn } from '@/lib/utils';

const OPTIONS = [
  { value: 'light', label: 'Light', Icon: LuSun },
  { value: 'system', label: 'System', Icon: LuMonitor },
  { value: 'dark', label: 'Dark', Icon: LuMoon },
] as const;

interface ThemeSwitcherProps {
  className?: string;
}

/**
 * Three-way theme control: Light · System · Dark. Reads the *stored* `theme`
 * (not the resolved one) so "System" is its own selectable state that keeps
 * following the OS, rather than collapsing to a concrete light/dark. Renders a
 * same-sized inert placeholder until mounted to avoid a hydration mismatch and
 * a wrong-state flash, since the active theme is only known on the client.
 */
const ThemeSwitcher = ({ className }: ThemeSwitcherProps) => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  const container = cn(
    'inline-flex items-center gap-0.5 rounded-full p-0.5 ring-1 ring-inset ring-foreground/15',
    className,
  );

  if (!mounted) {
    return <span className={cn(container, 'h-8 w-[5.75rem]')} aria-hidden="true" />;
  }

  const active = theme ?? 'system';

  return (
    <div role="radiogroup" aria-label="Theme" className={container}>
      {OPTIONS.map(({ value, label, Icon }) => {
        const isActive = active === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={`${label} theme`}
            title={`${label} theme`}
            onClick={() => setTheme(value)}
            className={cn(
              'inline-flex size-7 items-center justify-center rounded-full transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40',
              isActive
                ? 'bg-foreground text-background'
                : 'text-foreground/55 hover:bg-foreground/5 hover:text-foreground',
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
};

export default ThemeSwitcher;
