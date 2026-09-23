'use client';

import { MultiSelect, Select } from '@/ui';
import type { FieldOption } from '@/lib/types';

const selectLabels = {
  search: 'جستجو',
  remove: 'حذف انتخاب',
  removeAll: 'حذف همه',
  noOptionsFound: 'موردی یافت نشد',
};

function splitIds(value: string) {
  return value
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ClothShareFields({
  brandOptions,
  storeOptions,
  partnerOptions,
  assignPlace,
  assignPartner,
  brandIds,
  storeIds,
  partnerId,
  error,
  disabled,
  onChange,
}: {
  brandOptions: FieldOption[];
  storeOptions: FieldOption[];
  partnerOptions: FieldOption[];
  assignPlace: boolean;
  assignPartner: boolean;
  brandIds: string;
  storeIds: string;
  partnerId: string;
  error?: string;
  disabled?: boolean;
  onChange: (next: { brandIds: string; storeIds: string; partnerId: string }) => void;
}) {
  const selectedBrands = splitIds(brandIds);
  const selectedStores = splitIds(storeIds);
  const visibleStores = storeOptions.filter(
    (option) => !option.parent || selectedBrands.includes(String(option.parent)),
  );
  const columns = (assignPlace ? 2 : 0) + (assignPartner ? 1 : 0);
  const brandError = error && !selectedBrands.length ? error : undefined;
  const storeError = error && selectedBrands.length && !selectedStores.length ? error : undefined;

  function setBrands(next: string[]) {
    const allowed = new Set(next);
    onChange({
      brandIds: next.join(','),
      storeIds: selectedStores
        .filter((id) => {
          const store = storeOptions.find((option) => String(option.value) === id);
          return store ? allowed.has(String(store.parent || '')) : false;
        })
        .join(','),
      partnerId,
    });
  }

  if (!assignPlace && !assignPartner) return null;

  return (
    <div
      className={
        columns >= 3
          ? 'grid gap-3 sm:grid-cols-3'
          : columns === 2
            ? 'grid gap-3 sm:grid-cols-2'
            : 'grid gap-3'
      }
    >
      {assignPlace ? (
        <MultiSelect
          label="برند *"
          value={selectedBrands}
          onChange={(value) => setBrands(value.map(String))}
          options={brandOptions}
          searchable
          disabled={disabled}
          error={brandError}
          labels={selectLabels}
        />
      ) : null}
      {assignPlace ? (
        <MultiSelect
          label="فروشگاه *"
          value={selectedStores}
          onChange={(value) =>
            onChange({
              brandIds,
              storeIds: value.map(String).join(','),
              partnerId,
            })
          }
          options={visibleStores}
          searchable
          disabled={disabled || !selectedBrands.length}
          error={storeError}
          hint={selectedBrands.length ? undefined : 'ابتدا برند را انتخاب کنید'}
          labels={selectLabels}
        />
      ) : null}
      {assignPartner ? (
        <Select
          label="شریک"
          value={partnerId}
          onChange={(value) =>
            onChange({
              brandIds,
              storeIds,
              partnerId: String(value ?? ''),
            })
          }
          options={partnerOptions}
          searchable
          clearable
          disabled={disabled}
          placeholder="انتخاب کنید"
          labels={selectLabels}
        />
      ) : null}
    </div>
  );
}
