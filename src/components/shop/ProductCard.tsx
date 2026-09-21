'use client';

import { faNumber, toman } from '@/lib/format';
import type { CatalogProduct } from '@/lib/types';
import { cn } from '@/ui/lib/cn';
import Link from 'next/link';
import { useShopCart } from './CartProvider';
import { SaleCountdown } from './SaleCountdown';
import { ShopPackPicker } from './ShopPackPicker';

export function ProductCard({
  product,
  featured = false,
  linkToDetail = true,
}: {
  product: CatalogProduct;
  featured?: boolean;
  linkToDetail?: boolean;
}) {
  const { setProductPacks, pending, setDrawerOpen, items } = useShopCart();
  const line = items.find((item) => item.productId === product.id);
  const taken = line?.packs || [];
  const takenOrder = line?.takenOrder || [];
  const media = (
    <>
      <div
        className={cn('bg-cover bg-center transition duration-700 group-hover:scale-105', featured ? 'h-64 sm:h-80 md:h-[22rem]' : 'h-56 sm:h-72 md:h-80')}
        style={{ backgroundImage: `url(${product.image})` }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-shop-ink/70 via-shop-ink/10 to-transparent" />
      <div className="absolute left-3 top-3 flex max-w-[72%] flex-col items-start gap-1.5">
        {product.newCollection ? (
          <span className="rounded-full bg-shop-saffron px-2.5 py-1 text-[11px] font-medium text-shop-ink shadow-sm">کالکشن جدید</span>
        ) : null}
        {product.onSale && product.discountPercent ? (
          <span className="rounded-full bg-shop-madder px-2.5 py-1 text-[11px] font-medium text-white shadow-sm">
            حراج {faNumber(product.discountPercent)}٪
          </span>
        ) : null}
      </div>
      <span className="absolute right-3 top-3 rounded-full bg-shop-bone/92 px-2.5 py-1 text-[11px] text-shop-ink">
        {product.category}
      </span>
      {product.saleEndsAt ? (
        <div className="absolute bottom-3 left-3">
          <SaleCountdown endsAt={product.saleEndsAt} />
        </div>
      ) : null}
      <span className="absolute bottom-3 right-3 rounded-md bg-shop-ink/80 px-2 py-1 font-mono text-[11px] text-shop-saffron">کد {product.code}</span>
    </>
  );

  return (
    <article
      className={cn(
        'group relative flex flex-col rounded-2xl border border-shop-ink/10 bg-shop-paper shadow-[0_10px_30px_-18px_rgb(16_28_48_/_0.45)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-16px_rgb(16_28_48_/_0.5)]',
        featured && 'md:min-h-[28rem]',
      )}
    >
      {linkToDetail ? (
        <Link href={`/product/${product.id}`} className="relative block overflow-hidden rounded-t-2xl">
          {media}
        </Link>
      ) : (
        <div className="relative overflow-hidden rounded-t-2xl">{media}</div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-medium leading-snug text-shop-ink">
            {linkToDetail ? <Link href={`/product/${product.id}`}>{product.name}</Link> : product.name}
          </h3>
          <div className="shrink-0 text-left">
            {product.onSale && product.listPrice && product.listPrice > product.wholesalePrice ? (
              <p className="text-[11px] text-shop-ink/40 line-through">{toman(product.listPrice)}</p>
            ) : null}
            <p className="text-sm font-medium text-shop-saffron">{toman(product.wholesalePrice)}</p>
          </div>
        </div>
        <p className="text-xs text-shop-ink/55">
          {product.color || '—'} {product.size ? `· ${product.size}` : ''}
        </p>
        <div className="mt-auto border-t border-shop-ink/10 pt-3">
          <ShopPackPicker
            packSize={product.packSize}
            available={product.packs}
            taken={taken}
            takenOrder={takenOrder}
            unitPrice={product.wholesalePrice}
            minOrderQty={product.minOrderQty}
            pending={pending}
            onChange={async (nextPacks, order) => {
              const wasEmpty = !taken.length;
              const res = await setProductPacks(product.id, nextPacks, order);
              if (res.ok && wasEmpty && nextPacks.length) setDrawerOpen(true);
            }}
          />
        </div>
      </div>
    </article>
  );
}
