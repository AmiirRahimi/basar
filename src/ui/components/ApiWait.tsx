'use client';

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/cn';

export type ApiWaitProps = {
  title: ReactNode;
  hint?: ReactNode;
  className?: string;
  compact?: boolean;
};

export function ApiWait({ title, hint, className, compact = false }: ApiWaitProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl bg-gray-50 text-center text-sm text-gray-600',
        compact ? 'min-h-[5.5rem] px-3 py-4' : 'min-h-[8rem] px-4 py-6',
        className,
      )}
    >
      <Loader2 className={cn('animate-spin text-teal-700', compact ? 'h-5 w-5' : 'h-6 w-6')} />
      <p className="font-medium text-gray-800">{title}</p>
      {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}

export default ApiWait;
