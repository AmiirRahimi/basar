'use client';

import type { ReactNode } from 'react';
import { ActionIcon, Popover } from 'rizzui';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '../lib/cn';
import { HintPopover } from './HintPopover';

export type TableActionsMenuProps = {
  content: ReactNode;
  menuIcon?: ReactNode;
  className?: string;
  /** Already-translated tooltip / aria label */
  actionsLabel?: string;
};

export function TableActionsMenu({
  content,
  menuIcon = <MoreHorizontal className="size-4" />,
  className,
  actionsLabel = 'Actions',
}: TableActionsMenuProps) {
  return (
    <HintPopover content={actionsLabel}>
      <div className={cn('inline-flex', className)} data-stop-row-click="true">
        <Popover placement="bottom-end" shadow="lg">
          <Popover.Trigger>
            <ActionIcon
              size="sm"
              variant="outline"
              aria-label={actionsLabel}
              className="h-7 w-7 rounded-lg border-gray-200/80 text-gray-400 transition-all duration-200 hover:border-gray-400 hover:bg-gray-100 hover:text-gray-600 hover:shadow-md dark:border-gray-700/50 dark:text-gray-500 dark:hover:border-gray-600 dark:hover:bg-white/[0.06] dark:hover:text-gray-300"
            >
              {menuIcon}
            </ActionIcon>
          </Popover.Trigger>
          <Popover.Content className="z-50 border-gray-200/80 p-1.5 shadow-2xl shadow-black/10 backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/95 dark:shadow-black/40">
            {content}
          </Popover.Content>
        </Popover>
      </div>
    </HintPopover>
  );
}

export default TableActionsMenu;
