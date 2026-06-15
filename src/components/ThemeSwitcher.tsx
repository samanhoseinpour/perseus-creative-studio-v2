'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { LuSun, LuMonitor, LuMoon } from 'react-icons/lu';

import { cn } from '@/lib/utils';

const OPTIONS = [
  { value: 'light', label: 'Light', Icon: LuSun },
  { value: 'system', label: 'System', Icon: LuMonitor },
  { value: 'dark', label: 'Dark', Icon: LuMoon },
] as const;

// Tray reveal duration — setTheme waits for this, see below.
const TRAY_MS = 400;

interface ThemeSwitcherProps {
  className?: string;
  /** Which side of the trigger the tray slides out on. Left suits the navbar
   *  (empty center on its left); right suits the mobile menu's "Theme:" row
   *  (open space on its right). */
  direction?: 'left' | 'right';
}

/**
 * Compact three-way theme control: Light · System · Dark. At rest it's a
 * single circle showing the active choice; opening it slides a horizontal
 * option tray out beside it as an overlay, so it never pushes or collides
 * with neighboring navbar items. The reveal is a CSS clip-path wipe —
 * no animation library. Reads the *stored* `theme`
 * (not the resolved one) so "System" is its own selectable state that keeps
 * following the OS. The shell renders on the server so there's no
 * empty-then-pop flash; only the active icon/highlight is deferred until
 * mounted, since the stored theme is only known on the client (rendering it
 * during SSR would mismatch hydration).
 *
 * Picking an option collapses the tray first and applies the theme when the
 * collapse finishes: ThemeProvider sets `disableTransitionOnChange`, which
 * kills every in-flight CSS transition the moment the theme flips — calling
 * setTheme immediately would snap the close animation.
 */
const ThemeSwitcher = ({
  className,
  direction = 'left',
}: ThemeSwitcherProps) => {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const themeTimer = useRef<number | null>(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  useEffect(
    () => () => {
      if (themeTimer.current) window.clearTimeout(themeTimer.current);
    },
    [],
  );

  // Close on outside click/tap or Escape while open.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const choose = (value: string) => {
    setOpen(false);
    if (themeTimer.current) window.clearTimeout(themeTimer.current);
    themeTimer.current = window.setTimeout(() => setTheme(value), TRAY_MS);
  };

  const active = mounted ? (theme ?? 'system') : null;
  const ActiveIcon = (OPTIONS.find((o) => o.value === active) ?? OPTIONS[1])
    .Icon;

  return (
    <div
      ref={rootRef}
      className={cn(
        'relative inline-flex rounded-full p-0.5 ring-1 ring-inset ring-foreground/15',
        className,
      )}
    >
      {/* Trigger — shows the active choice */}
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Change theme"
        title="Change theme"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex size-7 cursor-pointer items-center justify-center rounded-full transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40',
          open
            ? 'bg-foreground/10 text-foreground'
            : 'text-foreground/70 hover:bg-foreground/5 hover:text-foreground',
        )}
      >
        <ActiveIcon className="size-4" aria-hidden="true" />
      </button>

      {/* Option tray — an overlay anchored beside the trigger. `w-max` is
          load-bearing: an auto-width absolute element anchored right-full
          inside this ~32px pill shrink-to-fits to 0px, so the tray must size
          to its own content. The reveal is a clip-path wipe emanating from
          the trigger — pure paint, no layout games. */}
      <div
        className={cn(
          'absolute top-1/2 z-20 w-max -translate-y-1/2',
          direction === 'left' ? 'right-full' : 'left-full',
          !open && 'pointer-events-none',
        )}
      >
        <div
          role="radiogroup"
          aria-label="Theme"
          aria-hidden={!open}
          className={cn(
            'flex items-center gap-0.5 rounded-full bg-background-contrast/90 p-0.5 ring-1 ring-inset ring-foreground/15 backdrop-blur-xl transition-[clip-path,opacity,translate] duration-400 ease-[cubic-bezier(0.76,0,0.24,1)]',
            direction === 'left' ? 'mr-2' : 'ml-2',
            open
              ? 'translate-x-0 opacity-100 [clip-path:inset(0_round_9999px)]'
              : direction === 'left'
                ? 'translate-x-1 opacity-0 [clip-path:inset(0_0_0_100%_round_9999px)]'
                : '-translate-x-1 opacity-0 [clip-path:inset(0_100%_0_0_round_9999px)]',
          )}
        >
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
                tabIndex={open ? 0 : -1}
                onClick={() => choose(value)}
                className={cn(
                  'inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors',
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
      </div>
    </div>
  );
};

export default ThemeSwitcher;
