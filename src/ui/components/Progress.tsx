'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  animated?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, size = 'md', ...props }, ref) => {
    const percentage = Math.min((value / max) * 100, 100);

    const sizeClasses = {
      sm: 'h-1.5',
      md: 'h-2',
      lg: 'h-3',
    };

    const getGradient = (val: number) => {
      if (val > 80) {
        return 'linear-gradient(90deg, #ef4444 0%, #f87171 50%, #ef4444 100%)';
      }
      if (val > 60) {
        return 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 50%, #f59e0b 100%)';
      }
      return 'linear-gradient(90deg, #10b981 0%, #34d399 50%, #10b981 100%)';
    };

    const getGlow = (val: number) => {
      if (val > 80) return '0 0 8px rgba(239, 68, 68, 0.4)';
      if (val > 60) return '0 0 8px rgba(245, 158, 11, 0.3)';
      return '0 0 8px rgba(16, 185, 129, 0.3)';
    };

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className={cn(
          'relative w-full overflow-hidden rounded-full',
          sizeClasses[size],
          'bg-gray-100/80 dark:bg-gray-800/50',
          className
        )}
        {...props}
      >
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${percentage}%`,
            background: getGradient(percentage),
            boxShadow: getGlow(percentage),
          }}
        />
      </div>
    );
  }
);
Progress.displayName = 'Progress';

export { Progress };
