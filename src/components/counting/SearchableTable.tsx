'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
  type VisibilityState,
} from '@tanstack/react-table';
import { BasicTable, ColumnPickerPanel, EmptyState, Input, TableFilter } from '@/ui';
import type { ColumnOption } from '@/ui';
import { matchesTableSearch } from '@/lib/table-search';

const PINNED_COLUMN = 'actions';
const DEFAULT_VISIBLE_COUNT = 6;
const STORAGE_PREFIX = 'basar.table.';

const COLUMN_PICKER_LABELS = {
  title: 'ستون‌ها',
  description: 'ستون‌ها را نشان دهید، پنهان کنید یا با کشیدن جابه‌جا کنید.',
  showAll: 'نمایش همه',
  showDefault: 'ستون‌های پیش‌فرض',
  cancel: 'انصراف',
  save: 'ذخیره',
  reorder: 'جابه‌جایی ستون',
};

const TABLE_FILTER_LABELS = {
  columns: 'ستون‌ها',
  filters: 'فیلتر',
  active: 'فعال',
  clearAll: 'پاک کردن جستجو',
  clearFilter: 'حذف',
};

type StoredLayout = { order: string[]; visible: string[] };

function columnId<T>(column: ColumnDef<T, any>, index: number) {
  return String(column.id || ('accessorKey' in column ? column.accessorKey : '') || index);
}

function columnLabel<T>(column: ColumnDef<T, any>, index: number) {
  return typeof column.header === 'string' ? column.header : columnId(column, index);
}

function pickerColumns<T>(columns: ColumnDef<T, any>[], defaultVisibleCount: number): ColumnOption[] {
  return columns
    .map((column, index) => ({ column, index, id: columnId(column, index) }))
    .filter((item) => item.id !== PINNED_COLUMN)
    .map((item, visibleIndex) => ({
      value: item.id,
      label: columnLabel(item.column, item.index),
      exclude: visibleIndex >= defaultVisibleCount ? { list: true } : undefined,
    }));
}

function allColumnIds<T>(columns: ColumnDef<T, any>[]) {
  return columns.map((column, index) => columnId(column, index));
}

function defaultVisibleIds(pickerIds: string[], count: number) {
  return pickerIds.slice(0, Math.min(Math.max(count, pickerIds.length ? 1 : 0), pickerIds.length));
}

function readLayout(storageKey: string): StoredLayout | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${storageKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredLayout;
    if (!Array.isArray(parsed.order) || !Array.isArray(parsed.visible)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLayout(storageKey: string, layout: StoredLayout) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${storageKey}`, JSON.stringify(layout));
  } catch {
    /* ignore quota / private mode */
  }
}

function mergeLayout(stored: StoredLayout | null, allIds: string[], fallbackVisible: string[]): StoredLayout {
  const pickerIds = allIds.filter((id) => id !== PINNED_COLUMN);
  const known = new Set(pickerIds);
  const storedOrder = stored ? stored.order.filter((id) => known.has(id)) : [];
  const missing = pickerIds.filter((id) => !storedOrder.includes(id));
  const order = [
    ...storedOrder,
    ...missing,
    ...(allIds.includes(PINNED_COLUMN) ? [PINNED_COLUMN] : []),
  ];
  const storedVisible = stored ? stored.visible.filter((id) => known.has(id)) : [];
  const visible = stored ? storedVisible : fallbackVisible;
  return { order, visible: visible.length ? visible : fallbackVisible };
}

export function SearchableTable<T>({
  storageKey,
  data,
  columns,
  getRowId,
  extraSearch,
  isLoading,
  emptyMessage = 'موردی نیست',
  defaultVisibleCount = DEFAULT_VISIBLE_COUNT,
}: {
  storageKey: string;
  data: T[];
  columns: ColumnDef<T, any>[];
  getRowId: (row: T) => string;
  extraSearch?: (row: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  defaultVisibleCount?: number;
}) {
  const ids = useMemo(() => allColumnIds(columns), [columns]);
  const options = useMemo(() => pickerColumns(columns, defaultVisibleCount), [columns, defaultVisibleCount]);
  const pickerIds = useMemo(() => options.map((option) => option.value), [options]);
  const fallbackVisible = useMemo(
    () => defaultVisibleIds(pickerIds, defaultVisibleCount),
    [pickerIds, defaultVisibleCount],
  );
  const [query, setQuery] = useState('');
  const [panel, setPanel] = useState<'columns' | null>(null);
  const [layout, setLayout] = useState<StoredLayout>({ order: ids, visible: fallbackVisible });
  const idsKey = ids.join('|');

  useEffect(() => {
    setLayout(
      mergeLayout(
        readLayout(storageKey),
        ids,
        defaultVisibleIds(
          ids.filter((id) => id !== PINNED_COLUMN),
          defaultVisibleCount,
        ),
      ),
    );
  }, [storageKey, idsKey, defaultVisibleCount, ids]);

  const filtered = useMemo(
    () => data.filter((row) => matchesTableSearch(row, query, extraSearch?.(row) || '')),
    [data, extraSearch, query],
  );

  const visibility = useMemo<VisibilityState>(() => {
    const next: VisibilityState = {};
    for (const id of ids) {
      next[id] = id === PINNED_COLUMN ? true : layout.visible.includes(id);
    }
    return next;
  }, [ids, layout.visible]);

  const table = useReactTable({
    data: filtered,
    columns,
    state: {
      columnVisibility: visibility,
      columnOrder: layout.order,
    },
    getCoreRowModel: getCoreRowModel(),
    getRowId,
  });

  function confirm(order: string[], visible: string[]) {
    const next = mergeLayout({ order, visible }, ids, fallbackVisible);
    setLayout(next);
    writeLayout(storageKey, next);
    setPanel(null);
  }

  if (!data.length) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div>
      <TableFilter
        search={
          <Input
            placeholder="جستجو در همه فیلدها"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            fullWidth
          />
        }
        showColumns
        columnsContent={
          <ColumnPickerPanel
            columnOptions={options}
            visibleColumnIds={layout.visible}
            onConfirm={confirm}
            onCancel={() => setPanel(null)}
            labels={COLUMN_PICKER_LABELS}
          />
        }
        visibleColumnCount={layout.visible.length}
        panel={panel}
        onPanelChange={(next) => setPanel(next === 'columns' ? 'columns' : null)}
        labels={TABLE_FILTER_LABELS}
      />
      <BasicTable
        table={table}
        isLoading={isLoading}
        hasActiveFilters={Boolean(query.trim())}
        onClearFilters={() => setQuery('')}
        labels={{
          nothingToShow: emptyMessage,
          noResults: 'نتیجه‌ای برای این جستجو نیست',
          clearFilters: 'پاک کردن جستجو',
        }}
      />
    </div>
  );
}
