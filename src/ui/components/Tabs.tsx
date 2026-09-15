'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export type TabItem = {
  value: string;
  label: ReactNode;
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
 * Pure tabs — routing / resource switching belongs in the host app via `onChange`.
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

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'z-20 border-b border-gray-200/90 py-0 font-medium text-gray-500 dark:border-gray-700/60',
          navClassName
        )}
      >
        <div className="custom-scrollbar overflow-x-auto scroll-smooth">
          <div className="inline-grid grid-flow-col gap-5 md:gap-7 lg:gap-10">
            {normalizedTabs.map((tab) => {
              const isActive = activeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => handleChange(tab.value)}
                  className={cn(
                    'relative cursor-pointer whitespace-nowrap py-4 transition-colors duration-200',
                    'hover:text-gray-800 dark:hover:text-gray-200',
                    isActive
                      ? 'font-semibold text-gray-1000 dark:text-white'
                      : 'text-gray-500'
                  )}
                >
                  {tab.label}
                  <span
                    className={cn(
                      'absolute bottom-0 left-0 h-0.5 w-full origin-left rounded-full bg-gray-1000 transition-transform duration-200 ease-out dark:bg-white',
                      isActive ? 'scale-x-100' : 'scale-x-0'
                    )}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className={cn('mt-6 min-h-[60vh] rounded-xl', contentClassName)}>
        {normalizedTabs.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <div
              key={tab.value}
              className={cn(isActive ? 'block' : 'hidden')}
              aria-hidden={!isActive}
            >
              {typeof tab.content === 'function' ? tab.content() : tab.content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Tabs;
