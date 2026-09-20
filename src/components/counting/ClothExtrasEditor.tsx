'use client';

import { Plus, X } from 'lucide-react';
import { Button, FieldGroup, IconButton, Input, Select, Textarea } from '@/ui';
import { faNumber, toman } from '@/lib/format';
import {
  CLOTH_EXTRA_KINDS,
  clothExtrasTotal,
  encodeClothExtras,
  parseClothExtras,
  type ClothExtra,
} from '@/lib/cloth-extras';

const KIND_OPTIONS = CLOTH_EXTRA_KINDS.map((row) => ({
  value: row.value,
  label: row.label,
}));

export function ClothExtrasEditor({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const rows = parseClothExtras(value);

  function setRows(next: ClothExtra[]) {
    onChange(encodeClothExtras(next));
  }

  function updateRow(index: number, patch: Partial<ClothExtra>) {
    setRows(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows([...rows, { kind: '', price: 0, description: '' }]);
  }

  const total = clothExtrasTotal(rows);

  return (
    <FieldGroup
      title={label}
      description="خرج‌های اضافه روی هر عدد لباس را ردیف‌به‌ردیف اضافه کنید."
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
              className="grid gap-2 rounded-lg bg-white/70 p-3 dark:bg-gray-900/40 md:grid-cols-[minmax(0,1fr)_8rem_auto] md:items-start"
            >
              <Select
                label={index === 0 ? 'نوع خرج' : undefined}
                value={row.kind || ''}
                onChange={(v) => updateRow(index, { kind: String(v || '') as ClothExtra['kind'] })}
                options={KIND_OPTIONS}
                placeholder="انتخاب کنید"
                searchable={false}
                clearable
                labels={{ search: 'جستجو', remove: 'حذف انتخاب', noOptionsFound: 'موردی یافت نشد' }}
              />
              <Input
                label={index === 0 ? 'مبلغ' : undefined}
                type="number"
                min={0}
                value={row.price || ''}
                onChange={(e) => updateRow(index, { price: Number(e.target.value) || 0 })}
              />
              <IconButton
                type="button"
                variant="outline"
                size="sm"
                className={index === 0 ? 'mt-7' : 'mt-1'}
                onClick={() => setRows(rows.filter((_, rowIndex) => rowIndex !== index))}
                aria-label="حذف خرج"
              >
                <X className="h-4 w-4" />
              </IconButton>
              <div className="md:col-span-3">
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
        جمع خرج‌ها: {toman(total)} · {faNumber(rows.length)} ردیف
      </p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </FieldGroup>
  );
}
