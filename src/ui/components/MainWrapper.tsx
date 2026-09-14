'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

export type MainWrapperProps = {
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

export const MainWrapper = React.forwardRef<HTMLDivElement, MainWrapperProps>(
  ({ children, footer, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-grow flex-col duration-300',
          'rounded-xl border border-gray-200/70 dark:border-gray-800/60',
          'bg-content-gradient',
          'shadow-sm',
          'overflow-y-auto overflow-x-hidden custom-scrollbar',
          className
        )}
      >
        <div className="flex-1 px-4 py-4 md:px-5 md:py-5">{children}</div>
        {footer}
      </div>
    );
  }
);

MainWrapper.displayName = 'MainWrapper';
