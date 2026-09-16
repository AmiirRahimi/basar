'use client';

import { compactToman, faNumber, toman } from '@/lib/format';
import { formatPacksFa } from '@/lib/packs';
import { cn } from '@/ui/lib/cn';
import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingBag, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ShopPackPicker } from './ShopPackPicker';
import { ShopButton } from './ShopUi';
import { useShopCart } from './CartProvider';

function useOverDarkPoster() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [overDark, setOverDark] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    function measure() {
      const hero = document.querySelector('[data-shop-hero]');
      const button = buttonRef.current;
      if (!hero || !button) {
        setOverDark(false);
        return;
      }
      const heroBox = hero.getBoundingClientRect();
      const cartBox = button.getBoundingClientRect();
      const overlaps =
        cartBox.bottom > heroBox.top + 8 &&
        cartBox.top < heroBox.bottom - 8 &&
        cartBox.right > heroBox.left &&
        cartBox.left < heroBox.right;
      setOverDark(overlaps);
    }

    measure();
    const frame = window.requestAnimationFrame(measure);
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [pathname]);

  return { overDark, buttonRef };
}

export function CartDock() {
  const { totals, drawerOpen, setDrawerOpen, pending } = useShopCart();
  const { overDark, buttonRef } = useOverDarkPoster();
  const light = overDark && !drawerOpen;

  useEffect(() => {
    if (!drawerOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setDrawerOpen(false);
    }
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [drawerOpen, setDrawerOpen]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <div className="absolute left-3 top-1/2 -translate-y-1/2">
        <motion.button
          ref={buttonRef}
          type="button"
          onClick={() => setDrawerOpen(!drawerOpen)}
          whileHover={{ scale: 1.08, y: -4 }}
          whileTap={{ scale: 0.9, y: 2 }}
          transition={{ type: 'spring', stiffness: 520, damping: 22, mass: 0.7 }}
          className={cn(
            'pointer-events-auto flex w-[4.35rem] flex-col items-center gap-2 rounded-[1.5rem] px-2 py-3 shadow-2xl',
            'origin-center will-change-transform transition-[background-color,color,border-color,box-shadow] duration-500 ease-out',
            light
              ? 'border border-white/50 bg-white/90 text-shop-ink backdrop-blur-md hover:shadow-[0_12px_40px_rgba(255,255,255,0.28)]'
              : 'border border-white/10 bg-shop-ink text-shop-bone hover:border-shop-saffron/50',
            drawerOpen && 'ring-2 ring-shop-saffron/80',
          )}
          aria-label="سبد عمده"
          aria-expanded={drawerOpen}
        >
          <ShoppingBag className={cn('h-5 w-5 transition-colors duration-500', light ? 'text-shop-ink' : 'text-shop-saffron')} />
          <span className="text-lg font-semibold leading-none">{faNumber(totals.packs)}</span>
          <span className={cn('max-w-full truncate text-[10px] leading-tight transition-colors duration-500', light ? 'text-shop-ink/70' : 'text-shop-saffron')}>
            {pending ? '...' : compactToman(totals.amount)}
          </span>
        </motion.button>
      </div>

      <AnimatePresence>
        {drawerOpen ? (
          <>
            <motion.button
              key="cart-veil"
              type="button"
              aria-label="بستن سبد"
              className="pointer-events-auto absolute inset-0 bg-shop-ink/35"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              key="cart-panel"
              dir="rtl"
              className="pointer-events-auto absolute bottom-4 left-[5.4rem] top-4 flex w-[min(calc(100vw-6.5rem),26rem)] flex-col overflow-hidden rounded-[1.6rem] border border-shop-ink/10 bg-shop-bone shadow-[0_24px_80px_rgba(11,29,42,0.28)]"
              initial={{ opacity: 0, x: -28, scale: 0.94 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -18, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.85 }}
              style={{ originX: 0, originY: 0.5 }}
            >
              <CartPopover />
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function CartPopover() {
  const { lines, totals, setProductPacks, removeProduct, pending, message, setDrawerOpen } = useShopCart();

  return (
    <>
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
    </>
  );
}

