'use client';

import React, { type ChangeEventHandler, type ReactNode } from 'react';
import { Checkbox as RizzuiCheckbox } from 'rizzui';

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
  className = '[&>label>span]:text-sm [&>label>span]:font-medium cursor-pointer',
  disabled,
}: CheckboxProps) {
  return (
    <RizzuiCheckbox
      checked={checked}
      onChange={onChange}
      label={label}
      disabled={disabled}
      variant={variant}
      className={className}
    />
  );
}
