'use client';

import React, { useState, useMemo } from 'react';
import { cn } from '../lib/cn';
import { FieldLabel } from './FieldLabel';
import {
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
  Search,
  X,
  Loader2,
} from 'lucide-react';
import { Input } from './Input';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TransferItem {
  id: string | number;
  label: string;
  subtitle?: string;
  disabled?: boolean;
}

export type TransferListLabels = {
  available?: string;
  selected?: string;
  selectAll?: string;
  search?: string;
  noItems?: string;
};

const DEFAULT_TRANSFER_LABELS: Required<TransferListLabels> = {
  available: 'Available',
  selected: 'Selected',
  selectAll: 'Select all',
  search: 'Search...',
  noItems: 'No items',
};

type TransferListSize = 'sm' | 'md' | 'lg';

interface TransferListProps {
  label?: React.ReactNode;
  error?: string;
  hint?: string;
  leftItems: TransferItem[];
  rightItems: TransferItem[];
  onChange: (rightIds: (string | number)[]) => void;
  leftTitle?: string;
  rightTitle?: string;
  size?: TransferListSize;
  disabled?: boolean;
  searchable?: boolean;
  fullWidth?: boolean;
  className?: string;
  maxItems?: number;
  loading?: boolean;
  /** UI copy — pass translations from the host app. */
  labels?: TransferListLabels;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const sizeStyles: Record<TransferListSize, string> = {
  sm: 'h-7 text-xs',
  md: 'h-8 text-xs',
  lg: 'h-9 text-sm',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function TransferList({
  label,
  error,
  hint,
  leftItems,
  rightItems,
  onChange,
  leftTitle,
  rightTitle,
  size = 'md',
  disabled = false,
  searchable = false,
  fullWidth = false,
  className,
  maxItems,
  loading = false,
  labels,
}: TransferListProps) {
  const copy = { ...DEFAULT_TRANSFER_LABELS, ...labels };
  const [selectedLeft, setSelectedLeft] = useState<Set<string | number>>(new Set());
  const [selectedRight, setSelectedRight] = useState<Set<string | number>>(new Set());
  const [leftSearch, setLeftSearch] = useState('');
  const [rightSearch, setRightSearch] = useState('');

  const rightIds = useMemo(() => new Set(rightItems.map((i) => i.id)), [rightItems]);

  const availableLeftItems = useMemo(
    () => leftItems.filter((item) => !rightIds.has(item.id)),
    [leftItems, rightIds]
  );

  const filteredLeft = useMemo(() => {
    if (!leftSearch) return availableLeftItems;
    const q = leftSearch.toLowerCase();
    return availableLeftItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q))
    );
  }, [availableLeftItems, leftSearch]);

  const filteredRight = useMemo(() => {
    if (!rightSearch) return rightItems;
    const q = rightSearch.toLowerCase();
    return rightItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q))
    );
  }, [rightItems, rightSearch]);

  const toggleLeft = (id: string | number) => {
    setSelectedLeft((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleRight = (id: string | number) => {
    setSelectedRight((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllLeft = () => {
    const selectable = filteredLeft.filter((i) => !i.disabled);
    setSelectedLeft(new Set(selectable.map((i) => i.id)));
  };

  const selectAllRight = () => {
    const selectable = filteredRight.filter((i) => !i.disabled);
    setSelectedRight(new Set(selectable.map((i) => i.id)));
  };

  const clearSelection = (side: 'left' | 'right') => {
    if (side === 'left') setSelectedLeft(new Set());
    else setSelectedRight(new Set());
  };

  const moveLeft = () => {
    if (selectedLeft.size === 0) return;
    const newRight = [...rightItems, ...availableLeftItems.filter((i) => selectedLeft.has(i.id))];
    if (maxItems && newRight.length > maxItems) return;
    onChange(newRight.map((i) => i.id));
    setSelectedLeft(new Set());
  };

  const moveRight = () => {
    if (selectedRight.size === 0) return;
    const newRight = rightItems.filter((i) => !selectedRight.has(i.id));
    onChange(newRight.map((i) => i.id));
    setSelectedRight(new Set());
  };

  const moveAllLeft = () => {
    const toAdd = availableLeftItems.filter((i) => !i.disabled);
    if (maxItems && rightItems.length + toAdd.length > maxItems) return;
    onChange([...rightItems.map((i) => i.id), ...toAdd.map((i) => i.id)]);
    setSelectedLeft(new Set());
  };

  const moveAllRight = () => {
    onChange([]);
    setSelectedRight(new Set());
  };

  const renderPanel = (
    side: 'left' | 'right',
    items: TransferItem[],
    selected: Set<string | number>,
    toggle: (id: string | number) => void,
    search: string,
    setSearch: (v: string) => void,
    selectAll: () => void,
    clearSel: () => void
  ) => {
    const isLeft = side === 'left';
    const title = isLeft ? leftTitle || copy.available : rightTitle || copy.selected;
    const count = items.filter((i) => selected.has(i.id)).length;

    return (
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-gray-200/80 bg-white dark:border-gray-700/60 dark:bg-gray-900">
        {/* Panel header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100/80 px-3 py-2 dark:border-gray-800">
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            {title}
            <span className="ml-1.5 text-gray-400 dark:text-gray-500">({items.length})</span>
          </span>
          <div className="flex items-center gap-1">
            {count > 0 && (
              <button
                type="button"
                onClick={clearSel}
                className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            <button
              type="button"
              onClick={selectAll}
              className="rounded-md px-1.5 py-0.5 text-[10px] font-medium text-primary transition-colors hover:bg-primary/10"
            >
              {copy.selectAll}
            </button>
          </div>
        </div>

        {/* Search */}
        {searchable && (
          <div className="shrink-0 border-b border-gray-100/80 px-2 py-1.5 dark:border-gray-800/80">
            <div className="relative">
              <Input
                type="text"
                value={search}
                icon={
                  <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
                }
                iconPosition="left"
                onChange={(e) => setSearch(e.target.value)}
                placeholder={copy.search}
              />
            </div>
          </div>
        )}

        {/* Items list */}
        <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar max-h-[200px] p-1.5 min-h-[200px]">
          {loading ? (
            <div className="flex h-full items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg bg-gray-50/80 py-6 dark:bg-gray-800/50">
              <p className="text-xs text-gray-400 dark:text-gray-500">{copy.noItems}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {items.map((item) => {
                const isSelected = selected.has(item.id);
                const isDisabled = item.disabled || disabled;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => toggle(item.id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors',
                      isDisabled && 'cursor-not-allowed opacity-40',
                      isSelected
                        ? 'bg-primary/10 ring-1 ring-primary/30'
                        : 'hover:bg-gray-100/80 dark:hover:bg-white/[0.04]'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                        isSelected
                          ? 'border-primary bg-primary text-white'
                          : 'border-gray-300 dark:border-gray-600'
                      )}
                    >
                      {isSelected && (
                        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M10 3L4.5 8.5L2 6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span
                        className={cn(
                          'block truncate text-xs font-medium',
                          isSelected ? 'text-primary' : 'text-gray-700 dark:text-gray-300'
                        )}
                      >
                        {item.label}
                      </span>
                      {item.subtitle && (
                        <span className="block truncate text-[10px] text-gray-400 dark:text-gray-500">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
      {label && <FieldLabel disabled={disabled}>{label}</FieldLabel>}

      <div
        className={cn(
          'flex flex-col items-center gap-2 sm:flex-row',
          disabled && 'pointer-events-none opacity-50',
          className
        )}
      >
        {/* Left panel */}
        {renderPanel(
          'left',
          filteredLeft,
          selectedLeft,
          toggleLeft,
          leftSearch,
          setLeftSearch,
          selectAllLeft,
          () => clearSelection('left')
        )}

        {/* Arrow buttons */}
        <div className="flex shrink-0 flex-row gap-1 sm:flex-col">
          <button
            type="button"
            onClick={moveLeft}
            disabled={disabled || selectedLeft.size === 0}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg border transition-all',
              selectedLeft.size > 0
                ? 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20'
                : 'border-gray-200/80 bg-gray-50 text-gray-400 dark:border-gray-700/60 dark:bg-gray-800 dark:text-gray-500'
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={moveAllLeft}
            disabled={disabled}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200/80 bg-gray-50 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600 dark:border-gray-700/60 dark:bg-gray-800 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={moveRight}
            disabled={disabled || selectedRight.size === 0}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg border transition-all',
              selectedRight.size > 0
                ? 'border-red-300 bg-red-50 text-red-500 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30'
                : 'border-gray-200/80 bg-gray-50 text-gray-400 dark:border-gray-700/60 dark:bg-gray-800 dark:text-gray-500'
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={moveAllRight}
            disabled={disabled}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200/80 bg-gray-50 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600 dark:border-gray-700/60 dark:bg-gray-800 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>

        {/* Right panel */}
        {renderPanel(
          'right',
          filteredRight,
          selectedRight,
          toggleRight,
          rightSearch,
          setRightSearch,
          selectAllRight,
          () => clearSelection('right')
        )}
      </div>

      {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-400 dark:text-gray-500">{hint}</p>}
    </div>
  );
}
