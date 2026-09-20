'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { FieldGroup } from './FieldGroup';

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
          <FieldGroup contentClassName={contentClassName}>{children}</FieldGroup>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CollapsiblePanel;
