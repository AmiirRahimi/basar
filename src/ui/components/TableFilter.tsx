'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Columns, Filter as FilterIcon, Search, X } from '../icons';
import { cn } from '../lib/cn';

export type TableFilterPanel = 'filters' | 'columns' | null;

export type TableFilterChip = {
  id: string;
  label: ReactNode;
  value?: ReactNode;
};

export type TableFilterLabels = {
  filters?: string;
  columns?: string;
  active?: string;
  clearAll?: string;
  clearFilter?: string;
};

export type TableFilterProps = {
  search?: ReactNode;
  filtersContent?: ReactNode;
  columnsContent?: ReactNode;
  showColumns?: boolean;
  filterCount?: number;
  visibleColumnCount?: number;
  chips?: TableFilterChip[];
  onRemoveChip?: (id: string) => void;
  onClearAll?: () => void;
  labels?: TableFilterLabels;
  defaultPanel?: TableFilterPanel;
  panel?: TableFilterPanel;
  onPanelChange?: (panel: TableFilterPanel) => void;
  className?: string;
};

const DEFAULT_LABELS: Required<TableFilterLabels> = {
  filters: 'Filters',
  columns: 'Columns',
  active: 'Active',
  clearAll: 'Clear all',
  clearFilter: 'Clear',
};

export function TableFilter({
  search,
  filtersContent,
  columnsContent,
  showColumns = false,
  filterCount = 0,
  visibleColumnCount = 0,
  chips = [],
  onRemoveChip,
  onClearAll,
  labels,
  defaultPanel = null,
  panel: controlledPanel,
  onPanelChange,
  className,
}: TableFilterProps) {
  const copy = { ...DEFAULT_LABELS, ...labels };
  const isControlled = controlledPanel !== undefined;
  const [internalPanel, setInternalPanel] = useState<TableFilterPanel>(
    defaultPanel ?? (filterCount > 0 ? 'filters' : null)
  );
  const activePanel = isControlled ? controlledPanel : internalPanel;

  const setPanel = useCallback(
    (next: TableFilterPanel | ((prev: TableFilterPanel) => TableFilterPanel)) => {
      const resolved = typeof next === 'function' ? next(activePanel) : next;
      if (!isControlled) setInternalPanel(resolved);
      onPanelChange?.(resolved);
    },
    [activePanel, isControlled, onPanelChange]
  );

  useEffect(() => {
    if (filterCount > 0 && !isControlled) {
      setInternalPanel((prev) => prev ?? 'filters');
    }
  }, [filterCount, isControlled]);

  const togglePanel = (panel: Exclude<TableFilterPanel, null>) => {
    setPanel((prev) => (prev === panel ? null : panel));
  };

  const toolbarButtonClass = (active: boolean) =>
    cn(
      'inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium shadow-sm backdrop-blur-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
      active
        ? 'border-primary/40 bg-primary/10 text-primary shadow-primary/10 hover:border-primary/50 hover:bg-primary/15'
        : 'border-gray-200/80 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-100 hover:text-gray-800 dark:border-gray-700/50 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-100'
    );

  return (
    <div className={cn('mb-4 space-y-3 overflow-visible', className)}>
      <div className="overflow-visible bg-white/80 pb-4 shadow-sm backdrop-blur-md dark:border-gray-700/50 dark:bg-gray-900 dark:shadow-none">
        <div className="flex flex-wrap items-center gap-2 overflow-visible px-1 pt-1 sm:px-0 sm:pt-0">
          {search ? (
            <div className="relative z-20 min-w-0 w-full flex-1 overflow-visible sm:min-w-[12rem]">{search}</div>
          ) : null}

          <div className={cn('flex items-center gap-2', search && 'ms-auto')}>
            {filtersContent ? (
              <button
                type="button"
                onClick={() => togglePanel('filters')}
                className={toolbarButtonClass(activePanel === 'filters' || filterCount > 0)}
              >
                <FilterIcon className="h-3.5 w-3.5" />
                {copy.filters}
                {filterCount > 0 ? (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white">
                    {filterCount}
                  </span>
                ) : (
                  <Search className="h-3.5 w-3.5 opacity-50" />
                )}
              </button>
            ) : null}

            {showColumns && columnsContent ? (
              <button
                type="button"
                onClick={() => togglePanel('columns')}
                className={toolbarButtonClass(activePanel === 'columns')}
              >
                <Columns className="h-3.5 w-3.5" />
                {copy.columns}
                {visibleColumnCount > 0 ? (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-gray-100 px-1 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {visibleColumnCount}
                  </span>
                ) : null}
              </button>
            ) : null}
          </div>
        </div>

        <AnimatePresence initial={false} mode="wait">
          {activePanel ? (
            <motion.div
              key={activePanel}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="mt-2 rounded-xl border border-gray-200/70 bg-gray-50/80 p-3 dark:border-gray-700/50 dark:bg-gray-800/40 sm:p-4">
                {activePanel === 'filters' ? filtersContent : columnsContent}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false}>
        {chips.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex flex-wrap items-center gap-2"
          >
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {copy.active}
            </span>
            {chips.map((chip) => (
              <span
                key={chip.id}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 py-1 pe-1 ps-2.5 text-xs font-medium text-primary dark:border-primary/20 dark:bg-primary/[0.08]"
              >
                <span className="truncate">{chip.label}</span>
                {chip.value != null ? (
                  <>
                    <span className="text-primary/45">·</span>
                    <span className="truncate font-semibold">{chip.value}</span>
                  </>
                ) : null}
                {onRemoveChip ? (
                  <button
                    type="button"
                    onClick={() => onRemoveChip(chip.id)}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-primary/70 transition-colors hover:bg-primary/15 hover:text-primary"
                    aria-label={`${copy.clearFilter} ${chip.id}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : null}
              </span>
            ))}
            {onClearAll ? (
              <button
                type="button"
                onClick={onClearAll}
                className="text-xs font-medium text-gray-400 transition-colors hover:text-red-500 dark:hover:text-red-400"
              >
                {copy.clearAll}
              </button>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default TableFilter;
