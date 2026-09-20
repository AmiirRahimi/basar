'use client';

import { useState, type ComponentType, type ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { Modal } from './Modal';
import { IconButton } from './Button';
import { DeletePopover } from './DeletePopover';
import { HintPopover } from './HintPopover';

export type DeleteConfirmationProps = {
  item: Record<string, unknown>;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
};

export type DeleteConfirmationTriggerProps = {
  item: Record<string, unknown>;
  onDelete?: (item: Record<string, unknown>) => void | Promise<void>;
  deleteIcon?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  tooltipLabel?: string;
  confirmationComponent?: ComponentType<DeleteConfirmationProps>;
  dir?: 'ltr' | 'rtl';
  yesLabel?: string;
  noLabel?: string;
};

export function DeleteConfirmationTrigger({
  item,
  onDelete,
  deleteIcon = <Trash2 className="size-3.5" />,
  title = 'Delete item',
  description = 'Are you sure you want to delete this item?',
  tooltipLabel = 'Delete item',
  confirmationComponent: ConfirmationComponent,
  dir = 'ltr',
  yesLabel = 'Yes',
  noLabel = 'No',
}: DeleteConfirmationTriggerProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!onDelete) return;
    setLoading(true);
    try {
      await onDelete(item);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  if (!ConfirmationComponent) {
    return (
      <DeletePopover
        title={title}
        description={description}
        onDelete={() => onDelete?.(item)}
        dir={dir}
        labels={{ yes: yesLabel, no: noLabel, deleteAriaLabel: tooltipLabel }}
        icon={
          <span className="text-gray-400 transition-colors duration-200 group-hover:text-white">
            {deleteIcon}
          </span>
        }
      />
    );
  }

  return (
    <>
      <HintPopover content={tooltipLabel}>
        <IconButton
          size="sm"
          variant="outline"
          aria-label={tooltipLabel}
          className="h-7 w-7 rounded-lg border-gray-200/80 text-gray-400 transition-all duration-200 hover:border-red-500/50 hover:bg-red-50 hover:text-red-600 hover:shadow-md hover:shadow-red-500/10 dark:border-gray-700/50 dark:text-gray-500 dark:hover:border-red-500/30 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          onClick={() => setOpen(true)}
        >
          {deleteIcon}
        </IconButton>
      </HintPopover>

      {open && (
        <Modal
          isOpen={open}
          onClose={() => !loading && setOpen(false)}
          size="lg"
          rounded="lg"
          overlayClassName="dark:bg-opacity-40 dark:backdrop-blur-lg"
          containerClassName="bg-white p-6 shadow-xl dark:bg-gray-900"
        >
          <ConfirmationComponent
            key={String(item.id ?? item.username ?? 'delete')}
            item={item}
            loading={loading}
            onCancel={() => setOpen(false)}
            onConfirm={handleConfirm}
          />
        </Modal>
      )}
    </>
  );
}

export default DeleteConfirmationTrigger;
