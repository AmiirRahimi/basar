'use client';

import { faNumber, toman } from '@/lib/format';
import { formatPacksFa } from '@/lib/packs';
import { cn } from '@/ui/lib/cn';
import { ShoppingBag, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShopPackPicker } from './ShopPackPicker';
import { ShopButton } from './ShopUi';
import { useShopCart } from './CartProvider';

export function CartDock() {
  const { totals, setDrawerOpen, pending } = useShopCart();
  const pathname = usePathname();
  const compact = pathname.startsWith('/checkout') || pathname.startsWith('/order');
  const empty = totals.packs < 1;

  return (
    <>
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className={cn(
          'fixed z-50 hidden flex-col items-center justify-between border border-white/10 bg-shop-ink text-shop-bone shadow-2xl lg:flex',
          compact ? 'bottom-6 left-4 h-auto w-16 rounded-2xl px-2 py-3' : 'bottom-6 left-4 top-28 w-[4.6rem] rounded-[1.6rem] px-2 py-4',
        )}
        aria-label="سبد عمده"
      >
        <ShoppingBag className="h-5 w-5 text-shop-saffron" />
        {!compact ? (
          <div className="space-y-1 text-center">
            <p className="text-[10px] tracking-[0.2em] text-shop-bone/50">سبد</p>
            <p className="text-lg font-semibold">{faNumber(totals.packs)}</p>
            <p className="text-[10px] text-shop-bone/55">{faNumber(totals.pieces)} عدد</p>
          </div>
        ) : (
          <p className="mt-2 text-sm font-semibold">{faNumber(totals.packs)}</p>
        )}
        <span className="mt-2 max-w-full truncate text-[10px] text-shop-saffron">
          {empty ? 'خالی' : pending ? '...' : toman(totals.amount).replace(' تومان', '')}
        </span>
      </button>
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="fixed inset-x-3 bottom-3 z-50 flex items-center justify-between rounded-2xl bg-shop-ink px-4 py-3 text-shop-bone shadow-2xl lg:hidden"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        aria-label="سبد عمده"
      >
        <span className="flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-shop-saffron" />
          <span className="text-sm">سبد عمده</span>
        </span>
        <span className="text-sm">
          {faNumber(totals.packs)} بسته · {empty ? 'خالی' : toman(totals.amount)}
        </span>
      </button>
    </>
  );
}

export function CartDrawer() {
  const { drawerOpen, setDrawerOpen, lines, totals, setProductPacks, removeProduct, pending, message } = useShopCart();
  if (!drawerOpen) return null;

  return (
    <div className="fixed inset-0 z-[60]" dir="rtl">
      <button type="button" className="absolute inset-0 bg-shop-ink/45" aria-label="بستن سبد" onClick={() => setDrawerOpen(false)} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-shop-ink/10 bg-shop-bone shadow-2xl">
        <div className="flex items-center justify-between border-b border-shop-ink/10 px-5 py-4">
          <div>
            <p className="text-[11px] tracking-[0.22em] text-shop-ink/45">برگه بسته‌بندی</p>
            <h2 className="text-xl font-semibold">سبد عمده</h2>
          </div>
          <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-full p-2 hover:bg-shop-ink/5" aria-label="بستن">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {message && !lines.length ? <p className="text-sm text-shop-madder">{message}</p> : null}
          {lines.length ? (
            lines.map((line) => (
              <div key={line.productId} className="rounded-2xl border border-shop-ink/10 bg-shop-paper p-3">
                <div className="mb-3 flex gap-3">
                  <div
                    className="h-16 w-14 shrink-0 rounded-xl bg-cover bg-center"
                    style={{ backgroundImage: `url(${line.product.image})` }}
                  />
                  <div className="min-w-0 flex-1">
                    <Link href={`/product/${line.product.id}`} className="font-medium" onClick={() => setDrawerOpen(false)}>
                      {line.product.name}
                    </Link>
                    <p className="text-xs text-shop-ink/50">کد {line.product.code}</p>
                    <p className="text-xs text-shop-ink/60">{formatPacksFa(line.packs)}</p>
                  </div>
                </div>
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
              </div>
            ))
          ) : (
            <p className="py-12 text-center text-sm text-shop-ink/55">سبد خالی است. از کاتالوگ بسته اضافه کنید.</p>
          )}
        </div>
        <div className="space-y-3 border-t border-shop-ink/10 bg-shop-paper px-5 py-4">
          <div className="flex items-center justify-between text-sm">
            <span>
              {faNumber(totals.packs)} بسته · {faNumber(totals.pieces)} عدد
            </span>
            <span className="font-semibold text-shop-saffron">{toman(totals.amount)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ShopButton href="/cart" variant="outline" onClick={() => setDrawerOpen(false)}>
              سبد کامل
            </ShopButton>
            <ShopButton href="/checkout" onClick={() => setDrawerOpen(false)}>
              تسویه عمده
            </ShopButton>
          </div>
        </div>
      </aside>
    </div>
  );
}
