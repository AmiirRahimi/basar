import React, { type ReactNode } from 'react';
import { cn } from '../lib/cn';

export type BreadcrumbProps = {
  separator?: string;
  children?: ReactNode;
  className?: string;
  separatorClassName?: string;
  separatorVariant?: 'default' | 'circle';
};

export type BreadcrumbItemProps = {
  className?: string;
  children?: ReactNode;
};

function BreadcrumbItem({ className, children }: BreadcrumbItemProps) {
  return <span className={cn('inline-flex items-center gap-2 text-sm', className)}>{children}</span>;
}

export function Breadcrumb({
  separator = '/',
  children,
  className,
  separatorClassName,
  separatorVariant = 'default',
}: BreadcrumbProps) {
  const numOfItems = React.Children.count(children);

  return (
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;

        const childElement = child as React.ReactElement<{ className?: string }>;
        const mergedClassName = cn(
          'font-medium text-gray-500 last:text-gray-800 dark:last:text-gray-200',
          childElement.props.className
        );

        return (
          <React.Fragment key={index}>
            {React.cloneElement(childElement, { className: mergedClassName })}
            {index < numOfItems - 1
              ? separatorVariant === 'default'
                ? (
                    <span
                      className={cn(
                        'text-sm text-gray-300 dark:text-gray-600',
                        separatorClassName
                      )}
                    >
                      {separator}
                    </span>
                  )
                : (
                    <span className="h-1 w-1 rounded-full bg-primary/40" />
                  )
              : null}
          </React.Fragment>
        );
      })}
    </div>
  );
}

Breadcrumb.Item = BreadcrumbItem;
Breadcrumb.displayName = 'Breadcrumb';

export default Breadcrumb;
