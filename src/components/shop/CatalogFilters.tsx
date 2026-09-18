'use client';

import { colorSwatch } from '@/lib/brand';
import { uniqueFilterOptions } from '@/lib/catalog';
import type { CatalogProduct } from '@/lib/types';
import { cn } from '@/ui/lib/cn';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
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
  const selectedColor = params.get('color') || '';
  const [open, setOpen] = useState(() => Boolean(params.toString()));

  return (
    <form
      key={params.toString()}
      method="get"
      action={pathname}
      className="h-fit rounded-2xl border border-shop-ink/10 bg-shop-paper p-4 shadow-[0_12px_32px_-20px_rgb(16_28_48_/_0.4)] lg:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] tracking-[0.22em] text-shop-saffron">فیلتر محصولات</p>
          <p className="mt-1 text-sm text-shop-ink/60">قیمت، نوع و رنگ</p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-full border border-shop-ink/15 px-3 py-1.5 text-xs text-shop-ink lg:hidden"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? 'بستن' : 'نمایش'}
        </button>
      </div>
      <div className={cn('space-y-4 lg:space-y-5', open ? 'mt-4' : 'hidden', 'lg:mt-5 lg:block')}>
      <ShopField label="جستجو">
        <input name="q" defaultValue={params.get('q') || ''} placeholder="کد، نوع، مدل..." className={shopInputClass} />
      </ShopField>
      <Select label="نوع" name="type" value={params.get('type') || ''} options={options.types} />
      <div>
        <p className="mb-2 text-xs tracking-[0.18em] text-shop-ink/55">رنگ</p>
        <div className="flex flex-wrap gap-2">
          <label className="cursor-pointer">
            <input type="radio" name="color" value="" defaultChecked={!selectedColor} className="peer sr-only" />
            <span className="inline-flex rounded-full border border-shop-ink/15 px-3 py-1.5 text-xs peer-checked:border-shop-saffron peer-checked:bg-shop-saffron/15 peer-checked:text-shop-ink">
              همه
            </span>
          </label>
          {options.colors.map((option) => (
            <label key={option.value} className="cursor-pointer">
              <input type="radio" name="color" value={option.value} defaultChecked={selectedColor === option.value} className="peer sr-only" />
              <span className="inline-flex items-center gap-1.5 rounded-full border border-shop-ink/15 px-3 py-1.5 text-xs peer-checked:border-shop-saffron peer-checked:bg-shop-saffron/15">
                <span className="h-2.5 w-2.5 rounded-full border border-shop-ink/15" style={{ backgroundColor: colorSwatch(option.label) }} />
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <ShopField label="از قیمت">
          <input name="minPrice" type="number" defaultValue={params.get('minPrice') || ''} className={shopInputClass} />
        </ShopField>
        <ShopField label="تا قیمت">
          <input name="maxPrice" type="number" defaultValue={params.get('maxPrice') || ''} className={shopInputClass} />
        </ShopField>
      </div>
      <Select label="مدل" name="style" value={params.get('style') || ''} options={options.styles} />
      <Select label="سایز" name="size" value={params.get('size') || ''} options={options.sizes} />
      <div className="space-y-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="sale" value="1" defaultChecked={params.get('sale') === '1'} className="rounded border-shop-ink/20 text-shop-saffron" />
          فقط حراج
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="new" value="1" defaultChecked={params.get('new') === '1'} className="rounded border-shop-ink/20 text-shop-saffron" />
          فقط کالکشن جدید
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="stock" value="in" defaultChecked={params.get('stock') === 'in'} className="rounded border-shop-ink/20 text-shop-saffron" />
          فقط موجود
        </label>
      </div>
      <div className="flex gap-2">
        <button type="submit" className={cn('flex-1 rounded-full bg-shop-ink py-2.5 text-sm text-shop-bone')}>
          اعمال فیلتر
        </button>
        <button type="button" className="rounded-full px-4 text-sm text-shop-ink/60" onClick={() => router.push(pathname)}>
          پاک
        </button>
      </div>
      </div>
    </form>
  );
}
