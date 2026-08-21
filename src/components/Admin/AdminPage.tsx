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
        // pb-28 (not py-8) below lg: clears the fixed mobile bottom bar
        // (56px bar + up-to-34px safe area + breathing room); lg:py-12 restores
        // desktop. print:pb-8 is load-bearing — print media evaluates at PAPER
        // width (A4 ≈ 794px < lg), so without it the payslip, which prints
        // through this wrapper, would carry 112px of phantom bottom padding.
        'mx-auto w-full px-5 pt-8 pb-28 sm:px-8 lg:py-12 print:pb-8',
        WIDTHS[width],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
