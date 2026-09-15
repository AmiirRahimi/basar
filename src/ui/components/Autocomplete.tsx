'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Search } from 'lucide-react';
import { cn } from '../lib/cn';
import { useCloseOnScroll } from '../lib/useCloseOnScroll';
import { Input, type InputSize } from './Input';
import { FieldLabel } from './FieldLabel';

export type AutocompleteOption = string | { label: string; value: string };

export type AutocompleteProps = {
  label?: React.ReactNode;
  value?: string;
  onChange?: (value: string) => void;
  options?: AutocompleteOption[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  size?: InputSize;
  className?: string;
  emptyMessage?: string;
};

function optionLabel(option: AutocompleteOption): string {
  return typeof option === 'string' ? option : option.label;
}

function optionValue(option: AutocompleteOption): string {
  return typeof option === 'string' ? option : option.value;
}

export function Autocomplete({
  label,
  value = '',
  onChange,
  options = [],
  placeholder = 'Search...',
  disabled,
  error,
  size = 'md',
  className,
  emptyMessage = 'No options found',
}: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!value.trim()) return options;
    const lower = value.toLowerCase();
    return options.filter((option) =>
      optionLabel(option).toLowerCase().includes(lower)
    );
  }, [options, value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useCloseOnScroll(isOpen, () => setIsOpen(false), [containerRef]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    onChange?.(next);
    setIsOpen(true);
  };

  const handleSelect = (option: AutocompleteOption) => {
    onChange?.(optionValue(option));
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {label ? <FieldLabel disabled={disabled}>{label}</FieldLabel> : null}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
        <Input
          size={size}
          value={value}
          onChange={handleInputChange}
          onFocus={() => value.trim().length > 0 && setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          disabled={disabled}
          placeholder={placeholder}
          className={cn('pl-9', error && 'border-red-400 focus:border-red-500')}
        />
      </div>
      {error ? (
        <p className="mt-1 text-xs text-red-500 dark:text-red-400">{error}</p>
      ) : null}

      {isOpen && value.trim().length > 0 && (
        <div
          className={cn(
            'absolute top-full left-0 z-50 mt-1 w-full max-h-[260px] overflow-y-auto',
            'rounded-xl border border-gray-200/80 bg-white shadow-lg',
            'dark:border-gray-700/50 dark:bg-gray-900'
          )}
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              {emptyMessage}
            </div>
          ) : (
            filtered.map((option, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelect(option)}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm',
                  'text-gray-700 dark:text-gray-300',
                  'hover:bg-gray-50 dark:hover:bg-gray-800',
                  'border-b border-gray-100 dark:border-gray-800 last:border-b-0'
                )}
              >
                {optionLabel(option)}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default Autocomplete;
