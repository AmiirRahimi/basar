'use client';

import { useState, useRef, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { ChevronRight, Search } from 'lucide-react';
import { cn } from '../lib/cn';
import { Input } from './Input';

export type SuggestionItem = {
  label: string;
  value: string;
};

export type SearchSuggestionsProps = {
  data: any[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onSuggestionClick?: (item: SuggestionItem, rowData: any) => void;
  fields?: { name: string; label: string; exclude?: { list?: boolean } | boolean; reference?: string }[];
  referencedData?: Record<string, { value: any; label: string }[]>;
  idField?: string;
  maxResults?: number;
  placeholder?: string;
  className?: string;
  dropdownClassName?: string;
  renderItem?: (matchedFields: SuggestionItem[], rowData: any) => ReactNode;
};

function resolveReferenceLabel(
  value: any,
  fieldName: string,
  referencedData?: Record<string, { value: any; label: string }[]>
): string | null {
  if (!referencedData?.[fieldName]) return null;
  const entry = referencedData[fieldName].find((i) => String(i.value) === String(value));
  return entry?.label ?? null;
}

function resolveFieldValue(
  row: any,
  field: { name: string; reference?: string },
  referencedData?: Record<string, { value: any; label: string }[]>
): string {
  const rawValue = row[field.name];
  if (rawValue == null) return '';

  if (field.reference && referencedData?.[field.name]) {
    if (typeof rawValue === 'object' && rawValue.id != null) {
      const label = resolveReferenceLabel(rawValue.id, field.name, referencedData);
      return label || String(rawValue.id);
    }
    const label = resolveReferenceLabel(rawValue, field.name, referencedData);
    if (label) return label;
  }

  if (Array.isArray(rawValue)) return rawValue.join(', ');
  if (typeof rawValue === 'object') return JSON.stringify(rawValue);
  return String(rawValue);
}

export default function SearchSuggestions({
  data = [],
  searchTerm,
  onSearchChange,
  onSuggestionClick,
  fields,
  referencedData,
  idField = 'id',
  maxResults = 8,
  placeholder = 'Search...',
  className,
  dropdownClassName,
  renderItem,
}: SearchSuggestionsProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const searchableFields = useMemo(() => {
    if (fields) return fields.filter((f) => !(typeof f.exclude === 'object' ? f.exclude?.list : f.exclude));
    return null;
  }, [fields]);

  const suggestions = useMemo(() => {
    if (!searchTerm || !data.length) return [];
    const lower = searchTerm.toLowerCase();
    const matches: { matchedFields: SuggestionItem[]; row: any }[] = [];

    for (const row of data) {
      const matchedFields: SuggestionItem[] = [];

      if (searchableFields) {
        for (const field of searchableFields) {
          const displayValue = resolveFieldValue(row, field, referencedData);
          if (!displayValue) continue;

          if (displayValue.toLowerCase().includes(lower)) {
            matchedFields.push({ label: field.label, value: displayValue });
          }
        }
      } else {
        for (const [key, value] of Object.entries(row)) {
          if (key === idField || value == null) continue;
          const str = Array.isArray(value)
            ? value.join(', ')
            : typeof value === 'object'
              ? JSON.stringify(value)
              : String(value);
          if (str.toLowerCase().includes(lower)) {
            const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
            matchedFields.push({ label, value: str });
          }
        }
      }

      if (matchedFields.length > 0) {
        matches.push({ matchedFields, row });
      }
      if (matches.length >= maxResults) break;
    }
    return matches;
  }, [data, searchTerm, searchableFields, referencedData, idField, maxResults]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = useCallback(
    (value: string) => {
      onSearchChange(value);
      setShowSuggestions(value.length > 0);
    },
    [onSearchChange]
  );

  const handleSuggestionClick = useCallback(
    (matchedFields: SuggestionItem[], rowData: any) => {
      if (matchedFields.length > 0) {
        onSearchChange(matchedFields[0].value);
        setShowSuggestions(false);
        onSuggestionClick?.(matchedFields[0], rowData);
      }
    },
    [onSearchChange, onSuggestionClick]
  );

  return (
    <div className={cn('relative', className)} ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => searchTerm.length > 0 && setShowSuggestions(true)}
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          className={cn(
            'absolute top-full left-0 z-50 mt-1 w-full max-h-[320px] overflow-y-auto custom-scrollbar rounded-xl border border-gray-200/80 bg-white shadow-lg dark:bg-gray-900 dark:border-gray-700/50 ui-enter-down',
            dropdownClassName
          )}
        >
          {suggestions.map((match, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSuggestionClick(match.matchedFields, match.row)}
              className="w-full px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-b-0"
            >
              {renderItem ? (
                renderItem(match.matchedFields, match.row)
              ) : (
                <div className="flex flex-wrap items-center gap-1">
                  {match.matchedFields.map((field, fIdx) => (
                    <span key={fIdx} className="inline-flex items-center gap-1">
                      {fIdx > 0 && (
                        <ChevronRight className="h-3 w-3 text-gray-300 dark:text-gray-600" />
                      )}
                      <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                        {field.label}
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {field.value.length > 40 ? field.value.slice(0, 40) + '…' : field.value}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
