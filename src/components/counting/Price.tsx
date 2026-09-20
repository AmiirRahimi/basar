'use client';

import type { ReactNode } from 'react';
import { toman } from '@/lib/format';
import { cn } from '@/ui';

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

export default Price;
