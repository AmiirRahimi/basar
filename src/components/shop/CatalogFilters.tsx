'use client';

import { uniqueFilterOptions } from '@/lib/catalog';
import type { CatalogProduct } from '@/lib/types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { shopInputClass, ShopField } from './ShopUi';

function Select({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <ShopField label={label}>
      <select name={name} defaultValue={value} className={shopInputClass}>
        <option value="">همه</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </ShopField>
  );
}

export function CatalogFilters({ products }: { products: CatalogProduct[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const options = uniqueFilterOptions(products);

  return (
    <form
      key={params.toString()}
      method="get"
      action={pathname}
      className="sticky top-24 space-y-4 rounded-[1.6rem] border border-shop-ink/10 bg-shop-paper p-4"
    >
      <p className="text-[11px] tracking-[0.22em] text-shop-ink/45">غربال انبار</p>
      <ShopField label="جستجو">
        <input name="q" defaultValue={params.get('q') || ''} placeholder="کد، نوع، مدل..." className={shopInputClass} />
      </ShopField>
      <Select label="نوع" name="type" value={params.get('type') || ''} options={options.types} />
      <Select label="مدل" name="style" value={params.get('style') || ''} options={options.styles} />
      <Select label="سایز" name="size" value={params.get('size') || ''} options={options.sizes} />
      <Select label="رنگ" name="color" value={params.get('color') || ''} options={options.colors} />
      <div className="grid grid-cols-2 gap-2">
        <ShopField label="از قیمت">
          <input name="minPrice" type="number" defaultValue={params.get('minPrice') || ''} className={shopInputClass} />
        </ShopField>
        <ShopField label="تا قیمت">
          <input name="maxPrice" type="number" defaultValue={params.get('maxPrice') || ''} className={shopInputClass} />
        </ShopField>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="stock" value="in" defaultChecked={params.get('stock') === 'in'} className="rounded border-shop-ink/20 text-shop-saffron" />
        فقط موجود
      </label>
      <div className="flex gap-2">
        <button type="submit" className="flex-1 rounded-full bg-shop-ink py-2.5 text-sm text-shop-bone">
          اعمال فیلتر
        </button>
        <button type="button" className="rounded-full px-4 text-sm text-shop-ink/60" onClick={() => router.push(pathname)}>
          پاک
        </button>
      </div>
    </form>
  );
}
