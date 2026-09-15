'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { Input } from './Input';
import { Button, IconButton } from './Button';
import { FieldLabel } from './FieldLabel';
import { Autocomplete } from './Autocomplete';

type Row = { _id: string; key: string; value: any };

let counter = 0;
const nextId = () => `kv_${++counter}_${Date.now()}`;

function decodeBase64Value(value: unknown): any {
  if (typeof value !== 'string' || value === '') return value;

  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return value;
  }
}

function encodeBase64Value(value: unknown): string {
  const text = String(value ?? '');

  try {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    bytes.forEach(byte => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  } catch {
    return text;
  }
}

// --- Parse encoded string: "key1=BASE64(value1),key2=BASE64(value2)" ---
function parseEncodedPairs(str: string): Row[] {
  if (!str || typeof str !== 'string') return [];
  // If it looks like JSON (starts with {), fallback to old JSON parsing
  if (str.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(str);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return Object.entries(parsed).map(([k, v]) => ({
          _id: nextId(),
          key: k,
          value: decodeBase64Value(v),
        }));
      }
    } catch {
      // not JSON, continue
    }
  }

  const pairs = str.split(',').filter(s => s.includes('='));
  return pairs
    .map(pair => {
      const separatorIndex = pair.indexOf('=');
      const key = pair.slice(0, separatorIndex);
      const encoded = pair.slice(separatorIndex + 1);
      return { _id: nextId(), key: key.trim(), value: decodeBase64Value(encoded) };
    })
    .filter(row => row.key !== '');
}

// --- Encode rows to "key1=BASE64(value1),key2=BASE64(value2)" ---
function rowsToEncodedString(rows: Row[]): string {
  return rows
    .filter(r => r.key.trim() !== '')
    .map(r => {
      const encoded = encodeBase64Value(r.value);
      return `${r.key}=${encoded}`;
    })
    .join(',');
}

export type KeyValueRepeaterOption = string | { label: string; value: string };

export type KeyValueRepeaterProps = {
  label?: ReactNode;
  value?: Record<string, any> | string;
  onChange?: (value: string) => void;
  options?: KeyValueRepeaterOption[];
  disabled?: boolean;
  addLabel?: string;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  emptyLabel?: ReactNode;
  className?: string;
};

export function KeyValueRepeater({
  label,
  value,
  onChange,
  options,
  disabled,
  addLabel = 'Add row',
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  emptyLabel = 'Click here to add key-value pairs',
  className,
}: KeyValueRepeaterProps) {
  const [rows, setRows] = useState<Row[]>(() => {
    if (typeof value === 'string') {
      return parseEncodedPairs(value);
    }
    if (value && typeof value === 'object') {
      return Object.entries(value).map(([k, v]) => ({
        _id: nextId(),
        key: k,
        value: decodeBase64Value(v),
      }));
    }
    return [];
  });

  const lastSentValue = useRef<string | undefined>(
    typeof value === 'string' ? value : value ? JSON.stringify(value) : undefined
  );

  // Sync rows when external `value` changes
  useEffect(() => {
    const valueStr =
      typeof value === 'string' ? value : value ? JSON.stringify(value) : undefined;
    if (valueStr === lastSentValue.current) return;
    lastSentValue.current = valueStr;
    if (typeof value === 'string') {
      setRows(parseEncodedPairs(value));
    } else if (value && typeof value === 'object') {
      setRows(
        Object.entries(value).map(([k, v]) => ({
          _id: nextId(),
          key: k,
          value: decodeBase64Value(v),
        }))
      );
    } else {
      setRows([]);
    }
  }, [value]);

  // Sync changes to parent
  const sync = (next: Row[]) => {
    setRows(next);
    const nextStr = rowsToEncodedString(next);
    lastSentValue.current = nextStr;
    onChange?.(nextStr);
  };

  const addRow = () => {
    if (disabled) return;
    sync([...rows, { _id: nextId(), key: '', value: '' }]);
  };

  const removeRow = (id: string) => {
    sync(rows.filter((r) => r._id !== id));
  };

  const updateKey = (id: string, newKey: string) => {
    sync(rows.map((r) => (r._id === id ? { ...r, key: newKey } : r)));
  };

  const updateValue = (id: string, newVal: any) => {
    sync(rows.map((r) => (r._id === id ? { ...r, value: newVal } : r)));
  };

  const hasOptions = Array.isArray(options) && options.length > 0;

  return (
    <div className={cn('space-y-4', disabled && 'opacity-90', className)}>
      {label ? <FieldLabel disabled={disabled}>{label}</FieldLabel> : null}

      {rows.length > 0 && (
        <div className="flex items-center justify-start">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={<Plus className="h-4 w-4" />}
            onClick={addRow}
            disabled={disabled}
          >
            {addLabel}
          </Button>
        </div>
      )}

      {rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((row, rowIndex) => (
            <div
              key={row._id}
              className={cn(
                'group relative flex w-full items-center rounded-xl border p-4 transition-all',
                'border-gray-100/80 dark:border-gray-800/40',
                rowIndex % 2 === 0
                  ? 'bg-white dark:bg-transparent'
                  : 'bg-gray-50/50 dark:bg-white/[0.01]',
                !disabled && 'hover:border-primary/30 hover:shadow-sm'
              )}
            >
              <div className="mr-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {rowIndex + 1}
              </div>

              <div className="w-full">
                {!disabled && (
                  <IconButton
                    type="button"
                    size="xs"
                    variant="danger"
                    onClick={() => removeRow(row._id)}
                    className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </IconButton>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {hasOptions ? (
                    <Autocomplete
                      value={row.key}
                      onChange={(newKey) => updateKey(row._id, newKey)}
                      options={options}
                      placeholder={keyPlaceholder}
                      disabled={disabled}
                    />
                  ) : (
                    <Input
                      value={row.key}
                      onChange={(e) => updateKey(row._id, e.target.value)}
                      placeholder={keyPlaceholder}
                      disabled={disabled}
                      fullWidth
                    />
                  )}
                  <Input
                    value={row.value ?? ''}
                    onChange={(e) => updateValue(row._id, e.target.value)}
                    placeholder={valuePlaceholder}
                    disabled={disabled}
                    fullWidth
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {rows.length === 0 && (
        <button
          type="button"
          onClick={addRow}
          disabled={disabled}
          className={cn(
            'w-full rounded-xl border-2 border-dashed py-8 text-gray-500 transition-all duration-200 dark:border-gray-700/50 dark:text-gray-400',
            'hover:border-primary/30 hover:bg-primary/5 hover:text-primary cursor-pointer border-gray-200',
            disabled && 'cursor-not-allowed opacity-60'
          )}
        >
          <Plus className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p className="text-sm font-medium opacity-50">{emptyLabel}</p>
        </button>
      )}
    </div>
  );
}

export default KeyValueRepeater;