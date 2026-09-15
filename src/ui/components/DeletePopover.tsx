'use client';

import type { ReactNode } from 'react';
import { Title, Text, Popover } from 'rizzui';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button, IconButton } from './Button';

export type DeletePopoverLabels = {
  yes?: string;
  no?: string;
  deleteAriaLabel?: string;
};

export type DeletePopoverProps = {
  title: ReactNode;
  description: ReactNode;
  onDelete: () => void;
  icon?: ReactNode;
  dir?: 'ltr' | 'rtl';
  labels?: DeletePopoverLabels;
};

const DEFAULT_LABELS: Required<DeletePopoverLabels> = {
  yes: 'Yes',
  no: 'No',
  deleteAriaLabel: 'Delete item',
};

export function DeletePopover({
  title,
  description,
  onDelete,
  icon = <Trash2 className="size-3.5" />,
  dir = 'ltr',
  labels,
}: DeletePopoverProps) {
  const copy = { ...DEFAULT_LABELS, ...labels };
  const isRtl = dir === 'rtl';

  return (
    <Popover placement="left">
      <Popover.Trigger>
        <IconButton
          size="sm"
          variant="outline"
          aria-label={copy.deleteAriaLabel}
          className="h-7 w-7 rounded-lg border-gray-200/80 text-gray-400 transition-all duration-200 hover:border-red-500/50 hover:bg-red-50 hover:text-red-600 hover:shadow-md hover:shadow-red-500/10 dark:border-gray-700/50 dark:text-gray-500 dark:hover:border-red-500/30 dark:hover:bg-red-500/10 dark:hover:text-red-400"
        >
          {icon}
        </IconButton>
      </Popover.Trigger>
      <Popover.Content className="z-10 border-gray-200/80 shadow-2xl shadow-black/10 backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/95 dark:shadow-black/40">
        {({ setOpen }: { setOpen: (open: boolean) => void }) => (
          <div className="w-64 pb-2 pt-1 text-left rtl:text-right">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 dark:bg-red-500/10">
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </div>
              <Title as="h6" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </Title>
            </div>
            <Text className="mb-3 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              {description}
            </Text>
            <div
              className={cn('flex items-center gap-2', {
                'flex-row-reverse justify-end': isRtl,
                'justify-end': !isRtl,
              })}
            >
              <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
                {copy.no}
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  onDelete();
                  setOpen(false);
                }}
              >
                {copy.yes}
              </Button>
            </div>
          </div>
        )}
      </Popover.Content>
    </Popover>
  );
}

export default DeletePopover;
