'use client';

import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export type FormCardProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function FormCard({ children, className, contentClassName }: FormCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800/70 dark:bg-gray-900',
        className
      )}
    >
      <div className={cn('p-5 sm:p-6 lg:p-8', contentClassName)}>{children}</div>
    </div>
  );
}

export default FormCard;
