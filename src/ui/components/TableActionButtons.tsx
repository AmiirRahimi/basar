'use client';

import type { ComponentType, ElementType, ReactNode } from 'react';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { cn } from '../lib/cn';
import { IconButton } from './Button';
import { HintPopover } from './HintPopover';
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

export type TableActionExtra = {
  label: string;
  icon: ReactNode;
  onClick: () => void;
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
  extraActions?: TableActionExtra[];
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

const iconClass =
  'h-7 w-7 shrink-0 rounded-lg border-gray-200/80 text-gray-600 transition-all duration-200 dark:border-gray-700/50 dark:text-gray-400';

export function TableActionButtons({
  item = {},
  viewIcon = <Eye className="size-3.5" />,
  editIcon = <Pencil className="size-3.5" />,
  deleteIcon = <Trash2 className="size-3.5" />,
  showView = true,
  showEdit = true,
  showDelete = true,
  onDelete,
  editUrl,
  viewUrl,
  className = '',
  extraButtons = null,
  extraActions = [],
  onEditClick,
  onViewClick,
  deleteConfirmation,
  LinkComponent = 'a',
  dir = 'ltr',
  labels,
}: TableActionButtonsProps) {
  const copy = { ...DEFAULT_LABELS, ...labels };

  return (
    <div
      data-stop-row-click="true"
      className={cn('inline-flex flex-nowrap items-center gap-1 whitespace-nowrap', className)}
    >
      {showView ? (
        <ActionHit
          label={copy.view}
          icon={viewIcon}
          href={viewUrl}
          LinkComponent={LinkComponent}
          className={`${iconClass} hover:border-blue-500/50 hover:bg-blue-50 hover:text-blue-600 dark:hover:border-blue-500/30 dark:hover:bg-blue-500/10 dark:hover:text-blue-400`}
          onClick={onViewClick ? () => onViewClick(item) : undefined}
        />
      ) : null}

      {showEdit ? (
        <ActionHit
          label={copy.edit}
          icon={editIcon}
          href={editUrl}
          LinkComponent={LinkComponent}
          className={`${iconClass} hover:border-amber-500/50 hover:bg-amber-50 hover:text-amber-600 dark:hover:border-amber-500/30 dark:hover:bg-amber-500/10 dark:hover:text-amber-400`}
          onClick={onEditClick ? () => onEditClick(item) : undefined}
        />
      ) : null}

      {extraActions.map((action) => (
        <ActionHit
          key={action.label}
          label={action.label}
          icon={action.icon}
          className={`${iconClass} hover:border-teal-500/50 hover:bg-teal-50 hover:text-teal-700 dark:hover:border-teal-500/30 dark:hover:bg-teal-500/10 dark:hover:text-teal-400`}
          onClick={action.onClick}
        />
      ))}

      {showDelete ? (
        <div className="inline-flex shrink-0">
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
      ) : null}

      {extraButtons}
    </div>
  );
}

function ActionHit({
  label,
  icon,
  href,
  onClick,
  className,
  LinkComponent = 'a',
}: {
  label: string;
  icon: ReactNode;
  href?: string;
  onClick?: () => void;
  className: string;
  LinkComponent?: ElementType;
}) {
  const button = (
    <IconButton type="button" size="sm" variant="outline" aria-label={label} className={className} onClick={onClick}>
      {icon}
    </IconButton>
  );

  if (href && href !== '#') {
    const Link = LinkComponent;
    return (
      <HintPopover content={label}>
        <Link href={href} className="inline-flex shrink-0" onClick={onClick}>
          <IconButton type="button" size="sm" variant="outline" aria-label={label} className={className}>
            {icon}
          </IconButton>
        </Link>
      </HintPopover>
    );
  }

  return (
    <HintPopover content={label}>
      <span className="inline-flex shrink-0">{button}</span>
    </HintPopover>
  );
}

export default TableActionButtons;
