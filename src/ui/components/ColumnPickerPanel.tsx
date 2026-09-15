'use client';

import { useMemo, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, Eye, EyeOff, GripVertical } from '../icons';
import { cn } from '../lib/cn';
import { Button } from './Button';
import type { ColumnOption } from './ColumnPickerModal';

export type ColumnPickerPanelLabels = {
  title?: string;
  description?: string;
  showAll?: string;
  showDefault?: string;
  cancel?: string;
  save?: string;
  reorder?: string;
};

export type ColumnPickerPanelProps = {
  columnOptions: ColumnOption[];
  visibleColumnIds: string[];
  onConfirm: (orderedIds: string[], visibleIds: string[]) => void;
  onCancel: () => void;
  labels?: ColumnPickerPanelLabels;
};

const DEFAULT_LABELS: Required<ColumnPickerPanelLabels> = {
  title: 'Manage columns',
  description: "Select the columns you'd like to have visible in the table.",
  showAll: 'Show all columns',
  showDefault: 'Show default columns',
  cancel: 'Cancel',
  save: 'Save',
  reorder: 'Reorder column',
};

function orderColumnsBy(options: ColumnOption[], visibleColumnIds: string[]) {
  const byId = new Map(options.map((col) => [col.value, col]));
  const ordered: ColumnOption[] = [];
  for (const id of visibleColumnIds) {
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
  reorderLabel,
}: {
  col: ColumnOption;
  visible: boolean;
  toggleCol: (value: string) => void;
  reorderLabel: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: col.value,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        'group flex select-none items-center gap-2 rounded-xl border px-2.5 py-2 text-sm transition-all',
        isDragging ? 'opacity-60 shadow-md' : 'opacity-100',
        visible
          ? 'border-gray-200 bg-white dark:border-gray-700/50 dark:bg-gray-900'
          : 'border-gray-100 bg-gray-50 dark:border-gray-700/40 dark:bg-gray-800/60'
      )}
    >
      <button
        type="button"
        className="inline-flex h-7 w-7 cursor-grab items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 active:cursor-grabbing dark:hover:bg-white/[0.06] dark:hover:text-gray-200"
        aria-label={reorderLabel}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        onClick={() => toggleCol(col.value)}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-start"
      >
        <span
          className={cn(
            'flex-shrink-0',
            visible ? 'text-primary' : 'text-gray-300 dark:text-gray-600'
          )}
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
      </button>
    </div>
  );
}

export function ColumnPickerPanel({
  columnOptions,
  visibleColumnIds,
  onConfirm,
  onCancel,
  labels,
}: ColumnPickerPanelProps) {
  const copy = { ...DEFAULT_LABELS, ...labels };
  const effectiveOptions = useMemo(
    () => columnOptions.filter((option) => !option.exclude?.filter),
    [columnOptions]
  );

  const defaultColumnIds = useMemo(
    () => effectiveOptions.filter((option) => !option.exclude?.list).map((option) => option.value),
    [effectiveOptions]
  );

  const [order, setOrder] = useState<ColumnOption[]>(() =>
    orderColumnsBy(effectiveOptions, visibleColumnIds)
  );
  const [localVisible, setLocalVisible] = useState(
    () =>
      new Set(visibleColumnIds.filter((id) => effectiveOptions.some((option) => option.value === id)))
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.findIndex((col) => col.value === active.id);
    const newIndex = order.findIndex((col) => col.value === over.id);
    setOrder(arrayMove(order, oldIndex, newIndex));
  };

  const toggleCol = (value: string) => {
    setLocalVisible((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{copy.title}</h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{copy.description}</p>
        </div>
        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          {localVisible.size}/{order.length}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          icon={<Eye className="h-3.5 w-3.5" />}
          onClick={() => setLocalVisible(new Set(order.map((col) => col.value)))}
        >
          {copy.showAll}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          icon={<EyeOff className="h-3.5 w-3.5" />}
          onClick={() => setLocalVisible(new Set(defaultColumnIds))}
        >
          {copy.showDefault}
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order.map((col) => col.value)} strategy={verticalListSortingStrategy}>
          <div className="custom-scrollbar max-h-72 space-y-1.5 overflow-y-auto py-1 pe-1">
            {order.map((col) => (
              <SortableColumnItem
                key={col.value}
                col={col}
                visible={localVisible.has(col.value)}
                toggleCol={toggleCol}
                reorderLabel={copy.reorder}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-200/70 pt-3 dark:border-gray-700/50">
        <Button type="button" size="md" variant="outline" onClick={onCancel}>
          {copy.cancel}
        </Button>
        <Button
          type="button"
          size="md"
          icon={<Check className="h-3.5 w-3.5" />}
          onClick={() =>
            onConfirm(
              order.map((col) => col.value),
              [...localVisible]
            )
          }
        >
          {copy.save}
        </Button>
      </div>
    </div>
  );
}

export default ColumnPickerPanel;
