'use client';

import { useId, useRef, type ReactNode } from 'react';
import { formatGroupedNumber, parseGroupedNumber, toman } from '@/lib/format';
import { FieldLabel, cn } from '@/ui';

export type PriceProps = {
  value?: number | string | null;
  className?: string;
  empty?: ReactNode;
  as?: 'span' | 'p' | 'td' | 'div';
};

/** Inline money amount (تومان). */
export function Price({ value, className, empty = '—', as: Tag = 'span' }: PriceProps) {
  if (value == null || value === '') {
    return <Tag className={className}>{empty}</Tag>;
  }
  return <Tag className={className}>{toman(value)}</Tag>;
}

export type PriceSectionProps = {
  label: ReactNode;
  value?: number | string | null;
  description?: ReactNode;
  className?: string;
};

/** Highlighted price block — same layout as «قیمت تمام‌شده» on the cloth form. */
export function PriceSection({ label, value, description, className }: PriceSectionProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-primary/25 bg-gradient-to-l from-primary/10 to-primary/5 px-4 py-3',
        className,
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-primary/70">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight text-primary">
        <Price value={value} empty="۰ تومان" />
      </p>
      {description != null && description !== '' ? (
        <p className="mt-0.5 text-xs text-gray-500">{description}</p>
      ) : null}
    </div>
  );
}

export type PriceFieldProps = {
  label?: ReactNode;
  value?: number | string | null;
  onChange: (value: number) => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
};

/** Money input: تومان + divider on the left, LTR amount field (caret stays in the number). */
export function PriceField({ label, value, onChange, error, hint, disabled, className }: PriceFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const empty = value == null || value === '';
  const display = empty ? '' : formatGroupedNumber(value);

  function focusInput() {
    inputRef.current?.focus();
  }

  function handleChange(raw: string) {
    const input = inputRef.current;
    const caret = input?.selectionStart ?? raw.length;
    const digitsBefore = raw.slice(0, caret).replace(/\D/g, '').length;
    const digitsOnly = raw.replace(/\D/g, '');
    if (!digitsOnly) {
      onChange(0);
      requestAnimationFrame(() => {
        inputRef.current?.setSelectionRange(0, 0);
      });
      return;
    }
    const nextValue = parseGroupedNumber(digitsOnly);
    onChange(nextValue);
    const formatted = formatGroupedNumber(nextValue);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      let pos = formatted.length;
      let seen = 0;
      for (let i = 0; i < formatted.length; i += 1) {
        if (/\d/.test(formatted[i]!)) {
          seen += 1;
          if (seen >= digitsBefore) {
            pos = i + 1;
            break;
          }
        }
      }
      el.setSelectionRange(pos, pos);
    });
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label != null && label !== '' ? (
        <FieldLabel htmlFor={inputId} disabled={disabled}>
          {label}
        </FieldLabel>
      ) : null}
      <div
        dir="ltr"
        onMouseDown={(e) => {
          // Keep caret in the number field when clicking the unit / divider.
          if (e.target !== inputRef.current) {
            e.preventDefault();
            focusInput();
          }
        }}
        className={cn(
          'flex h-9 items-stretch overflow-hidden rounded-xl border bg-white transition-all duration-200',
          'focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-0',
          disabled && 'cursor-not-allowed opacity-50',
          error
            ? 'border-red-400 focus-within:border-red-500 focus-within:ring-red-500/20 dark:border-red-500/60 dark:bg-gray-800'
            : 'border-gray-200/80 focus-within:border-primary/50 focus-within:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:focus-within:border-primary/50 dark:focus-within:ring-primary/25',
        )}
      >
        <span className="flex shrink-0 select-none items-center px-3 text-xs font-medium text-gray-500 dark:text-gray-400">
          تومان
        </span>
        <span className="my-2 w-px shrink-0 bg-gray-200 dark:bg-gray-600" aria-hidden />
        <input
          ref={inputRef}
          id={inputId}
          disabled={disabled}
          inputMode="numeric"
          autoComplete="off"
          dir="ltr"
          value={display}
          onChange={(e) => handleChange(e.target.value)}
          className={cn(
            'min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-gray-900',
            'outline-none ring-0 focus:outline-none focus:ring-0',
            'placeholder:text-gray-400 disabled:cursor-not-allowed',
            'dark:text-gray-100 dark:placeholder:text-gray-400',
          )}
        />
      </div>
      {error ? <p className="text-xs text-red-500 dark:text-red-400">{error}</p> : null}
      {hint && !error ? <p className="text-xs text-gray-400 dark:text-gray-500">{hint}</p> : null}
    </div>
  );
}

export default Price;
