'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import RubberSegment from './RubberSegment';
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
      <div className="max-w-full overflow-x-auto">
        <RubberSegment
          items={normalizedTabs.map((tab) => ({
            value: tab.value,
            label: tab.label,
            icon: tab.icon,
          }))}
          value={activeTab}
          onChange={(next: string) => handleChange(next)}
          trackColor="#f4f4f5"
          thumbColor="#18181b"
          textColor="#3f3f46"
          activeTextColor="#fafafa"
          size="md"
          radius={16}
          inset={4}
          equalSlots
          stretch={100}
          squash={3}
          speed={1}
          glide={75}
          draggable
          className={cn('w-full', navClassName)}
          aria-label="بخش‌ها"
        />
      </div>
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
