'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ProductGallery } from '@/components/shop/ProductGallery';
import { ProductPackForm } from '@/components/shop/ProductPackForm';
import { ClothColorPicker } from '@/components/shop/ClothColorPicker';
import { SaleCountdown } from '@/components/shop/SaleCountdown';
import { faNumber, toman } from '@/lib/format';
import { packLabelFa } from '@/lib/packs';
import type { CatalogProduct } from '@/lib/types';

export function ProductColorStage({
  product,
  categoryHref,
}: {
  product: CatalogProduct;
  categoryHref: string;
}) {
  const colorways = product.colorways?.length ? product.colorways : [];
  const [selectedId, setSelectedId] = useState(product.id);
  const active = useMemo(() => {
    return colorways.find((colorway) => colorway.id === selectedId)?.product || product;
  }, [colorways, product, selectedId]);

  return (
    <>
      <ProductGallery key={active.id} images={active.images} name={active.name} />
      <div className="space-y-6">
        <div>
          <p className="text-xs tracking-[0.22em] text-shop-ink/45">
            <Link href={categoryHref} className="hover:text-shop-saffron">
              {active.category} عمده
            </Link>
            {' · '}کد {active.code}
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight text-shop-ink sm:text-4xl">{active.name} عمده</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            {active.newCollection ? (
              <span className="rounded-full bg-shop-saffron px-3 py-1 text-xs font-medium text-shop-ink">کالکشن جدید</span>
            ) : null}
            {active.onSale && active.discountPercent ? (
              <span className="rounded-full bg-rose-600 px-3 py-1 text-xs font-medium text-white">
                حراج {faNumber(active.discountPercent)}٪
              </span>
            ) : null}
          </div>
          <p className="mt-3 text-shop-ink/65">{active.description}</p>
        </div>
        <div>
          {active.onSale && active.listPrice && active.listPrice > active.wholesalePrice ? (
            <p className="text-base text-shop-ink/40 line-through">{toman(active.listPrice)}</p>
          ) : null}
          <p className="text-3xl text-shop-saffron">{toman(active.wholesalePrice)}</p>
          {active.saleEndsAt ? (
            <div className="mt-3">
              <SaleCountdown endsAt={active.saleEndsAt} />
            </div>
          ) : null}
        </div>
        {colorways.length > 1 ? (
          <ClothColorPicker
            label="رنگ‌های این مدل"
            colors={colorways.map((colorway) => ({ id: colorway.id, name: colorway.name, hex: colorway.hex }))}
            value={active.id}
            onChange={setSelectedId}
          />
        ) : null}
        <ul className="grid gap-2 text-sm text-shop-ink/70">
          <li>{packLabelFa(active.packSize)}</li>
          {active.size ? <li>سایز: {active.size}</li> : null}
          {colorways.length < 2 && active.color ? <li>رنگ: {active.color}</li> : null}
          {active.style ? <li>مدل: {active.style}</li> : null}
        </ul>
        <div className="rounded-[1.6rem] border border-shop-ink/10 bg-shop-paper p-5">
          <ProductPackForm key={active.id} product={active} />
        </div>
        {colorways.length > 1 ? (
          <p className="text-xs text-shop-ink/45">
            عکس و موجودی با رنگ عوض می‌شود.
            {active.id !== product.id ? (
              <>
                {' '}
                <Link href={`/product/${active.id}`} className="underline">
                  صفحه این رنگ
                </Link>
              </>
            ) : null}
          </p>
        ) : null}
      </div>
    </>
  );
}
