'use client';

import { Plus, X } from 'lucide-react';
import { Button, FieldGroup, IconButton, Input } from '@/ui';
import { faNumber } from '@/lib/format';
import {
  encodePacksEditorValue,
  parsePacksEditorValue,
  totalItems,
  totalPacks,
  type ClothPack,
  type PacksEditorValue,
} from '@/lib/packs';

export function ClothPacksEditor({
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
  const parsed = parsePacksEditorValue(value);
  const rows = parsed.packs;

  function emit(next: PacksEditorValue) {
    onChange(encodePacksEditorValue(next));
  }

  function setPackSize(packSize: number) {
    emit({ packSize, packs: parsed.packs });
  }

  function setRows(nextRows: ClothPack[]) {
    emit({ packSize: parsed.packSize, packs: nextRows });
  }

  function updateRow(index: number, patch: Partial<ClothPack>) {
    setRows(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows([...rows, { items: parsed.packSize || 0, count: 1 }]);
  }

  const packTotal = totalPacks(parsed.packs);
  const itemTotal = totalItems(parsed.packs);

  return (
    <FieldGroup
      title={label}
      description="ابتدا مشخص کنید هر بسته کامل چند لباس دارد، بعد بگویید چند بسته با چه تعدادی موجود است. مثلاً ۱۰ بسته ۱۲ تایی، ۲ بسته ۴ تایی و ۱ بسته ۱ تایی."
    >
      <Input
        label="تعداد هر بسته کامل *"
        type="number"
        min={1}
        value={parsed.packSize || ''}
        onChange={(e) => setPackSize(Number(e.target.value) || 0)}
      />
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">بسته‌های موجود</h4>
        <Button type="button" size="sm" variant="outline" onClick={addRow} icon={<Plus className="h-4 w-4" />}>
          افزودن نوع بسته
        </Button>
      </div>
      {rows.length ? (
        <div className="space-y-2">
          {rows.map((row, index) => (
            <div key={`pack-row-${index}`} className="grid gap-2 rounded-lg bg-white/70 p-3 dark:bg-gray-900/40 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <Input
                label={index === 0 ? 'تعداد بسته' : undefined}
                type="number"
                min={1}
                value={row.count || ''}
                onChange={(e) => updateRow(index, { count: Number(e.target.value) || 0 })}
              />
              <Input
                label={index === 0 ? 'تعداد لباس داخل هر بسته' : undefined}
                type="number"
                min={1}
                max={parsed.packSize || undefined}
                value={row.items || ''}
                onChange={(e) => updateRow(index, { items: Number(e.target.value) || 0 })}
              />
              <IconButton
                type="button"
                variant="outline"
                size="sm"
                className="mb-1"
                disabled={rows.length <= 1}
                onClick={() => setRows(rows.filter((_, rowIndex) => rowIndex !== index))}
                aria-label="حذف نوع بسته"
              >
                <X className="h-4 w-4" />
              </IconButton>
            </div>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={addRow}
          className="w-full rounded-xl border-2 border-dashed border-gray-200 py-6 text-sm text-gray-500 hover:border-primary/30 hover:text-primary dark:border-gray-700"
        >
          افزودن بسته
        </button>
      )}
      <p className="rounded-lg bg-white/80 px-3 py-2 text-sm dark:bg-gray-900/50">
        جمع: {faNumber(packTotal)} بسته، {faNumber(itemTotal)} عدد
      </p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </FieldGroup>
  );
}
