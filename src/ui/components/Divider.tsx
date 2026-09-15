import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export type DividerProps = {
  label?: ReactNode;
  className?: string;
};

export function Divider({ label = '•••', className }: DividerProps) {
  return (
    <div className={cn('relative my-8', className)} role="separator" aria-hidden="true">
      <div className="absolute inset-0 flex items-center">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      </div>
      <div className="relative flex justify-center">
        <span className="rounded-full border border-gray-200/60 bg-gradient-to-r from-gray-50 via-white to-gray-50 px-5 py-1.5 text-xs font-medium text-gray-400 shadow-sm backdrop-blur-sm dark:border-gray-700/40 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 dark:text-gray-500">
          {label}
        </span>
      </div>
    </div>
  );
}

export default Divider;
