'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../lib/cn';
import { Modal } from './Modal';
import { Button } from './Button';
import { ModalFooter } from './ModalFooter';

export type ColumnOption = {
  label: string;
  value: string;
  exclude?: { filter?: boolean; list?: boolean };
};

export type ColumnPickerLabels = {
  title?: string;
  description?: string;
  showAll?: string;
  defaultBadge?: string;
  cancel?: string;
  save?: string;
};

const DEFAULT_LABELS: Required<ColumnPickerLabels> = {
  title: 'Manage columns',
  description: "Select the columns you'd like to have visible in the table.",
  showAll: 'Show all columns',
  defaultBadge: 'Default',
  cancel: 'Cancel',
  save: 'Save',
};

function orderColumnsBy(options: ColumnOption[], preferredIds: string[]): ColumnOption[] {
  const byId = new Map(options.map((o) => [o.value, o]));
  const ordered: ColumnOption[] = [];
  for (const id of preferredIds) {
    const col = byId.get(id);
    if (col) {
      ordered.push(col);
      byId.delete(id);
    }
  }
  for (const col of byId.values()) ordered.push(col);
  return ordered;
}

function SortableColumnItem({
  col,
  visible,
  toggleCol,
  defaultBadge,
}: {
  col: ColumnOption;
  visible: boolean;
  toggleCol: (value: string) => void;
  defaultBadge: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: col.value,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      onClick={() => toggleCol(col.value)}
      className={cn(
        'group relative flex select-none items-center justify-between gap-2 rounded-md border px-3 py-2.5 text-sm transition-all',
        isDragging ? 'cursor-grabbing opacity-50' : 'opacity-100',
        visible
          ? 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
          : 'border-gray-100 bg-gray-50 dark:border-gray-700/50 dark:bg-gray-800/50'
      )}
    >
      <div
        {...listeners}
        className="absolute -left-2 -top-2 z-10 flex h-6 w-6 cursor-grab items-center justify-center rounded-full bg-gray-500 text-white opacity-0 shadow-md transition-colors hover:bg-gray-600 group-hover:opacity-100 active:cursor-grabbing"
      >
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 10-4 0 2 2 0 004 0zm0 8a2 2 0 10-4 0 2 2 0 004 0zm0 8a2 2 0 10-4 0 2 2 0 004 0zm10-8a2 2 0 10-4 0 2 2 0 004 0zm0 8a2 2 0 10-4 0 2 2 0 004 0z" />
        </svg>
      </div>

      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={cn(
            'flex-shrink-0 transition-colors',
            visible
              ? 'text-primary hover:text-primary-dark'
              : 'text-gray-300 hover:text-gray-400 dark:text-gray-600'
          )}
          aria-label={visible ? 'Hide column' : 'Show column'}
        >
          {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </span>

        <span
          className={cn(
            'truncate text-[11px] font-medium uppercase tracking-wide',
            visible ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'
          )}
        >
          {col.label}
        </span>

        {false && (
          <span className="flex-shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-gray-400 dark:bg-gray-700 dark:text-gray-500">
            {defaultBadge}
          </span>
        )}
      </div>
    </div>
  );
}

function SortableColumnList({
  order,
  setOrder,
  localVisible,
  toggleCol,
  defaultBadge,
}: {
  order: ColumnOption[];
  setOrder: (next: ColumnOption[]) => void;
  localVisible: Set<string>;
  toggleCol: (value: string) => void;
  defaultBadge: string;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = order.findIndex((c) => c.value === active.id);
      const newIndex = order.findIndex((c) => c.value === over.id);
      setOrder(arrayMove(order, oldIndex, newIndex));
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={order.map((c) => c.value)} strategy={verticalListSortingStrategy}>
        <div className="max-h-80 space-y-1.5 overflow-y-auto custom-scrollbar py-2 pl-2 pr-1">
          {order.map((col) => (
            <SortableColumnItem
              key={col.value}
              col={col}
              visible={localVisible.has(col.value)}
              toggleCol={toggleCol}
              defaultBadge={defaultBadge}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export type ColumnPickerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  columnOptions: ColumnOption[];
  visibleColumnIds: string[];
  onConfirm: (ordered: string[], visible: string[]) => void;
  labels?: ColumnPickerLabels;
};

export function ColumnPickerModal({
  isOpen,
  onClose,
  columnOptions,
  visibleColumnIds,
  onConfirm,
  labels,
}: ColumnPickerModalProps) {
  const copy = { ...DEFAULT_LABELS, ...labels };
  const [order, setOrder] = useState<ColumnOption[]>(columnOptions);
  const [localVisible, setLocalVisible] = useState<Set<string>>(new Set(visibleColumnIds));
  const effectiveOptions = useMemo(
    () => columnOptions.filter((o) => !o.exclude?.filter),
    [columnOptions]
  );

  useEffect(() => {
    if (isOpen) {
      const ord = orderColumnsBy(effectiveOptions, visibleColumnIds);
      setOrder(ord);
      const allowed = new Set(effectiveOptions.map((o) => o.value));
      setLocalVisible(new Set(visibleColumnIds.filter((id) => allowed.has(id))));
    }
  }, [isOpen, effectiveOptions, visibleColumnIds]);

  const showAll = () => setLocalVisible(new Set(order.map((c) => c.value)));

  const toggleCol = (value: string) => {
    setLocalVisible((prev) => {
      const next = new Set(prev);
      next.has(value) ? next.delete(value) : next.add(value);
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm(order.map((c) => c.value), [...localVisible]);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      rounded="lg"
      title={copy.title}
      overlayClassName="dark:bg-opacity-40 dark:backdrop-blur-lg"
      containerClassName="bg-white p-6 shadow-xl dark:bg-gray-900"
    >
      <div className="w-full space-y-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">{copy.description}</p>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={showAll} icon={<Eye className="h-4 w-4" />}>
            {copy.showAll}
          </Button>
        </div>

        <SortableColumnList
          order={order}
          setOrder={setOrder}
          localVisible={localVisible}
          toggleCol={toggleCol}
          defaultBadge={copy.defaultBadge}
        />

        <ModalFooter
          formId="column-picker-form"
          onCancel={onClose}
          onSave={handleConfirm}
          labels={{ cancel: copy.cancel, save: copy.save }}
        />
      </div>
    </Modal>
  );
}

export default ColumnPickerModal;
