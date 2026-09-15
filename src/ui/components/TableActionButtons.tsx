'use client';

import type { ComponentType, ElementType, ReactNode } from 'react';
import { Tooltip } from 'rizzui';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { cn } from '../lib/cn';
import { IconButton } from './Button';
import {
  DeleteConfirmationTrigger,
  type DeleteConfirmationProps,
} from './DeleteConfirmationTrigger';

export type TableActionButtonsLabels = {
  view?: string;
  edit?: string;
  deleteTitle?: string;
  deleteDescription?: string;
  yes?: string;
  no?: string;
};

export type TableActionButtonsProps = {
  item?: Record<string, unknown>;
  viewIcon?: ReactNode;
  editIcon?: ReactNode;
  deleteIcon?: ReactNode;
  showView?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
  onDelete?: (item: Record<string, unknown>) => void | Promise<void>;
  editUrl?: string;
  viewUrl?: string;
  className?: string;
  extraButtons?: ReactNode;
  onEditClick?: (item: Record<string, unknown>) => void;
  onViewClick?: (item: Record<string, unknown>) => void;
  deleteConfirmation?: ComponentType<DeleteConfirmationProps>;
  /** Framework link, e.g. next/link. Defaults to native `<a>`. */
  LinkComponent?: ElementType;
  dir?: 'ltr' | 'rtl';
  labels?: TableActionButtonsLabels;
};

const DEFAULT_LABELS: Required<TableActionButtonsLabels> = {
  view: 'View',
  edit: 'Edit',
  deleteTitle: 'Delete item',
  deleteDescription: 'Are you sure you want to delete this item?',
  yes: 'Yes',
  no: 'No',
};

export function TableActionButtons({
  item = {},
  viewIcon = <Eye className="size-3.5" />,
  editIcon = <Pencil className="size-3.5" />,
  deleteIcon = <Trash2 className="size-3.5" />,
  showView = true,
  showEdit = true,
  showDelete = true,
  onDelete,
  editUrl = '#',
  viewUrl = '#',
  className = '',
  extraButtons = null,
  onEditClick,
  onViewClick,
  deleteConfirmation,
  LinkComponent = 'a',
  dir = 'ltr',
  labels,
}: TableActionButtonsProps) {
  const copy = { ...DEFAULT_LABELS, ...labels };
  const Link = LinkComponent;

  return (
    <div className={cn('relative flex w-fit items-center gap-1.5 pe-3', className)}>
      {showView && (
        <Tooltip size="sm" content={copy.view} placement="top" color="invert">
          <Link
            href={viewUrl}
            className="inline-flex"
            onClick={() => onViewClick?.(item)}
          >
            <IconButton
              size="sm"
              variant="outline"
              aria-label={copy.view}
              className="h-7 w-7 rounded-lg border-gray-200/80 text-gray-600 transition-all duration-200 hover:border-blue-500/50 hover:bg-blue-50 hover:text-blue-600 dark:border-gray-700/50 dark:text-gray-400 dark:hover:border-blue-500/30 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
            >
              {viewIcon}
            </IconButton>
          </Link>
        </Tooltip>
      )}

      {showEdit && (
        <Tooltip size="sm" content={copy.edit} placement="top" color="invert">
          <Link href={editUrl} className="inline-flex" onClick={() => onEditClick?.(item)}>
            <IconButton
              size="sm"
              variant="outline"
              aria-label={copy.edit}
              className="h-7 w-7 rounded-lg border-gray-200/80 text-gray-600 transition-all duration-200 hover:border-amber-500/50 hover:bg-amber-50 hover:text-amber-600 dark:border-gray-700/50 dark:text-gray-400 dark:hover:border-amber-500/30 dark:hover:bg-amber-500/10 dark:hover:text-amber-400"
            >
              {editIcon}
            </IconButton>
          </Link>
        </Tooltip>
      )}

      {showDelete && (
        <div className="group inline-flex transition-transform duration-200 active:scale-95">
          <DeleteConfirmationTrigger
            item={item}
            onDelete={onDelete}
            deleteIcon={deleteIcon}
            title={copy.deleteTitle}
            description={copy.deleteDescription}
            tooltipLabel={copy.deleteTitle}
            confirmationComponent={deleteConfirmation}
            dir={dir}
            yesLabel={copy.yes}
            noLabel={copy.no}
          />
        </div>
      )}

      {extraButtons}
    </div>
  );
}

export default TableActionButtons;
