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
      const zones = document.querySelectorAll('[data-shop-dark]');
      const button = buttonRef.current;
      if (!zones.length || !button) {
        setOverDark(false);
        return;
      }
      const cartBox = button.getBoundingClientRect();
      setOverDark(
        [...zones].some((zone) => {
          const box = zone.getBoundingClientRect();
          return (
            cartBox.bottom > box.top &&
            cartBox.top < box.bottom &&
            cartBox.right > box.left &&
            cartBox.left < box.right
          );
        }),
      );
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
  const light = overDark;

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
      <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-3 md:bottom-auto md:top-1/2 md:-translate-y-1/2">
        <motion.button
          ref={buttonRef}
          type="button"
          onClick={() => setDrawerOpen(!drawerOpen)}
          whileHover={{ scale: 1.08, y: -4 }}
          whileTap={{ scale: 0.9, y: 2 }}
          transition={{ type: 'spring', stiffness: 520, damping: 22, mass: 0.7 }}
          className={cn(
            'pointer-events-auto flex w-14 flex-col items-center gap-1 rounded-2xl px-2 py-2.5 shadow-2xl md:w-[4.35rem] md:gap-2 md:rounded-[1.5rem] md:py-3',
            'origin-center will-change-transform transition-[background-color,color,border-color,box-shadow] duration-500 ease-out',
            light
              ? 'border border-shop-saffron/50 bg-shop-paper text-shop-ink shadow-[0_12px_32px_rgba(0,0,0,0.28)]'
              : 'border border-white/10 bg-shop-ink text-shop-bone hover:border-shop-saffron/50',
            drawerOpen && 'ring-2 ring-shop-saffron/80',
          )}
          aria-label="سبد عمده"
          aria-expanded={drawerOpen}
        >
          <ShoppingBag className={cn('h-5 w-5 transition-colors duration-500', light ? 'text-shop-ink' : 'text-shop-saffron')} />
          <span className="text-base font-semibold leading-none md:text-lg">{faNumber(totals.packs)}</span>
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
              className={cn(
                'pointer-events-auto absolute z-10 flex flex-col overflow-hidden rounded-2xl border border-shop-ink/10 bg-shop-paper text-shop-ink shadow-[0_18px_50px_rgba(16,28,48,0.35)]',
                'bottom-[5.25rem] left-3 w-[min(18.25rem,calc(100vw-1.5rem))] max-h-[min(20.5rem,50dvh)]',
                'md:bottom-auto md:left-[5.2rem] md:top-1/2 md:w-[18.5rem] md:max-h-[min(22rem,52vh)] md:-translate-y-1/2',
              )}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.85 }}
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
      <div className="flex shrink-0 items-center justify-between border-b border-shop-ink/10 px-3 py-2.5">
        <div>
          <p className="text-[10px] tracking-[0.22em] text-shop-ink/45">برگه بسته‌بندی</p>
          <h2 className="text-base font-semibold text-shop-ink">سبد عمده</h2>
        </div>
        <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-full p-1.5 hover:bg-shop-ink/5" aria-label="بستن">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-2.5">
        {message && !lines.length ? <p className="text-sm text-shop-madder">{message}</p> : null}
        {lines.length ? (
          lines.map((line) => (
            <div key={line.productId} className="rounded-xl border border-shop-ink/10 bg-shop-bone/60 p-2.5">
              <div className="mb-2 flex gap-2.5">
                <div
                  className="h-14 w-12 shrink-0 rounded-xl bg-cover bg-center"
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
          <p className="py-4 text-center text-sm text-shop-ink/55">سبد خالی است. از کاتالوگ بسته اضافه کنید.</p>
        )}
      </div>
      <div className="shrink-0 space-y-2 border-t border-shop-ink/10 bg-shop-paper px-3 py-2.5">
        <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
          <span>
            {faNumber(totals.packs)} بسته · {faNumber(totals.pieces)} عدد
          </span>
          <span className="font-semibold text-shop-saffron">{toman(totals.amount)}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ShopButton href="/cart" variant="outline" className="px-3 py-2 text-xs" onClick={() => setDrawerOpen(false)}>
            سبد کامل
          </ShopButton>
          <ShopButton href="/checkout" className="px-3 py-2 text-xs" onClick={() => setDrawerOpen(false)}>
            تسویه عمده
          </ShopButton>
        </div>
      </div>
    </>
  );
}
