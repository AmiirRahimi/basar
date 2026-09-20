'use client';

import { Checkbox, MultiSelect } from '@/ui';
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
  sellInAllStores,
  brandIds,
  storeIds,
  defaultBrandId,
  error,
  disabled,
  onChange,
}: {
  brandOptions: FieldOption[];
  storeOptions: FieldOption[];
  sellInAllStores: boolean;
  brandIds: string;
  storeIds: string;
  defaultBrandId?: string;
  error?: string;
  disabled?: boolean;
  onChange: (next: { sellInAllStores: boolean; brandIds: string; storeIds: string }) => void;
}) {
  const selectedBrands = splitIds(brandIds);
  const selectedStores = splitIds(storeIds);
  const allBrandIds = brandOptions.map((option) => String(option.value));
  const allSelected = Boolean(
    allBrandIds.length && selectedBrands.length === allBrandIds.length && !selectedStores.length,
  );
  const visibleStores = storeOptions.filter(
    (option) => !option.parent || selectedBrands.includes(String(option.parent)),
  );

  function setBrands(next: string[]) {
    const allowed = new Set(next);
    onChange({
      sellInAllStores: Boolean(allBrandIds.length && next.length === allBrandIds.length && !selectedStores.length),
      brandIds: next.join(','),
      storeIds: selectedStores
        .filter((id) => {
          const store = storeOptions.find((option) => String(option.value) === id);
          return store ? allowed.has(String(store.parent || '')) : false;
        })
        .join(','),
    });
  }

  return (
    <div className="space-y-3">
      <Checkbox
        checked={sellInAllStores || allSelected}
        disabled={disabled || !allBrandIds.length}
        label="اشتراک در همه برندها و فروشگاه‌ها"
        onChange={() => {
          const nextAll = !(sellInAllStores || allSelected);
          onChange({
            sellInAllStores: nextAll,
            brandIds: nextAll ? allBrandIds.join(',') : defaultBrandId || selectedBrands[0] || '',
            storeIds: '',
          });
        }}
      />
      <MultiSelect
        label="برندها *"
        value={selectedBrands}
        onChange={(value) => setBrands(value.map(String))}
        options={brandOptions}
        searchable
        disabled={disabled || sellInAllStores}
        error={error}
        labels={selectLabels}
      />
      <MultiSelect
        label="فروشگاه‌ها"
        value={selectedStores}
        onChange={(value) =>
          onChange({
            sellInAllStores: false,
            brandIds,
            storeIds: value.map(String).join(','),
          })
        }
        options={visibleStores}
        searchable
        disabled={disabled || sellInAllStores || !selectedBrands.length}
        hint={
          selectedBrands.length
            ? 'اگر فروشگاهی انتخاب نشود، لباس در همه فروشگاه‌های برندهای انتخاب‌شده دیده می‌شود.'
            : 'ابتدا برند را انتخاب کنید'
        }
        labels={selectLabels}
      />
    </div>
  );
}
