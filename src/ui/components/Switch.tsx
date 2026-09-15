'use client';

import React from 'react';
import { cn } from '../lib/cn';
import { fieldLabelClassName } from './FieldLabel';

// ─── Types ────────────────────────────────────────────────────────────────────

type SwitchSize = 'sm' | 'md' | 'lg';

interface SwitchProps {
  label?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  size?: SwitchSize;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const trackStyles: Record<SwitchSize, string> = {
  sm: 'h-5 w-9',
  md: 'h-6 w-11',
  lg: 'h-7 w-14',
};

const thumbStyles: Record<SwitchSize, string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4.5 w-4.5',
  lg: 'h-5.5 w-5.5',
};

const translateStyles: Record<SwitchSize, string> = {
  sm: 'translate-x-4',
  md: 'translate-x-5',
  lg: 'translate-x-7',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Switch({
  label,
  checked = false,
  onChange,
  size = 'md',
  disabled = false,
  fullWidth = false,
  className,
}: SwitchProps) {
  return (
    <label
      className={cn(
        'inline-flex items-center gap-3',
        fullWidth && 'w-full',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        className
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={cn(
          'relative inline-flex shrink-0 rounded-full transition-all duration-200 ease-out',
          'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900',
          trackStyles[size],
          checked
            ? 'bg-gradient-to-r from-primary to-primary/90 shadow-md shadow-primary/25'
            : 'bg-gray-200 dark:bg-gray-700'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block rounded-full bg-white shadow-lg transition-transform duration-200 ease-out',
            'mt-[3px] ms-[3px]',
            thumbStyles[size],
            checked && translateStyles[size]
          )}
        />
      </button>
      {label && (
        <span className={fieldLabelClassName(disabled)}>{label}</span>
      )}
    </label>
  );
}
