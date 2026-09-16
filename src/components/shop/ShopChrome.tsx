'use client';

import { faNumber } from '@/lib/format';
import { cn } from '@/ui/lib/cn';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useShopCart } from './CartProvider';
import { ShopButton } from './ShopUi';

const LINKS = [
  { href: '/', label: 'خانه' },
  { href: '/catalog', label: 'ایندکس کالا' },
  { href: '/browse', label: 'فیلتر و جستجو' },
  { href: '/about', label: 'شرایط عمده' },
  { href: '/contact', label: 'ارتباط' },
];

export function ShopHeader() {
  const pathname = usePathname();
  const { totals, setDrawerOpen } = useShopCart();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-shop-ink/95 text-shop-bone backdrop-blur" dir="rtl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:px-6">
        <Link href="/" className="leading-none">
          <span className="block font-semibold tracking-tight text-2xl">بازار</span>
          <span className="mt-1 block text-[10px] tracking-[0.28em] text-shop-saffron">عمده‌فروشی پوشاک</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'border-b border-transparent pb-0.5 transition',
                pathname === link.href ? 'border-shop-saffron text-shop-saffron' : 'text-shop-bone/75 hover:text-shop-bone',
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="relative rounded-full border border-white/15 px-3 py-1.5 text-sm hover:border-shop-saffron/50"
          >
            سبد
            <span className="mr-2 inline-flex min-w-5 items-center justify-center rounded-full bg-shop-saffron px-1.5 text-[11px] font-semibold text-shop-ink">
              {faNumber(totals.packs)}
            </span>
          </button>
          <ShopButton href="/counting/login" variant="outline" className="hidden border-white/15 bg-transparent text-shop-bone hover:bg-white/5 sm:inline-flex">
            شمارش
          </ShopButton>
          <button type="button" className="rounded-full p-2 md:hidden" onClick={() => setOpen((v) => !v)} aria-label="منو">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open ? (
        <div className="border-t border-white/10 bg-shop-ink px-4 py-4 md:hidden">
          <div className="grid gap-3 text-sm">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className={pathname === link.href ? 'text-shop-saffron' : ''}>
                {link.label}
              </Link>
            ))}
            <Link href="/counting/login" onClick={() => setOpen(false)} className="text-shop-bone/70">
              پنل شمارش
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function ShopFooter() {
  return (
    <footer className="mt-20 border-t border-shop-ink/10 bg-shop-ink text-shop-bone" dir="rtl">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-3 lg:px-6">
        <div>
          <p className="text-2xl font-semibold">بازار</p>
          <p className="mt-2 max-w-sm text-sm leading-7 text-shop-bone/65">
            بنکداری پوشاک. فروش فقط با بسته و کارتن؛ قیمت خرده‌فروشی نداریم.
          </p>
        </div>
        <div className="grid gap-2 text-sm text-shop-bone/75">
          <Link href="/catalog">ایندکس کالا</Link>
          <Link href="/browse">فیلتر مدل‌ها</Link>
          <Link href="/about">شرایط همکاری</Link>
          <Link href="/contact">ارتباط با انبار</Link>
        </div>
        <p className="text-sm text-shop-bone/55">سفارش‌ها به‌صورت فاکتور شمارش ثبت می‌شوند. پرداخت و چک در پنل کارکنان است.</p>
      </div>
    </footer>
  );
}
