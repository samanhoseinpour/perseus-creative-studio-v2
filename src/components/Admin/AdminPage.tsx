import { cn } from '@/lib/utils';

/**
 * The one width/padding wrapper for every protected admin page. Replaces the
 * per-page `mx-auto w-full max-w-* px-5 py-8 sm:px-8 lg:py-12` divs so page
 * gutters and measures can't drift. `wide` for lists/dashboards (fills the
 * shell the collapsible rail frees up), `narrow` for detail views and forms.
 * Server-safe on purpose (no 'use client', like Glass.tsx) — pages, server
 * components, and the loading skeletons all render it; rest props pass
 * through so the skeletons can carry their role/aria-* attributes.
 */
const WIDTHS = {
  wide: 'max-w-[1400px]',
  narrow: 'max-w-4xl',
} as const;

export default function AdminPage({
  width = 'wide',
  className,
  children,
  ...rest
}: {
  width?: keyof typeof WIDTHS;
} & React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-5 py-8 sm:px-8 lg:py-12',
        WIDTHS[width],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
