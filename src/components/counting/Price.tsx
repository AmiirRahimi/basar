'use client';

import { useRef, type ReactNode } from 'react';
import { formatGroupedNumber, parseGroupedNumber, toman } from '@/lib/format';
import { Input, cn } from '@/ui';

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

/** Money input that shows thousand separators while typing (30000 → 30,000). */
export function PriceField({ label, value, onChange, error, hint, disabled, className }: PriceFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const empty = value == null || value === '';
  const display = empty ? '' : formatGroupedNumber(value);

  return (
    <Input
      ref={inputRef}
      label={label}
      error={error}
      hint={hint}
      disabled={disabled}
      className={className}
      inputMode="numeric"
      autoComplete="off"
      dir="ltr"
      value={display}
      onChange={(e) => {
        const input = e.target;
        const raw = input.value;
        const caret = input.selectionStart ?? raw.length;
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
      }}
    />
  );
}

export default Price;
