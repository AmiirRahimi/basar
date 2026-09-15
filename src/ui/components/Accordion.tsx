'use client';

import type { ComponentType, ReactNode } from 'react';
import { ChevronDown, Settings2 } from 'lucide-react';
import { cn } from '../lib/cn';
import { CollapsiblePanel } from './CollapsiblePanel';

export type AccordionProps = {
  children: ReactNode;
  open: boolean;
  setOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
  Icon?: ComponentType<{ size?: number; className?: string }>;
  /** Already-translated title (or any ReactNode). */
  title: ReactNode;
  badge?: number;
  panelKey?: string;
  contentClassName?: string;
};

/**
 * Pure accordion — pass translated `title` from the host app.
 */
export function Accordion({
  children,
  open,
  setOpen,
  Icon = Settings2,
  title,
  badge,
  panelKey,
  contentClassName,
}: AccordionProps) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className={cn(
          'inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-all duration-200',
          open
            ? 'border-primary/30 bg-gradient-to-r from-primary/15 to-primary/5 text-primary shadow-[0_0_12px_rgb(var(--primary-default)/0.08),inset_0_0_0_1px_rgb(var(--primary-default)/0.1)]'
            : 'border-gray-200/80 bg-white text-gray-600 hover:border-gray-300 hover:shadow-sm dark:border-gray-700/50 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-white/[0.02]'
        )}
      >
        <Icon className="size-4" />
        {title}
        {badge != null && badge > 0 && (
          <span className="ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-[10px] font-bold text-white shadow-[0_0_8px_rgb(var(--primary-default)/0.22)]">
            {badge}
          </span>
        )}
        <ChevronDown
          className={cn(
            'size-4 transition-transform duration-200 ease-out',
            open ? 'rotate-180' : 'rotate-0'
          )}
        />
      </button>

      <CollapsiblePanel
        open={open}
        panelKey={panelKey ?? 'accordion-panel'}
        contentClassName={contentClassName}
      >
        {children}
      </CollapsiblePanel>
    </div>
  );
}

export default Accordion;
