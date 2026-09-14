'use client';

import type { ReactNode } from 'react';
import { Breadcrumb } from './Breadcrumb';
import { cn } from '../lib/cn';

export type PageHeaderCrumb = {
  name: string;
};

export type PageHeaderProps = {
  title: string;
  /** Pre-translated breadcrumb labels */
  breadcrumb?: PageHeaderCrumb[];
  children?: ReactNode;
  className?: string;
  subtitle?: string;
};

export function PageHeader({
  title,
  breadcrumb,
  children,
  className = '',
  subtitle,
}: PageHeaderProps) {
  return (
    <header className={cn('@container lg:mb-5', className)}>
      <div className="flex w-full flex-row items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white lg:text-[1.35rem]">
            {title}
          </h2>
          {subtitle ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
          ) : null}
          {breadcrumb && breadcrumb.length > 0 ? (
            <Breadcrumb separator="" separatorVariant="circle" className="flex-wrap">
              {breadcrumb.map((item, index) => (
                <Breadcrumb.Item key={`${item.name}-${index}`}>{item.name}</Breadcrumb.Item>
              ))}
            </Breadcrumb>
          ) : null}
        </div>
        {children ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{children}</div>
        ) : null}
      </div>
      <div className="mt-4 h-px bg-gray-200/90 dark:bg-gray-700/60" />
    </header>
  );
}

export default PageHeader;
