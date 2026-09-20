'use client';

import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/cn';
import { useCloseOnScroll } from '../lib/useCloseOnScroll';
import { ChevronDown, Check, X, Search } from 'lucide-react';
import { Input } from './Input';
import { FieldLabel } from './FieldLabel';
import type { SizeType } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SelectValue = string | number | boolean;

export type SelectLabels = {
  search?: string;
  remove?: string;
  removeAll?: string;
  noOptionsFound?: string;
};

const DEFAULT_SELECT_LABELS: Required<SelectLabels> = {
  search: 'Search...',
  remove: 'Remove',
  removeAll: 'Remove all',
  noOptionsFound: 'No options found',
};

interface SelectOption {
  label: string;
  value: SelectValue;
}

function toSelectOptionKey(value: SelectValue): string {
  return String(value);
}

type DropdownPosition = {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
};

const DROPDOWN_GAP = 4;
const DROPDOWN_VIEWPORT_PAD = 8;
const DROPDOWN_DEFAULT_MAX_HEIGHT = 240; // max-h-60
const DROPDOWN_MIN_HEIGHT = 120;

function useDropdownPosition(
  isOpen: boolean,
  triggerRef: React.RefObject<HTMLElement | null>
): DropdownPosition | null {
  const [position, setPosition] = useState<DropdownPosition | null>(null);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const width = rect.width;
    const spaceBelow = window.innerHeight - rect.bottom - DROPDOWN_GAP - DROPDOWN_VIEWPORT_PAD;
    const spaceAbove = rect.top - DROPDOWN_GAP - DROPDOWN_VIEWPORT_PAD;
    const openBelow =
      spaceBelow >= DROPDOWN_MIN_HEIGHT || spaceBelow >= spaceAbove;

    const available = openBelow ? spaceBelow : spaceAbove;
    const maxHeight = Math.min(
      DROPDOWN_DEFAULT_MAX_HEIGHT,
      Math.max(48, available)
    );

    let left = rect.left;
    left = Math.min(left, window.innerWidth - width - DROPDOWN_VIEWPORT_PAD);
    left = Math.max(DROPDOWN_VIEWPORT_PAD, left);

    if (openBelow) {
      setPosition({
        top: rect.bottom + DROPDOWN_GAP,
        left,
        width,
        maxHeight,
      });
    } else {
      setPosition({
        bottom: window.innerHeight - rect.top + DROPDOWN_GAP,
        left,
        width,
        maxHeight,
      });
    }
  }, [triggerRef]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }

    updatePosition();

    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, updatePosition]);

  return position;
}

function dropdownMenuStyle(position: DropdownPosition): React.CSSProperties {
  return {
    top: position.top,
    bottom: position.bottom,
    left: position.left,
    width: position.width,
    maxHeight: position.maxHeight,
  };
}

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

