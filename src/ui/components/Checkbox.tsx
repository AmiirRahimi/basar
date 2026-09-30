'use client';

import React, { type ChangeEventHandler, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { Checkbox as RizzuiCheckbox } from 'rizzui';
import { cn } from '../lib/cn';

type CheckboxProps = {
  checked: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
  label: ReactNode;
  variant?: 'flat' | 'outline';
  className?: string;
  disabled?: boolean | undefined;
};

export default function Checkbox({
  checked,
  onChange,
  label,
  variant = 'flat',
  className,
  disabled,
}: CheckboxProps) {
  return (
    <span className="relative inline-flex items-center">
      <RizzuiCheckbox
        checked={checked}
        onChange={onChange}
        label={label}
        disabled={disabled}
        variant={variant}
        iconClassName="!hidden"
        className={cn(
          '[&>label>span]:text-sm [&>label>span]:font-medium cursor-pointer',
          className,
        )}
      />
      <Check
        aria-hidden
        strokeWidth={3}
        className={cn(
          'pointer-events-none absolute start-[5px] top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white',
          checked ? 'opacity-100' : 'opacity-0',
        )}
      />
    </span>
  );
}
