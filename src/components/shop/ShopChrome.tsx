'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/ui';

export function ShopHeader() {
  const pathname = usePathname();
  const links = [
    { href: '/', label: 'خانه' },
    { href: '/catalog', label: 'کاتالوگ عمده' },
    { href: '/about', label: 'شرایط عمده' },
    { href: '/cart', label: 'سبد' },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200/80 bg-white/90 backdrop-blur" dir="rtl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-xl font-semibold tracking-tight">
          بازار
          <span className="mr-2 text-sm font-normal text-muted-foreground">عمده‌فروشی پوشاک</span>
        </Link>
        <nav className="hidden items-center gap-5 text-sm md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={pathname === l.href ? 'text-primary' : 'text-gray-700'}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/counting/login">
            <Button size="sm" variant="outline">
              پنل شمارش
            </Button>
          </Link>
          <Link href="/checkout">
            <Button size="sm">سفارش عمده</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function ShopFooter() {
  return (
    <footer className="mt-16 border-t border-gray-200 py-8 text-center text-sm text-muted-foreground" dir="rtl">
      فروش فقط به‌صورت عمده — حداقل سفارش روی هر مدل مشخص شده است.
    </footer>
  );
}
