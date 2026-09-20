import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export const fieldGroupClassName = cn(
  'space-y-3 rounded-xl border border-gray-200 p-4',
  'bg-gradient-to-br from-gray-50/50 via-white/30 to-gray-50/50',
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]',
  'dark:border-gray-700/60 dark:from-gray-800/20 dark:via-gray-900/10 dark:to-gray-800/20',
  'dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]',
);

export type FieldGroupProps = {
  title?: ReactNode;
  description?: ReactNode;
  headerAction?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

/** Shared bordered card for form field groups, collapsible sections, and multi-row editors. */
export function FieldGroup({
  title,
  description,
  headerAction,
  children,
  className,
  contentClassName,
}: FieldGroupProps) {
  const hasHeader = title != null || description != null || headerAction != null;

  return (
    <div className={cn(fieldGroupClassName, className)}>
      {hasHeader ? (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title != null ? (
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</p>
            ) : null}
            {description != null ? (
              <p className={cn('text-xs text-gray-500', title != null && 'mt-0.5')}>{description}</p>
            ) : null}
          </div>
          {headerAction}
        </div>
      ) : null}
      {contentClassName ? <div className={contentClassName}>{children}</div> : children}
    </div>
  );
}

export default FieldGroup;
