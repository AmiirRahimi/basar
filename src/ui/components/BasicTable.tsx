'use client';

import type { ReactNode } from 'react';
import { Box, Table, Empty } from 'rizzui';
import { flexRender, type Table as TanstackTable, type Row } from '@tanstack/react-table';
import { PiArrowsDownUp } from 'react-icons/pi';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { ClipLoader } from 'react-spinners';
import { cn } from '../lib/cn';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { TableOverflowText } from './TableOverflowText';

function isCompactColumn(columnId: string, header: unknown) {
  if (columnId === 'actions' || columnId === 'select') return true;
  return header === 'عملیات';
}

export type BasicTableLabels = {
  noResults?: string;
  nothingToShow?: string;
  clearFilters?: string;
};

export type BasicTableProps<TData = any> = {
  table: TanstackTable<TData> | null | undefined;
  stickyHeader?: boolean;
  onRowClick?: (row: Row<TData>) => void;
  selectedRowId?: string | number | null;
  isLoading?: boolean;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  emptyMessage?: ReactNode;
  labels?: BasicTableLabels;
  loaderColor?: string;
  /**
   * Sorting behavior controls
   * - disable: makes headers non-interactive (no toggle sort on click)
   * - remove: hides sort affordances (icons) entirely
   */
  sorting?: {
    disable?: boolean;
    remove?: boolean;
  };
};

const DEFAULT_LABELS: Required<BasicTableLabels> = {
  noResults: 'No results found',
  nothingToShow: 'No items to display',
  clearFilters: 'Clear filters',
};

export function BasicTable<TData = any>({
  table,
  stickyHeader = false,
  onRowClick,
  selectedRowId,
  isLoading = false,
  hasActiveFilters = false,
  onClearFilters,
  emptyMessage,
  labels,
  loaderColor = 'rgb(var(--primary-default))',
  sorting,
}: BasicTableProps<TData>) {
  const copy = { ...DEFAULT_LABELS, ...labels };

  if (!table) return null;

  const rows = table.getRowModel().rows;
  const showEmpty = !isLoading && !rows.length;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/70 dark:bg-gray-900/70">
          <ClipLoader color={loaderColor} size={40} />
        </div>
      )}

      <Box className="custom-scrollbar w-full overflow-x-auto">
        <Table className="w-full table-fixed divide-y divide-gray-100 dark:divide-gray-800">
          <Table.Header
            className={cn(
              stickyHeader ? 'sticky top-0 z-10' : '',
              'bg-gray-50 dark:bg-gray-800/60'
            )}
          >
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Row key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Table.Head
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className="overflow-hidden px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 ltr:text-left rtl:text-right"
                  >
                    <div
                      className={cn(
                        'flex items-center gap-1.5',
                        header.column.getCanSort() &&
                          !sorting?.disable &&
                          !sorting?.remove &&
                          'cursor-pointer select-none transition-colors hover:text-gray-700 dark:hover:text-gray-200'
                      )}
                      onClick={
                        header.column.getCanSort() && !sorting?.disable && !sorting?.remove
                          ? header.column.getToggleSortingHandler()
                          : undefined
                      }
                    >
                      {header.isPlaceholder ? null : (
                        <>
                          <TableOverflowText className="font-medium">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </TableOverflowText>
                          {header.column.getCanSort() && !sorting?.remove && (
                            <div className="flex items-center">
                              {header.column.getIsSorted() === 'asc' ? (
                                <ArrowUp className="h-3.5 w-3.5 text-primary" />
                              ) : header.column.getIsSorted() === 'desc' ? (
                                <ArrowDown className="h-3.5 w-3.5 text-primary" />
                              ) : (
                                <PiArrowsDownUp
                                  size={13}
                                  className="text-gray-400 dark:text-gray-500"
                                />
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </Table.Head>
                ))}
              </Table.Row>
            ))}
          </Table.Header>

          <Table.Body className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((row) => {
              const isSelected = selectedRowId != null && String(selectedRowId) === String(row.id);

              return (
                <Table.Row
                  key={row.id}
                  data-row-id={row.id}
                  onClick={(event) => {
                    const target = event.target as HTMLElement;
                    if (
                      target.closest(
                        'a, button, input, label, [role="button"], [data-stop-row-click="true"]'
                      )
                    ) {
                      return;
                    }
                    onRowClick?.(row);
                  }}
                  className={cn(
                    'transition-colors',
                    'hover:bg-gray-50 dark:hover:bg-white/[0.03]',
                    onRowClick && 'cursor-pointer',
                    isSelected &&
                      'bg-primary/5 shadow-[inset_3px_0_0_0_rgb(var(--primary-default)/0.45)] hover:bg-primary/8 dark:bg-primary/[0.04] dark:hover:bg-primary/[0.06]'
                  )}
                >
                  {row.getVisibleCells().map((cell) => {
                    const compact = isCompactColumn(cell.column.id, cell.column.columnDef.header);
                    return (
                    <Table.Cell
                      key={cell.id}
                      className={cn(
                        'px-4 py-3 text-sm text-gray-600 dark:text-gray-300',
                        compact ? 'whitespace-nowrap' : 'max-w-0 overflow-hidden',
                      )}
                    >
                      {compact ? (
                        flexRender(cell.column.columnDef.cell, cell.getContext())
                      ) : (
                        <TableOverflowText>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableOverflowText>
                      )}
                    </Table.Cell>
                    );
                  })}
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table>
      </Box>

      {showEmpty && (
        <div className="py-10">
          <EmptyState
            icon={<Empty />}
            message={
              emptyMessage || (hasActiveFilters ? copy.noResults : copy.nothingToShow)
            }
          />
          {hasActiveFilters && onClearFilters && (
            <div className="mt-4 flex justify-center">
              <Button size="sm" variant="outline" onClick={onClearFilters}>
                {copy.clearFilters}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BasicTable;
