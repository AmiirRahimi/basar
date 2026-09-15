'use client';

import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export type PageLoaderProps = {
  label?: ReactNode;
  fullScreen?: boolean;
  className?: string;
};

export function PageLoader({
  label = 'Loading…',
  fullScreen = true,
  className,
}: PageLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        'relative isolate flex w-full items-center justify-center overflow-hidden bg-background text-foreground',
        fullScreen ? 'min-h-screen' : 'min-h-48',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative flex flex-col items-center gap-5">
        <div className="relative flex h-20 w-20 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/15 [animation-duration:1.8s]" />
          <span className="absolute inset-2 animate-spin rounded-full border-2 border-primary/15 border-t-primary [animation-duration:1.1s]" />
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-xl font-black text-primary-foreground shadow-lg shadow-primary/25">
            C
          </span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-200">
            {label}
          </p>
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {[0, 1, 2].map(index => (
              <span
                key={index}
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary"
                style={{ animationDelay: `${index * 140}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PageLoader;
