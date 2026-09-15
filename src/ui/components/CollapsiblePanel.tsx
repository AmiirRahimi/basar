'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export type CollapsiblePanelProps = {
  open: boolean;
  children: ReactNode;
  panelKey?: string;
  className?: string;
  contentClassName?: string;
};

export function CollapsiblePanel({
  open,
  children,
  panelKey = 'collapsible-panel',
  className,
  contentClassName,
}: CollapsiblePanelProps) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key={panelKey}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className={cn('overflow-hidden', className)}
        >
          <div
            className={cn(
              'rounded-xl border border-gray-100/80 dark:border-gray-800/40',
              'bg-gradient-to-br from-gray-50/50 via-white/30 to-gray-50/50',
              'dark:from-gray-800/20 dark:via-gray-900/10 dark:to-gray-800/20',
              'p-5',
              'shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]',
              contentClassName
            )}
          >
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CollapsiblePanel;
