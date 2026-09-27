'use client';

import { useMemo } from 'react';
import { swatchFor } from '@/lib/cloth-colors';
import type { FieldOption } from '@/lib/types';
import { cn } from '@/ui';

function idsOf(value: string) {
  return value
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ClothColorFamily({
  colors,
  value,
  siblings,
  existing,
  onColor,
  onSiblings,
}: {
  colors: FieldOption[];
  value: string;
  siblings: string;
  existing: { id: string; name: string; hex: string }[];
  onColor: (id: string) => void;
  onSiblings: (ids: string) => void;
}) {
  const selected = colors.find((color) => color.value === value);
  const extra = useMemo(() => new Set(idsOf(siblings)), [siblings]);
  const taken = new Set([value, ...existing.map((color) => color.id)]);

  function toggleExtra(id: string) {
    const next = new Set(extra);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSiblings([...next].join(','));
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-gray-800">رنگ این لباس</p>
        <p className="mt-1 text-xs leading-6 text-gray-500">
          یکی را انتخاب کنید. نام رنگ با نگه داشتن ماوس دیده می‌شود.
          {selected ? <span className="text-gray-800"> انتخاب: {selected.label}</span> : null}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {colors.map((color) => {
            const hex = swatchFor(color.label, color.hex);
            const active = color.value === value;
            return (
              <button
                key={color.value}
                type="button"
                title={color.label}
                aria-label={color.label}
                aria-pressed={active}
                onClick={() => {
                  onColor(color.value);
                  if (extra.has(color.value)) toggleExtra(color.value);
                }}
                className="group relative"
              >
                <span
                  className={cn(
                    'block h-8 w-8 rounded-full border shadow-sm',
                    active ? 'border-gray-900 ring-2 ring-amber-400 ring-offset-2' : 'border-black/10',
                  )}
                  style={{ backgroundColor: hex }}
                />
                <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2 py-1 text-[11px] text-white group-hover:block">
                  {color.label}
                </span>
              </button>
            );
          })}
        </div>
        {!colors.length ? <p className="mt-2 text-sm text-gray-500">اول مدیر باید رنگ‌ها را در لیست کمکی بسازد.</p> : null}
      </div>

      {existing.length > 1 ? (
        <div>
          <p className="text-sm font-medium text-gray-800">رنگ‌های ثبت‌شده این مدل</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {existing.map((color) => (
              <span key={color.id} className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700">
                <span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ backgroundColor: color.hex }} />
                {color.name}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <p className="text-sm font-medium text-gray-800">رنگ دیگر از همین مدل</p>
        <p className="mt-1 text-xs leading-6 text-gray-500">
          رنگ‌هایی که اینجا علامت بزنید، با همین کد و مدل ساخته می‌شوند. موجودی‌شان صفر است و عکس ندارند تا موجودی این
          لباس دو بار حساب نشود. بعد از ثبت، موجودی و عکس هر رنگ را روی همان ردیف می‌گذارید.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {colors
            .filter((color) => !taken.has(color.value) || extra.has(color.value))
            .map((color) => {
              const hex = swatchFor(color.label, color.hex);
              const on = extra.has(color.value);
              return (
                <button
                  key={color.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleExtra(color.value)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs',
                    on ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-700',
                  )}
                >
                  <span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ backgroundColor: hex }} />
                  {color.label}
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}
