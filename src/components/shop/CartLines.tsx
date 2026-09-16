'use client';

import { formatPacksFa } from '@/lib/packs';
import { toman } from '@/lib/format';
import Link from 'next/link';
import { ShopPackPicker } from './ShopPackPicker';
import { ShopButton } from './ShopUi';
import { useShopCart } from './CartProvider';

export function CartLines({ compact = false }: { compact?: boolean }) {
  const { lines, totals, pending, setProductPacks, removeProduct } = useShopCart();
  if (!lines.length) {
    return (
      <div className="rounded-[2rem] border border-dashed border-shop-ink/15 px-6 py-16 text-center">
        <p className="text-lg">سبد بسته‌ها خالی است.</p>
        <ShopButton href="/catalog" className="mt-6">
          رفتن به ایندکس کالا
        </ShopButton>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {lines.map((line) => (
        <div key={line.productId} className="grid gap-4 rounded-[1.6rem] border border-shop-ink/10 bg-shop-paper p-4 md:grid-cols-[7rem_1fr]">
          <div className="h-28 rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url(${line.product.image})` }} />
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link href={`/product/${line.product.id}`} className="text-lg font-medium">
                  {line.product.name}
                </Link>
                <p className="text-xs text-shop-ink/50">کد {line.product.code}</p>
                <p className="text-xs text-shop-ink/60">{formatPacksFa(line.packs)}</p>
              </div>
              <p className="text-shop-saffron">{toman(line.total)}</p>
            </div>
            <div className="mt-3">
              {compact ? (
                <p className="text-sm text-shop-ink/65">
                  {line.packCount} بسته · {line.pieces} عدد
                </p>
              ) : (
                <ShopPackPicker
                  packSize={line.product.packSize}
                  available={line.product.packs}
                  taken={line.packs}
                  unitPrice={line.product.wholesalePrice}
                  minOrderQty={line.product.minOrderQty}
                  pending={pending}
                  mode="edit"
                  onChange={(packs, order) => setProductPacks(line.productId, packs, order)}
                  onRemove={() => removeProduct(line.productId)}
                />
              )}
            </div>
          </div>
        </div>
      ))}
      {!compact ? (
        <div className="flex items-center justify-between rounded-[1.6rem] bg-shop-ink px-5 py-4 text-shop-bone">
          <p>
            {totals.packs} بسته · {totals.pieces} عدد
          </p>
          <div className="flex items-center gap-4">
            <p className="text-shop-saffron">{toman(totals.amount)}</p>
            <ShopButton href="/checkout">تسویه سفارش</ShopButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
