'use client';

import React, { useState } from 'react';
import { cn } from '../lib/cn';
import { FieldLabel } from './FieldLabel';
import { Eye, EyeOff } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type PasswordSize = 'sm' | 'md' | 'lg';

interface PasswordProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  size?: PasswordSize;
  fullWidth?: boolean;
  showStrength?: boolean;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const sizeStyles: Record<PasswordSize, string> = {
  sm: 'h-8 px-3 pr-10 text-xs',
  md: 'h-9 px-3.5 pr-10 text-sm',
  lg: 'h-10 px-4 pr-10 text-sm',
};

// ─── Strength Helper ──────────────────────────────────────────────────────────

function getPasswordStrength(value: string): 'weak' | 'medium' | 'strong' | null {
  if (!value) return null;
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[a-z]/.test(value)) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[!@#$%^&*(),.?":{}|<>_\-+=~`[\]\\]/.test(value)) score += 1;
  if (score <= 2) return 'weak';
  if (score <= 4) return 'medium';
  return 'strong';
}

const strengthColors = {
  weak: 'bg-red-400',
  medium: 'bg-amber-400',
  strong: 'bg-emerald-400',
};

const strengthTextColors = {
  weak: 'text-red-500',
  medium: 'text-amber-500',
  strong: 'text-emerald-500',
};

// ─── Component ────────────────────────────────────────────────────────────────

export const Password = React.forwardRef<HTMLInputElement, PasswordProps>(
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
      value,
      showStrength = false,
      ...props
    },
    ref
  ) => {
    const inputId = id || React.useId();
    const [showPassword, setShowPassword] = useState(false);
    const strength = showStrength ? getPasswordStrength(String(value || '')) : null;

    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {label && (
          <FieldLabel htmlFor={inputId} disabled={disabled}>
            {label}
          </FieldLabel>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={showPassword ? 'text' : 'password'}
            value={value}
            disabled={disabled}
            className={cn(
              'w-full rounded-xl border bg-white text-gray-900 placeholder:text-gray-400',
              'transition-all duration-200 ease-out',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              'disabled:cursor-not-allowed disabled:opacity-50',
              sizeStyles[size],
              error
                ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500/60 dark:bg-gray-800 dark:focus:ring-red-500/25'
                : 'border-gray-200/80 focus:border-primary/50 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-400 dark:focus:border-primary/50 dark:focus:ring-primary/25',
              className
            )}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {/* Password strength indicator */}
        {showStrength && strength && (
          <div className="flex items-center gap-2">
            <div className="flex-1 flex gap-1">
              <div
                className={cn(
                  'h-1 flex-1 rounded-full transition-all duration-300',
                  strength === 'weak' || strength === 'medium' || strength === 'strong'
                    ? strengthColors[strength]
                    : 'bg-gray-200 dark:bg-gray-700'
                )}
              />
              <div
                className={cn(
                  'h-1 flex-1 rounded-full transition-all duration-300',
                  strength === 'medium' || strength === 'strong'
                    ? strengthColors[strength]
                    : 'bg-gray-200 dark:bg-gray-700'
                )}
              />
              <div
                className={cn(
                  'h-1 flex-1 rounded-full transition-all duration-300',
                  strength === 'strong' ? strengthColors[strength] : 'bg-gray-200 dark:bg-gray-700'
                )}
              />
            </div>
            <span className={cn('text-xs font-medium', strengthTextColors[strength])}>
              {strength.charAt(0).toUpperCase() + strength.slice(1)}
            </span>
          </div>
        )}

        {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
        {hint && !error && <p className="text-xs text-gray-400 dark:text-gray-500">{hint}</p>}
      </div>
    );
  }
);

Password.displayName = 'Password';
