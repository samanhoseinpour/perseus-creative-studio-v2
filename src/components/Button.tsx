import React, { CSSProperties } from 'react';
import { twMerge } from 'tailwind-merge';
import clsx from 'clsx';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import type { IconType } from 'react-icons';

type ButtonSize = 'small' | 'medium' | 'large';
type ButtonVariant = 'primary' | 'secondary';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: ButtonSize;
  variant?: ButtonVariant;
  icon?: LucideIcon | IconType;
  iconPosition?: 'left' | 'right';
  showIcon?: boolean;
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
}

// Utility to merge classNames with Tailwind precedence
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      size = 'medium',
      variant = 'primary',
      icon: Icon = ArrowRight,
      iconPosition = 'right',
      showIcon = true,
      shimmerColor = '#fcfcfc',
      shimmerSize = '0.1em',
      shimmerDuration = '2s',
      borderRadius = '100px',
      background = 'var(--foreground)',
      ...rest
    },
    ref,
  ) => {
    const isPrimary = variant === 'primary';
    const shouldShowLeftIcon = showIcon && iconPosition === 'left';
    const shouldShowRightIcon = showIcon && iconPosition === 'right';
    return (
      <button
        ref={ref}
        style={
          {
            '--spread': '90deg',
            '--shimmer-color': shimmerColor,
            '--radius': borderRadius,
            '--speed': shimmerDuration,
            '--cut': shimmerSize,
            '--bg': background,
          } as CSSProperties
        }
        className={cn(
          'group relative z-0 flex cursor-pointer items-center justify-center gap-2.5 overflow-hidden whitespace-nowrap [border-radius:var(--radius)]',
          isPrimary &&
            'border border-foreground/10 text-background [background:var(--bg)]',
          !isPrimary &&
            'border border-black/10 bg-white/55 text-black/85 backdrop-blur-md shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_8px_24px_-12px_rgba(20,20,20,0.15)] hover:border-black/30 hover:bg-white/85 hover:text-black',
          size === 'small' && 'px-4 py-2 text-xs',
          size === 'medium' && 'px-6 py-3 text-sm',
          size === 'large' && 'px-8 py-4 text-lg',
          'transform-gpu transition-all duration-300 ease-in-out hover:-translate-y-0.5 active:translate-y-px',
          className,
        )}
        {...rest}
      >
        {/* shimmer container */}
        {isPrimary && (
          <div
            className={cn(
              '-z-30 blur-[2px]',
              'absolute inset-0 overflow-visible @container-[size]',
            )}
          >
            <div className="absolute inset-0 h-[100cqh] animate-shimmer-slide aspect-[1] rounded-none [mask:none]">
              <div className="absolute -inset-full w-auto rotate-0 animate-spin-around [background:conic-gradient(from_calc(270deg-(var(--spread)*0.5)),transparent_0,var(--shimmer-color)_var(--spread),transparent_var(--spread))] [translate:0_0]" />
            </div>
          </div>
        )}
        {shouldShowLeftIcon && (
          <Icon
            className="relative z-10 h-4 w-4 shrink-0 transition-transform duration-300 group-hover:-translate-x-0.5"
            aria-hidden="true"
          />
        )}
        <span className="relative z-10 contents">{children}</span>
        {shouldShowRightIcon && (
          <Icon
            className="relative z-10 h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        )}

        {/* Highlight */}
        {isPrimary && (
          <div
            className={cn(
              'inset-0 absolute size-full',
              'rounded-2xl px-4 py-1.5 text-sm font-medium shadow-[inset_0_-8px_10px_#ffffff1f]',
              'transform-gpu transition-all duration-300 ease-in-out',
              'group-hover:shadow-[inset_0_-6px_10px_#ffffff3f]',
              'group-active:shadow-[inset_0_-10px_10px_#ffffff3f]',
            )}
          />
        )}

        {/* backdrop */}
        {isPrimary && (
          <div
            className={cn(
              'absolute -z-20 [background:var(--bg)] [border-radius:var(--radius)] inset-(--cut)',
            )}
          />
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';

export default Button;
