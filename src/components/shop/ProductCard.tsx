'use client';

import { faNumber, toman } from '@/lib/format';
import { formatPacksFa, totalPacks } from '@/lib/packs';
import type { CatalogProduct } from '@/lib/types';
import { cn } from '@/ui/lib/cn';
import Link from 'next/link';
import { useState } from 'react';
import { useShopCart } from './CartProvider';
import { ShopPackPicker } from './ShopPackPicker';

export function ProductCard({ product, featured = false }: { product: CatalogProduct; featured?: boolean }) {
  const [open, setOpen] = useState(false);
  const { setProductPacks, pending, setDrawerOpen } = useShopCart();
  const packs = product.packs || [];

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-[1.6rem] border border-shop-ink/10 bg-shop-paper shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl',
        featured && 'md:min-h-[28rem]',
      )}
    >
      <Link href={`/product/${product.id}`} className="relative block overflow-hidden">
        <div
          className={cn('bg-cover bg-center transition duration-700 group-hover:scale-105', featured ? 'h-80' : 'h-72')}
          style={{ backgroundImage: `url(${product.image})` }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-shop-ink/55 via-transparent to-transparent" />
        <span className="absolute right-3 top-3 rounded-full bg-shop-bone/90 px-2.5 py-1 text-[11px] tracking-wide text-shop-ink">
          {product.category}
        </span>
        <span className="absolute bottom-3 right-3 rounded-md bg-shop-ink/80 px-2 py-1 font-mono text-[11px] text-shop-saffron">
          کد {product.code}
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-medium leading-snug">
            <Link href={`/product/${product.id}`}>{product.name}</Link>
          </h3>
          <p className="shrink-0 text-sm text-shop-saffron">{toman(product.wholesalePrice)}</p>
        </div>
        <p className="text-xs text-shop-ink/55">
          {product.color || '—'} {product.size ? `· ${product.size}` : ''}
        </p>
        <p className="text-xs text-shop-ink/60">{formatPacksFa(packs) || 'بدون موجودی بسته'}</p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-[11px] text-shop-ink/45">حداقل {faNumber(product.minOrderQty)} عدد</span>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-sm text-shop-ink underline decoration-shop-saffron/70 underline-offset-4"
          >
            {open ? 'بستن' : 'افزودن بسته'}
          </button>
        </div>
        {open ? (
          <div className="mt-2 border-t border-shop-ink/10 pt-3">
            <ShopPackPicker
              packSize={product.packSize}
              available={product.packs}
              unitPrice={product.wholesalePrice}
              minOrderQty={product.minOrderQty}
              pending={pending}
              onSubmit={async (nextPacks, order) => {
                const res = await setProductPacks(product.id, nextPacks, order);
                if (res.ok) setDrawerOpen(true);
              }}
            />
          </div>
        ) : null}
      </div>
      <p className="sr-only">{faNumber(totalPacks(packs))} بسته</p>
    </article>
  );
}
