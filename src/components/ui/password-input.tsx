'use client';

import * as React from 'react';
import { LuEye, LuEyeOff } from 'react-icons/lu';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Password field with an inline reveal toggle. Wraps the shared `Input`
 * primitive (so it inherits every field style/state) and manages masking
 * locally — `type` is derived from visibility, so consumers omit `type`.
 * The toggle is keyboard-focusable with a visible focus ring and mirrors
 * the input's `disabled` state.
 */
function PasswordInput({
  className,
  disabled,
  ...props
}: Omit<React.ComponentProps<'input'>, 'type'>) {
  const [visible, setVisible] = React.useState(false);
  const Icon = visible ? LuEyeOff : LuEye;
  const label = visible ? 'Hide password' : 'Show password';

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? 'text' : 'password'}
        disabled={disabled}
        className={cn('pr-10', className)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        disabled={disabled}
        aria-label={label}
        aria-pressed={visible}
        title={label}
        className={cn(
          'absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md',
          'text-muted-foreground transition-colors hover:text-foreground',
          'outline-none focus-visible:text-foreground focus-visible:ring-[1px] focus-visible:ring-ring/40 focus-visible:ring-inset',
          'disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export { PasswordInput };
