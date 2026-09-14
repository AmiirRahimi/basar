'use client';

import type { PropsWithChildren, ReactNode } from 'react';
import { cn } from '../lib/cn';

export type WidgetCardProps = PropsWithChildren<{
  title?: ReactNode;
  action?: ReactNode;
  description?: ReactNode;
  className?: string;
  headerClassName?: string;
  actionClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  contentWrapperClassName?: string;
  hideHeader?: boolean;
}>;

/**
 * Pure card shell — no resource/context hooks.
 */
export function WidgetCard({
  title = '',
  action,
  description,
  className = '',
  headerClassName,
  actionClassName,
  titleClassName,
  descriptionClassName,
  contentWrapperClassName = '',
  children,
  hideHeader = false,
}: WidgetCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200/80 bg-white shadow-sm transition-shadow duration-200 dark:border-gray-800/70 dark:bg-gray-900',
        className
      )}
    >
      {!hideHeader && (
        <div
          className={cn(
            action && 'flex items-center justify-between',
            'rounded-t-xl border-b border-gray-200/80 bg-gray-50/70 px-4 py-3 dark:border-gray-800/70 dark:bg-gray-800/50',
            headerClassName
          )}
        >
          <div>
            {title != null && title !== '' && (
              <div className={cn('text-sm font-semibold text-gray-900 dark:text-white', titleClassName)}>
                {title}
              </div>
            )}
            {description && <div className={cn('mt-1', descriptionClassName)}>{description}</div>}
          </div>
          {action && <div className={cn('ps-2', actionClassName)}>{action}</div>}
        </div>
      )}
      <div className={cn('p-0', contentWrapperClassName)}>{children}</div>
    </div>
  );
}

export default WidgetCard;
