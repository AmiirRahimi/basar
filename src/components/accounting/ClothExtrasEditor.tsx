'use client';

import { Plus, X } from 'lucide-react';
import { Button, FieldGroup, IconButton, Select, Textarea } from '@/ui';
import { faNumber } from '@/lib/format';
import {
  CLOTH_EXTRA_KINDS,
  clothExtrasTotal,
  encodeClothExtras,
  parseClothExtras,
} from '@/lib/cloth-extras';
import {
  FABRIC_EXTRA_KINDS,
  encodeFabricExtras,
  fabricExtrasTotal,
  parseFabricExtras,
} from '@/lib/fabric-extras';
import { Price, PriceField } from './Price';

export type ExtrasVariant = 'cloth' | 'fabric';

type ExtraRow = {
  kind: string;
  price: number;
  description?: string;
};

const VARIANT = {
  cloth: {
    kinds: CLOTH_EXTRA_KINDS,
    parse: parseClothExtras,
    encode: encodeClothExtras,
    total: clothExtrasTotal,
    description: 'خرج‌های اضافه روی هر عدد لباس را ردیف‌به‌ردیف اضافه کنید.',
  },
  fabric: {
    kinds: FABRIC_EXTRA_KINDS,
    parse: parseFabricExtras,
    encode: encodeFabricExtras,
    total: fabricExtrasTotal,
    description: 'خرج‌های اضافه این خرید پارچه را ردیف‌به‌ردیف اضافه کنید.',
  },
} as const;

export function ClothExtrasEditor({
  label,
  value,
  onChange,
  error,
  variant = 'cloth',
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  variant?: ExtrasVariant;
}) {
  const config = VARIANT[variant];
  const rows = config.parse(value) as ExtraRow[];
  const kindOptions = config.kinds.map((row) => ({
    value: row.value,
    label: row.label,
  }));

  function setRows(next: ExtraRow[]) {
    onChange(config.encode(next as never));
  }

  function updateRow(index: number, patch: Partial<ExtraRow>) {
    setRows(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows([...rows, { kind: '', price: 0, description: '' }]);
  }

  const total = config.total(rows);

  return (
    <FieldGroup
      title={label}
      description={config.description}
      headerAction={
        <Button type="button" size="sm" variant="outline" onClick={addRow} icon={<Plus className="h-4 w-4" />}>
          افزودن
        </Button>
      }
    >
      {rows.length ? (
        <div className="space-y-2">
          {rows.map((row, index) => (
            <div
              key={`extra-row-${index}`}
              className="grid min-w-0 grid-cols-1 gap-2 rounded-lg bg-white/70 p-3 dark:bg-gray-900/40 sm:grid-cols-[minmax(0,1fr)_minmax(0,9rem)_auto] sm:items-start"
            >
              <Select
                label={index === 0 ? 'نوع خرج' : undefined}
                value={row.kind || ''}
                onChange={(v) => updateRow(index, { kind: String(v || '') })}
                options={kindOptions}
                placeholder="انتخاب کنید"
                searchable={false}
                clearable
                labels={{ search: 'جستجو', remove: 'حذف انتخاب', noOptionsFound: 'موردی یافت نشد' }}
              />
              <PriceField
                label={index === 0 ? 'مبلغ' : undefined}
                value={row.price ?? ''}
                onChange={(price) => updateRow(index, { price })}
              />
              <IconButton
                type="button"
                variant="outline"
                size="sm"
                className={index === 0 ? 'mt-1 sm:mt-7' : 'mt-1'}
                onClick={() => setRows(rows.filter((_, rowIndex) => rowIndex !== index))}
                aria-label="حذف خرج"
              >
                <X className="h-4 w-4" />
              </IconButton>
              <div className="sm:col-span-3 min-w-0">
                <Textarea
                  label={index === 0 ? 'توضیح' : undefined}
                  value={row.description || ''}
                  onChange={(e) => updateRow(index, { description: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={addRow}
          className="w-full rounded-xl border-2 border-dashed border-gray-200 py-6 text-sm text-gray-500 hover:border-primary/30 hover:text-primary dark:border-gray-700"
        >
          افزودن خرج اضافه
        </button>
      )}

      <p className="rounded-lg bg-white/80 px-3 py-2 text-sm dark:bg-gray-900/50">
        جمع خرج‌ها: <Price value={total} /> · {faNumber(rows.length)} ردیف
      </p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </FieldGroup>
  );
}
