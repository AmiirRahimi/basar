'use client';

import { BRAND, BRAND_ADDRESSES, BRAND_PHONES, BRAND_SOCIAL } from '@/lib/brand';
import { cn } from '@/ui/lib/cn';
import { Instagram, Linkedin, Menu, Phone, Send, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const LINKS = [
  { href: '/', label: 'خانه' },
  { href: '/catalog', label: 'محصولات' },
  { href: '/about', label: 'درباره ما' },
  { href: '/contact', label: 'تماس با ما' },
];

function activePath(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ShopHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const sharePage = pathname.startsWith('/s/');

  if (sharePage) {
    return (
      <header className="sticky top-0 z-40 border-b border-white/10 bg-shop-ink/95 text-shop-bone backdrop-blur-md" dir="rtl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <span className="min-w-0 text-xl font-semibold tracking-tight sm:text-2xl">{BRAND.name}</span>
          <Link
            href="/catalog"
            className="rounded-full bg-shop-saffron px-4 py-2 text-sm font-medium text-shop-ink hover:brightness-105"
          >
            مشاهده همه محصولات
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-shop-ink/95 text-shop-bone backdrop-blur-md" dir="rtl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:px-6">
        <Link href="/" className="min-w-0 leading-none">
          <span className="block text-xl font-semibold tracking-tight sm:text-2xl">{BRAND.name}</span>
          <span className="mt-1 hidden max-w-[16rem] truncate text-[10px] tracking-[0.14em] text-shop-saffron sm:block md:max-w-none md:tracking-[0.18em]">
            {BRAND.tagline}
          </span>
        </Link>
        <nav className="hidden items-center gap-4 text-sm md:flex lg:gap-7">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'border-b border-transparent pb-0.5 transition',
                activePath(pathname, link.href) ? 'border-shop-saffron text-shop-saffron' : 'text-shop-bone/75 hover:text-shop-bone',
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/contact"
            className="hidden items-center gap-2 rounded-full border border-white/15 px-3 py-2 text-xs text-shop-bone/85 hover:bg-white/5 lg:inline-flex"
          >
            <Phone className="h-3.5 w-3.5 text-shop-saffron" />
            <span dir="ltr">{BRAND_PHONES[0].display}</span>
          </Link>
          <button type="button" className="rounded-full p-2 md:hidden" onClick={() => setOpen((v) => !v)} aria-label="منو">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open ? (
        <div className="border-t border-white/10 bg-shop-ink px-4 py-4 md:hidden">
          <div className="grid gap-3 text-sm">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className={activePath(pathname, link.href) ? 'text-shop-saffron' : ''}>
                {link.label}
              </Link>
            ))}
            <a href={BRAND_PHONES[0].href} dir="ltr" className="text-shop-bone/70">
              {BRAND_PHONES[0].display}
            </a>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function ShopFooter() {
  const pathname = usePathname();
  if (pathname.startsWith('/s/')) return null;

  return (
    <footer data-shop-dark className="mt-16 border-t border-shop-ink/10 bg-shop-ink text-shop-bone" dir="rtl">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-2 lg:grid-cols-4 lg:px-6">
        <div>
          <p className="text-2xl font-semibold">{BRAND.name}</p>
          <p className="mt-1 text-xs tracking-[0.16em] text-shop-saffron">{BRAND.latin}</p>
          <p className="mt-3 max-w-sm text-sm leading-7 text-shop-bone/65">{BRAND.description}. فروش عمده با بسته از حجره‌های بازار آهنگران.</p>
        </div>
        <div className="grid gap-2 text-sm text-shop-bone/75">
          <p className="mb-1 text-xs tracking-[0.18em] text-shop-saffron">صفحات</p>
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-shop-bone">
              {link.label}
            </Link>
          ))}
        </div>
        <div className="grid gap-2 text-sm">
          <p className="mb-1 text-xs tracking-[0.18em] text-shop-saffron">تلفن</p>
          {BRAND_PHONES.map((phone) => (
            <a key={phone.href} href={phone.href} dir="ltr" className="text-shop-bone/80 hover:text-shop-saffron">
              {phone.display}
            </a>
          ))}
        </div>
        <div className="grid gap-4 text-sm text-shop-bone/75">
          <p className="text-xs tracking-[0.18em] text-shop-saffron">آدرس حجره‌ها</p>
          {BRAND_ADDRESSES.map((address) => (
            <p key={address.title} className="leading-7">
              <span className="block text-shop-bone">{address.title}</span>
              {address.line}
            </p>
          ))}
          <div className="pt-2">
            <p className="mb-2 text-xs tracking-[0.18em] text-shop-saffron">شبکه‌های اجتماعی</p>
            <div className="flex flex-wrap gap-2">
              <a
                href={BRAND_SOCIAL.instagram}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs text-shop-bone/85 hover:bg-white/5 hover:text-shop-saffron"
              >
                <Instagram className="h-3.5 w-3.5" />
                اینستاگرام
              </a>
              <a
                href={BRAND_SOCIAL.telegram}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs text-shop-bone/85 hover:bg-white/5 hover:text-shop-saffron"
              >
                <Send className="h-3.5 w-3.5" />
                تلگرام
              </a>
              <a
                href={BRAND_SOCIAL.linkedin}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs text-shop-bone/85 hover:bg-white/5 hover:text-shop-saffron"
              >
                <Linkedin className="h-3.5 w-3.5" />
                لینکدین
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
