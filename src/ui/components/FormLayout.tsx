'use client';

import type { ReactNode } from 'react';
import { FormCard } from './FormCard';
import { cn } from '../lib/cn';

export type FormLayoutProps = {
  children: ReactNode;
  className?: string;
  maxWidthClassName?: string;
};

export function FormLayout({
  children,
  className,
  maxWidthClassName = 'max-w-5xl',
}: FormLayoutProps) {
  return (
    <div className={cn('mx-auto px-1 py-2 sm:px-2', maxWidthClassName, className)}>
      <FormCard>{children}</FormCard>
    </div>
  );
}

export default FormLayout;
