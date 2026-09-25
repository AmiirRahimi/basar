'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export type TabItem = {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
  content?: ReactNode | (() => ReactNode);
};

export type TabsProps = {
  tabs: TabItem[];
  /** Controlled value */
  value?: string;
  /** Uncontrolled initial value */
  defaultValue?: string;
  onChange?: (value: string) => void;
  navClassName?: string;
  contentClassName?: string;
  className?: string;
};

/**
 * Segmented pill tabs. Routing / resource switching belongs in the host app via `onChange`.
 */
export function Tabs({
  tabs,
  value,
  defaultValue,
  onChange,
  navClassName = '',
  contentClassName = '',
  className,
}: TabsProps) {
  const normalizedTabs = useMemo(() => tabs || [], [tabs]);
  const firstTabValue = normalizedTabs[0]?.value;
  const [internalValue, setInternalValue] = useState(defaultValue || firstTabValue);
  const activeTab = value ?? internalValue;

  useEffect(() => {
    if (value != null) return;
    const next = defaultValue || firstTabValue;
    if (next && next !== internalValue) setInternalValue(next);
  }, [defaultValue, firstTabValue, value, internalValue]);

  const handleChange = (tabValue: string) => {
    if (value == null) setInternalValue(tabValue);
    onChange?.(tabValue);
  };

  if (!normalizedTabs.length) return null;

  const hasContent = normalizedTabs.some((tab) => tab.content != null);

  return (
    <div className={cn('w-full', className)}>
      <nav
        className={cn(
          'flex gap-1 overflow-x-auto rounded-2xl border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-800 dark:bg-gray-950',
          navClassName,
        )}
      >
        {normalizedTabs.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleChange(tab.value)}
              className={cn(
                'flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                isActive
                  ? 'bg-gray-900 text-white shadow-sm dark:bg-white dark:text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-900',
              )}
            >
              {tab.icon ? <span className="inline-flex shrink-0">{tab.icon}</span> : null}
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </nav>
      {hasContent ? (
        <div className={cn('mt-5', contentClassName)}>
          {normalizedTabs.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <div key={tab.value} className={cn(isActive ? 'block' : 'hidden')} aria-hidden={!isActive}>
                {typeof tab.content === 'function' ? tab.content() : tab.content}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default Tabs;
