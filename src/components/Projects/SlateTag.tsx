import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * The archive's "slate register" type — the mono, uppercase, letter-spaced
 * chrome that labels every file number, eyebrow, call-sheet field, and status
 * chip across the projects section. One source of truth for that treatment so
 * the register reads identically on the hub, category showcases, and case
 * studies.
 *
 * The component owns only the *invariant* (font-mono + uppercase + the size and
 * tracking scales the design uses). Colour, opacity, layout, ring/bg fills, and
 * hover transitions stay per-site via `className` — the register sits on dark
 * media, light surfaces, and inverted bands, so its colour is always
 * contextual. Polymorphic via `as` (span / p / dt / dd / div / li / figcaption
 * / Link), defaulting to `span`.
 */
const slateTagVariants = cva('font-mono uppercase', {
  variants: {
    size: {
      xs: 'text-[9px]',
      sm: 'text-[10px]',
      md: 'text-[11px]',
    },
    /** Letter-spacing in em, named by hundredths (e.g. "18" → 0.18em). */
    tracking: {
      '14': 'tracking-[0.14em]',
      '15': 'tracking-[0.15em]',
      '16': 'tracking-[0.16em]',
      '18': 'tracking-[0.18em]',
      '20': 'tracking-[0.2em]',
    },
  },
  defaultVariants: {
    size: 'sm',
    tracking: '20',
  },
});

type SlateTagProps<T extends React.ElementType = 'span'> = {
  /** Element or component to render — defaults to `span`. */
  as?: T;
} & VariantProps<typeof slateTagVariants> &
  Omit<
    React.ComponentPropsWithoutRef<T>,
    'as' | keyof VariantProps<typeof slateTagVariants>
  >;

function SlateTag<T extends React.ElementType = 'span'>({
  as,
  size,
  tracking,
  className,
  ...props
}: SlateTagProps<T>) {
  // Cast to a permissive component type so the polymorphic `as` union doesn't
  // collapse intrinsic attributes (className, etc.) to `never`.
  const Comp = (as ?? 'span') as React.ComponentType<Record<string, unknown>>;

  return (
    <Comp
      className={cn(slateTagVariants({ size, tracking }), className as string)}
      {...props}
    />
  );
}

export { SlateTag, slateTagVariants };
