'use client';

import React from 'react';
import { cn } from '../lib/cn';
import { FieldLabel } from './FieldLabel';

// ─── Types ────────────────────────────────────────────────────────────────────

export type InputSize = 'sm' | 'md' | 'lg';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: React.ReactNode;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  size?: InputSize;
  fullWidth?: boolean;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const sizeStyles: Record<InputSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-3.5 text-sm',
  lg: 'h-10 px-4 text-sm',
};

const iconPaddingStyles: Record<InputSize, string> = {
  sm: 'pl-8',
  md: 'pl-9',
  lg: 'pl-10',
};

const iconPaddingRightStyles: Record<InputSize, string> = {
  sm: 'pr-8',
  md: 'pr-9',
  lg: 'pr-10',
};

// ─── Component ────────────────────────────────────────────────────────────────

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      icon,
      iconPosition = 'left',
      size = 'md',
      fullWidth = false,
      disabled,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || React.useId();

    return (
      <div className={cn('flex min-w-0 w-full flex-col gap-1.5', fullWidth && 'w-full')}>
        {label && (
          <FieldLabel htmlFor={inputId} disabled={disabled}>
            {label}
          </FieldLabel>
        )}
        <div className="relative min-w-0 w-full">
          {icon && iconPosition === 'left' && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={cn(
              'w-full min-w-0 max-w-full rounded-xl border bg-white text-gray-900 placeholder:text-gray-400',
              'transition-all duration-200 ease-out',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              'disabled:cursor-not-allowed disabled:opacity-50',
              // Size
              sizeStyles[size],
              // Icon padding
              icon && iconPosition === 'left' && iconPaddingStyles[size],
              icon && iconPosition === 'right' && iconPaddingRightStyles[size],
              // State
              error
                ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500/60 dark:bg-gray-800 dark:focus:ring-red-500/25'
                : 'border-gray-200/80 focus:border-primary/50 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-400 dark:focus:border-primary/50 dark:focus:ring-primary/25',
              className
            )}
            {...props}
          />
          {icon && iconPosition === 'right' && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
              {icon}
            </span>
          )}
        </div>
        {error && (
          <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs text-gray-400 dark:text-gray-500">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// ─── Textarea ─────────────────────────────────────────────────────────────────

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  size?: InputSize;
  fullWidth?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      hint,
      size = 'md',
      fullWidth = false,
      disabled,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || React.useId();

    return (
      <div className={cn('flex min-w-0 w-full flex-col gap-1.5', fullWidth && 'w-full')}>
        {label && (
          <FieldLabel htmlFor={inputId} disabled={disabled}>
            {label}
          </FieldLabel>
        )}
        <textarea
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={cn(
            'w-full min-w-0 max-w-full rounded-xl border bg-white text-gray-900 placeholder:text-gray-400',
            'transition-all duration-200 ease-out resize-y',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'disabled:cursor-not-allowed disabled:opacity-50',
            size === 'sm' && 'px-3 py-2 text-xs',
            size === 'md' && 'px-3.5 py-2.5 text-sm',
            size === 'lg' && 'px-4 py-3 text-sm',
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500/60 dark:bg-gray-800 dark:focus:ring-red-500/25'
              : 'border-gray-200/80 focus:border-primary/50 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-400 dark:focus:border-primary/50 dark:focus:ring-primary/25',
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs text-gray-400 dark:text-gray-500">{hint}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
