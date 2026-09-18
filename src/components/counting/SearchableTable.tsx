'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { BasicTable, Checkbox, ColumnPickerPanel, EmptyState, Input, Popover, PopoverContent, PopoverTrigger, TableFilter, cn } from '@/ui';
import type { ColumnOption } from '@/ui';
import { ListFilter } from 'lucide-react';
import { listResource } from '@/actions/crud';
import { redirectIfUnauthorized } from '@/lib/session-client';
import { encodeListQuery, matchesTableSearch } from '@/lib/table-search';

const PINNED_COLUMN = 'actions';
const DEFAULT_VISIBLE_COUNT = 6;
const STORAGE_PREFIX = 'basar.table.';
const SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_PAGE_SIZE = 200;

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

function searchPlaceholder(options: ColumnOption[], selected: string[] | null) {
  if (!selected || selected.length === options.length) return 'جستجو در همه فیلدها';
  if (!selected.length) return 'فیلدی برای جستجو انتخاب نشده';
  const labels = selected
    .map((id) => options.find((option) => option.value === id)?.label || id)
    .filter(Boolean);
  if (labels.length === 1) return `جستجو در ${labels[0]}`;
  if (labels.length === 2) return `جستجو در ${labels.join(' و ')}`;
  return `جستجو در ${labels.slice(0, 2).join('، ')} و ${labels.length - 2} فیلد دیگر`;
}

function SearchFieldPicker({
  options,
  selected,
  onChange,
}: {
  options: ColumnOption[];
  selected: string[] | null;
  onChange: (next: string[] | null) => void;
}) {
  const ids = options.map((option) => option.value);
  const searchingAll = !selected || selected.length === ids.length;
  const current = searchingAll ? ids : selected || [];
  const count = searchingAll ? ids.length : current.length;

  function toggle(id: string) {
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    onChange(next.length === ids.length ? null : next);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            '-ms-px inline-flex h-9 shrink-0 items-center gap-1.5 rounded-s-none rounded-e-xl border px-3 text-sm font-medium shadow-sm transition-colors',
            searchingAll
              ? 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
              : 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/15',
          )}
          aria-label="انتخاب فیلدهای جستجو"
        >
          <ListFilter className="size-3.5" />
          فیلدها
          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-gray-100 px-1 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {count}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-64 p-3" dir="rtl">
        <p className="mb-2 text-sm font-medium text-gray-800">جستجو در کدام فیلدها؟</p>
        <p className="mb-3 text-xs text-gray-500">پیش‌فرض همه فیلدهاست. برداشتن تیک همه، همه فیلدها را از انتخاب خارج می‌کند.</p>
        <div className="mb-2">
          <Checkbox
            checked={searchingAll}
            onChange={() => onChange(searchingAll ? [] : null)}
            label="همه فیلدها"
          />
        </div>
        <div className="max-h-64 space-y-1 overflow-auto border-t border-gray-100 pt-2 dark:border-gray-800">
          {options.map((option) => (
            <Checkbox
              key={option.value}
              checked={current.includes(option.value)}
              onChange={() => toggle(option.value)}
              label={option.label}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
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
  resource,
  pageSize = DEFAULT_PAGE_SIZE,
}: {
  storageKey: string;
  data: T[];
  columns: ColumnDef<T, any>[];
  getRowId: (row: T) => string;
  extraSearch?: (row: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  defaultVisibleCount?: number;
  resource?: string;
  pageSize?: number;
}) {
  const ids = useMemo(() => allColumnIds(columns), [columns]);
  const options = useMemo(() => pickerColumns(columns, defaultVisibleCount), [columns, defaultVisibleCount]);
  const pickerIds = useMemo(() => options.map((option) => option.value), [options]);
  const fallbackVisible = useMemo(
    () => defaultVisibleIds(pickerIds, defaultVisibleCount),
    [pickerIds, defaultVisibleCount],
  );
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchFields, setSearchFields] = useState<string[] | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [serverRows, setServerRows] = useState<T[]>(data);
  const [fetching, setFetching] = useState(false);
  const [panel, setPanel] = useState<'columns' | null>(null);
  const [layout, setLayout] = useState<StoredLayout>({ order: ids, visible: fallbackVisible });
  const idsKey = ids.join('|');
  const serverMode = Boolean(resource);
  const searchingAll = !searchFields || searchFields.length === pickerIds.length;
  const activeSearchFields = searchingAll ? undefined : searchFields || [];
  const searchFieldsKey = searchingAll ? '*' : activeSearchFields.join(',');

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

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!resource) {
      setServerRows(data);
      return;
    }
    const q = debouncedQuery.trim();
    const sort = sorting[0];
    if (!q && !sort) {
      setServerRows(data);
      setFetching(false);
      return;
    }
    let cancelled = false;
    setFetching(true);
    const extra = encodeListQuery({
      q,
      sort: sort?.id,
      dir: sort?.desc ? 'desc' : 'asc',
      fields: q ? activeSearchFields : undefined,
    });
    listResource(resource, 1, pageSize, extra)
      .then((res) => {
        if (cancelled) return;
        if (redirectIfUnauthorized(res)) return;
        if (res.ok && Array.isArray(res.data)) setServerRows(res.data as T[]);
        setFetching(false);
      })
      .catch(() => {
        if (!cancelled) setFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resource, debouncedQuery, sorting, data, pageSize, searchFieldsKey]);

  const tableData = useMemo(() => {
    if (serverMode) return serverRows;
    return data.filter((row) =>
      matchesTableSearch(row, query, extraSearch?.(row) || '', activeSearchFields, resource),
    );
  }, [serverMode, serverRows, data, extraSearch, query, activeSearchFields, resource]);

  const visibility = useMemo<VisibilityState>(() => {
    const next: VisibilityState = {};
    for (const id of ids) {
      next[id] = id === PINNED_COLUMN ? true : layout.visible.includes(id);
    }
    return next;
  }, [ids, layout.visible]);

  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      columnVisibility: visibility,
      columnOrder: layout.order,
      sorting,
    },
    onSortingChange: setSorting,
    manualSorting: serverMode,
    enableSortingRemoval: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: serverMode ? undefined : getSortedRowModel(),
    getRowId,
  });

  function confirm(order: string[], visible: string[]) {
    const next = mergeLayout({ order, visible }, ids, fallbackVisible);
    setLayout(next);
    writeLayout(storageKey, next);
    setPanel(null);
  }

  function clearQuery() {
    setQuery('');
    setDebouncedQuery('');
  }

  const hasActiveFilters = Boolean(query.trim()) || Boolean(sorting.length);
  const showBareEmpty = !fetching && !isLoading && !tableData.length && !hasActiveFilters;

  if (showBareEmpty) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div>
      <TableFilter
        search={
          <div className="flex w-full min-w-0 items-stretch">
            <div className="min-w-0 flex-1">
              <Input
                placeholder={searchPlaceholder(options, searchFields)}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                fullWidth
                className="rounded-e-none"
              />
            </div>
            <SearchFieldPicker options={options} selected={searchFields} onChange={setSearchFields} />
          </div>
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
        isLoading={Boolean(isLoading || fetching)}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearQuery}
        labels={{
          nothingToShow: emptyMessage,
          noResults: 'نتیجه‌ای برای این جستجو نیست',
          clearFilters: 'پاک کردن جستجو',
        }}
      />
    </div>
  );
}