interface SelectProps {
  label?: React.ReactNode;
  error?: string;
  hint?: string;
  options: SelectOption[];
  value?: SelectValue | null;
  onChange?: (value: SelectValue) => void;
  placeholder?: string;
  size?: SizeType;
  disabled?: boolean;
  clearable?: boolean;
  searchable?: boolean;
  fullWidth?: boolean;
  className?: string;
  /** UI copy — pass translations from the host app (no i18n inside this package). */
  labels?: SelectLabels;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const sizeStyles: Record<SizeType, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-3.5 text-sm',
  lg: 'h-10 px-4 text-sm',
  xl: 'h-11 px-4.5 text-sm',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Select({
  label,
  error,
  hint,
  options,
  value,
  onChange,
  placeholder = 'Select...',
  size = 'md',
  disabled = false,
  clearable = false,
  searchable = false,
  fullWidth = false,
  className,
  labels,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const ignoreNextTriggerClickRef = useRef(false);
  const mounted = useMounted();
  const menuPosition = useDropdownPosition(isOpen, containerRef);
  const copy = { ...DEFAULT_SELECT_LABELS, ...labels };

  const selectedOption = options.find((opt) => String(opt.value) === String(value ?? ''));

  const filteredOptions = options.filter((opt) =>
    String(opt.label).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const closeMenu = () => {
    setIsOpen(false);
    setSearchQuery('');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      closeMenu();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useCloseOnScroll(isOpen, closeMenu, [menuRef]);

  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  useEffect(() => {
    closeMenu();
  }, [value]);

  const handleSelect = (optionValue: SelectValue) => {
    ignoreNextTriggerClickRef.current = true;
    onChange?.(optionValue);
    setIsOpen(false);
    setSearchQuery('');
    window.setTimeout(() => {
      ignoreNextTriggerClickRef.current = false;
    }, 0);
  };

  const handleOptionSelect = (
    event: React.MouseEvent<HTMLButtonElement>,
    optionValue: SelectValue
  ) => {
    event.preventDefault();
    event.stopPropagation();
    handleSelect(optionValue);
  };

  const handleTriggerClick = () => {
    if (disabled || ignoreNextTriggerClickRef.current) return;
    setIsOpen((open) => !open);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.('');
  };

  return (
    <div className={cn('flex min-w-0 w-full flex-col gap-1.5')}>
      {label && <FieldLabel disabled={disabled}>{label}</FieldLabel>}
      <div ref={containerRef} className="relative min-w-0 w-full">
        <button
          type="button"
          onClick={handleTriggerClick}
          disabled={disabled}
          className={cn(
            'w-full min-w-0 rounded-xl border bg-white text-left',
            'transition-all duration-200 ease-out',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'disabled:cursor-not-allowed disabled:opacity-50',
            sizeStyles[size],
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
              : 'border-gray-200/80 focus:border-primary/50 focus:ring-primary/20 dark:border-gray-700/50 dark:bg-white/[0.02]',
            isOpen && !error && 'border-primary/50 ring-2 ring-primary/20',
            className
          )}
        >
          <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {value != null && value !== '' && (
              <span
                role="button"
                tabIndex={-1}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={handleClear}
                className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronDown
              className={cn(
                'h-4 w-4 text-gray-400 transition-transform duration-200',
                isOpen && 'rotate-180'
              )}
            />
          </span>
          <span
            className={cn(
              'block truncate pr-10',
              selectedOption
                ? 'text-gray-900 dark:text-gray-100'
                : 'text-gray-400 dark:text-gray-500'
            )}
          >
            {selectedOption?.label || placeholder}
          </span>
        </button>

        {isOpen &&
          menuPosition &&
          mounted &&
          createPortal(
            <div
              ref={menuRef}
              style={dropdownMenuStyle(menuPosition)}
              className="fixed z-dropdown flex flex-col rounded-xl border border-gray-200/80 bg-white shadow-lg dark:border-gray-700/50 dark:bg-gray-900/95 backdrop-blur-xl overflow-hidden ui-enter"
            >
              {searchable && (
                <div className="shrink-0 p-2 border-b border-gray-100/80 dark:border-gray-800/80">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <Input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      icon={<Search className="h-3.5 w-3.5 text-gray-400" />}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={copy.search}
                    />
                  </div>
                </div>
              )}
              <div className="min-h-0 flex-1 overflow-y-auto p-1 custom-scrollbar">
                {value != null && value !== '' && (
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onChange?.('');
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    <X className="h-4 w-4" />
                    <span>{copy.remove}</span>
                  </button>
                )}
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500 text-center">
                    {copy.noOptionsFound}
                  </div>
                ) : (
                  filteredOptions.map((option) => (
                    <button
                      key={toSelectOptionKey(option.value)}
                      type="button"
                      onMouseDown={(event) => handleOptionSelect(event, option.value)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
                        String(option.value) === String(value ?? '')
                          ? 'bg-primary/10 text-primary'
                          : 'text-gray-700 hover:bg-gray-100/80 dark:text-gray-300 dark:hover:bg-white/[0.04]'
                      )}
                    >
                      <span className="truncate">{option.label}</span>
                      {String(option.value) === String(value ?? '') && (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>,
            document.body
          )}
      </div>
      {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-400 dark:text-gray-500">{hint}</p>}
    </div>
  );
}

// ─── Multi Select ─────────────────────────────────────────────────────────────

interface MultiSelectProps extends Omit<SelectProps, 'value' | 'onChange'> {
  value?: (string | number | { value?: string | number })[];
  onChange?: (value: (string | number)[]) => void;
}

function normalizeMultiSelectValues(value: MultiSelectProps['value'] = []): (string | number)[] {
  return (Array.isArray(value) ? value : [])?.map((item) => {
    if (typeof item === 'object' && item !== null && 'value' in item) {
      return item.value as string | number;
    }
    return item as string | number;
  });
}

function isMultiValueSelected(
  selectedValues: (string | number)[],
  optionValue: SelectValue
): boolean {
  return selectedValues.some((selectedValue) => String(selectedValue) === String(optionValue));
}

export function MultiSelect({
  label,
  error,
  hint,
  options,
  value = [],
  onChange,
  placeholder = 'Select...',
  size = 'md',
  disabled = false,
  clearable = false,
  searchable = false,
  fullWidth = false,
  className,
  labels,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mounted = useMounted();
  const menuPosition = useDropdownPosition(isOpen, containerRef);
  const copy = { ...DEFAULT_SELECT_LABELS, ...labels };

  const selectedValues = normalizeMultiSelectValues(value);
  const selectedOptions = options.filter((opt) => isMultiValueSelected(selectedValues, opt.value));
  const selectedLabels = selectedOptions.map((opt) => opt.label).join(', ');

  const showHoverPreview = isHovering && !isOpen && selectedOptions.length > 0;
  const hoverPosition = useDropdownPosition(showHoverPreview, containerRef);

  const filteredOptions = options.filter((opt) =>
    String(opt.label).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const closeMenu = () => {
    setIsOpen(false);
    setSearchQuery('');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      closeMenu();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useCloseOnScroll(isOpen, closeMenu, [menuRef]);

  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const handleToggle = (
    event: React.MouseEvent<HTMLButtonElement>,
    optionValue: SelectValue
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (typeof optionValue === 'boolean') return;

    const newValue = isMultiValueSelected(selectedValues, optionValue)
      ? selectedValues.filter((selectedValue) => String(selectedValue) !== String(optionValue))
      : [...selectedValues, optionValue];

    onChange?.(newValue);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.([]);
  };

  return (
    <div className={cn('flex min-w-0 w-full flex-col gap-1.5')}>
      {label && <FieldLabel disabled={disabled}>{label}</FieldLabel>}
      <div ref={containerRef} className="relative min-w-0 w-full">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          disabled={disabled}
          className={cn(
            'w-full min-w-0 rounded-xl border bg-white text-left',
            'transition-all duration-200 ease-out',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'disabled:cursor-not-allowed disabled:opacity-50',
            sizeStyles[size],
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
              : 'border-gray-200/80 focus:border-primary/50 focus:ring-primary/20 dark:border-gray-700/50 dark:bg-white/[0.02]',
            isOpen && !error && 'border-primary/50 ring-2 ring-primary/20',
            className
          )}
        >
          <span
            className={cn(
              'block truncate pr-10',
              selectedOptions.length > 0
                ? 'text-gray-900 dark:text-gray-100'
                : 'text-gray-400 dark:text-gray-500'
            )}
          >
            {selectedOptions.length > 0 ? selectedLabels : placeholder}
          </span>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {selectedValues.length > 0 && (
              <span
                onClick={handleClear}
                className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronDown
              className={cn(
                'h-4 w-4 text-gray-400 transition-transform duration-200',
                isOpen && 'rotate-180'
              )}
            />
          </span>
        </button>

        {showHoverPreview &&
          hoverPosition &&
          mounted &&
          createPortal(
            <div
              ref={tooltipRef}
              style={{
                ...dropdownMenuStyle(hoverPosition),
                minWidth: hoverPosition.width,
                maxWidth: Math.max(hoverPosition.width, 280),
              }}
              className="fixed z-dropdown flex flex-col rounded-xl border border-gray-200/80 bg-white shadow-lg dark:border-gray-700/50 dark:bg-gray-900/95 backdrop-blur-xl overflow-hidden ui-enter pointer-events-none"
            >
              <div className="flex min-h-0 flex-1 flex-wrap gap-1.5 overflow-y-auto p-2 custom-scrollbar">
                {selectedOptions.map((option) => (
                  <span
                    key={toSelectOptionKey(option.value)}
                    className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                  >
                    {option.label}
                  </span>
                ))}
              </div>
            </div>,
            document.body
          )}

        {isOpen &&
          menuPosition &&
          mounted &&
          createPortal(
            <div
              ref={menuRef}
              style={dropdownMenuStyle(menuPosition)}
              className="fixed z-dropdown flex flex-col rounded-xl border border-gray-200/80 bg-white shadow-lg dark:border-gray-700/50 dark:bg-gray-900/95 backdrop-blur-xl overflow-hidden ui-enter"
            >
              {searchable && (
                <div className="shrink-0 p-2 border-b border-gray-100/80 dark:border-gray-800/80">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <Input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      icon={<Search className="h-3.5 w-3.5 text-gray-400" />}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={copy.search}
                    />
                  </div>
                </div>
              )}
              <div className="min-h-0 flex-1 overflow-y-auto p-1 custom-scrollbar">
                {selectedValues.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    <X className="h-4 w-4" />
                    <span>{copy.removeAll}</span>
                  </button>
                )}
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500 text-center">
                    {copy.noOptionsFound}
                  </div>
                ) : (
                  filteredOptions.map((option) => {
                    const isSelected = isMultiValueSelected(selectedValues, option.value);

                    return (
                      <button
                        key={toSelectOptionKey(option.value)}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={(event) => handleToggle(event, option.value)}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                          isSelected
                            ? 'bg-primary/10 text-primary'
                            : 'text-gray-700 hover:bg-gray-100/80 dark:text-gray-300 dark:hover:bg-white/[0.04]'
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                            isSelected
                              ? 'border-primary bg-primary text-white'
                              : 'border-gray-300 dark:border-gray-600'
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </span>
                        <span className="truncate">{option.label}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>,
            document.body
          )}
      </div>
      {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-400 dark:text-gray-500">{hint}</p>}
    </div>
  );
}

// ─── Select field layout (select + optional add button) ───────────────────────

export function SelectFieldLayout({
  children,
  addButton,
}: {
  children: React.ReactNode;
  addButton?: React.ReactNode;
}) {
  return (
    <div className="flex w-full items-end gap-2">
      <div className="min-w-0 flex-1">{children}</div>
      {addButton}
    </div>
  );
}
