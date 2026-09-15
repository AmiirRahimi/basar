'use client';

import { useEffect, useState } from 'react';
import { cn } from '../lib/cn';
import { Select } from 'rizzui';
import { IconButton } from './Button';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import type { SizeType } from '../types';

const sizeOptions = [5, 10, 15, 20, 25].map((n) => ({
  value: n,
  label: String(n),
}));

export type TablePaginationProps = {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  size?: SizeType;
  className?: string;
  rowsPerPageLabel?: string;
  pageLabel?: string;
  ofLabel?: string;
};

export function TablePagination({
  currentPage,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
  size = 'sm',
  className = '',
  rowsPerPageLabel = 'Rows per page',
  pageLabel = 'Page',
  ofLabel = 'of',
}: TablePaginationProps) {
  const [isRtl, setIsRtl] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsRtl(document.documentElement.dir === 'rtl');
  }, []);

  const canGoBack = currentPage > 0;
  const canGoForward = +currentPage + 1 < +totalPages;

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-xl mt-4',
        className
      )}
    >
      <div className='flex items-center gap-2'>
        <Select
          size="sm"
          variant="flat"
          options={sizeOptions}
          className="w-16"
          value={pageSize}
          onChange={(v: any) => {
            onPageSizeChange(Number(v.value));
            onPageChange(0);
          }}
          suffixClassName="[&>svg]:size-3"
          selectClassName="font-semibold text-xs ring-0 h-7 rounded-lg border-gray-200/80 dark:border-gray-700/50"
          optionClassName="font-medium text-xs px-2 justify-center"
        />
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {rowsPerPageLabel}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {pageLabel} {currentPage + 1} {ofLabel} {totalPages}
        </span>

        {isRtl ? (
          <div className="flex gap-1">
            <IconButton
              size={size}
              variant="outline"
              aria-label="Go to next page"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={!canGoForward}
            >
              <ChevronRight className="h-4 w-4" />
            </IconButton>
            <IconButton
              size={size}
              variant="outline"
              aria-label="Go to last page"
              onClick={() => onPageChange(totalPages - 1)}
              disabled={!canGoForward}
            >
              <ChevronsRight className="h-4 w-4" />
            </IconButton>
            <IconButton
              size={size}
              variant="outline"
              aria-label="Go to first page"
              onClick={() => onPageChange(0)}
              disabled={!canGoBack}
            >
              <ChevronsLeft className="h-4 w-4" />
            </IconButton>
            <IconButton
              size={size}
              variant="outline"
              aria-label="Go to previous page"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={!canGoBack}
            >
              <ChevronLeft className="h-4 w-4" />
            </IconButton>
          </div>
        ) : (
          <div className="flex gap-1">
            <IconButton
              size={size}
              variant="outline"
              aria-label="Go to first page"
              onClick={() => onPageChange(0)}
              disabled={!canGoBack}
            >
              <ChevronsLeft className="h-4 w-4" />
            </IconButton>
            <IconButton
              size={size}
              variant="outline"
              aria-label="Go to previous page"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={!canGoBack}
            >
              <ChevronLeft className="h-4 w-4" />
            </IconButton>
            <IconButton
              size={size}
              variant="outline"
              aria-label="Go to next page"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={!canGoForward}
            >
              <ChevronRight className="h-4 w-4" />
            </IconButton>
            <IconButton
              size={size}
              variant="outline"
              aria-label="Go to last page"
              onClick={() => onPageChange(totalPages - 1)}
              disabled={!canGoForward}
            >
              <ChevronsRight className="h-4 w-4" />
            </IconButton>
          </div>
        )}
      </div>
    </div>
  );
}

export default TablePagination;
