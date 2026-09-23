'use client';

import React from 'react';
import { cn } from '../lib/cn';
import { Loader2 } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning' | 'link';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type ButtonRounded = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  rounded?: ButtonRounded;
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  iconOnly?: boolean;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const disabledSolid =
  'disabled:translate-y-0 disabled:scale-100 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:brightness-100 disabled:cursor-not-allowed dark:disabled:bg-gray-800 dark:disabled:text-gray-500';

const filledMotion =
  'hover:-translate-y-px hover:shadow-md active:translate-y-0 active:scale-[0.985] active:shadow-inner';

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-primary/90 text-white',
    'shadow-sm shadow-primary/15',
    'hover:bg-primary hover:shadow-primary/20',
    'active:brightness-[0.92]',
    filledMotion,
    disabledSolid,
  ].join(' '),

  secondary: [
    'bg-secondary-lighter text-secondary',
    'shadow-sm shadow-gray-900/5',
    'hover:bg-[color-mix(in_srgb,rgb(var(--secondary-lighter))_82%,rgb(var(--secondary-default)))]',
    'hover:text-secondary-dark hover:shadow-gray-900/8',
    'active:bg-[color-mix(in_srgb,rgb(var(--secondary-lighter))_70%,rgb(var(--secondary-default)))]',
    'dark:bg-white/[0.07] dark:text-gray-200 dark:shadow-black/20',
    'dark:hover:bg-white/[0.11] dark:hover:text-gray-50',
    'dark:active:bg-white/[0.08]',
    filledMotion,
    disabledSolid,
  ].join(' '),

  outline: [
    'bg-white/80 dark:bg-white/[0.02]',
    'border border-gray-200/90 dark:border-gray-700/55',
    'text-gray-600 dark:text-gray-300',
    'hover:-translate-y-px hover:border-primary/30 hover:bg-primary/[0.05] hover:text-gray-800 hover:shadow-sm hover:shadow-primary/10',
    'dark:hover:border-primary/35 dark:hover:bg-primary/[0.08] dark:hover:text-gray-100',
    'active:translate-y-0 active:scale-[0.985] active:bg-primary/[0.08] dark:active:bg-primary/[0.12]',
    'disabled:translate-y-0 disabled:scale-100 disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200 disabled:shadow-none disabled:cursor-not-allowed dark:disabled:bg-transparent dark:disabled:text-gray-600 dark:disabled:border-gray-800',
  ].join(' '),

  ghost: [
    'bg-transparent',
    'text-gray-600 dark:text-gray-400',
    'hover:bg-gray-100/80 hover:text-gray-800',
    'dark:hover:bg-white/[0.06] dark:hover:text-gray-200',
    'active:scale-[0.985] active:bg-gray-200/70 dark:active:bg-white/[0.09]',
    'disabled:text-gray-400 disabled:cursor-not-allowed dark:disabled:text-gray-600',
  ].join(' '),

  danger: [
    'bg-red/85 text-white',
    'shadow-sm shadow-red/12',
    'hover:bg-red hover:shadow-red/16',
    'active:brightness-[0.92]',
    filledMotion,
    disabledSolid,
  ].join(' '),

  success: [
    'bg-green/85 text-white',
    'shadow-sm shadow-green/12',
    'hover:bg-green hover:shadow-green/16',
    'active:brightness-[0.92]',
    filledMotion,
    disabledSolid,
  ].join(' '),

  warning: [
    'bg-orange/80 text-white',
    'shadow-sm shadow-orange/12',
    'hover:bg-orange/90 hover:shadow-orange/16',
    'active:brightness-[0.92]',
    filledMotion,
    disabledSolid,
  ].join(' '),

  link: [
    'bg-transparent text-primary/90',
    'hover:text-primary hover:underline decoration-primary/40 underline-offset-4',
    'active:text-primary/75',
    'disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed dark:disabled:text-gray-600',
  ].join(' '),
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-xs gap-1.5',
  sm: 'h-8 px-3 text-xs gap-2',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-10 px-5 text-sm gap-2.5',
  xl: 'h-12 px-6 text-base gap-3',
};

const iconSizeStyles: Record<ButtonSize, string> = {
  xs: 'h-7 w-7',
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
  lg: 'h-10 w-10',
  xl: 'h-12 w-12',
};

const roundedStyles: Record<ButtonRounded, string> = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full',
};

// ─── Component ────────────────────────────────────────────────────────────────

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      rounded = 'lg',
      loading = false,
      loadingText,
      icon,
      iconPosition = 'left',
      iconOnly = false,
      fullWidth = false,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          // Base
          'inline-flex flex-row items-center justify-center font-medium',
          '[&_svg]:inline-block [&_svg]:shrink-0',
          'transition-[background-color,border-color,box-shadow,transform,color,opacity,filter] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          'active:duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900',
          'disabled:transition-none',
          // Variant
          variantStyles[variant],
          // Size (icon-only uses icon size)
          iconOnly ? iconSizeStyles[size] : sizeStyles[size],
          // Rounded
          roundedStyles[rounded],
          // Full width
          fullWidth && 'w-full',
          // Loading state
          loading && 'pointer-events-none',
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {loadingText && <span>{loadingText}</span>}
          </>
        ) : (
          <>
            {icon && iconPosition === 'left' && <span className="inline-flex shrink-0 items-center">{icon}</span>}
            {children && <span className="inline-flex items-center gap-1.5">{children}</span>}
            {icon && iconPosition === 'right' && <span className="inline-flex shrink-0 items-center">{icon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

// ─── Icon Button ──────────────────────────────────────────────────────────────

interface IconButtonProps extends Omit<ButtonProps, 'icon' | 'iconPosition' | 'iconOnly' | 'children' | 'loadingText'> {
  children: React.ReactNode;
  tooltip?: string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ children, variant = 'ghost', size = 'md', rounded = 'lg', className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        rounded={rounded}
        iconOnly
        className={className}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';

// ─── Button Group ─────────────────────────────────────────────────────────────

interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
  attached?: boolean;
  dir?: 'ltr' | 'rtl';
}

export function ButtonGroup({
  children,
  className,
  attached = false,
  dir,
  ...props
}: ButtonGroupProps & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      dir={dir}
      {...props}
      className={cn(
        'inline-flex items-center',
        attached
          ? 'gap-0 [&_.group-action]:rounded-none [&_.group-action]:shadow-none [&>span:first-child_.group-action]:rounded-s-lg [&>span:last-child_.group-action]:rounded-e-lg [&>span:not(:first-child)_.group-action]:border-s-0'
          : 'gap-2',
        className,
      )}
    >
      {children}
    </div>
  );
}
