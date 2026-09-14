'use client';

import React from 'react';
import { cn } from '../lib/cn';

export function fieldLabelClassName(disabled?: boolean, className?: string) {
  return cn(
    'text-sm font-medium text-gray-700 dark:text-gray-300',
    disabled && 'text-gray-400 dark:text-gray-500',
    className
  );
}

type FieldLabelProps = React.LabelHTMLAttributes<HTMLLabelElement> & {
  disabled?: boolean;
};

export function FieldLabel({ disabled, className, children, ...props }: FieldLabelProps) {
  return (
    <label {...props} className={fieldLabelClassName(disabled, className)}>
      {children}
    </label>
  );
}
