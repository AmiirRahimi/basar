'use client';

import type { ReactNode } from 'react';
import { TableActionButtons, type TableActionExtra } from '@/ui';

const FA_LABELS = {
  view: 'مشاهده',
  edit: 'ویرایش',
  deleteTitle: 'حذف',
  deleteDescription: 'این مورد حذف شود؟',
  yes: 'بله',
  no: 'خیر',
};

export function RowActions({
  onEdit,
  onDelete,
  extraActions,
  extraButtons,
}: {
  onEdit?: () => void;
  onDelete?: () => void | Promise<void>;
  extraActions?: TableActionExtra[];
  extraButtons?: ReactNode;
}) {
  return (
    <TableActionButtons
      dir="rtl"
      showView={false}
      showEdit={Boolean(onEdit)}
      showDelete={Boolean(onDelete)}
      onEditClick={onEdit ? () => onEdit() : undefined}
      onDelete={onDelete ? () => onDelete() : undefined}
      extraActions={extraActions}
      extraButtons={extraButtons}
      labels={FA_LABELS}
    />
  );
}
